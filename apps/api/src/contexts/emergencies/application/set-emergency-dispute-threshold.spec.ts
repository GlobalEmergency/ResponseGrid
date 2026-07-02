import { SetEmergencyDisputeThreshold } from './set-emergency-dispute-threshold';
import { EmergencyNotFoundError } from './emergency-not-found.error';
import { Emergency } from '../domain/emergency';
import { EmergencyStatus } from '../domain/emergency-status';
import { InvalidDisputeThresholdError } from '../domain/invalid-dispute-threshold.error';
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

describe('SetEmergencyDisputeThreshold', () => {
  it('persiste el umbral cuando se pasa un valor positivo', async () => {
    const emergency = Emergency.fromSnapshot(SNAP);
    const { repo, saveMock, saved } = makeRepo(emergency);

    await new SetEmergencyDisputeThreshold(repo).execute({
      emergencyId: SNAP.id,
      threshold: 5,
    });

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saved()!.resourceDisputeThreshold).toBe(5);
  });

  it('limpia el umbral cuando se pasa null (vuelve al global)', async () => {
    const emergency = Emergency.fromSnapshot({
      ...SNAP,
      resourceDisputeThreshold: 5,
    });
    const { repo, saved } = makeRepo(emergency);

    await new SetEmergencyDisputeThreshold(repo).execute({
      emergencyId: SNAP.id,
      threshold: null,
    });

    expect(saved()!.resourceDisputeThreshold).toBeNull();
  });

  it('propaga el error de dominio y no persiste con un umbral inválido', async () => {
    const emergency = Emergency.fromSnapshot(SNAP);
    const { repo, saveMock } = makeRepo(emergency);

    await expect(
      new SetEmergencyDisputeThreshold(repo).execute({
        emergencyId: SNAP.id,
        threshold: 0,
      }),
    ).rejects.toBeInstanceOf(InvalidDisputeThresholdError);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('lanza EmergencyNotFoundError si la emergencia no existe', async () => {
    const { repo, saveMock } = makeRepo(null);

    await expect(
      new SetEmergencyDisputeThreshold(repo).execute({
        emergencyId: SNAP.id,
        threshold: 5,
      }),
    ).rejects.toBeInstanceOf(EmergencyNotFoundError);
    expect(saveMock).not.toHaveBeenCalled();
  });
});
