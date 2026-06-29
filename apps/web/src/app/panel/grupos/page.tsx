import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchMyGroups } from './actions';
import { CreateGroupForm } from './create-group-form';
import { scopeTypeLabel } from '@/lib/permissions';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageContainer } from '@/components/molecules/page-container';
import { PageHeader } from '@/components/molecules/page-header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mis grupos · ResponseGrid',
  description: 'Tus cuadrillas y grupos de voluntarios.',
};

export default async function GruposPage() {
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/panel/grupos');
  }

  const [{ data: me, response: meRes }, { data: roles }, myGroups] =
    await Promise.all([
      api.GET('/auth/me', { headers: authHeaders(token) }),
      api.GET('/roles', { headers: authHeaders(token) }),
      fetchMyGroups(),
    ]);

  if (meRes.status === 401 || !me) {
    redirect('/login?next=/panel/grupos');
  }

  // Can the user create groups? True if any of their roles confers group:create.
  const roleMap = new Map((roles ?? []).map((r) => [r.id, r]));
  const canCreate =
    me.isAdmin ||
    (me.grants ?? []).some((g) =>
      roleMap.get(g.roleId)?.permissions.includes('group:create'),
    );

  return (
    <main className="flex-1 bg-surface">
      <PageContainer>
        <PageHeader
          title="Mis grupos"
          subtitle="Cuadrillas y grupos de voluntarios a los que perteneces o gestionas."
        />

        <section aria-labelledby="list-heading" className="flex flex-col gap-4">
          <h2 id="list-heading" className="text-xl font-bold text-ink">
            Grupos ({myGroups.length})
          </h2>

          {myGroups.length === 0 ? (
            <EmptyState
              title="Aún no perteneces a ningún grupo."
              description={
                canCreate
                  ? 'Crea uno abajo, o pide a un manager que te añada.'
                  : 'Pide a un manager que te añada, o solicita unirte a un grupo público.'
              }
            />
          ) : (
            <ul className="flex flex-col gap-3" role="list">
              {myGroups.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/panel/grupos/${g.id}`}
                    className="flex items-center justify-between gap-4 rounded-lg border border-line bg-white p-4 transition-colors hover:bg-surface"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-bold text-ink">
                        {g.name}
                      </span>
                      <span className="text-xs text-muted">
                        {scopeTypeLabel(g.ownerKind)} ·{' '}
                        {g.visibility === 'public' ? 'Público' : 'Privado'}
                      </span>
                    </div>
                    <span
                      className={`inline-flex flex-shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        g.membershipStatus === 'approved'
                          ? 'border-green-400 bg-green-50 text-green-800'
                          : 'border-amber-400 bg-amber-50 text-amber-800'
                      }`}
                    >
                      {g.membershipStatus === 'approved'
                        ? 'Aprobado'
                        : 'Pendiente'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {canCreate && (
          <>
            <hr className="border-line" />
            <section
              aria-labelledby="create-heading"
              className="flex flex-col gap-4"
            >
              <h2 id="create-heading" className="text-xl font-bold text-ink">
                Crear un grupo
              </h2>
              <CreateGroupForm />
            </section>
          </>
        )}
      </PageContainer>
    </main>
  );
}
