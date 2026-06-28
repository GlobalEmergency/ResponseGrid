import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { ScopeRefProps } from '../../domain/authorization/scope-ref';
import { ScopeResolver } from './scope-resolver';
import { RESOURCE_EMERGENCY_LOOKUP } from '../../domain/ports/resource-emergency-lookup';
import { NEED_EMERGENCY_LOOKUP } from '../../domain/ports/need-emergency-lookup';
import { OFFER_EMERGENCY_LOOKUP } from '../../domain/ports/offer-emergency-lookup';
import { VOLUNTEER_EMERGENCY_LOOKUP } from '../../domain/ports/volunteer-emergency-lookup';
import { TASK_EMERGENCY_LOOKUP } from '../../domain/ports/task-emergency-lookup';
import { REPORT_EMERGENCY_LOOKUP } from '../../domain/ports/report-emergency-lookup';

interface EmergencyLookup {
  findEmergencyId(entityId: string): Promise<string | null>;
}

/**
 * Resolves the scope chain for both emergency-scoped routes
 * (`/emergencies/:emergencyId/...`) and entity-scoped routes
 * (`:resourceId`, `:needId`, …) by reusing the existing *EmergencyLookup ports
 * — the same lookups the legacy Require*CoordinatorGuard family used. Preserves
 * the legacy 404 when the targeted entity does not exist, so migrating a route
 * from the old guard to @RequirePermission is behavior-preserving for the
 * not-found case. See docs/features/13 §9.
 */
@Injectable()
export class EntityAwareScopeResolver implements ScopeResolver {
  private readonly entityLookups: ReadonlyArray<{
    param: string;
    entityType: string;
    lookup: EmergencyLookup;
  }>;

  constructor(
    @Inject(RESOURCE_EMERGENCY_LOOKUP) resource: EmergencyLookup,
    @Inject(NEED_EMERGENCY_LOOKUP) need: EmergencyLookup,
    @Inject(OFFER_EMERGENCY_LOOKUP) offer: EmergencyLookup,
    @Inject(VOLUNTEER_EMERGENCY_LOOKUP) volunteer: EmergencyLookup,
    @Inject(TASK_EMERGENCY_LOOKUP) task: EmergencyLookup,
    @Inject(REPORT_EMERGENCY_LOOKUP) report: EmergencyLookup,
  ) {
    this.entityLookups = [
      { param: 'resourceId', entityType: 'resource', lookup: resource },
      { param: 'needId', entityType: 'need', lookup: need },
      { param: 'offerId', entityType: 'offer', lookup: offer },
      { param: 'volunteerId', entityType: 'volunteer', lookup: volunteer },
      { param: 'taskId', entityType: 'task', lookup: task },
      { param: 'reportId', entityType: 'report', lookup: report },
    ];
  }

  async resolve(request: Request): Promise<ScopeRefProps[]> {
    const params = (request.params ?? {}) as Record<string, string | undefined>;

    const emergencyId = params.emergencyId;
    if (emergencyId) {
      return [{ type: 'emergency', id: emergencyId }, { type: 'platform' }];
    }

    for (const { param, entityType, lookup } of this.entityLookups) {
      const entityId = params[param];
      if (!entityId) continue;

      const resolvedEmergencyId = await lookup.findEmergencyId(entityId);
      if (resolvedEmergencyId === null) {
        throw new NotFoundException(`${entityType} ${entityId} not found`);
      }
      return [
        { type: 'entity', entityType, id: entityId },
        { type: 'emergency', id: resolvedEmergencyId },
        { type: 'platform' },
      ];
    }

    return [{ type: 'platform' }];
  }
}
