import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchMyGroups } from './actions';
import { CreateGroupForm } from './create-group-form';
import { scopeTypeLabel } from '@/lib/permissions';
import { EmptyState } from '@/components/molecules/empty-state';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mis grupos · ResponseGrid',
  description: 'Tus cuadrillas y grupos de voluntarios.',
};

export default async function GruposPage() {
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/grupos');
  }

  const [{ data: me, response: meRes }, { data: roles }, myGroups] =
    await Promise.all([
      api.GET('/auth/me', { headers: authHeaders(token) }),
      api.GET('/roles', { headers: authHeaders(token) }),
      fetchMyGroups(),
    ]);

  if (meRes.status === 401 || !me) {
    redirect('/login?next=/grupos');
  }

  // Can the user create groups? True if any of their roles confers group:create.
  const roleMap = new Map((roles ?? []).map((r) => [r.id, r]));
  const canCreate =
    me.isAdmin ||
    (me.grants ?? []).some((g) =>
      roleMap.get(g.roleId)?.permissions.includes('group:create'),
    );

  return (
    <main className="flex-1 flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-10">
        <header className="flex flex-col gap-2">
          <Link
            href="/"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Inicio
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Mis grupos
          </h1>
          <p className="text-base text-gray-600">
            Cuadrillas y grupos de voluntarios a los que perteneces o gestionas.
          </p>
        </header>

        <section aria-labelledby="list-heading" className="flex flex-col gap-4">
          <h2 id="list-heading" className="text-xl font-bold text-gray-900">
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
                    href={`/grupos/${g.id}`}
                    className="flex items-center justify-between gap-4 rounded-lg border-2 border-gray-900 bg-white p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-bold text-gray-900">
                        {g.name}
                      </span>
                      <span className="text-xs text-gray-500">
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
            <hr className="border-gray-200" />
            <section
              aria-labelledby="create-heading"
              className="flex flex-col gap-4"
            >
              <h2
                id="create-heading"
                className="text-xl font-bold text-gray-900"
              >
                Crear un grupo
              </h2>
              <CreateGroupForm />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
