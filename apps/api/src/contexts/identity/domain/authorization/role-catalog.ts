import {
  Permission,
  ALL_PERMISSIONS,
  READ_ONLY_PERMISSIONS,
} from './permission';
import { ScopeType } from './scope-ref';

export interface RoleDefinition {
  id: string;
  description: string;
  /** The scope type this role is normally granted at (informational). */
  defaultScopeType: ScopeType;
  permissions: readonly Permission[];
}

/**
 * Fixed role catalog (decision D2: catálogo fijo primero). A role is a *named
 * bundle of permissions*. Custom per-organization roles are a later phase; the
 * domain does not change for them — only the source of this catalog moves from
 * a constant to a repository. See docs/features/13 §4.
 */
export const ROLE_CATALOG: Record<string, RoleDefinition> = {
  platform_admin: {
    id: 'platform_admin',
    description:
      'Plataforma: super-administrador (sustituye al booleano isAdmin).',
    defaultScopeType: 'platform',
    permissions: ALL_PERMISSIONS,
  },
  platform_operator: {
    id: 'platform_operator',
    description:
      'Equipo central: abre/activa/pausa emergencias y acredita organizaciones.',
    defaultScopeType: 'platform',
    permissions: [
      'emergency:create',
      'emergency:activate',
      'emergency:pause',
      'emergency:resume',
      'emergency:close',
      'emergency:announce',
      'emergency:read',
      'accreditation:grant',
      'accreditation:revoke',
      'org:read',
      'audit:read',
    ],
  },
  org_admin: {
    id: 'org_admin',
    description:
      'Administra su organización: invita usuarios, concede roles y gestiona API keys.',
    defaultScopeType: 'organization',
    permissions: [
      'user:invite',
      'user:read',
      'role:grant',
      'role:revoke',
      'apikey:create',
      'apikey:revoke',
      'org:edit',
      'org:read',
      'group:create',
      'group:read',
      'group:manage_members',
    ],
  },
  org_member: {
    id: 'org_member',
    description: 'Miembro de una organización.',
    defaultScopeType: 'organization',
    permissions: ['org:read'],
  },
  emergency_coordinator: {
    id: 'emergency_coordinator',
    description:
      'Coordina una emergencia: valida, asigna, tría reportes y prioriza.',
    defaultScopeType: 'emergency',
    permissions: [
      'emergency:read',
      'emergency:pause',
      'emergency:resume',
      'emergency:announce',
      'resource:read',
      'resource:verify',
      'resource:close',
      'resource:edit',
      'need:read',
      'need:validate',
      'need:prioritize',
      'offer:read',
      'offer:match',
      'intake:read',
      'intake:receive',
      'capacity:read',
      'shipment:create',
      'shipment:assign',
      'shipment:update',
      'shipment:read',
      'container:manage',
      'container:read',
      'campaign:read',
      'campaign:verify',
      'campaign:block',
      'volunteer:read',
      'volunteer:assign',
      'task:create',
      'task:assign',
      'task:read',
      'report:read',
      'report:triage',
      'incident:create',
      'incident:resolve',
      'group:create',
      'group:read',
      'group:manage_members',
      // Trazabilidad: el coordinador (no el verificador) ve el registro de
      // actividad de SU emergencia. El scope emergency del grant limita la
      // lectura a su propia emergencia (ver EmergencyAuditController).
      'audit:read',
    ],
  },
  emergency_verifier: {
    id: 'emergency_verifier',
    description: 'Valida recursos, campañas y necesidades sin coordinar.',
    defaultScopeType: 'emergency',
    permissions: [
      'emergency:read',
      'resource:read',
      'resource:verify',
      'need:read',
      'need:validate',
      'campaign:read',
      'campaign:verify',
      'offer:read',
      'capacity:read',
      'container:read',
    ],
  },
  group_manager: {
    id: 'group_manager',
    description:
      'Gestiona un grupo/cuadrilla: aprueba/añade miembros, asigna tareas y ' +
      'puede nombrar sub-managers (mismo rol) por atenuación.',
    defaultScopeType: 'group',
    permissions: [
      'group:read',
      'group:manage_members',
      'volunteer:read',
      'volunteer:assign',
      'task:create',
      'task:assign',
      'task:read',
      'report:read',
      // Delegation within the group: invite users and appoint sub-managers.
      // Attenuation (§5) limits this to roles whose permissions ⊆ these.
      'user:invite',
      'role:grant',
    ],
  },
  volunteer_operative: {
    id: 'volunteer_operative',
    description: 'Voluntario operativo: tareas propias y reportes de campo.',
    defaultScopeType: 'emergency',
    permissions: [
      'task:read',
      'task:checkin_self',
      'report:create',
      'volunteer:read',
    ],
  },
  transportista: {
    id: 'transportista',
    description:
      'Transportista: ejecuta las expediciones asignadas, actualiza su estado ' +
      'en tránsito y firma manifiestos (ciudadano con vehículo u operador).',
    defaultScopeType: 'emergency',
    permissions: ['shipment:read', 'shipment:track', 'manifest:sign'],
  },
  hub_manager: {
    id: 'hub_manager',
    description:
      'Gestor de hub logístico: crea y opera las expediciones que transitan su ' +
      'hub. Autoridad transversal a emergencias vía scope hub/entity (§16).',
    defaultScopeType: 'entity',
    permissions: [
      'shipment:create',
      'shipment:read',
      'shipment:track',
      'manifest:sign',
      'container:manage',
      'container:read',
    ],
  },
  viewer: {
    id: 'viewer',
    description: 'Solo lectura.',
    defaultScopeType: 'emergency',
    permissions: READ_ONLY_PERMISSIONS,
  },
  citizen: {
    id: 'citizen',
    description:
      'Ciudadano autenticado (rol por defecto de cualquier usuario).',
    defaultScopeType: 'platform',
    permissions: [
      'offer:create',
      'offer:read',
      'capacity:publish',
      'resource:register',
      'resource:read',
      'need:read',
      'campaign:read',
      'volunteer:register',
    ],
  },
};

export function roleExists(roleId: string): boolean {
  return ROLE_CATALOG[roleId] !== undefined;
}

export function permissionsForRole(roleId: string): readonly Permission[] {
  return ROLE_CATALOG[roleId]?.permissions ?? [];
}
