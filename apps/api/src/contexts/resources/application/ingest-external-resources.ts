/**
 * IngestExternalResources — application-layer use case.
 *
 * Idempotent upsert of Resource aggregates from an external source.
 *
 * Key decisions:
 *  - IDEMPOTENCY KEY: (sourceName, externalId) pair via findByExternal.
 *  - UPDATE STRATEGY: when the record already exists, we rebuild the aggregate
 *    via Resource.fromSnapshot(), preserving the existing id, publicStatus,
 *    verificationLevel, and ownerUserId (the "local-owned" fields that operators
 *    may have changed). Source-owned fields (name, description, location, contact,
 *    schedule, manager, accepts, country, city, provenance) are taken from the
 *    incoming mapped record.
 *    We use Resource.fromSnapshot() rather than mutating the aggregate directly
 *    because Resource has no setter methods for those fields (they are readonly).
 *    This deliberately bypasses the ResourceRegistered domain event for updates
 *    (the aggregate is not "re-registered", just overwritten in the repository).
 *  - HEXAGONAL CONSTRAINT: this file imports zero @nestjs/* or drizzle modules.
 *    It depends only on the ResourceRepository port (domain/ports) and the pure
 *    CategoryResolver (supplies domain).
 */

import { ResourceRepository } from '../domain/ports/resource.repository';
import { Resource } from '../domain/resource';
import { ResourceId } from '../domain/resource-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { VerificationLevel, PublicStatus } from '../domain/resource-enums';
import { CategoryResolver } from '../../supplies/domain/category-resolver';
import { ResourceMapper } from './acopiove-mapper';

export type IngestInput = {
  emergencyId: string;
  sourceName: string;
  ownerUserId: string;
  records: unknown[];
  mapper: ResourceMapper;
};

export type IngestResult = {
  inserted: number;
  updated: number;
  skipped: number;
};

export class IngestExternalResources {
  constructor(
    private readonly repo: ResourceRepository,
    private readonly categoryResolver: CategoryResolver,
  ) {}

  async execute(input: IngestInput): Promise<IngestResult> {
    const { emergencyId, sourceName, ownerUserId, records, mapper } = input;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const emergencyIdVO = EmergencyId.fromString(emergencyId);

    for (const raw of records) {
      const mapped = mapper(raw);

      if (mapped === null) {
        skipped++;
        continue;
      }

      const accepts = this.categoryResolver.resolveMany(
        mapped.acceptsRawLabels,
      );

      const existing = await this.repo.findByExternal(
        sourceName,
        mapped.externalId,
      );

      if (existing !== null) {
        // UPDATE: rebuild the aggregate preserving local-owned fields
        const existingSnap = existing.toSnapshot();
        const updatedResource = Resource.fromSnapshot({
          // Preserved (local-owned):
          id: existingSnap.id,
          ownerUserId: existingSnap.ownerUserId,
          ownerOrganizationId: existingSnap.ownerOrganizationId,
          verificationLevel: existingSnap.verificationLevel,
          publicStatus: existingSnap.publicStatus,
          createdAt: existingSnap.createdAt,
          // Preserved (local-owned recipient role — #60):
          isFinalRecipient: existingSnap.isFinalRecipient,
          recipientType: existingSnap.recipientType,
          // Preserved (local-owned inventory — operators may have declared stock):
          items: existingSnap.items,
          // Preserved (structural — not changed by source):
          emergencyId: existingSnap.emergencyId,
          // Source-owned (updated):
          type: mapped.type,
          stage: mapped.stage,
          name: mapped.name,
          description: mapped.description,
          location: {
            address: mapped.address,
            latitude: mapped.latitude,
            longitude: mapped.longitude,
          },
          contact: mapped.contact,
          schedule: mapped.schedule,
          manager: mapped.manager,
          accepts,
          country: mapped.country,
          city: mapped.city,
          provenance: {
            sourceName,
            externalId: mapped.externalId,
            externalUpdatedAt: mapped.externalUpdatedAt,
            raw: mapped.raw,
          },
        });

        await this.repo.save(updatedResource);
        updated++;
      } else {
        // INSERT: build a new Resource via fromSnapshot (Active by default, no domain events)
        const resource = Resource.fromSnapshot({
          id: ResourceId.create().value,
          emergencyId: emergencyIdVO.value,
          type: mapped.type,
          stage: mapped.stage,
          name: mapped.name,
          description: mapped.description,
          location: {
            address: mapped.address,
            latitude: mapped.latitude,
            longitude: mapped.longitude,
          },
          ownerUserId,
          ownerOrganizationId: null,
          verificationLevel: VerificationLevel.Unverified,
          publicStatus: PublicStatus.Active,
          createdAt: new Date(),
          isFinalRecipient: false,
          recipientType: null,
          items: [],
          contact: mapped.contact,
          schedule: mapped.schedule,
          manager: mapped.manager,
          accepts,
          country: mapped.country,
          city: mapped.city,
          provenance: {
            sourceName,
            externalId: mapped.externalId,
            externalUpdatedAt: mapped.externalUpdatedAt,
            raw: mapped.raw,
          },
        });

        await this.repo.save(resource);
        inserted++;
      }
    }

    return { inserted, updated, skipped };
  }
}
