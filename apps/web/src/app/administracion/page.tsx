import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageShell } from '@/components/molecules/page-shell';
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
  if (!token) redirect('/login?next=/administracion');

  const [meRes, rolesRes, emergenciesRes] = await Promise.all([
    api.GET('/auth/me', { headers: authHeaders(token) }),
    api.GET('/roles', { headers: authHeaders(token) }),
    api.GET('/emergencies', { headers: authHeaders(token) }),
  ]);

  const me = meRes.data;
  if (meRes.response.status === 401 || !me) redirect('/login?next=/administracion');

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
    <PageShell>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Inicio
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Administración
        </h1>
        <p className="text-base text-gray-600">
          Estos son los ámbitos que administras. Entra en cualquiera para
          gestionar sus usuarios, roles y accesos. Solo ves lo que tus permisos
          te permiten.
        </p>
      </header>

      <section aria-labelledby="scopes-heading" className="flex flex-col gap-4">
        <h2 id="scopes-heading" className="text-xl font-bold text-gray-900">
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
    </PageShell>
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
      href = '/admin/permisos';
      cta = 'Roles y permisos';
      break;
    case 'organization':
      title = 'Organización';
      subtitle = `ID ${shortId(scope.scopeId ?? '')} · miembros, roles y cuentas de servicio.`;
      href = `/administracion/ambito/organization/${scope.scopeId}`;
      cta = 'Gestionar organización';
      break;
    case 'group':
      title = 'Grupo / cuadrilla';
      subtitle = `ID ${shortId(scope.scopeId ?? '')} · miembros y roles.`;
      href = `/administracion/ambito/group/${scope.scopeId}`;
      cta = 'Gestionar grupo';
      break;
    case 'emergency':
      title = emergencyName ?? 'Emergencia';
      subtitle = `ID ${shortId(scope.scopeId ?? '')} · miembros y roles.`;
      href = `/administracion/ambito/emergency/${scope.scopeId}`;
      cta = 'Gestionar emergencia';
      break;
    default:
      title = scope.scopeType;
      subtitle = scope.scopeId ?? '';
      href = null;
      cta = '';
  }

  const inner = (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-gray-900 bg-white p-4 transition-colors hover:bg-gray-50">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-base font-bold text-gray-900">
          {title}
          {href ? ' →' : ''}
        </span>
        <div className="flex flex-wrap gap-1">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
      <span className="text-sm text-gray-600">{subtitle}</span>
      {scope.scopeType === 'platform' && (
        <div className="flex flex-col gap-1">
          <Link
            href="/admin/usuarios"
            className="text-xs font-medium text-gray-500 underline underline-offset-2 hover:text-gray-900"
          >
            Usuarios (global) →
          </Link>
          <Link
            href="/admin/organizaciones"
            className="text-xs font-medium text-gray-500 underline underline-offset-2 hover:text-gray-900"
          >
            Organizaciones (global) →
          </Link>
          <Link
            href="/admin/api-keys"
            className="text-xs font-medium text-gray-500 underline underline-offset-2 hover:text-gray-900"
          >
            Cuentas de servicio y API keys →
          </Link>
        </div>
      )}
    </div>
  );

  return href ? (
    <Link href={href} aria-label={`${cta}: ${title}`}>
      {inner}
    </Link>
  ) : (
    inner
  );
}
