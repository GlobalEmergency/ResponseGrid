import { RegisterSighting } from './register-sighting';
import { CreateMissingPersonReport } from './create-missing-person-report';
import { InMemoryMissingPersonReportRepository } from './in-memory-missing-person-report.repository';
import { ReunificationEmergencyStatusReader } from '../domain/ports/reunification-emergency-status-reader';
import { MissingPersonStatus } from '../domain/missing-person-status';
import { SightingsClosedError } from '../domain/missing-person-report-errors';
import { UpdateReportStatus } from './update-report-status';

const EMERGENCY_ID = 'cccccccc-0000-4000-8000-000000000001';

const BASE_CREATE_CMD = {
  emergencyId: EMERGENCY_ID,
  person: {
    firstName: 'Sara',
    lastName: 'Martínez',
    documentId: null,
    approximateAge: null,
    lastKnownLocation: 'Calle Colón',
    lastKnownCoords: null,
    description: null,
  },
  reporter: {
    userId: 'user-1',
    name: 'Luis Martínez',
    phone: '+34622333444',
    email: null,
  },
  consentGiven: true,
};

class StubStatusReader implements ReunificationEmergencyStatusReader {
  getStatus(_id: string): Promise<string | null> {
    return Promise.resolve('active');
  }
}

describe('RegisterSighting', () => {
  it('adds a sighting to an open report', async () => {
    const repo = new InMemoryMissingPersonReportRepository();
    const createUc = new CreateMissingPersonReport(
      repo,
      new StubStatusReader(),
    );
    const { id: reportId } = await createUc.execute(BASE_CREATE_CMD);

    const sightingUc = new RegisterSighting(repo);
    const result = await sightingUc.execute({
      reportId,
      reportedByUserId: 'user-2',
      reportedByName: null,
      location: 'Plaza de la Reina',
      coords: null,
      note: 'Visto a las 10am',
    });
    expect(result.sightingId).toBeDefined();
  });

  it('throws SightingsClosedError when report is matched', async () => {
    const repo = new InMemoryMissingPersonReportRepository();
    const createUc = new CreateMissingPersonReport(
      repo,
      new StubStatusReader(),
    );
    const { id: reportId } = await createUc.execute(BASE_CREATE_CMD);

    const updateUc = new UpdateReportStatus(repo);
    await updateUc.execute({
      reportId,
      status: MissingPersonStatus.UnderReview,
      reviewedByUserId: 'coord',
    });
    await updateUc.execute({
      reportId,
      status: MissingPersonStatus.Matched,
      reviewedByUserId: 'coord',
      matchNote: 'Encontrada',
    });

    const sightingUc = new RegisterSighting(repo);
    await expect(
      sightingUc.execute({
        reportId,
        reportedByUserId: 'user-2',
        reportedByName: null,
        location: 'Otro sitio',
        coords: null,
        note: 'tarde',
      }),
    ).rejects.toThrow(SightingsClosedError);
  });
});
