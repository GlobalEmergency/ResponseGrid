import { GetResourceFacets } from './get-resource-facets';
import { ResourceRepository } from '../domain/ports/resource.repository';

const EM = '11111111-1111-4111-8111-111111111111';

function makeRepo(overrides: Partial<ResourceRepository> = {}): ResourceRepository {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findPendingByEmergency: jest.fn(),
    findActiveByEmergency: jest.fn(),
    countByEmergencyGroupedByPublicStatus: jest.fn(),
    findByOwnerAndEmergency: jest.fn(),
    findVisibleByEmergency: jest.fn(),
    findByExternal: jest.fn(),
    findVisiblePaged: jest.fn(),
    facets: jest.fn().mockResolvedValue({
      byCategory: { water: 3, food: 2 },
      byCountry: { VE: 2, CO: 1 },
      total: 4,
    }),
    ...overrides,
  } as unknown as ResourceRepository;
}

describe('GetResourceFacets', () => {
  it('delegates to repo.facets and returns the result', async () => {
    const repo = makeRepo();
    const useCase = new GetResourceFacets(repo);

    const result = await useCase.execute({ emergencyId: EM });

    expect(result).toEqual({
      byCategory: { water: 3, food: 2 },
      byCountry: { VE: 2, CO: 1 },
      total: 4,
    });
    expect(repo.facets).toHaveBeenCalledTimes(1);
  });

  it('returns empty facets when no visible resources', async () => {
    const repo = makeRepo({
      facets: jest.fn().mockResolvedValue({ byCategory: {}, byCountry: {}, total: 0 }),
    });
    const useCase = new GetResourceFacets(repo);

    const result = await useCase.execute({ emergencyId: EM });

    expect(result.total).toBe(0);
    expect(result.byCategory).toEqual({});
    expect(result.byCountry).toEqual({});
  });
});
