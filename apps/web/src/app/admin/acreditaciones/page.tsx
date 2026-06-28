import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchAccreditations } from './actions';
import { GrantAccreditationForm } from './grant-form';
import { RevokeButton } from './revoke-button';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageHeaderBand } from '@/components/molecules/page-header-band';

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
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-xl">
        <PageHeaderBand
          backHref="/"
          backLabel="← Inicio"
          title="Acreditaciones"
          subtitle="Gestión de acreditaciones de organizaciones. Solo administradores."
        />
        <div className="flex flex-col gap-8 px-4 pb-12 pt-6">

        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-300 rounded px-3 py-2">
          Nota: el ID de organización debe introducirse manualmente (no hay listado global de organizaciones disponible).
        </p>

        {/* ── LISTADO DE ACREDITACIONES ────────────────────────────────── */}
        <section aria-labelledby="list-heading" className="flex flex-col gap-4">
          <h2 id="list-heading" className="text-xl font-bold text-ink">
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
                    className="flex items-start justify-between gap-4 rounded-lg border-2 border-navy bg-white p-4"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-bold text-ink break-all">
                        Org: {acc.organizationId}
                      </span>
                      <span className="text-xs text-muted font-medium">
                        Alcance: {scopeLabel}
                      </span>
                      {acc.evidence && (
                        <span className="text-xs text-muted break-all">
                          Evidencia: {acc.evidence}
                        </span>
                      )}
                      <span className="text-xs text-muted-soft">
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

        <hr className="border-line" />

        {/* ── CONCEDER ACREDITACIÓN ────────────────────────────────────── */}
        <section aria-labelledby="grant-heading" className="flex flex-col gap-4">
          <h2 id="grant-heading" className="text-xl font-bold text-ink">
            Conceder acreditación
          </h2>
          <GrantAccreditationForm />
        </section>

        </div>
      </div>
    </main>
  );
}
