import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { registerVolunteer } from './actions';
import { VoluntarioForm } from './voluntario-form';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { Card } from '@/components/atoms/card';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type VolunteerViewDto = components['schemas']['VolunteerViewDto'];

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
    title: t.voluntario.meta_title.replace('{emergencyName}', emergency.name),
    description: t.voluntario.meta_description.replace('{emergencyName}', emergency.name),
  };
}

export default async function VoluntarioPage({ params }: Props) {
  const { slug } = await params;
  const { t } = await getT();

  const token = await getToken();
  if (!token) {
    redirect(`/login?next=/e/${slug}/voluntario`);
  }

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  // Fetch existing profile (upsert: pre-fill if already registered)
  let existingProfile: VolunteerViewDto | null = null;
  const { data, response } = await api.GET(
    '/emergencies/{emergencyId}/volunteers/me',
    {
      params: { path: { emergencyId: emergency.id } },
      headers: authHeaders(token),
    },
  );
  if (response.status === 200 && data !== undefined) {
    existingProfile = data;
  }

  const boundAction = registerVolunteer.bind(null, emergency.id);

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeaderBand
          backHref={`/e/${slug}`}
          backLabel={t.common.back_to_emergency}
          title={t.voluntario.page_title}
          subtitle={t.voluntario.page_subtitle.replace('{emergencyName}', emergency.name)}
        />
        <div className="flex flex-col gap-8 px-5 pb-12 pt-6 lg:px-8">
          <Card className="p-5 lg:p-7">
            <VoluntarioForm
              action={boundAction}
              slug={slug}
              existingProfile={existingProfile}
              t={t.voluntario}
              backToEmergencyLabel={t.common.back_to_emergency}
            />
          </Card>
        </div>
      </div>
    </main>
  );
}
