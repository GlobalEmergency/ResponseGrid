import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { scopeLabel } from '@/lib/permissions';
import { formatDate } from '@/lib/format-date';
import { EmptyState } from '@/components/molecules/empty-state';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mis permisos · ResponseGrid',
  description: 'Tus roles, ámbitos y lo que puedes hacer.',
};

export default async function MisPermisosPage() {
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/mis-permisos');
  }

  const [{ data: me, response: meRes }, { data: roles }] = await Promise.all([
    api.GET('/auth/me', { headers: authHeaders(token) }),
    api.GET('/roles', { headers: authHeaders(token) }),
  ]);

  if (meRes.status === 401 || !me) {
    redirect('/login?next=/mis-permisos');
  }

  const roleMap = new Map((roles ?? []).map((r) => [r.id, r]));
  const grants = me.grants ?? [];

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
            Mis permisos
          </h1>
          <p className="text-base text-gray-600">
            Tus roles, dónde aplican y qué te permiten hacer.
          </p>
        </header>

        {/* Identity */}
        <section className="flex flex-col gap-2 rounded-lg border-2 border-gray-900 p-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-gray-900">{me.name}</span>
            {me.isAdmin && (
              <span className="inline-flex items-center rounded-full border border-gray-900 bg-gray-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                Administrador de plataforma
              </span>
            )}
          </div>
          <span className="text-sm text-gray-600">{me.email}</span>
          <span className="text-xs text-gray-400 break-all">ID: {me.id}</span>
        </section>

        {/* Grants */}
        <section aria-labelledby="grants-heading" className="flex flex-col gap-4">
          <h2 id="grants-heading" className="text-xl font-bold text-gray-900">
            Mis roles ({grants.length})
          </h2>

          {grants.length === 0 ? (
            <EmptyState
              title="No tienes roles asignados todavía."
              description="Un administrador o el manager de un grupo puede concederte uno."
            />
          ) : (
            <ul className="flex flex-col gap-3" role="list">
              {grants.map((g, i) => {
                const role = roleMap.get(g.roleId);
                return (
                  <li
                    key={`${g.roleId}-${g.scopeType}-${g.scopeId ?? 'p'}-${i}`}
                    className="flex flex-col gap-2 rounded-lg border-2 border-gray-900 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-gray-900 bg-gray-50 px-2.5 py-0.5 text-sm font-bold text-gray-900">
                        {g.roleId}
                      </span>
                      <span className="text-sm text-gray-500">en</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {scopeLabel(g.scopeType, g.scopeId)}
                      </span>
                      {g.expiresAt && (
                        <span className="text-xs text-amber-700">
                          · caduca{' '}
                          <time dateTime={g.expiresAt} suppressHydrationWarning>
                            {formatDate(g.expiresAt, 'es')}
                          </time>
                        </span>
                      )}
                    </div>
                    {role && (
                      <p className="text-sm text-gray-600">{role.description}</p>
                    )}
                    {role && role.permissions.length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer font-medium text-gray-700">
                          Ver permisos ({role.permissions.length})
                        </summary>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {role.permissions.map((p) => (
                            <li
                              key={p}
                              className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700"
                            >
                              {p}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-xs text-gray-400">
          ¿Necesitas más permisos? Contacta con un administrador o con el manager
          del grupo correspondiente.
        </p>
      </div>
    </main>
  );
}
