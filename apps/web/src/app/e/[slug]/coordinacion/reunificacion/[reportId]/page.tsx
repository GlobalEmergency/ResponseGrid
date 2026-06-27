import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { MissingPersonDetail } from '@/components/organisms/missing-person-detail';
import { getT } from '@/i18n/server';
import {
  updateReportStatus,
  addSighting,
} from '../actions';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string; reportId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    return {
      title: 'Emergencia no encontrada · ResponseGrid',
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `Detalle solicitud — ${emergency.name} · ResponseGrid`,
    // Sensitive — must not be indexed
    robots: { index: false, follow: false },
  };
}

export default async function ReportDetailPage({ params }: Props) {
  const { slug, reportId } = await params;

  // Auth guard
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion/reunificacion/${reportId}`);
  }

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const { t } = await getT();
  const tc = t.coord_reunificacion;
  const headers = authHeaders(token);

  const { data: report, response } = await api.GET(
    '/reunification/{reportId}',
    {
      params: { path: { reportId } },
      headers,
    },
  );

  if (response.status === 401 || response.status === 403) {
    redirect(`/login?next=/e/${slug}/coordinacion/reunificacion/${reportId}`);
  }

  if (report === undefined) {
    notFound();
  }

  // Bind server actions with context
  const boundUpdateStatus = updateReportStatus.bind(null, slug, reportId);
  const boundAddSighting = addSighting.bind(null, slug, reportId);

  return (
    <main className="flex-1 flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-3">
          <Link
            href={`/e/${slug}/coordinacion/reunificacion`}
            className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded w-fit"
          >
            {tc.back_to_queue}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {report.person.firstName} {report.person.lastName}
          </h1>
          <p className="text-sm text-gray-600">{emergency.name}</p>
        </header>

        {/* Detail */}
        <MissingPersonDetail
          report={report}
          updateStatusAction={boundUpdateStatus}
          addSightingAction={boundAddSighting}
          t={tc}
        />
      </div>
    </main>
  );
}
