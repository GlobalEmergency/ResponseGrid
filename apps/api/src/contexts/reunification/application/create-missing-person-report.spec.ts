import { CreateMissingPersonReport } from './create-missing-person-report';
import { InMemoryMissingPersonReportRepository } from './in-memory-missing-person-report.repository';
import { ReunificationEmergencyStatusReader } from '../domain/ports/reunification-emergency-status-reader';
import { MissingPersonStatus } from '../domain/missing-person-status';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';
import { ConsentRequiredError } from '../domain/missing-person-report-errors';

const EMERGENCY_ID = 'bbbbbbbb-0000-4000-8000-000000000001';

const BASE_CMD = {
  emergencyId: EMERGENCY_ID,
  person: {
    firstName: 'Ana',
    lastName: 'López',
    documentId: null,
    approximateAge: 35,
    lastKnownLocation: 'Avenida del Puerto',
    lastKnownCoords: null,
    description: null,
  },
  reporter: {
    userId: null,
    name: 'Pedro López',
    phone: '+34611222333',
    email: null,
  },
  consentGiven: true,
};

class StubStatusReader implements ReunificationEmergencyStatusReader {
  constructor(private readonly status: string | null) {}
  getStatus(_id: string): Promise<string | null> {
    return Promise.resolve(this.status);
  }
}

describe('CreateMissingPersonReport', () => {
  it('creates a report in open status for an active emergency', async () => {
    const repo = new InMemoryMissingPersonReportRepository();
    const uc = new CreateMissingPersonReport(
      repo,
      new StubStatusReader('active'),
    );
    const result = await uc.execute(BASE_CMD);
    expect(result.id).toBeDefined();
    expect(result.status).toBe(MissingPersonStatus.Open);
  });

  it('throws EmergencyNotAcceptingIntakeError for paused emergency', async () => {
    const repo = new InMemoryMissingPersonReportRepository();
    const uc = new CreateMissingPersonReport(
      repo,
      new StubStatusReader('paused'),
    );
    await expect(uc.execute(BASE_CMD)).rejects.toThrow(
      EmergencyNotAcceptingIntakeError,
    );
  });

  it('throws EmergencyNotAcceptingIntakeError for closed emergency', async () => {
    const repo = new InMemoryMissingPersonReportRepository();
    const uc = new CreateMissingPersonReport(
      repo,
      new StubStatusReader('closed'),
    );
    await expect(uc.execute(BASE_CMD)).rejects.toThrow(
      EmergencyNotAcceptingIntakeError,
    );
  });

  it('throws ConsentRequiredError when consentGiven is false', async () => {
    const repo = new InMemoryMissingPersonReportRepository();
    const uc = new CreateMissingPersonReport(
      repo,
      new StubStatusReader('active'),
    );
    await expect(
      uc.execute({ ...BASE_CMD, consentGiven: false }),
    ).rejects.toThrow(ConsentRequiredError);
  });
});
