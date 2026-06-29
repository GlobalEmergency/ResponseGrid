/**
 * Pure presentation helpers for the admin organizations pages: maps backend
 * enum values to localized labels and to the shared Badge variants. Safe to
 * import from Server or Client Components.
 */
import type { Messages } from '@/i18n/messages/es';
import type { AccreditationStatus } from './actions';

type AdminMessages = Messages['admin'];

const TYPE_KEYS: Record<string, keyof AdminMessages> = {
  ngo: 'orgs_type_ngo',
  company: 'orgs_type_company',
  public_admin: 'orgs_type_public_admin',
  association: 'orgs_type_association',
  transport_operator: 'orgs_type_transport_operator',
  other: 'orgs_type_other',
};

export function orgTypeLabel(type: string, ta: AdminMessages): string {
  const key = TYPE_KEYS[type];
  return key ? ta[key] : type;
}

const ACCR_KEYS: Record<AccreditationStatus, keyof AdminMessages> = {
  global: 'orgs_accr_global',
  emergency: 'orgs_accr_emergency',
  none: 'orgs_accr_none',
};

export function accreditationLabel(
  status: AccreditationStatus,
  ta: AdminMessages,
): string {
  return ta[ACCR_KEYS[status]];
}

/** Maps accreditation status to a shared Badge variant. */
export function accreditationBadgeVariant(
  status: AccreditationStatus,
): 'verification-official' | 'verification-verified' | 'unverified' {
  if (status === 'global') return 'verification-official';
  if (status === 'emergency') return 'verification-verified';
  return 'unverified';
}

const VERIF_KEYS: Record<string, keyof AdminMessages> = {
  official: 'orgs_verif_official',
  verified: 'orgs_verif_verified',
  unverified: 'orgs_verif_unverified',
};

export function verificationLabel(level: string, ta: AdminMessages): string {
  const key = VERIF_KEYS[level];
  return key ? ta[key] : level;
}
