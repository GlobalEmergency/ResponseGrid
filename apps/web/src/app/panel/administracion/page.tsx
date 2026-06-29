import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/molecules/page-header';
import { Card } from '@/components/atoms/card';
import { shortId } from '@/lib/permissions';
import {
  administrableScopes,
  sortAdminScopes,
  type AdminScope,
} from '@/lib/admin-scopes';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Administración — ResponseGrid',
  description:
    'Panel de administración: gestiona los usuarios, roles y accesos de los ámbitos que administras.',
};

function capChips(scope: AdminScope): string[] {
  const chips: string[] = [];
  if (scope.canGrantRoles) chips.push('Roles');
  if (scope.canInvite) chips.push('Invitar');
  if (scope.canManageMembers) chips.push('Miembros');
  if (scope.canManageKeys) chips.push('API keys');
  return chips;
}

export default async function AdministracionPage() {
  const token = await getToken();
  if (!token) redirect('/login?next=/panel/administracion');

  const [meRes, rolesRes, emergenciesRes] = await Promise.all([
    api.GET('/auth/me', { headers: authHeaders(token) }),
    api.GET('/roles', { headers: authHeaders(token) }),
    api.GET('/emergencies', { headers: authHeaders(token) }),
  ]);

  const me = meRes.data;
  if (meRes.response.status === 401 || !me) redirect('/login?next=/panel/administracion');

  const roles = (rolesRes.data ?? []) as { id: string; permissions: string[] }[];
  const scopes = sortAdminScopes(administrableScopes(me.grants ?? [], roles));

  // Anyone who can't administer anything has no business here.
  if (scopes.length === 0) redirect('/');

  // Resolve emergency ids → names for nicer card titles.
  const emergencies = (emergenciesRes.data ?? []) as {
    id: string;
    name: string;
  }[];
  const nameById = new Map(emergencies.map((e) => [e.id, e.name]));

  return (
    <>
      <PageHeader
        title="Administración"
        subtitle="Estos son los ámbitos que administras. Entra en cualquiera para gestionar sus usuarios, roles y accesos. Solo ves lo que tus permisos te permiten."
      />

      <section aria-labelledby="scopes-heading" className="flex flex-col gap-4">
        <h2 id="scopes-heading" className="text-xl font-bold text-ink">
          Ámbitos que administras ({scopes.length})
        </h2>
        <ul className="flex flex-col gap-3" role="list">
          {scopes.map((scope) => (
            <li key={scope.key}>
              <ScopeCard
                scope={scope}
                emergencyName={
                  scope.scopeId ? nameById.get(scope.scopeId) : undefined
                }
              />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function ScopeCard({
  scope,
  emergencyName,
}: {
  scope: AdminScope;
  emergencyName?: string;
}) {
  const chips = capChips(scope);

  // Each scope type routes to the right management surface.
  let title: string;
  let subtitle: string;
  let href: string | null;
  let cta: string;

  switch (scope.scopeType) {
    case 'platform':
      title = 'Plataforma (global)';
      subtitle = 'Roles, permisos y cuentas de servicio de toda la plataforma.';
      href = '/panel/administracion/permisos';
      cta = 'Roles y permisos';
      break;
    case 'organization':
      title = 'Organización';
      subtitle = `ID ${shortId(scope.scopeId ?? '')} · miembros, roles y cuentas de servicio.`;
      href = `/panel/administracion/ambito/organization/${scope.scopeId}`;
      cta = 'Gestionar organización';
      break;
    case 'group':
      title = 'Grupo / cuadrilla';
      subtitle = `ID ${shortId(scope.scopeId ?? '')} · miembros y roles.`;
      href = `/panel/administracion/ambito/group/${scope.scopeId}`;
      cta = 'Gestionar grupo';
      break;
    case 'emergency':
      title = emergencyName ?? 'Emergencia';
      subtitle = `ID ${shortId(scope.scopeId ?? '')} · miembros y roles.`;
      href = `/panel/administracion/ambito/emergency/${scope.scopeId}`;
      cta = 'Gestionar emergencia';
      break;
    default:
      title = scope.scopeType;
      subtitle = scope.scopeId ?? '';
      href = null;
      cta = '';
  }

  const inner = (
    <Card className="flex flex-col gap-2 p-4 transition-colors hover:bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-base font-bold text-ink">
          {title}
          {href ? ' →' : ''}
        </span>
        <div className="flex flex-wrap gap-1">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
      <span className="text-sm text-muted">{subtitle}</span>
      {scope.scopeType === 'platform' && (
        <div className="flex flex-col gap-1">
          <Link
            href="/panel/administracion/usuarios"
            className="text-xs font-medium text-muted underline underline-offset-2 hover:text-ink"
          >
            Usuarios (global) →
          </Link>
          <Link
            href="/panel/administracion/organizaciones"
            className="text-xs font-medium text-muted underline underline-offset-2 hover:text-ink"
          >
            Organizaciones (global) →
          </Link>
          <Link
            href="/panel/administracion/centros"
            className="text-xs font-medium text-muted underline underline-offset-2 hover:text-ink"
          >
            Centros / recursos (global) →
          </Link>
          <Link
            href="/panel/administracion/api-keys"
            className="text-xs font-medium text-muted underline underline-offset-2 hover:text-ink"
          >
            Cuentas de servicio y API keys →
          </Link>
        </div>
      )}
    </Card>
  );

  return href ? (
    <Link href={href} aria-label={`${cta}: ${title}`}>
      {inner}
    </Link>
  ) : (
    inner
  );
}
