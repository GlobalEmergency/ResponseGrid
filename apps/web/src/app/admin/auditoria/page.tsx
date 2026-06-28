import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchAuditEntries } from './actions';
import { AuditFilter } from './audit-filter';
import { AuditEntryCard, AuditEntryRow } from '@/components/molecules/audit-entry-row';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageHeaderBand } from '@/components/molecules/page-header-band';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Registro de auditoría — Admin · ResponseGrid',
  description: 'Registro de actividad del sistema. Solo administradores.',
};

interface PageProps {
  searchParams: Promise<{
    entityType?: string;
    emergencyId?: string;
    offset?: string;
  }>;
}

const PAGE_LIMIT = 50;

export default async function AuditoriaPage({ searchParams }: PageProps) {
  // ── Auth guard ──────────────────────────────────────────────────────────
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/admin/auditoria');
  }

  // ── Admin check via GET /auth/me ────────────────────────────────────────
  const { data: me, response: meResponse } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });

  if (meResponse.status === 401 || !me) {
    redirect('/login?next=/admin/auditoria');
  }

  if (!me.isAdmin) {
    redirect('/');
  }

  // ── Resolve searchParams ─────────────────────────────────────────────────
  const params = await searchParams;
  const entityType = params.entityType ?? '';
  const emergencyId = params.emergencyId ?? '';
  const offset = Number(params.offset ?? '0');

  // ── Fetch audit entries ──────────────────────────────────────────────────
  const { entries, total } = await fetchAuditEntries({
    ...(entityType ? { entityType } : {}),
    ...(emergencyId ? { emergencyId } : {}),
    limit: PAGE_LIMIT,
    offset,
  });

  const hasFilters = entityType !== '' || emergencyId !== '';
  const prevOffset = Math.max(0, offset - PAGE_LIMIT);
  const nextOffset = offset + PAGE_LIMIT;
  const hasPrev = offset > 0;
  const hasNext = nextOffset < total;

  function paginationHref(newOffset: number) {
    const p = new URLSearchParams();
    if (entityType) p.set('entityType', entityType);
    if (emergencyId) p.set('emergencyId', emergencyId);
    if (newOffset > 0) p.set('offset', String(newOffset));
    const qs = p.toString();
    return qs ? `?${qs}` : '?';
  }

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-5xl">
        <PageHeaderBand
          backHref="/"
          backLabel="← Inicio"
          title="Registro de auditoría"
          subtitle="Actividad registrada en el sistema. Solo administradores."
        />
        <div className="flex flex-col gap-8 px-4 pb-12 pt-6">

        {total > 0 && (
          <p className="text-xs text-muted-soft">
            {total} entrada{total !== 1 ? 's' : ''} en total
            {hasFilters ? ' (filtrado)' : ''}
          </p>
        )}

        {/* ── FILTROS ─────────────────────────────────────────────────── */}
        <section aria-label="Filtros">
          <AuditFilter />
        </section>

        {/* ── LISTADO ─────────────────────────────────────────────────── */}
        <section aria-labelledby="audit-heading" className="flex flex-col gap-4">
          <h2 id="audit-heading" className="text-xl font-bold text-ink">
            Entradas recientes
          </h2>

          {entries.length === 0 ? (
            <EmptyState
              title="No hay entradas de auditoría."
              description={
                hasFilters
                  ? 'Prueba a cambiar o eliminar los filtros.'
                  : 'El registro de auditoría está vacío.'
              }
            />
          ) : (
            <>
              {/* ── Mobile: stacked cards ──────────────────────────────── */}
              <ul className="flex flex-col gap-3 md:hidden" role="list">
                {entries.map((entry) => (
                  <AuditEntryCard key={entry.id} entry={entry} />
                ))}
              </ul>

              {/* ── Desktop: table ─────────────────────────────────────── */}
              <div className="hidden md:block overflow-x-auto rounded-lg border-2 border-navy">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface border-b-2 border-navy">
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
                        Acción
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
                        Actor
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
                        Entidad
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
                        Petición
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
                        Estado
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <AuditEntryRow key={entry.id} entry={entry} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ─────────────────────────────────────────── */}
              {(hasPrev || hasNext) && (
                <nav
                  aria-label="Paginación del registro"
                  className="flex items-center justify-between gap-4 pt-2"
                >
                  {hasPrev ? (
                    <Link
                      href={paginationHref(prevOffset)}
                      className="text-sm font-medium text-muted hover:text-ink underline underline-offset-2 transition-colors"
                    >
                      ← Anterior
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-muted-soft">
                    {offset + 1}–{Math.min(offset + PAGE_LIMIT, total)} de {total}
                  </span>
                  {hasNext ? (
                    <Link
                      href={paginationHref(nextOffset)}
                      className="text-sm font-medium text-muted hover:text-ink underline underline-offset-2 transition-colors"
                    >
                      Siguiente →
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </>
          )}
        </section>

        </div>
      </div>
    </main>
  );
}
