import { DonationIntakeId } from '../domain/donation-intake-id';
import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';
import { DonationIntakeNotFoundError } from './donation-intake-not-found.error';
import { Category } from '../domain/offer-enums';

export interface DonationIntakeLineView {
  id: string;
  sortOrder: number;
  name: string;
  quantity: number;
  unit: string | null;
  category: Category;
  presentation: string | null;
}

export interface DonationIntakeView {
  id: string;
  emergencyId: string;
  targetResourceId: string;
  intakeCode: string;
  status: string;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
  donorUserId: string | null;
  lines: DonationIntakeLineView[];
  volunteerNotes: string | null;
  evidenceFileKey: string | null;
  receivedAt: Date | null;
  receivedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class GetDonationIntakeById {
  constructor(private readonly repo: DonationIntakeRepository) {}

  async execute(intakeId: string): Promise<DonationIntakeView> {
    const intake = await this.repo.findById(
      DonationIntakeId.fromString(intakeId),
    );
    if (!intake) throw new DonationIntakeNotFoundError(intakeId);

    const snap = intake.toSnapshot();
    return {
      id: snap.id,
      emergencyId: snap.emergencyId,
      targetResourceId: snap.targetResourceId,
      intakeCode: snap.intakeCode,
      status: snap.status,
      donorName: snap.donorName,
      donorPhone: snap.donorPhone,
      donorEmail: snap.donorEmail,
      donorUserId: snap.donorUserId,
      lines: snap.lines.map((line) => ({
        id: line.id,
        sortOrder: line.sortOrder,
        name: line.name,
        quantity: line.quantity,
        unit: line.unit,
        category: line.category,
        presentation: line.presentation ?? null,
      })),
      volunteerNotes: snap.volunteerNotes,
      evidenceFileKey: snap.evidenceFileKey,
      receivedAt: snap.receivedAt,
      receivedByUserId: snap.receivedByUserId,
      createdAt: snap.createdAt,
      updatedAt: snap.updatedAt,
    };
  }
}
