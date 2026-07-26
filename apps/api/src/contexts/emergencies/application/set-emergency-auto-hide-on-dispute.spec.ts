import { SetEmergencyAutoHideOnDispute } from './set-emergency-auto-hide-on-dispute';
import { EmergencyNotFoundError } from './emergency-not-found.error';
import { Emergency } from '../domain/emergency';
import { EmergencyStatus } from '../domain/emergency-status';
import { EmergencyRepository } from '../domain/ports/emergency.repository';

const SNAP = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Terremoto Venezuela 2026',
  slug: 'terremoto-venezuela-2026',
  country: 'VE',
  status: EmergencyStatus.Active,
  announcement: null,
  dontBringList: [],
  resourceDisputeThreshold: null,
  autoHideOnDispute: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function makeRepo(emergency: Emergency | null): {
  repo: EmergencyRepository;
  saveMock: jest.Mock;
  saved: () => Emergency | null;
} {
  let saved: Emergency | null = null;
  const saveMock = jest.fn((e: Emergency) => {
    saved = e;
    return Promise.resolve();
  });
  const repo: EmergencyRepository = {
    save: saveMock,
    findById: jest.fn().mockResolvedValue(emergency),
    findBySlug: jest.fn().mockResolvedValue(null),
    findByIds: jest.fn().mockResolvedValue([]),
    listActive: jest.fn().mockResolvedValue([]),
  };
  return { repo, saveMock, saved: () => saved };
}

describe('SetEmergencyAutoHideOnDispute', () => {
  it('turns the policy on (#171)', async () => {
    const emergency = Emergency.fromSnapshot(SNAP);
    const { repo, saveMock, saved } = makeRepo(emergency);

    await new SetEmergencyAutoHideOnDispute(repo).execute({
      emergencyId: SNAP.id,
      enabled: true,
    });

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saved()!.autoHideOnDispute).toBe(true);
  });

  it('turns the policy back off', async () => {
    const emergency = Emergency.fromSnapshot({
      ...SNAP,
      autoHideOnDispute: true,
    });
    const { repo, saved } = makeRepo(emergency);

    await new SetEmergencyAutoHideOnDispute(repo).execute({
      emergencyId: SNAP.id,
      enabled: false,
    });

    expect(saved()!.autoHideOnDispute).toBe(false);
  });

  it('lanza EmergencyNotFoundError si la emergencia no existe', async () => {
    const { repo, saveMock } = makeRepo(null);

    await expect(
      new SetEmergencyAutoHideOnDispute(repo).execute({
        emergencyId: SNAP.id,
        enabled: true,
      }),
    ).rejects.toBeInstanceOf(EmergencyNotFoundError);
    expect(saveMock).not.toHaveBeenCalled();
  });
});
