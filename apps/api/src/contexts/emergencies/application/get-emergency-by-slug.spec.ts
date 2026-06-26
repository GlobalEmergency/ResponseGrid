import { GetEmergencyBySlug } from './get-emergency-by-slug';
import { InMemoryEmergencyRepository } from '../infrastructure/in-memory-emergency.repository';
import { Emergency } from '../domain/emergency';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Slug } from '../domain/slug';

describe('GetEmergencyBySlug', () => {
  it('returns EmergencyView when found', async () => {
    const repo = new InMemoryEmergencyRepository();
    const emergency = Emergency.create({
      id: EmergencyId.create(),
      name: 'Earthquake Relief',
      slug: Slug.fromString('earthquake-relief'),
      country: 'JP',
    });
    await repo.save(emergency);

    const useCase = new GetEmergencyBySlug(repo);
    const view = await useCase.execute({ slug: 'earthquake-relief' });

    expect(view).not.toBeNull();
    expect(view!.slug).toBe('earthquake-relief');
    expect(view!.name).toBe('Earthquake Relief');
    expect(view!.country).toBe('JP');
    expect(view!.status).toBe('active');
  });

  it('returns null when not found', async () => {
    const repo = new InMemoryEmergencyRepository();
    const useCase = new GetEmergencyBySlug(repo);

    const view = await useCase.execute({ slug: 'nonexistent-slug' });

    expect(view).toBeNull();
  });

  it('throws when slug format is invalid', async () => {
    const repo = new InMemoryEmergencyRepository();
    const useCase = new GetEmergencyBySlug(repo);

    await expect(
      useCase.execute({ slug: 'INVALID SLUG!' }),
    ).rejects.toThrow('Invalid slug');
  });
});
