import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { EmptyState } from '@/components/molecules/empty-state';
import { ReportCard } from '@/components/organisms/report-card';
import { DamageReportsQueue } from '@/components/organisms/damage-reports-queue';
import type { FieldReport } from '@/components/organisms/report-card';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: 'Emergencia no encontrada · ResponseGrid' };
  return {
    title: `Reportes de campo — ${emergency.name} · ResponseGrid`,
    description: `Cola de partes de campo de ${emergency.name}.`,
  };
}

const VALID_STATUSES = ['open', 'reviewed', 'published', 'closed'] as const;
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const VALID_TYPES = [
  'incident',
  'stock',
  'status',
  'other',
  'structural_damage',
  'trapped_persons',
] as const;

type ReportStatus = typeof VALID_STATUSES[number];
type ReportPriority = typeof VALID_PRIORITIES[number];
type ReportType = typeof VALID_TYPES[number];

const STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'Abiertos',
  reviewed: 'Revisados',
  published: 'Publicados',
  closed: 'Cerrados',
};

const PRIORITY_LABELS: Record<ReportPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

export default async function CoordinacionReportesPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  // --- Auth guard ---
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion/reportes`);
  }

  // --- Emergency resolution ---
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;
  const headers = authHeaders(token);

  // --- Parse and validate filter params ---
  const rawStatus = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : undefined;
  const rawPriority = typeof resolvedSearchParams.priority === 'string' ? resolvedSearchParams.priority : undefined;
  const rawResourceId = typeof resolvedSearchParams.resourceId === 'string' ? resolvedSearchParams.resourceId : undefined;
  const rawType = typeof resolvedSearchParams.type === 'string' ? resolvedSearchParams.type : undefined;

  const statusFilter = (VALID_STATUSES as readonly string[]).includes(rawStatus ?? '')
    ? (rawStatus as ReportStatus)
    : undefined;
  const priorityFilter = (VALID_PRIORITIES as readonly string[]).includes(rawPriority ?? '')
    ? (rawPriority as ReportPriority)
    : undefined;
  const typeFilter = (VALID_TYPES as readonly string[]).includes(rawType ?? '')
    ? (rawType as ReportType)
    : undefined;

  const resourceIdFilter = rawResourceId !== undefined && rawResourceId.trim().length > 0
    ? rawResourceId.trim()
    : undefined;

  // --- Fetch reports ---
  // Use the body openapi-fetch already parsed (`data`); calling response.json()
  // a second time throws "Body has already been read".
  let reports: FieldReport[] = [];
  const { data, response } = await api.GET('/emergencies/{emergencyId}/reports', {
    params: {
      path: { emergencyId },
      query: {
        status: statusFilter,
        priority: priorityFilter,
        resourceId: resourceIdFilter,
        type: typeFilter,
      },
    },
    headers,
  });

  if (response.status === 401) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/coordinacion/reportes`);
  }

  if (response.status === 403) {
    redirect(`/e/${slug}/coordinacion`);
  }

  if (response.ok && Array.isArray(data)) {
    reports = (data as unknown[]).filter(
      (r): r is FieldReport =>
        typeof r === 'object' &&
        r != null &&
        typeof (r as Record<string, unknown>).id === 'string' &&
        typeof (r as Record<string, unknown>).type === 'string' &&
        typeof (r as Record<string, unknown>).note === 'string' &&
        typeof (r as Record<string, unknown>).priority === 'string' &&
        typeof (r as Record<string, unknown>).status === 'string',
    );
  }

  const baseUrl = `/e/${slug}/coordinacion/reportes`;

  return (
    <main className="flex-1 flex flex-col items-center justify-start px-4 py-10 bg-white">
      <div className="w-full max-w-xl flex flex-col gap-8">

        {/* ── CABECERA ────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Reportes de campo
              </h1>
              <p className="text-base text-gray-600 font-medium">
                {emergency.name}
              </p>
            </div>

            <Link
              href={`/e/${slug}/coordinacion`}
              className="flex-shrink-0 rounded-lg border-2 border-gray-900 px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              ← Coordinación
            </Link>
          </div>
        </header>

        <hr className="border-gray-200" />

        {/* ── FILTROS ─────────────────────────────────────────────────── */}
        <section aria-labelledby="filters-heading" className="flex flex-col gap-3">
          <h2 id="filters-heading" className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Filtrar
          </h2>

          <div className="flex flex-wrap gap-2">
            {/* Status filter */}
            <div className="flex gap-1">
              <Link
                href={baseUrl}
                className={[
                  'rounded-lg border-2 px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1',
                  statusFilter === undefined
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900',
                ].join(' ')}
              >
                Todos
              </Link>
              {VALID_STATUSES.map((s) => (
                <Link
                  key={s}
                  href={`${baseUrl}?status=${s}${priorityFilter !== undefined ? `&priority=${priorityFilter}` : ''}`}
                  className={[
                    'rounded-lg border-2 px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1',
                    statusFilter === s
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900',
                  ].join(' ')}
                >
                  {STATUS_LABELS[s]}
                </Link>
              ))}
            </div>

            {/* Priority filter */}
            <div className="flex gap-1">
              {VALID_PRIORITIES.map((p) => (
                <Link
                  key={p}
                  href={`${baseUrl}?${statusFilter !== undefined ? `status=${statusFilter}&` : ''}priority=${p}`}
                  className={[
                    'rounded-lg border-2 px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1',
                    priorityFilter === p
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900',
                  ].join(' ')}
                >
                  {PRIORITY_LABELS[p]}
                </Link>
              ))}
            </div>
          </div>

          {/* Clear filters */}
          {(statusFilter !== undefined || priorityFilter !== undefined) && (
            <Link
              href={baseUrl}
              className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-900 rounded w-fit"
            >
              Limpiar filtros
            </Link>
          )}
        </section>

        <hr className="border-gray-200" />

        {/* ── COLA SAR — Daños y atrapados ────────────────────────────── */}
        {typeFilter === undefined && (
          <DamageReportsQueue reports={reports} slug={slug} />
        )}

        {typeFilter !== undefined &&
          (typeFilter === 'structural_damage' || typeFilter === 'trapped_persons') && (
            <DamageReportsQueue reports={reports} slug={slug} />
          )}

        <hr className="border-gray-200" />

        {/* ── LISTA DE PARTES ─────────────────────────────────────────── */}
        <section aria-labelledby="reports-heading" className="flex flex-col gap-4">
          <h2 id="reports-heading" className="text-xl font-bold text-gray-900">
            Partes recibidos
            {reports.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({reports.length})
              </span>
            )}
          </h2>

          {reports.length === 0 ? (
            <EmptyState
              title="No hay partes con los filtros seleccionados."
              description="Ajusta los filtros o espera a que los voluntarios envíen partes de campo."
            />
          ) : (
            <ul className="flex flex-col gap-4" aria-label="Lista de partes de campo">
              {reports.map((report) => (
                <li key={report.id}>
                  <ReportCard report={report} slug={slug} />
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </main>
  );
}
