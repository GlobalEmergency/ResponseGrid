import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { ReunificationStatusBadge } from '@/components/atoms/reunification-status-badge';
import { EmptyState } from '@/components/molecules/empty-state';
import { getT } from '@/i18n/server';
import type { components } from '@reliefhub/api-client';

// Always fetch live data.
export const dynamic = 'force-dynamic';

type MyReportResponseDto = components['schemas']['MyReportResponseDto'];

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  const { t } = await getT();

  if (!emergency) {
    return {
      title: 'Emergencia no encontrada · ResponseGrid',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: t.mi_busqueda.meta_title.replace('{emergencyName}', emergency.name),
    // Sensitive — must not be indexed
    robots: { index: false, follow: false },
  };
}

export default async function MiBusquedaPage({ params }: Props) {
  const { slug } = await params;

  // Auth required
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/mi-busqueda`);
  }

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const { t } = await getT();
  const tm = t.mi_busqueda;

  const { data: reports } = await api.GET(
    '/emergencies/{emergencyId}/reunification/mine',
    {
      params: { path: { emergencyId: emergency.id } },
      headers: authHeaders(token),
    },
  );

  const myReports: MyReportResponseDto[] = reports ?? [];

  return (
    <main className="flex-1 flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-3">
          <Link
            href={`/e/${slug}`}
            className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded w-fit"
          >
            ← {emergency.name}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {tm.page_title}
          </h1>
        </header>

        {/* Reports list */}
        {myReports.length === 0 ? (
          <EmptyState
            title={tm.no_reports_title}
            description={tm.no_reports_description}
          />
        ) : (
          <ul className="flex flex-col gap-4" role="list" aria-label="Mis búsquedas">
            {myReports.map((report) => (
              <li
                key={report.id}
                className="flex flex-col gap-3 rounded-lg border-2 border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-base font-bold text-gray-900">
                      {report.person.firstName} {report.person.lastName}
                    </span>
                    {report.person.approximateAge != null &&
                      Object.keys(report.person.approximateAge).length > 0 && (
                        <span className="text-sm text-gray-500">
                          {String(report.person.approximateAge as unknown as number)} años aprox.
                        </span>
                      )}
                    <span className="text-sm text-gray-600 mt-1">
                      {tm.person_label}: {report.person.lastKnownLocation}
                    </span>
                  </div>
                  <ReunificationStatusBadge status={report.status} />
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                  <span>
                    {tm.submitted_label}{' '}
                    <time
                      suppressHydrationWarning
                      dateTime={report.createdAt}
                    >
                      {new Date(report.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </time>
                  </span>
                  <span>
                    {tm.sightings_label}: {report.sightings.length}
                  </span>
                </div>

                {report.sightings.length > 0 && (
                  <ul className="flex flex-col gap-1.5 border-t border-gray-100 pt-2">
                    {report.sightings.map((sighting) => (
                      <li key={sighting.id} className="text-sm text-gray-700">
                        <span className="font-medium">{tm.sighting_at}:</span>{' '}
                        {sighting.location} —{' '}
                        <time
                          suppressHydrationWarning
                          dateTime={sighting.reportedAt}
                        >
                          {new Date(sighting.reportedAt).toLocaleDateString(
                            'es-ES',
                          )}
                        </time>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
