import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { registerVolunteer } from './actions';
import { VoluntarioForm } from './voluntario-form';
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
    <main className="flex-1 flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-md flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <a
            href={`/e/${slug}`}
            className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded w-fit"
          >
            ← {emergency.name}
          </a>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t.voluntario.page_title}
          </h1>
          <p className="text-base text-gray-600">
            {t.voluntario.page_subtitle.replace('{emergencyName}', emergency.name)}
          </p>
        </header>

        <VoluntarioForm
          action={boundAction}
          slug={slug}
          existingProfile={existingProfile}
          t={t.voluntario}
          backToEmergencyLabel={t.common.back_to_emergency}
        />
      </div>
    </main>
  );
}
