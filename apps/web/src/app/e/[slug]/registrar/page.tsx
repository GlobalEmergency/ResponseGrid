import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { requireSession } from '@/lib/auth';
import { OrgSelector } from '@/components/molecules/org-selector';
import { LocationPicker } from '@/components/organisms/location-picker';
import { registerResource } from './actions';
import { RegistrarForm } from './registrar-form';
import { AppBar } from '@/components/organisms/app-bar';
import { Card } from '@/components/atoms/card';
import { getT } from '@/i18n/server';
import { getCategories } from '@/adapters/get-categories';

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
  const { t, locale } = await getT();

  await requireSession(`/e/${slug}/registrar`);

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const categories = await getCategories(locale);
  const boundAction = registerResource.bind(null, slug, emergency.id);

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <AppBar variant="action" slug={slug} backHref={`/e/${slug}`} />
        <div className="px-4 pt-6">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy">
            {t.registrar.page_title}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {t.registrar.page_subtitle.replace('{emergencyName}', emergency.name)}
          </p>
        </div>
        <div className="flex flex-col gap-8 px-5 pb-12 pt-6 lg:px-8">
          <Card className="p-5 lg:p-7">
            <RegistrarForm
              action={boundAction}
              slug={slug}
              locationPicker={<LocationPicker />}
              orgSelector={<OrgSelector />}
              t={t.registrar}
              backToEmergencyLabel={t.common.back_to_emergency}
              locale={locale}
              categories={categories}
            />
          </Card>
        </div>
      </div>
    </main>
  );
}
