/**
 * Derives the `action`, `entityType`, and `entityId` for an audit entry from
 * the HTTP method, route path template, and route params.
 *
 * Heuristic (documented):
 *
 * 1. **action** — We look at the *last meaningful path segment* (ignoring UUID
 *    param segments) to find a "verb" (verify, publish, pause, activate, etc.).
 *    If the last segment is a known verb, the resource before it names the
 *    resource and becomes the entity type:
 *      POST /resources/:resourceId/verify  → action = "resource.verify"
 *      POST /emergencies/:id/pause         → action = "emergency.pause"
 *    If no verb segment exists we fall back to HTTP-method→CRUD mapping:
 *      POST   → <resource>.create
 *      PUT/PATCH → <resource>.update
 *      DELETE → <resource>.delete
 *    where <resource> is the first path segment (singular, lowercased).
 *
 * 2. **entityType** / **entityId** — Scanned from route params in priority
 *    order: resourceId, needId, offerId, taskId, volunteerId, reportId,
 *    accreditationId, organizationId, emergencyId. The first match gives
 *    entityType (stripped of "Id" suffix) and entityId (its value).
 *
 * 3. **emergencyId** — Taken from params.emergencyId if present.
 */

const VERB_SEGMENTS = new Set([
  'verify',
  'validate',
  'publish',
  'pause',
  'activate',
  'close',
  'archive',
  'restore',
  'approve',
  'reject',
  'discard',
  'read',
  'assign',
  'complete',
  'cancel',
  'confirm',
  'submit',
  'accept',
  'revoke',
]);

const METHOD_TO_CRUD: Record<string, string> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

const ENTITY_PARAM_KEYS: ReadonlyArray<string> = [
  'resourceId',
  'needId',
  'offerId',
  'taskId',
  'volunteerId',
  'reportId',
  'accreditationId',
  'organizationId',
  'emergencyId',
];

export interface AuditFieldsResult {
  action: string;
  entityType: string | null;
  entityId: string | null;
  emergencyId: string | null;
}

/**
 * @param method   HTTP verb, e.g. "POST"
 * @param routePath Express route path template, e.g. "/resources/:resourceId/verify"
 * @param params   Express route params object, e.g. { resourceId: "abc-..." }
 */
export function deriveAuditFields(
  method: string,
  routePath: string,
  params: Record<string, string>,
): AuditFieldsResult {
  // Split the path into segments, drop empty strings
  const segments = routePath.split('/').filter(Boolean);

  // Non-param segments (not :something)
  const staticSegments = segments.filter((s) => !s.startsWith(':'));

  // Determine action
  let action: string;
  const lastStatic = staticSegments[staticSegments.length - 1] ?? '';
  const secondLastStatic = staticSegments[staticSegments.length - 2] ?? '';

  if (VERB_SEGMENTS.has(lastStatic)) {
    // e.g. /resources/:resourceId/verify → resource.verify
    const resource = secondLastStatic || staticSegments[0] || 'unknown';
    action = `${singular(resource)}.${lastStatic}`;
  } else {
    // Fall back: last static segment (the resource being acted on) + CRUD verb.
    // E.g. POST /emergencies/:id/resources → "resources" is the target.
    // E.g. POST /emergencies → "emergencies" is the target.
    const resource =
      staticSegments[staticSegments.length - 1] ??
      staticSegments[0] ??
      'unknown';
    const crud = METHOD_TO_CRUD[method.toUpperCase()] ?? 'mutate';
    action = `${singular(resource)}.${crud}`;
  }

  // Determine entityType / entityId from params
  let entityType: string | null = null;
  let entityId: string | null = null;
  for (const key of ENTITY_PARAM_KEYS) {
    if (params[key]) {
      // "resourceId" → "resource"
      entityType = key.replace(/Id$/, '');
      entityId = params[key];
      break;
    }
  }

  // emergencyId from params (may duplicate entityId if the entity IS an emergency)
  const emergencyId = params['emergencyId'] ?? null;

  return { action, entityType, entityId, emergencyId };
}

/** Very simple singularisation: strips trailing 's' or 'ies'→'y'. */
function singular(word: string): string {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}
