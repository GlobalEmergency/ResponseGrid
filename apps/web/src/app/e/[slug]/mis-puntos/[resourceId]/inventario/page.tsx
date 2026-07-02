import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { fetchMyInventory, saveMyInventory } from './actions';
import { InventoryEditForm } from './inventory-edit-form';
import { AppBar } from '@/components/organisms/app-bar';
import { Card } from '@/components/atoms/card';
import { PageHeading } from '@/components/atoms/page-heading';
import { getT } from '@/i18n/server';
import { getCategories } from '@/adapters/get-categories';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string; resourceId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: t.account.emergency_not_found };
  return { title: t.account.inventory_page_title };
}

export default async function InventarioPage({ params }: Props) {
  const { slug, resourceId } = await params;
  const { t, locale } = await getT();

  await requireSession(`/e/${slug}/mis-puntos/${resourceId}/inventario`);

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) notFound();

  const initial = await fetchMyInventory(resourceId, slug);
  if (initial === null) notFound();

  const categories = await getCategories(locale);
  const boundAction = saveMyInventory.bind(null, resourceId, slug);

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <AppBar variant="action" slug={slug} backHref={`/e/${slug}/mis-puntos`} />
        <PageHeading
          title={t.account.inventory_page_title}
          subtitle={t.account.inventory_page_subtitle}
        />
        <div className="flex flex-col gap-8 px-5 pb-12 pt-6 lg:px-8">
          <Card className="p-5 lg:p-7">
            <InventoryEditForm
              action={boundAction}
              initial={initial}
              t={t.registrar}
              ta={t.account}
              locale={locale}
              categories={categories}
            />
          </Card>
        </div>
      </div>
    </main>
  );
}
