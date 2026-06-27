/**
 * Canonical Global Emergency links, shared across all ResponseGrid surfaces.
 *
 * ResponseGrid is published as a project of Global Emergency, so it reuses the
 * umbrella organisation's legal pages (privacy / terms) — the same links every
 * other Global Emergency project points to. These live on the org site, not on
 * responsegrid.app, hence absolute URLs.
 *
 * @see https://globalemergency.online
 */
export const GLOBAL_EMERGENCY = {
  /** Umbrella organisation site. */
  site: 'https://globalemergency.online',
  /** Shared privacy policy — "Política de privacidad". */
  privacy: 'https://globalemergency.online/privacidad',
  /** Shared terms & conditions — "Términos y condiciones". */
  terms: 'https://globalemergency.online/terminos',
} as const;
