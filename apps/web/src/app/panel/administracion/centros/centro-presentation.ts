/**
 * Pure presentation helpers for the admin centers/resources pages: maps backend
 * enum values (resource type, public status, verification level, report status)
 * to localized labels and to badge styling. Safe to import from Server or Client
 * Components.
 */
import type { Messages } from '@/i18n/messages/es';

type AdminMessages = Messages['admin'];

const TYPE_KEYS: Record<string, keyof AdminMessages> = {
  collection_point: 'centros_type_collection_point',
  delivery_point: 'centros_type_delivery_point',
  collection_and_delivery: 'centros_type_collection_and_delivery',
  warehouse: 'centros_type_warehouse',
  transport: 'centros_type_transport',
  supplier: 'centros_type_supplier',
  venue: 'centros_type_venue',
};

export function resourceTypeLabel(type: string, ta: AdminMessages): string {
  const key = TYPE_KEYS[type];
  return key ? ta[key] : type;
}

/** Resource types in display order, for the filter dropdown. */
export const RESOURCE_TYPES: ReadonlyArray<string> = [
  'collection_point',
  'delivery_point',
  'collection_and_delivery',
  'warehouse',
  'transport',
  'supplier',
  'venue',
];

const STATUS_KEYS: Record<string, keyof AdminMessages> = {
  hidden: 'centros_status_hidden',
  active: 'centros_status_active',
  saturated: 'centros_status_saturated',
  paused: 'centros_status_paused',
  closed: 'centros_status_closed',
};

export function statusLabel(status: string, ta: AdminMessages): string {
  const key = STATUS_KEYS[status];
  return key ? ta[key] : status;
}

/** Public statuses in display order, for the filter dropdown. */
export const PUBLIC_STATUSES: ReadonlyArray<string> = [
  'active',
  'saturated',
  'paused',
  'hidden',
  'closed',
];

/**
 * Tailwind classes for the status pill. Mirrors the brand palette used by the
 * Badge atom but covers the admin-only states (hidden/closed) the atom lacks.
 */
export function statusPillClasses(status: string): string {
  switch (status) {
    case 'active':
      return 'border border-success bg-success-soft text-success';
    case 'saturated':
      return 'border border-warning bg-warning-soft text-warning';
    case 'paused':
      return 'border border-info-line bg-info-soft text-info';
    case 'closed':
      return 'border border-line bg-surface-alt text-muted';
    case 'hidden':
    default:
      return 'border border-line bg-line-soft text-muted';
  }
}

const VERIF_KEYS: Record<string, keyof AdminMessages> = {
  unverified: 'centros_verif_unverified',
  verified: 'centros_verif_verified',
  official: 'centros_verif_official',
  rejected: 'centros_verif_rejected',
};

export function verificationLabel(level: string, ta: AdminMessages): string {
  const key = VERIF_KEYS[level];
  return key ? ta[key] : level;
}

/** Maps a verification level to a shared Badge variant. */
export function verificationBadgeVariant(
  level: string,
): 'verification-official' | 'verification-verified' | 'offer-cancelled' | 'unverified' {
  if (level === 'official') return 'verification-official';
  if (level === 'verified') return 'verification-verified';
  if (level === 'rejected') return 'offer-cancelled';
  return 'unverified';
}

const REPORT_STATUS_KEYS: Record<string, keyof AdminMessages> = {
  open: 'centros_detail_report_status_open',
  accepted: 'centros_detail_report_status_accepted',
  dismissed: 'centros_detail_report_status_dismissed',
};

export function reportStatusLabel(status: string, ta: AdminMessages): string {
  const key = REPORT_STATUS_KEYS[status];
  return key ? ta[key] : status;
}

const STAGE_KEYS: Record<string, keyof AdminMessages> = {
  origin: 'centros_detail_stage_origin',
  intermediate: 'centros_detail_stage_intermediate',
  destination: 'centros_detail_stage_destination',
};

export function stageLabel(stage: string, ta: AdminMessages): string {
  const key = STAGE_KEYS[stage];
  return key ? ta[key] : stage;
}
