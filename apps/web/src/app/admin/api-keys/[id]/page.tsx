import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireSession, authHeaders, redirectToLogin } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  fetchServiceAccounts,
  fetchApiKeys,
  fetchRoles,
  fetchServiceAccountGrants,
} from '../actions';
import { IssueKeyButton } from '../issue-key-button';
import { RevokeKeyButton } from '../revoke-key-button';
import { GrantServiceAccountRoleForm } from '../grant-sa-role-form';
import { RevokeServiceAccountGrantButton } from '../revoke-sa-grant-button';
import { shortId, scopeLabel } from '@/lib/permissions';
import { computeEffectivePermissions } from '@/lib/effective-permissions';
import { formatDate } from '@/lib/format-date';
import { PageHeader } from '@/components/molecules/page-header';
import { EmptyState } from '@/components/molecules/empty-state';
import { EffectivePermissions } from '@/components/molecules/effective-permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cuenta de servicio — Admin · ResponseGrid',
};

/** An expired grant confers nothing — surfaced so the list isn't misread. */
function isExpired(iso: string): boolean {
  return new Date(iso).getTime() <= Date.now();
}

type Props = { params: Promise<{ id: string }> };

export default async function ServiceAccountDetailPage({ params }: Props) {
  const { id } = await params;

  const token = await requireSession(`/admin/api-keys/${id}`);

  const { data: me, response: meRes } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });
  if (meRes.status === 401 || !me) return redirectToLogin(`/admin/api-keys/${id}`);
  if (!me.isAdmin) redirect('/');

  const [accounts, keys, roles, grants] = await Promise.all([
    fetchServiceAccounts(),
    fetchApiKeys(id),
    fetchRoles(),
    fetchServiceAccountGrants(id),
  ]);
  const sa = accounts.find((a) => a.id === id);
  if (!sa) notFound();

  const effective = computeEffectivePermissions(grants, roles);

  return (
    <>
      <PageHeader
        title={sa.name}
        subtitle={
          sa.ownerOrganizationId
            ? `Organización · ${shortId(sa.ownerOrganizationId)}`
            : 'Ámbito plataforma'
        }
        backHref="/admin/api-keys"
        backLabel="Cuentas de servicio"
      />
      <p className="text-xs text-muted break-all">ID: {sa.id}</p>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-ink">Claves ({keys.length})</h2>
        {keys.length === 0 ? (
          <EmptyState title="Esta cuenta no tiene claves todavía." />
        ) : (
          <ul className="flex flex-col gap-2" role="list">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-mono text-sm text-ink">
                    {k.prefix}…
                  </span>
                  <span className="text-xs text-muted">
                    Creada{' '}
                    <time dateTime={k.createdAt} suppressHydrationWarning>
                      {formatDate(k.createdAt, 'es')}
                    </time>
                    {k.lastUsedAt &&
                      ` · uso ${formatDate(k.lastUsedAt, 'es')}`}
                  </span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      k.active
                        ? 'border-green-400 bg-green-50 text-green-800'
                        : 'border-line bg-surface text-muted'
                    }`}
                  >
                    {k.active ? 'Activa' : 'Revocada'}
                  </span>
                  {k.active && (
                    <RevokeKeyButton keyId={k.id} serviceAccountId={id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr className="border-line" />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-ink">
            Permisos ({grants.length})
          </h2>
          <p className="text-xs text-muted">
            Una API key no tiene permisos propios: hereda los de esta cuenta de
            servicio. Concede o revoca roles para cambiar qué pueden hacer sus
            claves.
          </p>
        </div>

        {grants.length === 0 ? (
          <EmptyState title="Esta cuenta no tiene permisos concedidos. Sus claves solo pueden leer datos públicos." />
        ) : (
          <ul className="flex flex-col gap-2" role="list">
            {grants.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-ink">
                    {g.roleId}
                  </span>
                  <span className="text-xs text-muted">
                    {scopeLabel(g.scopeType, g.scopeId)}
                    {g.expiresAt && (
                      <>
                        {isExpired(g.expiresAt) ? ' · caducado ' : ' · caduca '}
                        <time dateTime={g.expiresAt} suppressHydrationWarning>
                          {formatDate(g.expiresAt, 'es')}
                        </time>
                      </>
                    )}
                  </span>
                </div>
                <RevokeServiceAccountGrantButton
                  grantId={g.id}
                  serviceAccountId={id}
                />
              </li>
            ))}
          </ul>
        )}

        <EffectivePermissions effective={effective} />
      </section>

      <hr className="border-line" />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-ink">Conceder permiso</h2>
        <p className="text-xs text-muted">
          Solo puedes conceder roles que tú mismo tengas en ese ámbito (sin
          escalada de privilegios).
        </p>
        <GrantServiceAccountRoleForm serviceAccountId={id} roles={roles} />
      </section>

      <hr className="border-line" />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-ink">Emitir clave</h2>
        <p className="text-xs text-muted">
          La clave se muestra una sola vez. Guárdala en un gestor de secretos.
        </p>
        <IssueKeyButton serviceAccountId={id} />
      </section>
    </>
  );
}
