import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getToken } from '@/lib/auth';
import { reportValidity } from './actions';
import { ReportValidezForm } from './report-validez-form';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { Card } from '@/components/atoms/card';
import { getT } from '@/i18n/server';

type Props = {
  params: Promise<{ slug: string; resourceId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  const { t } = await getT();
  if (!emergency) return { title: 'Emergencia no encontrada · ResponseGrid' };
  return {
    title: t.reportar_validez.meta_title.replace(
      '{emergencyName}',
      emergency.name,
    ),
    description: t.reportar_validez.meta_description,
  };
}

export const dynamic = 'force-dynamic';

export default async function ReportarEstadoPage({ params }: Props) {
  const { slug, resourceId } = await params;
  const { t } = await getT();

  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/recursos/${resourceId}/reportar-estado`);
  }

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const boundAction = reportValidity.bind(null, resourceId, slug);

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeaderBand
          backHref={`/e/${slug}/recursos/${resourceId}`}
          backLabel={t.reportar_validez.back}
          title={t.reportar_validez.page_title}
          subtitle={emergency.name}
        />
        <div className="flex flex-col gap-6 px-5 pb-12 pt-6 lg:px-8">
          <Card className="flex flex-col gap-6 p-5 lg:p-7">
            <p className="text-sm text-muted">{t.reportar_validez.intro}</p>
            <ReportValidezForm
              action={boundAction}
              slug={slug}
              resourceId={resourceId}
              t={t.reportar_validez}
              backLabel={t.common.back_to_emergency}
            />
          </Card>
        </div>
      </div>
    </main>
  );
}
