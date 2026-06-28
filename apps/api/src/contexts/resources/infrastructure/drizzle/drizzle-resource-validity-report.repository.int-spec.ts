import { randomUUID } from 'node:crypto';
import { createDb, Db } from '../../../../shared/db';
import { resourcesTable } from './schema';
import { DrizzleResourceValidityReportRepository } from './drizzle-resource-validity-report.repository';
import { DrizzleResourceRepository } from './drizzle-resource.repository';
import { Resource } from '../../domain/resource';
import { ResourceId } from '../../domain/resource-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { ResourceType, ResourceStage } from '../../domain/resource-enums';
import { Location } from '../../../../shared/domain/location';
import {
  ResourceValidityReport,
  ValidityReason,
} from '../../domain/resource-validity-report';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const EM = '11111111-1111-4111-8111-111111111111';
const REPORTER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('DrizzleResourceValidityReportRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleResourceValidityReportRepository;
  let resources: DrizzleResourceRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleResourceValidityReportRepository(db);
    resources = new DrizzleResourceRepository(db);
  });
  afterAll(async () => {
    await pool.end();
  });
  beforeEach(async () => {
    await db.delete(resourcesTable); // cascades to resource_validity_reports
  });

  async function seedResource(): Promise<string> {
    const r = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Acopio Integración',
      location: Location.create({
        address: 'Caracas',
        latitude: 10.48,
        longitude: -66.9,
      }),
      ownerUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    await resources.save(r);
    return r.id.value;
  }

  it('folds a concurrent first-report (different id, same open slot) into an update', async () => {
    const resourceId = await seedResource();

    // Request A won the race and created its open report.
    const a = ResourceValidityReport.open({
      id: randomUUID(),
      resourceId,
      emergencyId: EM,
      reporterUserId: REPORTER,
      reason: ValidityReason.Closed,
      note: 'primero',
    });
    await repo.save(a);

    // Request B raced with A: it also built a fresh-id open report for the same
    // (resource, reporter). Saving it must NOT throw on the partial unique index
    // `resource_validity_one_open_per_user` — it folds into the existing row.
    const b = ResourceValidityReport.open({
      id: randomUUID(),
      resourceId,
      emergencyId: EM,
      reporterUserId: REPORTER,
      reason: ValidityReason.Moved,
      note: 'segundo',
    });
    await expect(repo.save(b)).resolves.toBeUndefined();

    const open = await repo.findOpenByResource(resourceId);
    expect(open).toHaveLength(1); // still one open report per user
    expect(open[0].reason).toBe(ValidityReason.Moved); // folded B's values
    expect(open[0].note).toBe('segundo');
    expect(await repo.countOpenByResource(resourceId)).toBe(1);
  });

  it('the normal id-based upsert updates an existing report in place', async () => {
    const resourceId = await seedResource();
    const report = ResourceValidityReport.open({
      id: randomUUID(),
      resourceId,
      emergencyId: EM,
      reporterUserId: REPORTER,
      reason: ValidityReason.Closed,
    });
    await repo.save(report);
    report.update({ reason: ValidityReason.Outdated });
    await repo.save(report);

    const open = await repo.findOpenByResource(resourceId);
    expect(open).toHaveLength(1);
    expect(open[0].reason).toBe(ValidityReason.Outdated);
  });
});
