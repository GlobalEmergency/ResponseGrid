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
  site: 'https://globalemergency.online',
  privacy: 'https://globalemergency.online/privacidad',
  terms: 'https://globalemergency.online/terminos',
} as const;
