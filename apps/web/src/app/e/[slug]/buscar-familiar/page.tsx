import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { createMissingPersonReport } from './actions';
import { MissingPersonForm } from '@/components/molecules/missing-person-form';
import { getT } from '@/i18n/server';

// Always fetch live data — never serve a stale cached page.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  const { t } = await getT();

  if (!emergency) {
    return {
      title: 'Emergencia no encontrada · ResponseGrid',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: t.buscar_familiar.meta_title.replace('{emergencyName}', emergency.name),
    description: t.buscar_familiar.meta_description.replace(
      '{emergencyName}',
      emergency.name,
    ),
    // Sensitive data — must not be indexed by search engines
    robots: { index: false, follow: false },
  };
}

export default async function BuscarFamiliarPage({ params }: Props) {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  const { t } = await getT();

  if (!emergency) {
    notFound();
  }

  const boundAction = createMissingPersonReport.bind(null, emergency.id);
  const tf = t.buscar_familiar;

  return (
    <main className="flex-1 flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-3">
          <Link
            href={`/e/${slug}`}
            className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded w-fit"
          >
            ← {emergency.name}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {tf.page_title}
          </h1>
          <p className="text-sm text-gray-600">
            {tf.page_subtitle.replace('{emergencyName}', emergency.name)}
          </p>
        </header>

        {/* Form */}
        <MissingPersonForm action={boundAction} slug={slug} t={tf} />
      </div>
    </main>
  );
}
