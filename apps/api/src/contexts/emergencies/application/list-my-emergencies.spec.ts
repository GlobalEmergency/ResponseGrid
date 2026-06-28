import { ListMyEmergencies, PrincipalGrant } from './list-my-emergencies';
import { InMemoryEmergencyRepository } from '../infrastructure/in-memory-emergency.repository';
import { Emergency } from '../domain/emergency';
import { EmergencyStatus } from '../domain/emergency-status';

const VE_ID = '11111111-1111-4111-8111-111111111111';
const PAUSED_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_ID = '33333333-3333-4333-8333-333333333333';

function grant(
  scopeId: string,
  roleId = 'emergency_verifier',
  expiresAt: string | null = null,
): PrincipalGrant {
  return { roleId, scope: { type: 'emergency', id: scopeId }, expiresAt };
}

describe('ListMyEmergencies', () => {
  async function seed(): Promise<InMemoryEmergencyRepository> {
    const repo = new InMemoryEmergencyRepository();

    const active = Emergency.fromSnapshot({
      id: VE_ID,
      name: 'Terremoto Venezuela 2026',
      slug: 'terremoto-venezuela-2026',
      country: 'VE',
      status: EmergencyStatus.Active,
      announcement: null,
      dontBringList: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repo.save(active);

    const paused = Emergency.fromSnapshot({
      id: PAUSED_ID,
      name: 'Inundación paused',
      slug: 'inundacion-paused',
      country: 'ES',
      status: EmergencyStatus.Paused,
      announcement: null,
      dontBringList: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repo.save(paused);

    return repo;
  }

  it('resolves an emergency-scoped grant to its view with roleIds', async () => {
    const repo = await seed();
    const useCase = new ListMyEmergencies(repo);

    const views = await useCase.execute([grant(VE_ID)]);

    expect(views).toHaveLength(1);
    expect(views[0].id).toBe(VE_ID);
    expect(views[0].slug).toBe('terremoto-venezuela-2026');
    expect(views[0].roleIds).toEqual(['emergency_verifier']);
  });

  it('includes PAUSED emergencies (unlike listActive)', async () => {
    const repo = await seed();
    const useCase = new ListMyEmergencies(repo);

    const views = await useCase.execute([grant(PAUSED_ID)]);

    expect(views).toHaveLength(1);
    expect(views[0].id).toBe(PAUSED_ID);
    expect(views[0].status).toBe('paused');
  });

  it('dedupes multiple roles at the same emergency scope', async () => {
    const repo = await seed();
    const useCase = new ListMyEmergencies(repo);

    const views = await useCase.execute([
      grant(VE_ID, 'emergency_verifier'),
      grant(VE_ID, 'emergency_coordinator'),
    ]);

    expect(views).toHaveLength(1);
    expect(views[0].roleIds).toEqual([
      'emergency_verifier',
      'emergency_coordinator',
    ]);
  });

  it('ignores non-emergency grants', async () => {
    const repo = await seed();
    const useCase = new ListMyEmergencies(repo);

    const views = await useCase.execute([
      {
        roleId: 'org_admin',
        scope: { type: 'organization', id: OTHER_ID },
        expiresAt: null,
      },
      {
        roleId: 'platform_admin',
        scope: { type: 'platform' },
        expiresAt: null,
      },
    ]);

    expect(views).toEqual([]);
  });

  it('ignores expired grants', async () => {
    const repo = await seed();
    const useCase = new ListMyEmergencies(repo);
    const past = new Date(Date.now() - 60_000).toISOString();

    const views = await useCase.execute([
      grant(VE_ID, 'emergency_verifier', past),
    ]);

    expect(views).toEqual([]);
  });

  it('omits grants pointing at unknown emergencies', async () => {
    const repo = await seed();
    const useCase = new ListMyEmergencies(repo);

    const views = await useCase.execute([grant(OTHER_ID)]);

    expect(views).toEqual([]);
  });

  it('returns empty list when the principal has no grants', async () => {
    const repo = await seed();
    const useCase = new ListMyEmergencies(repo);

    const views = await useCase.execute([]);

    expect(views).toEqual([]);
  });
});
