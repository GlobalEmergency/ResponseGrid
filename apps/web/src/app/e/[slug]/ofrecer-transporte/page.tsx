import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getToken } from '@/lib/auth';
import { getMe } from '@/lib/navigation-data';
import { submitCapacity } from './actions';
import { OfrecerTransporteForm } from './ofrecer-transporte-form';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { Card } from '@/components/atoms/card';
import { getT } from '@/i18n/server';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  const { t } = await getT();

  if (!emergency) {
    return { title: 'Emergencia no encontrada · ResponseGrid' };
  }

  return {
    title: t.ofrecerTransporte.meta_title.replace('{emergencyName}', emergency.name),
    description: t.ofrecerTransporte.meta_description.replace(
      '{emergencyName}',
      emergency.name,
    ),
  };
}

export default async function OfrecerTransportePage({ params }: Props) {
  const { slug } = await params;
  const { t } = await getT();

  // Publishing a capacity REQUIRES auth (capacity:publish, citizen-grade).
  const token = await getToken();
  if (!token) {
    redirect(`/login?next=/e/${slug}/ofrecer-transporte`);
  }

  // Resolve the current user — they are the provider (type: volunteer).
  const me = await getMe();
  if (me == null) {
    redirect(`/login?next=/e/${slug}/ofrecer-transporte`);
  }

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  // Bind both the emergency and the provider id server-side so neither is
  // trusted from the client form.
  const boundAction = submitCapacity.bind(null, emergency.id, me.id);

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeaderBand
          backHref={`/e/${slug}`}
          backLabel={t.common.back_to_emergency}
          title={t.ofrecerTransporte.page_title}
          subtitle={t.ofrecerTransporte.page_subtitle.replace(
            '{emergencyName}',
            emergency.name,
          )}
        />
        <div className="flex flex-col gap-8 px-5 pb-12 pt-6 lg:px-8">
          <Card className="p-5 lg:p-7">
            <OfrecerTransporteForm
              action={boundAction}
              slug={slug}
              t={t.ofrecerTransporte}
              backToEmergencyLabel={t.common.back_to_emergency}
            />
          </Card>
        </div>
      </div>
    </main>
  );
}
