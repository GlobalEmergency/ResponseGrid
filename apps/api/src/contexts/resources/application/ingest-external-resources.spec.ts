/**
 * Unit tests for IngestExternalResources use case.
 *
 * All infrastructure is mocked:
 *  - ResourceRepository → InMemoryResourceRepository (no DB)
 *  - CategoryResolver → instantiated with a fixed Map (no DB)
 *  - ResourceMapper → a simple inline function
 *
 * Tests cover:
 *  1. Insert path: new records are saved with correct fields.
 *  2. Idempotency / update path: re-ingesting an existing externalId updates the
 *     resource but PRESERVES publicStatus, verificationLevel, and ownerUserId
 *     from the previously saved record.
 *  3. Skip path: records for which the mapper returns null are counted as skipped.
 */

import { IngestExternalResources } from './ingest-external-resources';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { CategoryResolver } from '../../taxonomy/domain/category-resolver';
import { MappedResourceInput, ResourceMapper } from './acopiove-mapper';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
  PublicStatus,
} from '../domain/resource-enums';
import { Resource } from '../domain/resource';
import { ResourceId } from '../domain/resource-id';
import { Location } from '../../../shared/domain/location';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMERGENCY_ID = '22222222-2222-4222-8222-222222222222';
const OWNER_USER_ID = '33333333-3333-4333-8333-333333333333';
const SOURCE_NAME = 'acopiove';
const EXT_ID_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const EXT_ID_2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMappedInput(
  overrides: Partial<MappedResourceInput> = {},
): MappedResourceInput {
  return {
    externalId: EXT_ID_1,
    type: ResourceType.CollectionPoint,
    stage: ResourceStage.Origin,
    name: 'Punto Acopio Prueba',
    description: 'Necesitamos agua | Fuente: Cruz Roja',
    address: 'Calle Mayor 1, Valencia',
    latitude: 39.4699,
    longitude: -0.3763,
    contact: '600123456',
    schedule: 'L-V 9-18h',
    manager: 'María García',
    acceptsRawLabels: ['agua', 'ropa'],
    country: 'España',
    city: 'Valencia',
    externalUpdatedAt: new Date('2024-01-15T10:30:00.000Z'),
    raw: { id: EXT_ID_1, name: 'raw-data' },
    ...overrides,
  };
}

/** Builds a CategoryResolver whose map resolves 'agua'→'water', 'ropa'→'clothing'. */
function makeResolver(): CategoryResolver {
  return new CategoryResolver(
    new Map([
      ['agua', 'water'],
      ['ropa', 'clothing'],
    ]),
  );
}

/** Builds a mapper that always returns the given input. */
function makeMapper(input: MappedResourceInput): ResourceMapper {
  return (_raw: unknown) => input;
}

