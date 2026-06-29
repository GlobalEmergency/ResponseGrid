import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/molecules/page-header';
import { EmptyState } from '@/components/molecules/empty-state';
import { shortId } from '@/lib/permissions';
import { formatDate } from '@/lib/format-date';
import { administrableScopes } from '@/lib/admin-scopes';
import {
  fetchRoles,
  fetchScopeGrants,
  fetchOrgServiceAccounts,
  type ScopeType,
} from './actions';
import { GrantRoleForm } from './grant-role-form';
import { RevokeGrantButton } from './revoke-grant-button';
import { ServiceAccountsManager } from './service-accounts-manager';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Administrar ámbito — ResponseGrid',
  description: 'Gestiona los usuarios y roles de este ámbito.',
};

const SCOPE_LABELS: Record<ScopeType, string> = {
  organization: 'Organización',
  group: 'Grupo / cuadrilla',
  emergency: 'Emergencia',
};

function isScopeType(value: string): value is ScopeType {
  return value === 'organization' || value === 'group' || value === 'emergency';
}

interface PageProps {
  params: Promise<{ scopeType: string; id: string }>;
}

export default async function ScopeAdminPage({ params }: PageProps) {
  const { scopeType: rawType, id: scopeId } = await params;
  if (!isScopeType(rawType)) notFound();
  const scopeType = rawType;
  const next = `/panel/administracion/ambito/${scopeType}/${scopeId}`;

  const token = await getToken();
  if (!token) redirect(`/login?next=${next}`);

  const [meRes, roles] = await Promise.all([
    api.GET('/auth/me', { headers: authHeaders(token) }),
    fetchRoles(),
  ]);
  const me = meRes.data;
  if (meRes.response.status === 401 || !me) redirect(`/login?next=${next}`);

  // Authorize: the caller must actually administer THIS scope.
  const scope = administrableScopes(me.grants ?? [], roles).find(
    (s) => s.scopeType === scopeType && s.scopeId === scopeId,
  );
  if (!scope) redirect('/panel/administracion');

  const grants = await fetchScopeGrants(scopeType, scopeId);
  const serviceAccounts =
    scopeType === 'organization' && scope.canManageKeys
      ? await fetchOrgServiceAccounts(scopeId)
      : null;

  return (
    <>
      <PageHeader
        title={SCOPE_LABELS[scopeType]}
        subtitle="Usuarios y roles de este ámbito. Asigna o revoca roles del catálogo; los cambios respetan la atenuación de tus propios permisos."
        backHref="/panel/administracion"
        backLabel="Administración"
      />
      <p className="font-mono text-xs text-muted break-all">{scopeId}</p>

      {/* ── MIEMBROS / ROLES ─────────────────────────────────────────────── */}
      <section aria-labelledby="members-heading" className="flex flex-col gap-4">
        <h2 id="members-heading" className="text-xl font-bold text-ink">
          Roles concedidos ({grants.length})
        </h2>
        {grants.length === 0 ? (
          <EmptyState
            title="Aún no hay roles en este ámbito."
            description="Concede el primero con el formulario de abajo."
          />
        ) : (
          <ul className="flex flex-col gap-2" role="list">
            {grants.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line bg-white p-3"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-bold text-ink">
                    {g.principalName ?? shortId(g.principalId)}
                    {g.principalId === me.id ? ' (tú)' : ''}
                  </span>
                  {g.principalEmail && (
                    <span className="text-xs text-muted">
                      {g.principalEmail}
                    </span>
                  )}
                  <span className="text-xs text-muted">
                    Rol: <span className="font-mono">{g.roleId}</span>
                    {g.principalType === 'service_account'
                      ? ' · cuenta de servicio'
                      : ''}
                  </span>
                  {g.expiresAt && (
                    <span className="text-xs text-amber-700">
                      caduca{' '}
                      <time dateTime={g.expiresAt} suppressHydrationWarning>
                        {formatDate(g.expiresAt, 'es')}
                      </time>
                    </span>
                  )}
                </div>
                <RevokeGrantButton
                  grantId={g.id}
                  scopeType={scopeType}
                  scopeId={scopeId}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr className="border-line" />

      {/* ── CONCEDER ROL ─────────────────────────────────────────────────── */}
      <section aria-labelledby="grant-heading" className="flex flex-col gap-4">
        <h2 id="grant-heading" className="text-xl font-bold text-ink">
          Asignar un rol
        </h2>
        <GrantRoleForm scopeType={scopeType} scopeId={scopeId} roles={roles} />
      </section>

      {/* ── CUENTAS DE SERVICIO (solo organización) ──────────────────────── */}
      {serviceAccounts !== null && (
        <>
          <hr className="border-line" />
          <section aria-labelledby="sa-heading" className="flex flex-col gap-4">
            <h2 id="sa-heading" className="text-xl font-bold text-ink">
              Cuentas de servicio y API keys
            </h2>
            <p className="text-sm text-muted -mt-2">
              Principales máquina de esta organización. Sus API keys autentican
              llamadas servidor-a-servidor.
            </p>
            <ServiceAccountsManager
              orgId={scopeId}
              initialAccounts={serviceAccounts}
            />
          </section>
        </>
      )}
    </>
  );
}
