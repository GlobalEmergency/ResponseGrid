import { InMemoryNeedRepository } from '../infrastructure/in-memory-need.repository';
import { GetPublicNeeds } from './get-public-needs';
import { Need } from '../domain/need';
import { NeedId } from '../domain/need-id';
import { SupplyLine } from '../../supplies/domain/supply-line';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Priority, Category } from '../domain/need-enums';
import { Location } from '../../../shared/domain/location';

const EM = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const USER_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

function makeValidated(title: string): Need {
  const need = Need.create({
    id: NeedId.create(),
    emergencyId: EmergencyId.fromString(EM),
    title,
    description: null,
    location: Location.create({
      address: `${title} address`,
      latitude: 10.48,
      longitude: -66.9,
    }),
    priority: Priority.High,
    requesterUserId: USER_ID,
    requesterOrganizationId: null,
    items: [
      SupplyLine.create({
        name: 'Water',
        quantity: 10,
        unit: 'liters',
        category: Category.Water,
      }),
    ],
  });
  need.validate();
  return need;
}

describe('GetPublicNeeds pagination', () => {
  it('returns the full validated set when no limit is supplied', async () => {
    const repo = new InMemoryNeedRepository();
    const useCase = new GetPublicNeeds(repo);
    for (let i = 0; i < 5; i++) await repo.save(makeValidated(`N${i}`));

    const all = await useCase.execute({ emergencyId: EM });

    expect(all).toHaveLength(5);
  });

  it('windows results with limit/offset without gaps or overlaps', async () => {
    const repo = new InMemoryNeedRepository();
    const useCase = new GetPublicNeeds(repo);
    for (let i = 0; i < 5; i++) await repo.save(makeValidated(`N${i}`));

    const page1 = await useCase.execute({
      emergencyId: EM,
      limit: 2,
      offset: 0,
    });
    const page2 = await useCase.execute({
      emergencyId: EM,
      limit: 2,
      offset: 2,
    });
    const page3 = await useCase.execute({
      emergencyId: EM,
      limit: 2,
      offset: 4,
    });

    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    expect(page3).toHaveLength(1);

    const ids = [...page1, ...page2, ...page3].map((n) => n.id);
    expect(new Set(ids).size).toBe(5); // no duplicates across pages
  });

  it('defaults offset to 0 when only a limit is given', async () => {
    const repo = new InMemoryNeedRepository();
    const useCase = new GetPublicNeeds(repo);
    for (let i = 0; i < 3; i++) await repo.save(makeValidated(`N${i}`));

    const firstTwo = await useCase.execute({ emergencyId: EM, limit: 2 });

    expect(firstTwo).toHaveLength(2);
  });
});
