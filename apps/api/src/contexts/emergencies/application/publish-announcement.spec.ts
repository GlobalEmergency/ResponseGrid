import { PublishAnnouncement } from './publish-announcement';
import { InMemoryEmergencyRepository } from '../infrastructure/in-memory-emergency.repository';
import { CreateEmergency } from './create-emergency';
import { PauseEmergency } from './pause-emergency';
import { EmergencyNotFoundError } from './emergency-not-found.error';
import { EmergencyId } from '../../../shared/domain/emergency-id';

async function createAndGetId(
  repo: InMemoryEmergencyRepository,
): Promise<string> {
  const createUC = new CreateEmergency(repo);
  const result = await createUC.execute({
    name: 'Announcement Test',
    country: 'ES',
  });
  return result.id;
}

describe('PublishAnnouncement', () => {
  it('sets the announcement on an active emergency', async () => {
    const repo = new InMemoryEmergencyRepository();
    const id = await createAndGetId(repo);
    const useCase = new PublishAnnouncement(repo);

    await useCase.execute({ emergencyId: id, message: 'All roads are clear.' });

    const saved = await repo.findById(EmergencyId.fromString(id));
    expect(saved?.announcement).toBe('All roads are clear.');
  });

  it('sets the announcement on a paused emergency', async () => {
    const repo = new InMemoryEmergencyRepository();
    const id = await createAndGetId(repo);
    await new PauseEmergency(repo).execute({ emergencyId: id });
    const useCase = new PublishAnnouncement(repo);

    await useCase.execute({
      emergencyId: id,
      message: 'Operations suspended.',
    });

    const saved = await repo.findById(EmergencyId.fromString(id));
    expect(saved?.announcement).toBe('Operations suspended.');
  });

  it('replaces a previous announcement', async () => {
    const repo = new InMemoryEmergencyRepository();
    const id = await createAndGetId(repo);
    const useCase = new PublishAnnouncement(repo);

    await useCase.execute({ emergencyId: id, message: 'First message' });
    await useCase.execute({ emergencyId: id, message: 'Updated message' });

    const saved = await repo.findById(EmergencyId.fromString(id));
    expect(saved?.announcement).toBe('Updated message');
  });

  it('throws EmergencyNotFoundError for unknown id', async () => {
    const repo = new InMemoryEmergencyRepository();
    const useCase = new PublishAnnouncement(repo);

    await expect(
      useCase.execute({
        emergencyId: '00000000-0000-4000-8000-000000000000',
        message: 'msg',
      }),
    ).rejects.toThrow(EmergencyNotFoundError);
  });
});