/** Mapper that always returns null (skip). */
const skipMapper: ResourceMapper = (_raw: unknown) => null;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('IngestExternalResources', () => {
  describe('insert path — new records', () => {
    it('inserts 2 new records and returns {inserted:2, updated:0, skipped:0}', async () => {
      const repo = new InMemoryResourceRepository();
      const resolver = makeResolver();
      const useCase = new IngestExternalResources(repo, resolver);

      const input1 = makeMappedInput({ externalId: EXT_ID_1 });
      const input2 = makeMappedInput({
        externalId: EXT_ID_2,
        name: 'Segundo punto',
      });

      const combinedMapper: ResourceMapper = (raw) =>
        raw === 'rec1' ? input1 : raw === 'rec2' ? input2 : null;

      const result = await useCase.execute({
        emergencyId: EMERGENCY_ID,
        sourceName: SOURCE_NAME,
        ownerUserId: OWNER_USER_ID,
        records: ['rec1', 'rec2'],
        mapper: combinedMapper,
      });

      expect(result).toEqual({ inserted: 2, updated: 0, skipped: 0 });
    });

    it('saves Resource with resolved accepts and correct provenance', async () => {
      const repo = new InMemoryResourceRepository();
      const resolver = makeResolver();
      const useCase = new IngestExternalResources(repo, resolver);

      const input = makeMappedInput({
        acceptsRawLabels: ['agua', 'ropa', 'unknownLabel'],
      });
      await useCase.execute({
        emergencyId: EMERGENCY_ID,
        sourceName: SOURCE_NAME,
        ownerUserId: OWNER_USER_ID,
        records: ['rec'],
        mapper: makeMapper(input),
      });

      const found = await repo.findByExternal(SOURCE_NAME, EXT_ID_1);
      expect(found).not.toBeNull();
      // 'unknownLabel' has no alias → filtered out; 'agua'→'water', 'ropa'→'clothing'
      expect(found!.accepts).toEqual(
        expect.arrayContaining(['water', 'clothing']),
      );
      expect(found!.accepts).not.toContain('unknownLabel');
      expect(found!.accepts).toHaveLength(2);

      expect(found!.provenance?.sourceName).toBe(SOURCE_NAME);
      expect(found!.provenance?.externalId).toBe(EXT_ID_1);
      expect(found!.provenance?.raw).toEqual({
        id: EXT_ID_1,
        name: 'raw-data',
      });
    });

    it('saves Resource with correct mapped fields (contact, schedule, manager, city, country)', async () => {
      const repo = new InMemoryResourceRepository();
      const resolver = makeResolver();
      const useCase = new IngestExternalResources(repo, resolver);

      const input = makeMappedInput();
      await useCase.execute({
        emergencyId: EMERGENCY_ID,
        sourceName: SOURCE_NAME,
        ownerUserId: OWNER_USER_ID,
        records: ['rec'],
        mapper: makeMapper(input),
      });

      const found = await repo.findByExternal(SOURCE_NAME, EXT_ID_1);
      expect(found).not.toBeNull();
      expect(found!.contact).toBe('600123456');
      expect(found!.schedule).toBe('L-V 9-18h');
      expect(found!.manager).toBe('María García');
      expect(found!.city).toBe('Valencia');
      expect(found!.country).toBe('España');
      expect(found!.type).toBe(ResourceType.CollectionPoint);
      expect(found!.stage).toBe(ResourceStage.Origin);
    });

    it('new resource starts with verificationLevel=Unverified and publicStatus=Active', async () => {
      const repo = new InMemoryResourceRepository();
      const resolver = makeResolver();
      const useCase = new IngestExternalResources(repo, resolver);

      await useCase.execute({
        emergencyId: EMERGENCY_ID,
        sourceName: SOURCE_NAME,
        ownerUserId: OWNER_USER_ID,
        records: ['rec'],
        mapper: makeMapper(makeMappedInput()),
      });

      const found = await repo.findByExternal(SOURCE_NAME, EXT_ID_1);
      expect(found).not.toBeNull();
      expect(found!.verificationLevel).toBe(VerificationLevel.Unverified);
      expect(found!.publicStatus).toBe(PublicStatus.Active);
    });
  });

  describe('update path — re-ingest existing externalId', () => {
    it('returns {inserted:0, updated:1, skipped:0} on re-ingest', async () => {
      const repo = new InMemoryResourceRepository();
      const resolver = makeResolver();
      const useCase = new IngestExternalResources(repo, resolver);

      // First ingest (insert)
      await useCase.execute({
        emergencyId: EMERGENCY_ID,
        sourceName: SOURCE_NAME,
        ownerUserId: OWNER_USER_ID,
        records: ['rec'],
        mapper: makeMapper(makeMappedInput()),
      });

      // Second ingest with same externalId (update)
      const updatedInput = makeMappedInput({ name: 'Nombre Actualizado' });
      const result = await useCase.execute({
        emergencyId: EMERGENCY_ID,
        sourceName: SOURCE_NAME,
        ownerUserId: OWNER_USER_ID,
        records: ['rec'],
        mapper: makeMapper(updatedInput),
      });

      expect(result).toEqual({ inserted: 0, updated: 1, skipped: 0 });
    });

    it('preserves publicStatus, verificationLevel, and ownerUserId from the existing record', async () => {
      const repo = new InMemoryResourceRepository();
      const resolver = makeResolver();
      const useCase = new IngestExternalResources(repo, resolver);

      // Manually plant a "pre-existing" resource with non-default status/level/owner
      const existingId = ResourceId.create();
      const preExisting = Resource.fromSnapshot({
        id: existingId.value,
        emergencyId: EMERGENCY_ID,
        type: ResourceType.CollectionPoint,
        stage: ResourceStage.Origin,
        name: 'Punto Original',
        description: null,
        location: {
          address: 'Calle Antigua 1',
          latitude: 39.4699,
          longitude: -0.3763,
        },
        ownerUserId: 'original-owner-id',
        ownerOrganizationId: null,
        verificationLevel: VerificationLevel.Verified, // non-default: Verified
        publicStatus: PublicStatus.Active, // non-default: Active
        createdAt: new Date('2023-01-01'),
        contact: null,
        schedule: null,
        manager: null,
        accepts: [],
        country: null,
        city: null,
        provenance: {
          sourceName: SOURCE_NAME,
          externalId: EXT_ID_1,
          externalUpdatedAt: null,
          raw: null,
        },
      });
      await repo.save(preExisting);

      // Now ingest the same externalId with a different name and different ownerUserId
      const incomingInput = makeMappedInput({
        name: 'Nombre Nuevo desde Fuente',
      });
      const result = await useCase.execute({
        emergencyId: EMERGENCY_ID,
        sourceName: SOURCE_NAME,
        ownerUserId: 'different-owner-id', // ignored: preserved from existing
        records: ['rec'],
        mapper: makeMapper(incomingInput),
      });

      expect(result).toEqual({ inserted: 0, updated: 1, skipped: 0 });

      const found = await repo.findByExternal(SOURCE_NAME, EXT_ID_1);
      expect(found).not.toBeNull();

      // Local fields PRESERVED
      expect(found!.publicStatus).toBe(PublicStatus.Active); // preserved
      expect(found!.verificationLevel).toBe(VerificationLevel.Verified); // preserved
      expect(found!.ownerUserId).toBe('original-owner-id'); // preserved
      expect(found!.id.value).toBe(existingId.value); // same aggregate

      // Source-owned fields UPDATED
      expect(found!.name).toBe('Nombre Nuevo desde Fuente');
    });
  });

  describe('skip path — mapper returns null', () => {
    it('counts records where mapper returns null as skipped', async () => {
      const repo = new InMemoryResourceRepository();
      const resolver = makeResolver();
      const useCase = new IngestExternalResources(repo, resolver);

      const result = await useCase.execute({
        emergencyId: EMERGENCY_ID,
        sourceName: SOURCE_NAME,
        ownerUserId: OWNER_USER_ID,
        records: ['rec1', 'rec2', 'rec3'],
        mapper: skipMapper,
      });

      expect(result).toEqual({ inserted: 0, updated: 0, skipped: 3 });
    });

    it('mixes inserts and skips correctly', async () => {
      const repo = new InMemoryResourceRepository();
      const resolver = makeResolver();
      const useCase = new IngestExternalResources(repo, resolver);

      const input1 = makeMappedInput({ externalId: EXT_ID_1 });
      const mixedMapper: ResourceMapper = (raw) =>
        raw === 'valid' ? input1 : null;

      const result = await useCase.execute({
        emergencyId: EMERGENCY_ID,
        sourceName: SOURCE_NAME,
        ownerUserId: OWNER_USER_ID,
        records: ['valid', 'invalid', 'invalid2'],
        mapper: mixedMapper,
      });

      expect(result).toEqual({ inserted: 1, updated: 0, skipped: 2 });
    });
  });
});
