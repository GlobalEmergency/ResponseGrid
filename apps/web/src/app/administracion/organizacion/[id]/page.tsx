import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageShell } from '@/components/molecules/page-shell';
import { EmptyState } from '@/components/molecules/empty-state';
import { shortId } from '@/lib/permissions';
import { administrableScopes } from '@/lib/admin-scopes';
import { fetchRoles, fetchOrgGrants } from './actions';
import { GrantOrgRoleForm } from './grant-org-role-form';
import { RevokeGrantButton } from './revoke-grant-button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Administrar organización — ResponseGrid',
  description: 'Gestiona los usuarios y roles de tu organización.',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizacionAdminPage({ params }: PageProps) {
  const { id: orgId } = await params;
  const next = `/administracion/organizacion/${orgId}`;

  const token = await getToken();
  if (!token) redirect(`/login?next=${next}`);

  const [meRes, roles] = await Promise.all([
    api.GET('/auth/me', { headers: authHeaders(token) }),
    fetchRoles(),
  ]);
  const me = meRes.data;
  if (meRes.response.status === 401 || !me) redirect(`/login?next=${next}`);

  // Authorize: the caller must actually administer THIS organization.
  const administers = administrableScopes(me.grants ?? [], roles).some(
    (s) => s.scopeType === 'organization' && s.scopeId === orgId,
  );
  if (!administers) redirect('/administracion');

  const grants = await fetchOrgGrants(orgId);

  return (
    <PageShell>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Link
            href="/administracion"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Administración
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Organización
        </h1>
        <p className="font-mono text-xs text-gray-400 break-all">{orgId}</p>
        <p className="text-base text-gray-600">
          Usuarios y roles de esta organización. Asigna o revoca roles del
          catálogo; los cambios respetan la atenuación de tus propios permisos.
        </p>
      </header>

      {/* ── MIEMBROS / ROLES ─────────────────────────────────────────────── */}
      <section aria-labelledby="members-heading" className="flex flex-col gap-4">
        <h2 id="members-heading" className="text-xl font-bold text-gray-900">
          Roles concedidos ({grants.length})
        </h2>
        {grants.length === 0 ? (
          <EmptyState
            title="Aún no hay roles en esta organización."
            description="Concede el primero con el formulario de abajo."
          />
        ) : (
          <ul className="flex flex-col gap-2" role="list">
            {grants.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-300 bg-white p-3"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-bold text-gray-900">
                    {g.roleId}
                  </span>
                  <span className="font-mono text-xs text-gray-500 break-all">
                    {g.principalType === 'service_account'
                      ? 'cuenta de servicio · '
                      : ''}
                    {shortId(g.principalId)}
                    {g.principalId === me.id ? ' (tú)' : ''}
                  </span>
                  {g.expiresAt && (
                    <span className="text-xs text-amber-700">
                      caduca{' '}
                      <time dateTime={g.expiresAt} suppressHydrationWarning>
                        {new Date(g.expiresAt).toLocaleDateString('es-ES')}
                      </time>
                    </span>
                  )}
                </div>
                <RevokeGrantButton grantId={g.id} orgId={orgId} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr className="border-gray-200" />

      {/* ── CONCEDER ROL ─────────────────────────────────────────────────── */}
      <section aria-labelledby="grant-heading" className="flex flex-col gap-4">
        <h2 id="grant-heading" className="text-xl font-bold text-gray-900">
          Asignar un rol
        </h2>
        <GrantOrgRoleForm orgId={orgId} roles={roles} />
      </section>
    </PageShell>
  );
}
