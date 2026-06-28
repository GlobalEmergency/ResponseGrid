import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';
import {
  DonationIntake,
  DonationIntakeSnapshot,
} from '../domain/donation-intake';
import { DonationIntakeId } from '../domain/donation-intake-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { DonationIntakeStatus } from '../domain/donation-intake-enums';

export class InMemoryDonationIntakeRepository implements DonationIntakeRepository {
  private store = new Map<string, DonationIntakeSnapshot>();

  save(intake: DonationIntake): Promise<void> {
    this.store.set(intake.id.value, intake.toSnapshot());
    return Promise.resolve();
  }

  findById(id: DonationIntakeId): Promise<DonationIntake | null> {
    const snap = this.store.get(id.value);
    return Promise.resolve(snap ? DonationIntake.fromSnapshot(snap) : null);
  }

  findByEmergencyAndCode(
    emergencyId: EmergencyId,
    intakeCode: string,
  ): Promise<DonationIntake | null> {
    const snap = [...this.store.values()].find(
      (s) =>
        s.emergencyId === emergencyId.value &&
        s.intakeCode === intakeCode.toUpperCase(),
    );
    return Promise.resolve(snap ? DonationIntake.fromSnapshot(snap) : null);
  }

  existsCode(emergencyId: EmergencyId, intakeCode: string): Promise<boolean> {
    const found = [...this.store.values()].some(
      (s) => s.emergencyId === emergencyId.value && s.intakeCode === intakeCode,
    );
    return Promise.resolve(found);
  }

  search(emergencyId: EmergencyId, query: string): Promise<DonationIntake[]> {
    const q = query.trim().toLowerCase();
    const digits = query.replace(/\D/g, '');
    const upper = query.trim().toUpperCase();

    const result = [...this.store.values()]
      .filter((s) => s.emergencyId === emergencyId.value)
      .filter((s) => {
        if (/^ACO-[A-Z0-9]{4}$/i.test(query.trim())) {
          return s.intakeCode === upper;
        }
        const phoneDigits = (s.donorPhone ?? '').replace(/\D/g, '');
        const nameMatch = s.donorName.toLowerCase().includes(q);
        const emailMatch = (s.donorEmail ?? '').toLowerCase().includes(q);
        const phoneMatch = digits.length > 0 && phoneDigits.includes(digits);
        return nameMatch || emailMatch || phoneMatch;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((s) => DonationIntake.fromSnapshot(s));

    return Promise.resolve(result);
  }

  findPendingByResource(resourceId: string): Promise<DonationIntake[]> {
    const result = [...this.store.values()]
      .filter(
        (s) =>
          s.targetResourceId === resourceId &&
          s.status === DonationIntakeStatus.Pending,
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((s) => DonationIntake.fromSnapshot(s));
    return Promise.resolve(result);
  }

  findPendingByContact(
    emergencyId: EmergencyId,
    contactNormalized: string,
  ): Promise<DonationIntake[]> {
    const result = [...this.store.values()]
      .filter(
        (s) =>
          s.emergencyId === emergencyId.value &&
          s.contactNormalized === contactNormalized &&
          s.status === DonationIntakeStatus.Pending,
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((s) => DonationIntake.fromSnapshot(s));
    return Promise.resolve(result);
  }

  findLatestDonorNameByContact(
    emergencyId: EmergencyId,
    contactNormalized: string,
  ): Promise<string | null> {
    const latest = [...this.store.values()]
      .filter(
        (s) =>
          s.emergencyId === emergencyId.value &&
          s.contactNormalized === contactNormalized,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    return Promise.resolve(latest?.donorName ?? null);
  }
}
