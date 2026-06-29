import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { api } from '@/lib/api';
import { getT } from '@/i18n/server';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { EmptyState } from '@/components/molecules/empty-state';
import { submitPreRegistration } from './actions';
import { PreRegistroForm } from './pre-registro-form';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Resource types that accept donation pre-registration (mirrors the API). */
const COLLECTION_TYPES = new Set(['collection_point', 'collection_and_delivery']);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  const { t } = await getT();

  if (!emergency) {
    return { title: 'Emergencia no encontrada · ResponseGrid' };
  }

  return {
    title: t.prereg.meta_title.replace('{emergencyName}', emergency.name),
    description: t.prereg.meta_description.replace(
      '{emergencyName}',
      emergency.name,
    ),
  };
}

export default async function PreRegistroPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const tp = t.prereg;

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const resourceId =
    typeof sp.resourceId === 'string' ? sp.resourceId.trim() : '';

  // The donor reaches this page from a specific point's page, so the target is
  // known via ?resourceId=. Without it (or when the point can't take a
  // pre-registration) we steer the person back to choose a point on the map,
  // instead of offering a dropdown of hundreds of points.
  const { data: resource } =
    resourceId === ''
      ? { data: undefined }
      : await api.GET(
          '/emergencies/{emergencyId}/public/resources/{resourceId}',
          { params: { path: { emergencyId: emergency.id, resourceId } } },
        );

  const eligible =
    resource !== undefined &&
    COLLECTION_TYPES.has(resource.type) &&
    resource.publicStatus === 'active';

  const headerSubtitle =
    eligible && resource !== undefined
      ? tp.page_subtitle.replace('{pointName}', resource.name)
      : undefined;

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-md">
        <PageHeaderBand
          backHref={
            resourceId !== ''
              ? `/e/${slug}/recursos/${resourceId}`
              : `/e/${slug}`
          }
          backLabel={t.common.back_to_emergency}
          title={tp.page_title}
          subtitle={headerSubtitle}
        />
        <div className="flex flex-col gap-6 px-4 pb-12 pt-6">
          {eligible && resource !== undefined ? (
            <PreRegistroForm
              action={submitPreRegistration.bind(
                null,
                emergency.id,
                resourceId,
              )}
              slug={slug}
              resourceId={resourceId}
              pointName={resource.name}
              t={tp}
              locale={locale}
              backToEmergencyLabel={t.common.back_to_emergency}
            />
          ) : (
            <>
              <EmptyState
                title={
                  resource === undefined ? tp.no_point_title : tp.not_eligible_title
                }
                description={
                  resource === undefined ? tp.no_point_body : tp.not_eligible_body
                }
              />
              <Link
                href={`/e/${slug}`}
                className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-white bg-navy rounded-lg hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 transition-colors"
              >
                {tp.no_point_cta}
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
