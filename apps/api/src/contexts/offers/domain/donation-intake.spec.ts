import { DonationIntake, generateIntakeCode } from './donation-intake';
import { DonationIntakeId } from './donation-intake-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { NeedCategory } from './offer-enums';
import { DonationIntakeStatus } from './donation-intake-enums';
import {
  DonationIntakeAlreadyProcessedError,
  DonationIntakeLineLimitError,
} from './donation-intake-errors';
import { InvalidDonationIntakeContactError } from './donation-intake-errors';

const EM = '11111111-1111-4111-8111-111111111111';
const RESOURCE = '33333333-3333-4333-8333-333333333331';

function makeLine(overrides?: { quantity?: number }) {
  return {
    category: NeedCategory.Food,
    description: 'Arroz 1kg',
    quantity: overrides?.quantity ?? 10,
    unit: 'bolsas',
    notes: null,
    sortOrder: 0,
  };
}

function makeIntake() {
  return DonationIntake.create({
    id: DonationIntakeId.create(),
    emergencyId: EmergencyId.fromString(EM),
    targetResourceId: RESOURCE,
    intakeCode: 'ACO-7F3K',
    donor: {
      donorName: 'María López',
      donorPhone: '+52 55 1234 5678',
      donorEmail: null,
    },
    donorUserId: null,
    lines: [makeLine()],
  });
}

describe('DonationIntake aggregate', () => {
  it('creates with pending status and lines', () => {
    const intake = makeIntake();
    expect(intake.status).toBe(DonationIntakeStatus.Pending);
    expect(intake.lines).toHaveLength(1);
    expect(intake.intakeCode).toBe('ACO-7F3K');
    expect(intake.contactNormalized).toBe('525512345678');
  });

  it('create() throws when no lines', () => {
    expect(() =>
      DonationIntake.create({
        id: DonationIntakeId.create(),
        emergencyId: EmergencyId.fromString(EM),
        targetResourceId: RESOURCE,
        intakeCode: 'ACO-AAAA',
        donor: {
          donorName: 'Test',
          donorPhone: '123',
          donorEmail: null,
        },
        donorUserId: null,
        lines: [],
      }),
    ).toThrow('Donation intake requires at least one line');
  });

  it('create() throws when line quantity is 0', () => {
    expect(() =>
      DonationIntake.create({
        id: DonationIntakeId.create(),
        emergencyId: EmergencyId.fromString(EM),
        targetResourceId: RESOURCE,
        intakeCode: 'ACO-AAAA',
        donor: {
          donorName: 'Test',
          donorPhone: '123',
          donorEmail: null,
        },
        donorUserId: null,
        lines: [makeLine({ quantity: 0 })],
      }),
    ).toThrow('Line quantity must be greater than 0');
  });

  it('create() throws when contact is missing', () => {
    expect(() =>
      DonationIntake.create({
        id: DonationIntakeId.create(),
        emergencyId: EmergencyId.fromString(EM),
        targetResourceId: RESOURCE,
        intakeCode: 'ACO-AAAA',
        donor: {
          donorName: 'Test',
          donorPhone: null,
          donorEmail: null,
        },
        donorUserId: null,
        lines: [makeLine()],
      }),
    ).toThrow(InvalidDonationIntakeContactError);
  });

  it('updateContent() replaces donor and lines while pending', () => {
    const intake = makeIntake();
    intake.updateContent(
      {
        donorName: 'María Actualizada',
        donorPhone: '+52 55 1234 5678',
        donorEmail: 'maria@example.com',
      },
      [
        makeLine(),
        {
          category: NeedCategory.Water,
          description: 'Agua 500ml',
          quantity: 5,
          unit: 'cajas',
          notes: null,
          sortOrder: 1,
        },
      ],
    );
    expect(intake.donorName).toBe('María Actualizada');
    expect(intake.donorEmail).toBe('maria@example.com');
    expect(intake.lines).toHaveLength(2);
  });

  it('confirmReception() transitions pending → received', () => {
    const intake = makeIntake();
    intake.confirmReception('user-1', 'Todo OK', 'photo.jpg');
    expect(intake.status).toBe(DonationIntakeStatus.Received);
    expect(intake.receivedByUserId).toBe('user-1');
    expect(intake.evidenceFileKey).toBe('photo.jpg');
    expect(intake.receivedAt).toBeInstanceOf(Date);
  });

  it('reject() transitions pending → rejected', () => {
    const intake = makeIntake();
    intake.reject('Artículos no permitidos');
    expect(intake.status).toBe(DonationIntakeStatus.Rejected);
    expect(intake.volunteerNotes).toBe('Artículos no permitidos');
  });

  it('markIncomplete() transitions pending → incomplete', () => {
    const intake = makeIntake();
    intake.markIncomplete('Faltaron bolsas');
    expect(intake.status).toBe(DonationIntakeStatus.Incomplete);
  });

  it('throws when mutating a processed intake', () => {
    const intake = makeIntake();
    intake.confirmReception('user-1', null, null);
    expect(() =>
      intake.updateContent(
        {
          donorName: 'X',
          donorPhone: '1',
          donorEmail: null,
        },
        [makeLine()],
      ),
    ).toThrow(DonationIntakeAlreadyProcessedError);
  });

  it('round-trips through snapshot', () => {
    const intake = makeIntake();
    intake.confirmReception('user-1', 'ok', null);
    const restored = DonationIntake.fromSnapshot(intake.toSnapshot());
    expect(restored.toSnapshot()).toEqual(intake.toSnapshot());
  });
});

describe('generateIntakeCode', () => {
  it('returns ACO- prefix with 4 chars', () => {
    const code = generateIntakeCode();
    expect(code).toMatch(/^ACO-[A-Z2-9]{4}$/);
  });
});

describe('DonationIntake line limit', () => {
  it('throws when exceeding MAX lines', () => {
    const lines = Array.from({ length: 101 }, (_, i) => ({
      category: NeedCategory.Food,
      description: `Item ${i}`,
      quantity: 1,
      unit: null,
      notes: null,
      sortOrder: i,
    }));
    expect(() =>
      DonationIntake.create({
        id: DonationIntakeId.create(),
        emergencyId: EmergencyId.fromString(EM),
        targetResourceId: RESOURCE,
        intakeCode: 'ACO-ZZZZ',
        donor: {
          donorName: 'Test',
          donorPhone: '123',
          donorEmail: null,
        },
        donorUserId: null,
        lines,
      }),
    ).toThrow(DonationIntakeLineLimitError);
  });
});
