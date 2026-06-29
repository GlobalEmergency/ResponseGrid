import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchRoles, fetchGrants, resolvePrincipal } from './actions';
import { GrantRoleForm } from './grant-role-form';
import { RevokeGrantButton } from './revoke-grant-button';
import { scopeLabel } from '@/lib/permissions';
import { formatDate } from '@/lib/format-date';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageHeader } from '@/components/molecules/page-header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Permisos y roles — Admin · ResponseGrid',
  description: 'Concede y revoca roles a usuarios y cuentas de servicio.',
};

type Props = { searchParams: Promise<{ principalId?: string }> };

export default async function PermisosPage({ searchParams }: Props) {
  const token = await getToken();
  if (!token) redirect('/login?next=/panel/administracion/permisos');

  const { data: me, response: meRes } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });
  if (meRes.status === 401 || !me) redirect('/login?next=/panel/administracion/permisos');
  if (!me.isAdmin) redirect('/');

  const { principalId } = await searchParams;
  const rawLookup = (principalId ?? '').trim();
  // Accept a UUID or an email; resolve email → principal id via the directory.
  const resolved = rawLookup ? await resolvePrincipal(rawLookup) : null;
  const lookupId = resolved?.id ?? '';

  const [roles, grants] = await Promise.all([
    fetchRoles(),
    lookupId ? fetchGrants(lookupId) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="Permisos y roles"
        subtitle="Concede y revoca roles a usuarios y cuentas de servicio. Solo administradores."
      />

      {/* ── Look up a principal's grants ───────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-ink">
          Consultar roles de un principal
        </h2>
        <form method="get" className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            name="principalId"
            defaultValue={rawLookup}
            placeholder="Email del usuario, o UUID de usuario / cuenta de servicio"
            className="flex-1 rounded-lg border border-line bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          />
          <button
            type="submit"
            className="rounded-lg border border-line bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy/90"
          >
            Consultar
          </button>
        </form>

        {rawLookup && !resolved && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-300 rounded px-3 py-2">
            No se encontró ningún principal con «{rawLookup}». Usa un email
            registrado o pega un UUID.
          </p>
        )}

        {resolved && (resolved.name || resolved.email) && (
          <p className="text-xs text-muted">
            {resolved.name ?? 'Usuario'}
            {resolved.email ? ` · ${resolved.email}` : ''} ·{' '}
            <span className="font-mono break-all">{resolved.id}</span>
          </p>
        )}

        {lookupId &&
          (grants.length === 0 ? (
            <EmptyState title="Este principal no tiene roles asignados." />
          ) : (
            <ul className="flex flex-col gap-2" role="list">
              {grants.map((g) => (
                <li
                  key={g.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-line bg-white p-3"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-bold text-ink">
                      {g.roleId}
                    </span>
                    <span className="text-xs text-muted">
                      {scopeLabel(g.scopeType, g.scopeId)}
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
                  <RevokeGrantButton grantId={g.id} />
                </li>
              ))}
            </ul>
          ))}
      </section>

      <hr className="border-line" />

      {/* ── Grant a role ───────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-ink">Conceder un rol</h2>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-300 rounded px-3 py-2">
          La concesión está sujeta a atenuación: solo puedes conceder permisos
          que tú ya tengas en ese ámbito.
        </p>
        <GrantRoleForm roles={roles} defaultPrincipalId={lookupId} />
      </section>

      <hr className="border-line" />

      {/* ── Role catalog reference ─────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-ink">
          Catálogo de roles ({roles.length})
        </h2>
        <ul className="flex flex-col gap-2" role="list">
          {roles.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-3"
            >
              <span className="text-sm font-bold text-ink">{r.id}</span>
              <span className="text-xs text-muted">{r.description}</span>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted">
                  {r.permissions.length} permisos
                </summary>
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.permissions.map((p) => (
                    <span
                      key={p}
                      className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-ink-soft"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
