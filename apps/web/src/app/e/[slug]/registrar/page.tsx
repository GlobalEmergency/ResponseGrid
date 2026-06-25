import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { registerResource } from './actions';
import { RegistrarForm } from './registrar-form';

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
    title: `Ofrecer un recurso — ${emergency.name} · ReliefHub`,
    description: `Regístrate como recurso disponible para ${emergency.name}.`,
  };
}

export default async function RegistrarPage({ params }: Props) {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);

  if (!emergency) {
    notFound();
  }

  // Bind the resolved emergencyId into the server action so the form
  // does not need to know about it directly.
  const boundAction = registerResource.bind(null, emergency.id);

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-4 py-10">
      <div className="w-full max-w-md flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Ofrecer un recurso
          </h1>
          <p className="text-base text-gray-600">
            {emergency.name} · Rellena el formulario. Te validaremos antes de activarte.
          </p>
        </header>

        <RegistrarForm action={boundAction} slug={slug} />
      </div>
    </main>
  );
}
