/**
 * Recipient-type metadata for a resource's `recipientType` slug (#62).
 *
 * Mirrors `lib/categories`: a static map of the seeded base types with
 * localised labels + chip colours. The type taxonomy is extensible on the
 * backend (GET /recipient-types), so the helpers fall back gracefully — label
 * to the slug itself, colour to neutral — for any slug not listed here.
 */

export interface RecipientTypeMeta {
  labelEs: string;
  labelEn: string;
  /** Tailwind utility classes for the chip background + text colour */
  color: string;
}

const RECIPIENT_TYPE_MAP: Record<string, RecipientTypeMeta> = {
  hospital: {
    labelEs: 'Hospital',
    labelEn: 'Hospital',
    color: 'bg-red-100 text-red-800',
  },
  clinic: {
    labelEs: 'Clínica',
    labelEn: 'Clinic',
    color: 'bg-rose-100 text-rose-800',
  },
  organization: {
    labelEs: 'Organización',
    labelEn: 'Organization',
    color: 'bg-indigo-100 text-indigo-800',
  },
  company: {
    labelEs: 'Empresa',
    labelEn: 'Company',
    color: 'bg-blue-100 text-blue-800',
  },
  collection_center: {
    labelEs: 'Centro de acopio',
    labelEn: 'Collection center',
    color: 'bg-amber-100 text-amber-800',
  },
  individual: {
    labelEs: 'Particular',
    labelEn: 'Individual',
    color: 'bg-emerald-100 text-emerald-800',
  },
  other: {
    labelEs: 'Otro',
    labelEn: 'Other',
    color: 'bg-gray-100 text-gray-700',
  },
};

const FALLBACK_COLOR = 'bg-gray-100 text-gray-700';

/**
 * Localised label for a recipient-type slug. Falls back to the slug itself
 * when unknown, so custom/extensible types still render something meaningful.
 */
export function recipientTypeLabel(slug: string, locale: 'es' | 'en'): string {
  const meta = RECIPIENT_TYPE_MAP[slug];
  if (!meta) return slug;
  return locale === 'en' ? meta.labelEn : meta.labelEs;
}

/** Tailwind chip colour for a recipient-type slug; neutral fallback when unknown. */
export function recipientTypeColor(slug: string): string {
  return RECIPIENT_TYPE_MAP[slug]?.color ?? FALLBACK_COLOR;
}
