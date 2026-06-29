import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getMe, getRoles } from '@/lib/navigation-data';
import {
  resolveEmergencyAccess,
  type EmergencyAccess,
} from '@/lib/emergency-permissions';
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';
import { EmergencyControls } from '@/components/organisms/emergency-controls';
import { CoordinationSectionLink } from '@/components/molecules/coordination-section-link';
import { EmptyState } from '@/components/molecules/empty-state';
import { getT } from '@/i18n/server';

// Always fetch live data — never serve a stale cached page.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: t.coord.meta_not_found };
  return {
    title: t.coord.dashboard_meta_title.replace('{name}', emergency.name),
    description: t.coord.dashboard_meta_description.replace('{name}', emergency.name),
  };
}

export default async function CoordinacionPage({ params }: Props) {
  const { slug } = await params;

  // --- Auth + emergency (frame is rendered by the layout) ---------------
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;
  const headers = authHeaders(token);

  const [me, roles] = await Promise.all([getMe(), getRoles()]);
  if (me == null) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  const access: EmergencyAccess = resolveEmergencyAccess(
    emergencyId,
    (me.grants ?? []) as MeGrant[],
    roles as RoleCatalogEntry[],
  );

  const { t } = await getT();
  const tc = t.coord;

  const onUnauthorized = async (status: number): Promise<void> => {
    if (status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion`);
    }
  };

  // --- Pending counters for each actionable section ---------------------
  // Resources: ask for one row only — we just need the `total`.
  const [
    resourcesPending,
    needsPending,
    offersPending,
    shipmentsActive,
    disputesPending,
  ] = await Promise.all([
    access.canVerifyResources
      ? api
          .GET('/emergencies/{emergencyId}/coordination/queue', {
            params: { path: { emergencyId }, query: { page: 1, limit: 1 } },
            headers,
          })
          .then(async (r) => {
            await onUnauthorized(r.response.status);
            return r.data?.total ?? 0;
          })
      : Promise.resolve(null),
    access.canValidateNeeds
      ? api
          .GET('/emergencies/{emergencyId}/needs/queue', {
            params: { path: { emergencyId }, query: {} },
            headers,
          })
          .then(async (r) => {
            await onUnauthorized(r.response.status);
            return r.data?.length ?? 0;
          })
      : Promise.resolve(null),
    access.canMatchOffers
      ? api
          .GET('/emergencies/{emergencyId}/offers/queue', {
            params: { path: { emergencyId } },
            headers,
          })
          .then(async (r) => {
            await onUnauthorized(r.response.status);
            return r.data?.length ?? 0;
          })
      : Promise.resolve(null),
    access.canCoordinateLogistics
      ? api
          .GET('/emergencies/{emergencyId}/logistics/shipments', {
            params: { path: { emergencyId } },
            headers,
          })
          .then(async (r) => {
            await onUnauthorized(r.response.status);
            // Count only the in-flight shipments (not delivered/cancelled).
            return (r.data ?? []).filter(
              (s) => s.status !== 'delivered' && s.status !== 'cancelled',
            ).length;
          })
      : Promise.resolve(null),
    access.canVerifyResources
      ? api
          .GET('/emergencies/{emergencyId}/coordination/disputed', {
            params: { path: { emergencyId } },
            headers,
          })
          .then(async (r) => {
            await onUnauthorized(r.response.status);
            return r.data?.length ?? 0;
          })
      : Promise.resolve(null),
  ]);

  const base = `/e/${slug}/coordinacion`;

  return (
    <>
      {!access.canActOnAnyQueue &&
        !access.canCoordinate &&
        !access.canReadIntakes && (
          <EmptyState
            title={tc.no_actionable_queues_title}
            description={tc.no_actionable_queues_description}
          />
        )}

      {(access.canActOnAnyQueue ||
        access.canCoordinate ||
        access.canReadIntakes) && (
        <section aria-label={tc.hub_sections_label} className="flex flex-col gap-4">
          {resourcesPending !== null && (
            <CoordinationSectionLink
              href={`${base}/recursos`}
              label={tc.hub_resources_label}
              description={tc.hub_resources_description}
              count={resourcesPending}
              countAria={tc.hub_count_aria}
            />
          )}
          {disputesPending !== null && (
            <CoordinationSectionLink
              href={`${base}/puntos-en-duda`}
              label={tc.hub_disputes_label}
              description={tc.hub_disputes_description}
              count={disputesPending}
              countAria={tc.hub_count_aria}
            />
          )}
          {needsPending !== null && (
            <CoordinationSectionLink
              href={`${base}/peticiones`}
              label={tc.hub_needs_label}
              description={tc.hub_needs_description}
              count={needsPending}
              countAria={tc.hub_count_aria}
            />
          )}
          {offersPending !== null && (
            <CoordinationSectionLink
              href={`${base}/ofertas`}
              label={tc.hub_offers_label}
              description={tc.hub_offers_description}
              count={offersPending}
              countAria={tc.hub_count_aria}
            />
          )}
          {shipmentsActive !== null && (
            <CoordinationSectionLink
              href={`${base}/expediciones`}
              label={tc.hub_shipments_label}
              description={tc.hub_shipments_description}
              count={shipmentsActive}
              countAria={tc.hub_shipments_count_aria}
            />
          )}
          {access.canReadIntakes && (
            <CoordinationSectionLink
              href={`/e/${slug}/recepcion`}
              label={t.recepcion.hub_label}
              description={t.recepcion.hub_description}
            />
          )}
          {access.canCoordinate && (
            <>
              <CoordinationSectionLink
                href={`${base}/voluntarios`}
                label={tc.hub_volunteers_label}
                description={tc.hub_volunteers_description}
              />
              <CoordinationSectionLink
                href={`${base}/reportes`}
                label={tc.hub_reports_label}
                description={tc.hub_reports_description}
              />
            </>
          )}
        </section>
      )}

      {access.canCoordinate && (
        <>
          <hr className="border-line" />
          <EmergencyControls
            emergencyId={emergency.id}
            slug={slug}
            status={emergency.status}
            currentAnnouncement={
              typeof emergency.announcement === 'string'
                ? emergency.announcement
                : null
            }
          />
        </>
      )}
    </>
  );
}
