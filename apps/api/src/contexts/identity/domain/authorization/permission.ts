/**
 * The permission catalog — the atomic currency of authorization.
 *
 * A {@link Permission} is a `${resource}:${verb}` pair (e.g. `resource:verify`).
 * Guards check *permissions*, never *roles* (roles are bundles of permissions,
 * see role-catalog.ts). This is what lets new actor types be expressed as
 * combinations of existing permissions instead of new code.
 *
 * This catalog also doubles as the source of OAuth2 scopes for the public API
 * (a public-exportable subset; see docs/features/13 §8.2).
 */
export const PERMISSION_CATALOG = {
  emergency: [
    'create',
    'activate',
    'pause',
    'resume',
    'close',
    'announce',
    'read',
  ],
  resource: ['register', 'read', 'verify', 'close', 'edit'],
  need: ['create', 'validate', 'prioritize', 'read'],
  offer: ['create', 'match', 'read'],
  campaign: ['create', 'verify', 'block', 'read'],
  volunteer: ['register', 'read', 'assign', 'validate_skill'],
  task: ['create', 'assign', 'checkin_self', 'read'],
  report: ['create', 'triage', 'read'],
  incident: ['create', 'resolve'],
  org: ['create', 'edit', 'read'],
  group: ['create', 'read', 'manage_members'],
  accreditation: ['grant', 'revoke'],
  user: ['invite', 'read'],
  role: ['grant', 'revoke', 'create_custom'],
  apikey: ['create', 'revoke'],
  audit: ['read'],
  // Logística de transporte (EPIC #103). 'create'/'read' existían como data
  // antes del enforcement; #106 añade 'assign' (coordinador asigna capacidad y
  // transportista) y 'update' (cambios de estado por el coordinador). 'track'
  // lo usa el transportista para marcar tránsito/entrega de SU expedición.
  shipment: ['create', 'assign', 'update', 'read', 'track'],
  manifest: ['sign'],
  // Capacidad de transporte (#105): ofertar mover carga A->B. 'publish' es de
  // grado ciudadano (como 'offer:create'); 'read' lo consume la coordinación.
  capacity: ['publish', 'read'],
  intake: ['create', 'read', 'receive', 'update'],
  // Empaquetado rastreable (#140): contenedores palet/caja/lote en supplies.
  // 'manage' = crear/anidar/precintar/mover (coordinador / responsable de punto,
  // mirror de capacity:* y shipment:*); 'read' lo consume coordinación/verificación.
  container: ['manage', 'read'],
  // Catálogo maestro de insumos (#228). 'manage' = alta/edición/archivado de
  // insumos y variantes, gestión de alias y fusión de duplicados (#222), y CRUD
  // de categorías/subcategorías (#221) — gobernanza admins-only del catálogo
  // cerrado. 'read' queda reservado para lecturas internas del catálogo.
  catalogue: ['manage', 'read'],
} as const;

type Catalog = typeof PERMISSION_CATALOG;

/** `${resource}:${verb}` union built from the catalog above. */
export type Permission = {
  [Resource in keyof Catalog]: `${Resource & string}:${Catalog[Resource][number]}`;
}[keyof Catalog];

function buildAllPermissions(): Permission[] {
  const out: Permission[] = [];
  for (const resource of Object.keys(PERMISSION_CATALOG) as (keyof Catalog)[]) {
    for (const verb of PERMISSION_CATALOG[resource]) {
      out.push(`${resource}:${verb}` as Permission);
    }
  }
  return out;
}

/** Every permission in the catalog (flattened). */
export const ALL_PERMISSIONS: readonly Permission[] = buildAllPermissions();

/** Read-only permissions (`*:read`) — the basis for the `viewer` role. */
export const READ_ONLY_PERMISSIONS: readonly Permission[] =
  ALL_PERMISSIONS.filter((p) => p.endsWith(':read'));

/** Type guard: is the given string a known permission? */
export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value);
}
