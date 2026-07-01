import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireSession, loginHref, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getMe, getRoles } from '@/lib/navigation-data';
import {
  resolveEmergencyAccess,
  type EmergencyAccess,
} from '@/lib/emergency-permissions';
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';
import type { components } from '@reliefhub/api-client';
import { OffersQueue } from '@/components/organisms/coordination-queues';
import { OffersFilter } from '@/components/molecules/offers-filter';
import { MATERIAL_CATEGORIES } from '@/lib/categories';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type OfferCategory =
  components['schemas']['OfferViewDto']['items'][number]['category'];
type OfferStatus = components['schemas']['OfferViewDto']['status'];

// Offers carry material supply lines, so the filter mirrors MATERIAL_CATEGORIES
// (the single catalogue) — never medical_personnel, which is not material.
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

export default async function CoordinacionOfertasPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const token = await requireSession(`/e/${slug}/coordinacion/ofertas`);

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;
  const headers = authHeaders(token);

  const [me, roles] = await Promise.all([getMe(), getRoles()]);
  if (me == null) {
    await clearToken();
    redirect(loginHref(`/e/${slug}/coordinacion/ofertas`));
  }

  const access: EmergencyAccess = resolveEmergencyAccess(
    emergencyId,
    (me.grants ?? []) as MeGrant[],
    roles as RoleCatalogEntry[],
  );

  // Permission gate: a principal without offer:match is bounced to the hub.
  if (!access.canMatchOffers) {
    redirect(`/e/${slug}/coordinacion`);
  }

  const rawCategory =
    typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined;
  const rawStatus =
    typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : undefined;
  const category =
    rawCategory !== undefined &&
    (MATERIAL_CATEGORIES as readonly string[]).includes(rawCategory)
      ? (rawCategory as OfferCategory)
      : undefined;
  const status = VALID_STATUSES.includes(rawStatus as OfferStatus)
    ? (rawStatus as OfferStatus)
    : undefined;

  const { t } = await getT();
  const tc = t.coord;

  const onUnauthorized = async (statusCode: number): Promise<void> => {
    if (statusCode === 401) {
      await clearToken();
      redirect(loginHref(`/e/${slug}/coordinacion/ofertas`));
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
        if (r.response.status === 403) redirect(`/e/${slug}/coordinacion`);
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
    <section aria-labelledby="offers-heading" className="flex flex-col gap-5">
      <h2 id="offers-heading" className="text-xl font-bold text-ink">
        {tc.offers_heading}
      </h2>

      <OffersFilter />

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
    </section>
  );
}
