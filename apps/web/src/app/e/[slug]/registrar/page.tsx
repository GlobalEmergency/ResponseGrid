import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getToken } from '@/lib/auth';
import { OrgSelector } from '@/components/org-selector';
import { LocationPicker } from '@/components/location-picker';
import { registerResource } from './actions';
import { RegistrarForm } from './registrar-form';
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
    title: t.registrar.meta_title.replace('{emergencyName}', emergency.name),
    description: t.registrar.meta_description.replace('{emergencyName}', emergency.name),
  };
}

export default async function RegistrarPage({ params }: Props) {
  const { slug } = await params;
  const { t } = await getT();

  const token = await getToken();
  if (!token) {
    redirect(`/login?next=/e/${slug}/registrar`);
  }

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const boundAction = registerResource.bind(null, emergency.id);

  return (
    <main className="flex-1 flex flex-col items-center justify-start px-4 py-10">
      <div className="w-full max-w-md flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t.registrar.page_title}
          </h1>
          <p className="text-base text-gray-600">
            {t.registrar.page_subtitle.replace('{emergencyName}', emergency.name)}
          </p>
        </header>

        <RegistrarForm
          action={boundAction}
          slug={slug}
          locationPicker={<LocationPicker />}
          orgSelector={<OrgSelector />}
          t={t.registrar}
          backToEmergencyLabel={t.common.back_to_emergency}
        />
      </div>
    </main>
  );
}
