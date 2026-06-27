import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { MissingPersonQueue } from '@/components/organisms/missing-person-queue';
import { getT } from '@/i18n/server';
import type { components } from '@reliefhub/api-client';

type MissingPersonReportListItemDto =
  components['schemas']['MissingPersonReportListItemDto'];
type MissingPersonReportDetailDto =
  components['schemas']['MissingPersonReportDetailDto'];

export const dynamic = 'force-dynamic';

type ReunificationStatus = 'open' | 'under_review' | 'matched' | 'closed';

const VALID_STATUSES: ReunificationStatus[] = [
  'open',
  'under_review',
  'matched',
  'closed',
];

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  const { t } = await getT();

  if (!emergency) {
    return { title: 'Emergencia no encontrada · ResponseGrid' };
  }

  return {
    title: t.coord_reunificacion.meta_title.replace(
      '{emergencyName}',
      emergency.name,
    ),
    // Coordination panel — must not be indexed
    robots: { index: false, follow: false },
  };
}

export default async function CoordinacionReunificacionPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  // --- Auth guard ---
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion/reunificacion`);
  }

  // --- Emergency resolution ---
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const { t } = await getT();
  const tc = t.coord_reunificacion;
  const headers = authHeaders(token);
  const emergencyId = emergency.id;

  // --- Filter param ---
  const rawStatus =
    typeof resolvedSearchParams.status === 'string'
      ? resolvedSearchParams.status
      : undefined;
  const statusFilter = VALID_STATUSES.includes(rawStatus as ReunificationStatus)
    ? (rawStatus as ReunificationStatus)
    : undefined;

  // --- Search param ---
  const searchDocumentId =
    typeof resolvedSearchParams.q === 'string'
      ? resolvedSearchParams.q.trim()
      : '';

  // --- Fetch reports ---
  // The list endpoint returns MissingPersonReportListItemDto[] (no sensitive fields).
  // The search endpoint returns MissingPersonReportDetailDto[] (full detail).
  // We handle both cases, converting search results to the list format for uniform rendering.
  let listReports: MissingPersonReportListItemDto[] = [];
  let searchResults: MissingPersonReportDetailDto[] = [];

  if (searchDocumentId !== '') {
    const { data } = await api.GET(
      '/emergencies/{emergencyId}/reunification/search',
      {
        params: {
          path: { emergencyId },
          query: { documentId: searchDocumentId },
        },
        headers,
      },
    );
    searchResults = data ?? [];
    // Map detail to list-item shape for MissingPersonQueue
    listReports = searchResults.map(
      (r): MissingPersonReportListItemDto => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        person: {
          firstName: r.person.firstName,
          lastName: r.person.lastName,
          approximateAge: r.person.approximateAge,
          lastKnownLocation: r.person.lastKnownLocation,
          ...(r.person.lastKnownCoords != null
            ? { lastKnownCoords: r.person.lastKnownCoords }
            : {}),
          ...(r.person.description != null
            ? { description: r.person.description }
            : {}),
        },
      }),
    );
  } else {
    const { data } = await api.GET(
      '/emergencies/{emergencyId}/reunification',
      {
        params: {
          path: { emergencyId },
          query: statusFilter != null ? { status: statusFilter } : {},
        },
        headers,
      },
    );
    listReports = data ?? [];
  }

  const filterOptions: Array<{
    value: ReunificationStatus | '';
    label: string;
  }> = [
    { value: '', label: tc.filter_all },
    { value: 'open', label: 'Abierto' },
    { value: 'under_review', label: 'En revisión' },
    { value: 'matched', label: 'Encontrado' },
    { value: 'closed', label: 'Cerrado' },
  ];

  return (
    <main className="flex-1 flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-3">
          <Link
            href={`/e/${slug}/coordinacion`}
            className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded w-fit"
          >
            ← Coordinación
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {tc.page_title}
          </h1>
          <p className="text-sm text-gray-600">{emergency.name}</p>
        </header>

        {/* Search by documentId */}
        <section
          aria-labelledby="search-heading"
          className="flex flex-col gap-3"
        >
          <h2
            id="search-heading"
            className="text-base font-bold text-gray-900 uppercase tracking-wide"
          >
            {tc.search_heading}
          </h2>
          <form
            method="GET"
            className="flex gap-2"
            aria-label={tc.search_heading}
          >
            <input
              type="search"
              name="q"
              defaultValue={searchDocumentId}
              placeholder={tc.search_placeholder}
              className="flex-1 rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            />
            <button
              type="submit"
              className="rounded-lg border-2 border-gray-900 bg-gray-900 px-4 py-3 text-base font-semibold text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
            >
              {tc.search_button}
            </button>
          </form>
          {searchDocumentId !== '' && (
            <Link
              href={`/e/${slug}/coordinacion/reunificacion`}
              className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded w-fit"
            >
              ← Borrar búsqueda
            </Link>
          )}
        </section>

        {/* Status filter */}
        {searchDocumentId === '' && (
          <section
            aria-labelledby="filter-heading"
            className="flex flex-col gap-3"
          >
            <h2
              id="filter-heading"
              className="text-base font-bold text-gray-900 uppercase tracking-wide"
            >
              {tc.filter_label}
            </h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label={tc.filter_label}>
              {filterOptions.map((opt) => {
                const isActive =
                  (opt.value === '' && statusFilter === undefined) ||
                  opt.value === statusFilter;
                const href =
                  opt.value === ''
                    ? `/e/${slug}/coordinacion/reunificacion`
                    : `/e/${slug}/coordinacion/reunificacion?status=${opt.value}`;
                return (
                  <Link
                    key={opt.value}
                    href={href}
                    className={[
                      'inline-flex items-center rounded-full border-2 px-3 py-1 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2',
                      isActive
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500',
                    ].join(' ')}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {opt.label}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Queue */}
        <section
          aria-labelledby="queue-heading"
          className="flex flex-col gap-4"
        >
          <h2
            id="queue-heading"
            className="text-xl font-bold text-gray-900"
          >
            {tc.queue_heading}
            {searchDocumentId !== '' && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                — Resultados para «{searchDocumentId}»
              </span>
            )}
          </h2>

          {searchDocumentId !== '' && listReports.length === 0 ? (
            <p className="text-sm text-gray-500">{tc.search_no_results}</p>
          ) : (
            <MissingPersonQueue
              reports={listReports}
              slug={slug}
              t={tc}
            />
          )}
        </section>
      </div>
    </main>
  );
}
