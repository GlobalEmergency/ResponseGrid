import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getToken } from '@/lib/auth';
import { OrgSelector } from '@/components/org-selector';
import { LocationPicker } from '@/components/location-picker';
import { submitPeticion } from './actions';
import { PeticionForm } from './peticion-form';
import { ItemsField } from './items-field';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);

  if (!emergency) {
    return { title: 'Emergencia no encontrada · ReliefHub' };
  }

  return {
    title: `Poner una petición — ${emergency.name} · ReliefHub`,
    description: `Registra una necesidad de ayuda para ${emergency.name}.`,
  };
}

export default async function PeticionPage({ params }: Props) {
  const { slug } = await params;

  const token = await getToken();
  if (!token) {
    redirect(`/login?next=/e/${slug}/peticion`);
  }

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const boundAction = submitPeticion.bind(null, emergency.id);

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-4 py-10">
      <div className="w-full max-w-md flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Poner una petición
          </h1>
          <p className="text-base text-gray-600">
            {emergency.name} · Describe la necesidad para que el equipo de
            coordinación pueda validarla.
          </p>
        </header>

        <PeticionForm
          action={boundAction}
          slug={slug}
          locationPicker={<LocationPicker />}
          orgSelector={<OrgSelector />}
          itemsField={<ItemsField />}
        />
      </div>
    </main>
  );
}
