import { randomBytes } from 'node:crypto';
import { DonationIntakeId } from './donation-intake-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  DonationIntakeStatus,
  MAX_DONATION_INTAKE_LINES,
} from './donation-intake-enums';
import {
  DonationIntakeAlreadyProcessedError,
  DonationIntakeLineLimitError,
} from './donation-intake-errors';
import { IntakeLine, IntakeLineProps, IntakeLineSnapshot } from './intake-line';
import {
  buildDonorContact,
  DonorContactInput,
  DonorContactSnapshot,
} from './donor-contact';
import { DomainEvent } from './events/domain-event';
import { DonationIntakeReceived } from './events/donation-intake-received.event';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface CreateDonationIntakeProps {
  id: DonationIntakeId;
  emergencyId: EmergencyId;
  targetResourceId: string;
  intakeCode: string;
  donor: DonorContactInput;
  donorUserId: string | null;
  lines: IntakeLineProps[];
}

export interface DonationIntakeSnapshot {
  id: string;
  emergencyId: string;
  targetResourceId: string;
  intakeCode: string;
  status: DonationIntakeStatus;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
  donorUserId: string | null;
  contactNormalized: string;
  lines: IntakeLineSnapshot[];
  volunteerNotes: string | null;
  evidenceFileKey: string | null;
  receivedAt: Date | null;
  receivedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class DonationIntake {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly id: DonationIntakeId,
    public readonly emergencyId: EmergencyId,
    public readonly targetResourceId: string,
    public readonly intakeCode: string,
    private _status: DonationIntakeStatus,
    private _donor: DonorContactSnapshot,
    public readonly donorUserId: string | null,
    private _lines: IntakeLine[],
    private _volunteerNotes: string | null,
    private _evidenceFileKey: string | null,
    private _receivedAt: Date | null,
    private _receivedByUserId: string | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateDonationIntakeProps): DonationIntake {
    const lines = DonationIntake.buildLines(props.lines);
    const donor = buildDonorContact(props.donor);
    const now = new Date();

    return new DonationIntake(
      props.id,
      props.emergencyId,
      props.targetResourceId,
      props.intakeCode,
      DonationIntakeStatus.Pending,
      donor,
      props.donorUserId,
      lines,
      null,
      null,
      null,
      null,
      now,
      now,
    );
  }

  static fromSnapshot(s: DonationIntakeSnapshot): DonationIntake {
    return new DonationIntake(
      DonationIntakeId.fromString(s.id),
      EmergencyId.fromString(s.emergencyId),
      s.targetResourceId,
      s.intakeCode,
      s.status,
      {
        donorName: s.donorName,
        donorPhone: s.donorPhone,
        donorEmail: s.donorEmail,
        contactNormalized: s.contactNormalized,
      },
      s.donorUserId,
      s.lines.map((line) => IntakeLine.fromSnapshot(line)),
      s.volunteerNotes,
      s.evidenceFileKey,
      s.receivedAt,
      s.receivedByUserId,
      s.createdAt,
      s.updatedAt,
    );
  }

  private static buildLines(lineProps: IntakeLineProps[]): IntakeLine[] {
    if (lineProps.length === 0) {
      throw new Error('Donation intake requires at least one line');
    }
    if (lineProps.length > MAX_DONATION_INTAKE_LINES) {
      throw new DonationIntakeLineLimitError(MAX_DONATION_INTAKE_LINES);
    }
    return lineProps.map((props, index) =>
      IntakeLine.create({ ...props, sortOrder: index }),
    );
  }

  get status(): DonationIntakeStatus {
    return this._status;
  }

  get donorName(): string {
    return this._donor.donorName;
  }

  get donorPhone(): string | null {
    return this._donor.donorPhone;
  }

  get donorEmail(): string | null {
    return this._donor.donorEmail;
  }

  get contactNormalized(): string {
    return this._donor.contactNormalized;
  }

  get lines(): readonly IntakeLine[] {
    return this._lines;
  }

  get volunteerNotes(): string | null {
    return this._volunteerNotes;
  }

  get evidenceFileKey(): string | null {
    return this._evidenceFileKey;
  }

  get receivedAt(): Date | null {
    return this._receivedAt;
  }

  get receivedByUserId(): string | null {
    return this._receivedByUserId;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateContent(donor: DonorContactInput, lines: IntakeLineProps[]): void {
    this.assertPending();
    this._donor = buildDonorContact(donor);
    this._lines = DonationIntake.buildLines(lines);
    this.touch();
  }

  confirmReception(
    receivedByUserId: string,
    volunteerNotes: string | null,
    evidenceFileKey: string | null,
  ): void {
    this.assertPending();
    this._status = DonationIntakeStatus.Received;
    this._receivedByUserId = receivedByUserId;
    this._volunteerNotes = volunteerNotes?.trim()
      ? volunteerNotes.trim()
      : null;
    this._evidenceFileKey = evidenceFileKey?.trim()
      ? evidenceFileKey.trim()
      : null;
    this._receivedAt = new Date();
    this.touch();
    this.events.push(
      new DonationIntakeReceived(this.id.value, {
        emergencyId: this.emergencyId.value,
        targetResourceId: this.targetResourceId,
        receivedByUserId,
        lines: this._lines.map((line) => line.supplyLine.toSnapshot()),
      }),
    );
  }

  reject(volunteerNotes: string | null): void {
    this.assertPending();
    this._status = DonationIntakeStatus.Rejected;
    this._volunteerNotes = volunteerNotes?.trim()
      ? volunteerNotes.trim()
      : null;
    this.touch();
  }

  markIncomplete(volunteerNotes: string | null): void {
    this.assertPending();
    this._status = DonationIntakeStatus.Incomplete;
    this._volunteerNotes = volunteerNotes?.trim()
      ? volunteerNotes.trim()
      : null;
    this.touch();
  }

  pullDomainEvents(): DomainEvent[] {
    const drained = this.events;
    this.events = [];
    return drained;
  }

  private assertPending(): void {
    if (this._status !== DonationIntakeStatus.Pending) {
      throw new DonationIntakeAlreadyProcessedError(this._status);
    }
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  toSnapshot(): DonationIntakeSnapshot {
    return {
      id: this.id.value,
      emergencyId: this.emergencyId.value,
      targetResourceId: this.targetResourceId,
      intakeCode: this.intakeCode,
      status: this._status,
      donorName: this._donor.donorName,
      donorPhone: this._donor.donorPhone,
      donorEmail: this._donor.donorEmail,
      donorUserId: this.donorUserId,
      contactNormalized: this._donor.contactNormalized,
      lines: this._lines.map((line) => line.toSnapshot()),
      volunteerNotes: this._volunteerNotes,
      evidenceFileKey: this._evidenceFileKey,
      receivedAt: this._receivedAt,
      receivedByUserId: this._receivedByUserId,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

/** Genera códigos legibles tipo ACO-7F3K (sin O/0/I/1). */
export function generateIntakeCode(): string {
  const bytes = randomBytes(4);
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += CODE_ALPHABET[(bytes[i] ?? 0) % CODE_ALPHABET.length];
  }
  return `ACO-${suffix}`;
}
