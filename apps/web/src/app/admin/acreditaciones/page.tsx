import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchAccreditations } from './actions';
import { GrantAccreditationForm } from './grant-form';
import { RevokeButton } from './revoke-button';
import { EmptyState } from '@/components/molecules/empty-state';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Acreditaciones — Admin · ResponseGrid',
  description: 'Gestión de acreditaciones de organizaciones.',
};

export default async function AcreditacionesPage() {
  // ── Auth guard ──────────────────────────────────────────────────────────
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/admin/acreditaciones');
  }

  // ── Admin check via GET /auth/me ────────────────────────────────────────
  const { data: me, response: meResponse } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });

  if (meResponse.status === 401 || !me) {
    redirect('/login?next=/admin/acreditaciones');
  }

  if (!me.isAdmin) {
    redirect('/');
  }

  // ── Fetch existing accreditations ────────────────────────────────────────
  const accreditations = await fetchAccreditations();

  return (
    <main className="flex-1 flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-10">

        {/* ── CABECERA ────────────────────────────────────────────────── */}
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
            Acreditaciones
          </h1>
          <p className="text-base text-gray-600">
            Gestión de acreditaciones de organizaciones. Solo administradores.
          </p>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-300 rounded px-3 py-2">
            Nota: el ID de organización debe introducirse manualmente (no hay listado global de organizaciones disponible).
          </p>
        </header>

        {/* ── LISTADO DE ACREDITACIONES ────────────────────────────────── */}
        <section aria-labelledby="list-heading" className="flex flex-col gap-4">
          <h2 id="list-heading" className="text-xl font-bold text-gray-900">
            Acreditaciones vigentes ({accreditations.length})
          </h2>

          {accreditations.length === 0 ? (
            <EmptyState
              title="No hay acreditaciones vigentes."
              description="Usa el formulario de abajo para conceder la primera."
            />
          ) : (
            <ul className="flex flex-col gap-3" role="list">
              {accreditations.map((acc) => {
                const scopeLabel =
                  acc.scope === 'global'
                    ? 'Global'
                    : `Emergencia: ${acc.scope.emergencyId}`;

                return (
                  <li
                    key={acc.id}
                    className="flex items-start justify-between gap-4 rounded-lg border-2 border-gray-900 bg-white p-4"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-bold text-gray-900 break-all">
                        Org: {acc.organizationId}
                      </span>
                      <span className="text-xs text-gray-600 font-medium">
                        Alcance: {scopeLabel}
                      </span>
                      {acc.evidence && (
                        <span className="text-xs text-gray-500 break-all">
                          Evidencia: {acc.evidence}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        Concedida:{' '}
                        <time dateTime={acc.grantedAt} suppressHydrationWarning>
                          {new Date(acc.grantedAt).toLocaleDateString('es-ES')}
                        </time>
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      <RevokeButton accreditationId={acc.id} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <hr className="border-gray-200" />

        {/* ── CONCEDER ACREDITACIÓN ────────────────────────────────────── */}
        <section aria-labelledby="grant-heading" className="flex flex-col gap-4">
          <h2 id="grant-heading" className="text-xl font-bold text-gray-900">
            Conceder acreditación
          </h2>
          <GrantAccreditationForm />
        </section>

      </div>
    </main>
  );
}
