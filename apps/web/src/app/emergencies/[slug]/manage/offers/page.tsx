import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { redirectToLogin } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { resolveManageAccess } from '@/lib/manage-access';
import type { components } from '@reliefhub/api-client';
import { WorkQueue } from '@/components/organisms/work-queue';
import { QueueToolbar } from '@/components/molecules/queue-toolbar';
import { OffersQueue } from '@/components/organisms/coordination-queues';
import { OffersFilter } from '@/components/molecules/offers-filter';
import { getCategoriesCached } from '@/adapters/get-categories';
import { isMaterialCategory } from '@/domain/supplies/category';
import { getT, getLocale } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type OfferCategory =
  components['schemas']['OfferViewDto']['items'][number]['category'];
type OfferStatus = components['schemas']['OfferViewDto']['status'];

// Offers carry material supply lines, so the filter mirrors the material
// categories from the DB catalogue — never medical_personnel, which is not material.
const VALID_STATUSES: OfferStatus[] = ['open', 'matched', 'fulfilled', 'cancelled'];

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: t.coord.meta_not_found };
  return {
    title: t.coord.offers_section_meta_title.replace('{name}', emergency.name),
    description: t.coord.offers_section_meta_description.replace('{name}', emergency.name),
  };
}

export default async function ManageOffersPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const returnPath = `/emergencies/${slug}/manage/offers`;
  const { emergency, access, headers } = await resolveManageAccess(slug, returnPath);
  const emergencyId = emergency.id;

  // Permission gate: a principal without offer:match is bounced to the hub.
  if (!access.canMatchOffers) {
    redirect(`/emergencies/${slug}/manage`);
  }

  const locale = await getLocale();
  const materialCategorySlugs = (await getCategoriesCached(locale))
    .filter(isMaterialCategory)
    .map((c) => c.slug);

  const rawCategory =
    typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined;
  const rawStatus =
    typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : undefined;
  const category =
    rawCategory !== undefined && materialCategorySlugs.includes(rawCategory)
      ? (rawCategory as OfferCategory)
      : undefined;
  const status = VALID_STATUSES.includes(rawStatus as OfferStatus)
    ? (rawStatus as OfferStatus)
    : undefined;

  const { t } = await getT();
  const tc = t.coord;

  const onUnauthorized = async (statusCode: number): Promise<void> => {
    if (statusCode === 401) {
      return redirectToLogin(`/emergencies/${slug}/manage/offers`);
    }
  };

  const [offersQueue, validatedNeeds] = await Promise.all([
    api
      .GET('/emergencies/{emergencyId}/offers/queue', {
        params: { path: { emergencyId } },
        headers,
      })
      .then(async (r) => {
        await onUnauthorized(r.response.status);
        if (r.response.status === 403) redirect(`/emergencies/${slug}/manage`);
        return r.data ?? [];
      }),
    api
      .GET('/emergencies/{emergencyId}/public/needs', {
        params: { path: { emergencyId } },
      })
      .then((r) => r.data ?? []),
  ]);

  // Category/status filters are applied here (the queue endpoint has no
  // filters): the offers queue is small relative to the resources queue.
  const visibleOffers = offersQueue.filter(
    (o) =>
      (category === undefined ||
        o.items.some((i) => i.category === category)) &&
      (status === undefined || o.status === status),
  );

  const isFiltered = category !== undefined || status !== undefined;

  return (
    <WorkQueue
      title={tc.offers_heading}
      headingId="offers-heading"
      toolbar={
        <QueueToolbar>
          <OffersFilter />
        </QueueToolbar>
      }
    >
      <OffersQueue
        offers={visibleOffers}
        validatedNeeds={validatedNeeds}
        slug={slug}
        canMatch={access.canMatchOffers}
        listLabel={tc.offers_list_label}
        emptyTitle={isFiltered ? tc.offers_no_match_title : tc.offers_empty_title}
        emptyDescription={
          isFiltered ? tc.offers_no_match_description : tc.offers_empty_description
        }
      />
    </WorkQueue>
  );
}
