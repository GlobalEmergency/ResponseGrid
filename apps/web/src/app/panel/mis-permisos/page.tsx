import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { scopeLabel } from '@/lib/permissions';
import { formatDate } from '@/lib/format-date';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageContainer } from '@/components/molecules/page-container';
import { PageHeader } from '@/components/molecules/page-header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mis permisos · ResponseGrid',
  description: 'Tus roles, ámbitos y lo que puedes hacer.',
};

export default async function MisPermisosPage() {
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/panel/mis-permisos');
  }

  const [{ data: me, response: meRes }, { data: roles }] = await Promise.all([
    api.GET('/auth/me', { headers: authHeaders(token) }),
    api.GET('/roles', { headers: authHeaders(token) }),
  ]);

  if (meRes.status === 401 || !me) {
    redirect('/login?next=/panel/mis-permisos');
  }

  const roleMap = new Map((roles ?? []).map((r) => [r.id, r]));
  const grants = me.grants ?? [];

  return (
    <main className="flex-1 bg-surface">
      <PageContainer>
        <PageHeader
          title="Mis permisos"
          subtitle="Tus roles, dónde aplican y qué te permiten hacer."
        />

        {/* Identity */}
        <section className="flex flex-col gap-2 rounded-lg border border-line p-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-ink">{me.name}</span>
            {me.isAdmin && (
              <span className="inline-flex items-center rounded-full border border-navy bg-navy px-2.5 py-0.5 text-xs font-semibold text-white">
                Administrador de plataforma
              </span>
            )}
          </div>
          <span className="text-sm text-muted">{me.email}</span>
          <span className="text-xs text-muted break-all">ID: {me.id}</span>
        </section>

        {/* Grants */}
        <section aria-labelledby="grants-heading" className="flex flex-col gap-4">
          <h2 id="grants-heading" className="text-xl font-bold text-ink">
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
                    className="flex flex-col gap-2 rounded-lg border border-line bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-sm font-bold text-ink">
                        {g.roleId}
                      </span>
                      <span className="text-sm text-muted">en</span>
                      <span className="text-sm font-semibold text-ink-soft">
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
                      <p className="text-sm text-muted">{role.description}</p>
                    )}
                    {role && role.permissions.length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer font-medium text-ink-soft">
                          Ver permisos ({role.permissions.length})
                        </summary>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {role.permissions.map((p) => (
                            <li
                              key={p}
                              className="rounded bg-surface px-2 py-0.5 font-mono text-xs text-ink-soft"
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

        <p className="text-xs text-muted">
          ¿Necesitas más permisos? Contacta con un administrador o con el manager
          del grupo correspondiente.
        </p>
      </PageContainer>
    </main>
  );
}
