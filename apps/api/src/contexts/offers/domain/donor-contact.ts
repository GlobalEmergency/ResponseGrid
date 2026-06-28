import { InvalidDonationIntakeContactError } from './donation-intake-errors';

export interface DonorContactInput {
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
}

export interface DonorContactSnapshot {
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
  contactNormalized: string;
}

/** Normaliza el canal principal de contacto para índice y lookup. */
export function normalizeDonorContact(
  donorPhone: string | null | undefined,
  donorEmail: string | null | undefined,
): string {
  const phone = donorPhone?.trim() ?? '';
  const email = donorEmail?.trim() ?? '';

  if (phone.length > 0) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length > 0) return digits;
  }

  if (email.length > 0) {
    return email.toLowerCase();
  }

  throw new InvalidDonationIntakeContactError();
}

export function buildDonorContact(
  input: DonorContactInput,
): DonorContactSnapshot {
  const donorName = input.donorName.trim();
  if (!donorName) {
    throw new Error('donorName is required');
  }

  const donorPhone = input.donorPhone?.trim() ? input.donorPhone.trim() : null;
  const donorEmail = input.donorEmail?.trim() ? input.donorEmail.trim() : null;

  return {
    donorName,
    donorPhone,
    donorEmail,
    contactNormalized: normalizeDonorContact(donorPhone, donorEmail),
  };
}

/** True si el contacto proporcionado coincide con el registro (teléfono o email). */
export function contactMatchesIntake(
  intake: DonorContactSnapshot,
  donorPhone: string | null | undefined,
  donorEmail: string | null | undefined,
): boolean {
  const phone = donorPhone?.trim() ?? '';
  const email = donorEmail?.trim() ?? '';

  if (phone.length > 0 && intake.donorPhone) {
    const a = phone.replace(/\D/g, '');
    const b = intake.donorPhone.replace(/\D/g, '');
    if (a.length > 0 && a === b) return true;
  }

  if (email.length > 0 && intake.donorEmail) {
    if (email.toLowerCase() === intake.donorEmail.toLowerCase()) return true;
  }

  return false;
}
