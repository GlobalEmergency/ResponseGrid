import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { submitReport } from './actions';
import { ReportForm } from './report-form';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { Card } from '@/components/atoms/card';
import { getT } from '@/i18n/server';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  const { t } = await getT();
  if (!emergency) return { title: 'Emergencia no encontrada · ResponseGrid' };
  return {
    title: t.reportar.meta_title.replace('{emergencyName}', emergency.name),
    description: t.reportar.meta_description.replace('{emergencyName}', emergency.name),
  };
}

export const dynamic = 'force-dynamic';

export default async function ReportarPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const { t } = await getT();

  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/reportar`);
  }

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  // Fetch my resources for the optional "punto relacionado" selector
  let myResources: Array<{ id: string; name: string }> = [];
  try {
    const { data } = await api.GET(
      '/emergencies/{emergencyId}/resources/mine',
      {
        params: { path: { emergencyId: emergency.id } },
        headers: authHeaders(token),
      },
    );
    if (data != null) {
      myResources = data
        .filter(
          (r): r is typeof r & { id: string; name: string } =>
            typeof r.id === 'string' && typeof r.name === 'string',
        )
        .map((r) => ({ id: r.id, name: r.name }));
    }
  } catch {
    // non-fatal — form still works without point selector
  }

  const prefilledResourceId =
    typeof resolvedSearchParams.resourceId === 'string'
      ? resolvedSearchParams.resourceId
      : undefined;

  const boundAction = submitReport.bind(null, emergency.id);

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeaderBand
          backHref={`/e/${slug}`}
          backLabel={t.common.back_to_emergency}
          title={t.reportar.page_title}
          subtitle={emergency.name}
        />
        <div className="flex flex-col gap-8 px-5 pb-12 pt-6 lg:px-8">
          <Card className="p-5 lg:p-7">
            <ReportForm
              action={boundAction}
              slug={slug}
              myResources={myResources}
              prefilledResourceId={prefilledResourceId}
              t={t.reportar}
              backToEmergencyLabel={t.common.back_to_emergency}
            />
          </Card>
        </div>
      </div>
    </main>
  );
}
