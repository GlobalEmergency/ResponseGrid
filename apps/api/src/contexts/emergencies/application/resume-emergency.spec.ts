import { ResumeEmergency } from './resume-emergency';
import { PauseEmergency } from './pause-emergency';
import { InMemoryEmergencyRepository } from '../infrastructure/in-memory-emergency.repository';
import { CreateEmergency } from './create-emergency';
import { EmergencyNotFoundError } from './emergency-not-found.error';
import { InvalidEmergencyTransitionError } from '../domain/invalid-emergency-transition.error';
import { EmergencyStatus } from '../domain/emergency-status';
import { EmergencyId } from '../../../shared/domain/emergency-id';

async function createAndGetId(
  repo: InMemoryEmergencyRepository,
): Promise<string> {
  const createUC = new CreateEmergency(repo);
  const result = await createUC.execute({
    name: 'Test Emergency',
    country: 'ES',
  });
  return result.id;
}

describe('ResumeEmergency', () => {
  it('resumes a paused emergency', async () => {
    const repo = new InMemoryEmergencyRepository();
    const id = await createAndGetId(repo);
    await new PauseEmergency(repo).execute({ emergencyId: id });

    const useCase = new ResumeEmergency(repo);
    await useCase.execute({ emergencyId: id });

    const saved = await repo.findById(EmergencyId.fromString(id));
    expect(saved?.status).toBe(EmergencyStatus.Active);
  });

  it('throws EmergencyNotFoundError for unknown id', async () => {
    const repo = new InMemoryEmergencyRepository();
    const useCase = new ResumeEmergency(repo);

    await expect(
      useCase.execute({ emergencyId: '00000000-0000-4000-8000-000000000000' }),
    ).rejects.toThrow(EmergencyNotFoundError);
  });

  it('throws InvalidEmergencyTransitionError when active (not paused)', async () => {
    const repo = new InMemoryEmergencyRepository();
    const id = await createAndGetId(repo);
    const useCase = new ResumeEmergency(repo);

    await expect(useCase.execute({ emergencyId: id })).rejects.toThrow(
      InvalidEmergencyTransitionError,
    );
  });
});
