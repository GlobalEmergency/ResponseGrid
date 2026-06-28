import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchAuditEntries } from './actions';
import { AuditFilter } from './audit-filter';
import { AuditEntryCard, AuditEntryRow } from '@/components/molecules/audit-entry-row';
import { EmptyState } from '@/components/molecules/empty-state';

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
    <main className="flex-1 flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-5xl flex flex-col gap-10">

        {/* ── CABECERA ────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← Inicio
            </Link>
            <span className="text-gray-300" aria-hidden="true">/</span>
            <Link
              href="/admin/acreditaciones"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Admin
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Registro de auditoría
          </h1>
          <p className="text-base text-gray-600">
            Actividad registrada en el sistema. Solo administradores.
          </p>
          {total > 0 && (
            <p className="text-xs text-gray-400">
              {total} entrada{total !== 1 ? 's' : ''} en total
              {hasFilters ? ' (filtrado)' : ''}
            </p>
          )}
        </header>

        {/* ── FILTROS ─────────────────────────────────────────────────── */}
        <section aria-label="Filtros">
          <AuditFilter />
        </section>

        {/* ── LISTADO ─────────────────────────────────────────────────── */}
        <section aria-labelledby="audit-heading" className="flex flex-col gap-4">
          <h2 id="audit-heading" className="text-xl font-bold text-gray-900">
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
              <div className="hidden md:block overflow-x-auto rounded-lg border-2 border-gray-900">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-gray-900">
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-gray-700">
                        Acción
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-gray-700">
                        Actor
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-gray-700">
                        Entidad
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-gray-700">
                        Petición
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-gray-700">
                        Estado
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-gray-700">
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
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 underline underline-offset-2 transition-colors"
                    >
                      ← Anterior
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-gray-400">
                    {offset + 1}–{Math.min(offset + PAGE_LIMIT, total)} de {total}
                  </span>
                  {hasNext ? (
                    <Link
                      href={paginationHref(nextOffset)}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 underline underline-offset-2 transition-colors"
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
    </main>
  );
}
