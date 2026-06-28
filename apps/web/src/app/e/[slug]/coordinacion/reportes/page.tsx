import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { EmptyState } from '@/components/molecules/empty-state';
import { ReportCard } from '@/components/organisms/report-card';
import type { FieldReport } from '@/components/organisms/report-card';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: t.coord.meta_not_found };
  return {
    title: t.coord.reports_meta_title.replace('{name}', emergency.name),
    description: t.coord.reports_meta_description.replace('{name}', emergency.name),
  };
}

const VALID_STATUSES = ['open', 'reviewed', 'closed'] as const;
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const VALID_TYPES = ['incident', 'stock', 'status', 'other'] as const;

type ReportStatus = typeof VALID_STATUSES[number];
type ReportPriority = typeof VALID_PRIORITIES[number];
type ReportType = typeof VALID_TYPES[number];

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

  const { t } = await getT();
  const tc = t.coord;

  const STATUS_LABELS: Record<ReportStatus, string> = {
    open: tc.reports_status_open,
    reviewed: tc.reports_status_reviewed,
    closed: tc.reports_status_closed,
  };

  const PRIORITY_LABELS: Record<ReportPriority, string> = {
    low: tc.priority_low,
    medium: tc.priority_medium,
    high: tc.priority_high,
    urgent: tc.priority_urgent,
  };

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-5 pb-12 pt-6 lg:max-w-5xl lg:px-8">

        <header className="flex flex-col gap-2">
          <h1 className="font-display text-xl font-bold text-navy lg:text-2xl">{tc.reports_title}</h1>
          <p className="text-sm text-muted">{emergency.name}</p>
        </header>

        {/* ── FILTROS ─────────────────────────────────────────────────── */}
        <section aria-labelledby="filters-heading" className="flex flex-col gap-3">
          <h2 id="filters-heading" className="text-sm font-semibold text-ink uppercase tracking-wide">
            {tc.reports_filter_heading}
          </h2>

          <div className="flex flex-wrap gap-2">
            {/* Status filter */}
            <div className="flex gap-1">
              <Link
                href={baseUrl}
                className={[
                  'rounded-lg border-2 px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1',
                  statusFilter === undefined
                    ? 'border-navy bg-navy text-white'
                    : 'border-line text-muted hover:border-navy hover:text-ink',
                ].join(' ')}
              >
                {tc.reports_filter_all}
              </Link>
              {VALID_STATUSES.map((s) => (
                <Link
                  key={s}
                  href={`${baseUrl}?status=${s}${priorityFilter !== undefined ? `&priority=${priorityFilter}` : ''}`}
                  className={[
                    'rounded-lg border-2 px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1',
                    statusFilter === s
                      ? 'border-navy bg-navy text-white'
                      : 'border-line text-muted hover:border-navy hover:text-ink',
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
                    'rounded-lg border-2 px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1',
                    priorityFilter === p
                      ? 'border-navy bg-navy text-white'
                      : 'border-line text-muted hover:border-navy hover:text-ink',
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
              className="text-xs text-muted-soft underline underline-offset-2 hover:text-ink-soft focus:outline-none focus:ring-1 focus:ring-navy rounded w-fit"
            >
              {tc.reports_filter_clear}
            </Link>
          )}
        </section>

        <hr className="border-line" />

        {/* ── LISTA DE PARTES ─────────────────────────────────────────── */}
        <section aria-labelledby="reports-heading" className="flex flex-col gap-4">
          <h2 id="reports-heading" className="text-xl font-bold text-ink">
            {tc.reports_received_heading}
            {reports.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted">
                ({reports.length})
              </span>
            )}
          </h2>

          {reports.length === 0 ? (
            <EmptyState
              title={tc.reports_empty_title}
              description={tc.reports_empty_description}
            />
          ) : (
            <ul className="flex flex-col gap-4" aria-label={tc.reports_list_label}>
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
