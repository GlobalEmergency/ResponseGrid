import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { OrgSelector } from '@/components/molecules/org-selector';
import { LocationPicker } from '@/components/organisms/location-picker';
import { submitOffer } from './actions';
import { DonarForm } from './donar-form';
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

  if (!emergency) {
    return { title: 'Emergencia no encontrada · ResponseGrid' };
  }

  return {
    title: t.donar.meta_title.replace('{emergencyName}', emergency.name),
    description: t.donar.meta_description.replace('{emergencyName}', emergency.name),
  };
}

export default async function DonarPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const { t } = await getT();

  const token = await getToken();
  if (!token) {
    redirect(`/login?next=/e/${slug}/donar/ofrecer`);
  }

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  // Resolve optional ?needId= query param
  const rawNeedId =
    typeof resolvedSearchParams.needId === 'string'
      ? resolvedSearchParams.needId.trim()
      : undefined;

  // If a needId is provided, try to resolve the need title from the public list
  let targetNeedTitle: string | undefined;
  if (rawNeedId !== undefined && rawNeedId !== '') {
    const { data: needs } = await api.GET(
      '/emergencies/{emergencyId}/public/needs',
      { params: { path: { emergencyId: emergency.id } } },
    );
    const matched = (needs ?? []).find((n) => n.id === rawNeedId);
    if (matched !== undefined) {
      targetNeedTitle = matched.title;
    }
  }

  const targetNeedId =
    targetNeedTitle !== undefined ? rawNeedId : undefined;

  const boundAction = submitOffer.bind(null, emergency.id);

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeaderBand
          backHref={`/e/${slug}`}
          backLabel={t.common.back_to_emergency}
          title={t.donar.page_title}
          subtitle={t.donar.page_subtitle.replace('{emergencyName}', emergency.name)}
        />
        <div className="px-5 pb-12 pt-6 lg:px-8">
          <Card className="p-5 lg:p-7">
            <DonarForm
              action={boundAction}
              slug={slug}
              targetNeedTitle={targetNeedTitle}
              targetNeedId={targetNeedId}
              locationPicker={<LocationPicker />}
              orgSelector={<OrgSelector />}
              t={t.donar}
              backToEmergencyLabel={t.common.back_to_emergency}
            />
          </Card>
        </div>
      </div>
    </main>
  );
}
