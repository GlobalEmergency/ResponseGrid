import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchRoles, fetchGrants } from './actions';
import { GrantRoleForm } from './grant-role-form';
import { RevokeGrantButton } from './revoke-grant-button';
import { scopeLabel } from '@/lib/permissions';
import { EmptyState } from '@/components/molecules/empty-state';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Permisos y roles — Admin · ResponseGrid',
  description: 'Concede y revoca roles a usuarios y cuentas de servicio.',
};

type Props = { searchParams: Promise<{ principalId?: string }> };

export default async function PermisosPage({ searchParams }: Props) {
  const token = await getToken();
  if (!token) redirect('/login?next=/admin/permisos');

  const { data: me, response: meRes } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });
  if (meRes.status === 401 || !me) redirect('/login?next=/admin/permisos');
  if (!me.isAdmin) redirect('/');

  const { principalId } = await searchParams;
  const lookupId = (principalId ?? '').trim();

  const [roles, grants] = await Promise.all([
    fetchRoles(),
    lookupId ? fetchGrants(lookupId) : Promise.resolve([]),
  ]);

  return (
    <main className="flex-1 flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-2xl flex flex-col gap-10">
        <header className="flex flex-col gap-2">
          <Link
            href="/"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Inicio
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Permisos y roles
          </h1>
          <p className="text-base text-gray-600">
            Concede y revoca roles a usuarios y cuentas de servicio. Solo
            administradores.
          </p>
        </header>

        {/* ── Look up a principal's grants ───────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900">
            Consultar roles de un principal
          </h2>
          <form method="get" className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              name="principalId"
              defaultValue={lookupId}
              placeholder="UUID del usuario o cuenta de servicio"
              className="flex-1 rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            />
            <button
              type="submit"
              className="rounded-lg border-2 border-gray-900 bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-700"
            >
              Consultar
            </button>
          </form>

          {lookupId &&
            (grants.length === 0 ? (
              <EmptyState title="Este principal no tiene roles asignados." />
            ) : (
              <ul className="flex flex-col gap-2" role="list">
                {grants.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-gray-300 bg-white p-3"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-bold text-gray-900">
                        {g.roleId}
                      </span>
                      <span className="text-xs text-gray-600">
                        {scopeLabel(g.scopeType, g.scopeId)}
                      </span>
                      {g.expiresAt && (
                        <span className="text-xs text-amber-700">
                          caduca{' '}
                          {new Date(g.expiresAt).toLocaleDateString('es-ES')}
                        </span>
                      )}
                    </div>
                    <RevokeGrantButton grantId={g.id} />
                  </li>
                ))}
              </ul>
            ))}
        </section>

        <hr className="border-gray-200" />

        {/* ── Grant a role ───────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900">Conceder un rol</h2>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-300 rounded px-3 py-2">
            La concesión está sujeta a atenuación: solo puedes conceder permisos
            que tú ya tengas en ese ámbito.
          </p>
          <GrantRoleForm roles={roles} defaultPrincipalId={lookupId} />
        </section>

        <hr className="border-gray-200" />

        {/* ── Role catalog reference ─────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900">
            Catálogo de roles ({roles.length})
          </h2>
          <ul className="flex flex-col gap-2" role="list">
            {roles.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <span className="text-sm font-bold text-gray-900">{r.id}</span>
                <span className="text-xs text-gray-600">{r.description}</span>
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-500">
                    {r.permissions.length} permisos
                  </summary>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.permissions.map((p) => (
                      <span
                        key={p}
                        className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-gray-700"
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
      </div>
    </main>
  );
}
