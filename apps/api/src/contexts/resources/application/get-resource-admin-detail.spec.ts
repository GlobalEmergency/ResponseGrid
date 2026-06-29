import { GetResourceAdminDetail } from './get-resource-admin-detail';
import {
  ResourceRepository,
  ResourceWithEmergency,
} from '../domain/ports/resource.repository';
import { ResourceValidityReportRepository } from '../domain/ports/resource-validity-report.repository';
import { Resource } from '../domain/resource';
import { SupplyLine } from '../../supplies/domain/supply-line';
import { Category } from '../../supplies/domain/category';
import {
  ResourceValidityReport,
  ValidityReason,
} from '../domain/resource-validity-report';
import { ResourceType, ResourceStage } from '../domain/resource-enums';

const EM = '11111111-1111-4111-8111-111111111111';
const RESOURCE_ID = '22222222-2222-4222-8222-222222222222';

function hiddenResourceWithInventory(): Resource {
  return Resource.fromSnapshot({
    id: RESOURCE_ID,
    emergencyId: EM,
    type: ResourceType.Warehouse,
    stage: ResourceStage.Origin,
    name: 'Almacén oculto',
    description: null,
    location: { address: 'Calle 1', latitude: 10, longitude: -66 },
    ownerUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ownerOrganizationId: null,
    // hidden + unverified — the public lookup would never return this
    verificationLevel: 'unverified',
    publicStatus: 'hidden',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    contact: null,
    schedule: null,
    manager: null,
    accepts: [],
    country: null,
    city: null,
    provenance: null,
    isFinalRecipient: false,
    recipientType: null,
    disputed: false,
    disputedAt: null,
    items: [
      SupplyLine.create({
        name: 'Agua',
        quantity: 100,
        unit: 'L',
        category: Category.Water,
      }).toSnapshot(),
      SupplyLine.create({
        name: 'Agua embotellada',
        quantity: 50,
        unit: 'L',
        category: Category.Water,
      }).toSnapshot(),
    ],
  });
}

function repo(found: ResourceWithEmergency | null): ResourceRepository {
  return {
    findByIdForAdmin: () => Promise.resolve(found),
  } as unknown as ResourceRepository;
}

function reportsRepo(
  reports: ResourceValidityReport[],
): ResourceValidityReportRepository {
  return {
    findByResource: () => Promise.resolve(reports),
  } as unknown as ResourceValidityReportRepository;
}

describe('GetResourceAdminDetail', () => {
  it('returns a hidden/unverified resource with aggregated inventory + reports', async () => {
    const r = hiddenResourceWithInventory();
    const report = ResourceValidityReport.open({
      id: '33333333-3333-4333-8333-333333333333',
      resourceId: RESOURCE_ID,
      emergencyId: EM,
      reporterUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      reason: ValidityReason.Closed,
    });

    const result = await new GetResourceAdminDetail(
      repo({ resource: r, emergencyName: 'Terremoto' }),
      reportsRepo([report]),
    ).execute({ resourceId: RESOURCE_ID });

    expect(result).not.toBeNull();
    expect(result!.resource).toMatchObject({
      id: RESOURCE_ID,
      emergencyId: EM,
      emergencyName: 'Terremoto',
      publicStatus: 'hidden',
      verificationLevel: 'unverified',
    });
    // inventory aggregated to DISTINCT categories (two water lines → one)
    expect(result!.resource.inventoryCategories).toEqual([Category.Water]);
    expect(result!.validityReports).toHaveLength(1);
    expect(result!.validityReports[0]?.reason).toBe(ValidityReason.Closed);
  });

  it('returns null when the resource does not exist', async () => {
    const result = await new GetResourceAdminDetail(
      repo(null),
      reportsRepo([]),
    ).execute({ resourceId: RESOURCE_ID });

    expect(result).toBeNull();
  });
});
