import { DonationIntake } from '../donation-intake';
import { DonationIntakeId } from '../donation-intake-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';

export const DONATION_INTAKE_REPOSITORY = Symbol('DonationIntakeRepository');

export interface DonationIntakeRepository {
  save(intake: DonationIntake): Promise<void>;
  findById(id: DonationIntakeId): Promise<DonationIntake | null>;
  findByEmergencyAndCode(
    emergencyId: EmergencyId,
    intakeCode: string,
  ): Promise<DonationIntake | null>;
  existsCode(emergencyId: EmergencyId, intakeCode: string): Promise<boolean>;
  search(emergencyId: EmergencyId, query: string): Promise<DonationIntake[]>;
  findPendingByResource(resourceId: string): Promise<DonationIntake[]>;
  /** A donor's own intakes across every emergency (newest first). */
  findByDonorUserId(donorUserId: string): Promise<DonationIntake[]>;
  findPendingByContact(
    emergencyId: EmergencyId,
    contactNormalized: string,
  ): Promise<DonationIntake[]>;
  findLatestDonorNameByContact(
    emergencyId: EmergencyId,
    contactNormalized: string,
  ): Promise<string | null>;
}
