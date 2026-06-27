import {
  GrantAccreditation,
  AccreditationAlreadyExistsError,
} from './grant-accreditation';
import { InMemoryAccreditationRepository } from '../infrastructure/in-memory-accreditation.repository';

describe('GrantAccreditation use case', () => {
  let repo: InMemoryAccreditationRepository;
  let useCase: GrantAccreditation;

  beforeEach(() => {
    repo = new InMemoryAccreditationRepository();
    useCase = new GrantAccreditation(repo);
  });

  it('grants a global accreditation and returns an id', async () => {
    const result = await useCase.execute({
      organizationId: 'org-1',
      scope: 'global',
      grantedByUserId: 'admin-1',
      evidence: 'UN certified',
    });
    expect(result.id).toBeDefined();
    const stored = await repo.findById(result.id);
    expect(stored).not.toBeNull();
    expect(stored!.scope.isGlobal).toBe(true);
    expect(stored!.evidence).toBe('UN certified');
  });

  it('grants an emergency-scoped accreditation', async () => {
    const result = await useCase.execute({
      organizationId: 'org-2',
      scope: { emergencyId: 'em-42' },
      grantedByUserId: 'admin-1',
    });
    const stored = await repo.findById(result.id);
    expect(stored!.scope.emergencyId).toBe('em-42');
    expect(stored!.evidence).toBeNull();
  });

  it('the repo reflects isAccredited after grant', async () => {
    await useCase.execute({
      organizationId: 'org-3',
      scope: { emergencyId: 'em-1' },
      grantedByUserId: 'admin-1',
    });
    expect(await repo.isAccredited('org-3', 'em-1')).toBe(true);
    expect(await repo.isAccredited('org-3', 'em-999')).toBe(false);
  });

  describe('duplicate accreditation guard (bug fix)', () => {
    it('throws AccreditationAlreadyExistsError on second global grant for same org', async () => {
      await useCase.execute({
        organizationId: 'org-dup',
        scope: 'global',
        grantedByUserId: 'admin-1',
      });
      await expect(
        useCase.execute({
          organizationId: 'org-dup',
          scope: 'global',
          grantedByUserId: 'admin-1',
        }),
      ).rejects.toThrow(AccreditationAlreadyExistsError);
    });

    it('throws AccreditationAlreadyExistsError on second emergency-scoped grant for same org+emergency', async () => {
      await useCase.execute({
        organizationId: 'org-dup2',
        scope: { emergencyId: 'em-77' },
        grantedByUserId: 'admin-1',
      });
      await expect(
        useCase.execute({
          organizationId: 'org-dup2',
          scope: { emergencyId: 'em-77' },
          grantedByUserId: 'admin-1',
        }),
      ).rejects.toThrow(AccreditationAlreadyExistsError);
    });

    it('allows emergency-scoped grant for a different emergency after one already exists', async () => {
      await useCase.execute({
        organizationId: 'org-multi',
        scope: { emergencyId: 'em-1' },
        grantedByUserId: 'admin-1',
      });
      const result = await useCase.execute({
        organizationId: 'org-multi',
        scope: { emergencyId: 'em-2' },
        grantedByUserId: 'admin-1',
      });
      expect(result.id).toBeDefined();
    });
  });
});
