import { InMemoryNeedRepository } from '../infrastructure/in-memory-need.repository';
import { GetNeedsInBounds } from './get-needs-in-bounds';
import { Need } from '../domain/need';
import { NeedId } from '../domain/need-id';
import { SupplyLine } from '../../supplies/domain/supply-line';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Priority, Category } from '../domain/need-enums';
import { Location } from '../../../shared/domain/location';

const EM = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const USER_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

// A bounding box around Caracas.
const BOX = {
  minLat: 10.3,
  minLng: -67.2,
  maxLat: 10.7,
  maxLng: -66.6,
  limit: 500,
};

function makeNeed(
  title: string,
  lat: number,
  lng: number,
  validate = true,
): Need {
  const need = Need.create({
    id: NeedId.create(),
    emergencyId: EmergencyId.fromString(EM),
    title,
    description: null,
    location: Location.create({
      address: `${title} address`,
      latitude: lat,
      longitude: lng,
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
  if (validate) need.validate();
  return need;
}

describe('GetNeedsInBounds', () => {
  it('returns validated needs inside the bounding box', async () => {
    const repo = new InMemoryNeedRepository();
    const useCase = new GetNeedsInBounds(repo);

    await repo.save(makeNeed('Inside', 10.48, -66.9));

    const result = await useCase.execute({ emergencyId: EM, ...BOX });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Inside');
    expect(result.items[0].items).toHaveLength(1);
  });

  it('excludes needs whose coordinates fall outside the box', async () => {
    const repo = new InMemoryNeedRepository();
    const useCase = new GetNeedsInBounds(repo);

    await repo.save(makeNeed('Inside', 10.48, -66.9));
    await repo.save(makeNeed('Far north', 12.5, -66.9));
    await repo.save(makeNeed('Far west', 10.48, -70.0));

    const result = await useCase.execute({ emergencyId: EM, ...BOX });

    expect(result.items.map((n) => n.title)).toEqual(['Inside']);
  });

  it('excludes needs that are not validated (e.g. pending)', async () => {
    const repo = new InMemoryNeedRepository();
    const useCase = new GetNeedsInBounds(repo);

    await repo.save(makeNeed('Validated', 10.48, -66.9));
    await repo.save(makeNeed('Pending', 10.49, -66.91, false));

    const result = await useCase.execute({ emergencyId: EM, ...BOX });

    expect(result.items.map((n) => n.title)).toEqual(['Validated']);
  });

  it('caps the number of results at the given limit', async () => {
    const repo = new InMemoryNeedRepository();
    const useCase = new GetNeedsInBounds(repo);

    for (let i = 0; i < 5; i++) {
      await repo.save(makeNeed(`Need ${i}`, 10.48 + i * 0.001, -66.9));
    }

    const result = await useCase.execute({ emergencyId: EM, ...BOX, limit: 3 });

    expect(result.items).toHaveLength(3);
  });
});
