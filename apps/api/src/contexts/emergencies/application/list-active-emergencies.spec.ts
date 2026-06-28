import { ListActiveEmergencies } from './list-active-emergencies';
import { InMemoryEmergencyRepository } from '../infrastructure/in-memory-emergency.repository';
import { Emergency } from '../domain/emergency';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Slug } from '../domain/slug';
import { EmergencyStatus } from '../domain/emergency-status';

describe('ListActiveEmergencies', () => {
  it('returns only active emergencies as EmergencyView', async () => {
    const repo = new InMemoryEmergencyRepository();

    const active = Emergency.create({
      id: EmergencyId.create(),
      name: 'Active Relief',
      slug: Slug.fromString('active-relief'),
      country: 'US',
    });
    await repo.save(active);

    const closed = Emergency.fromSnapshot({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Closed Relief',
      slug: 'closed-relief',
      country: 'ES',
      status: EmergencyStatus.Closed,
      announcement: null,
      dontBringList: [],
      recommendedList: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repo.save(closed);

    const useCase = new ListActiveEmergencies(repo);
    const views = await useCase.execute();

    expect(views).toHaveLength(1);
    expect(views[0].slug).toBe('active-relief');
    expect(views[0].status).toBe('active');
    expect(views[0].name).toBe('Active Relief');
    expect(views[0].country).toBe('US');
  });

  it('returns empty list when no active emergencies', async () => {
    const repo = new InMemoryEmergencyRepository();
    const useCase = new ListActiveEmergencies(repo);

    const views = await useCase.execute();

    expect(views).toEqual([]);
  });

  it('returns correct EmergencyView shape', async () => {
    const repo = new InMemoryEmergencyRepository();
    const emergency = Emergency.create({
      id: EmergencyId.create(),
      name: 'Shape Test',
      slug: Slug.fromString('shape-test'),
      country: 'FR',
    });
    await repo.save(emergency);

    const useCase = new ListActiveEmergencies(repo);
    const views = await useCase.execute();

    const v = views[0];
    expect(typeof v.id).toBe('string');
    expect(v.name).toBe('Shape Test');
    expect(v.slug).toBe('shape-test');
    expect(v.country).toBe('FR');
    expect(v.status).toBe('active');
  });
});
