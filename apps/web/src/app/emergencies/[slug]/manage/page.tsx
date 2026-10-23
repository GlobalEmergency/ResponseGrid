import type { Metadata } from 'next';
import { redirectToLogin } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { resolveManageAccess } from '@/lib/manage-access';
import { EmergencyControls } from '@/components/organisms/emergency-controls';
import { CoordinationSectionLink } from '@/components/molecules/coordination-section-link';
import { EmptyState } from '@/components/molecules/empty-state';
import { getT } from '@/i18n/server';

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

export default async function ManageOverviewPage({ params }: Props) {
  const { slug } = await params;

  const returnPath = `/emergencies/${slug}/manage`;
  const { emergency, access, headers } = await resolveManageAccess(slug, returnPath);
  const emergencyId = emergency.id;

  const { t } = await getT();
  const tc = t.coord;

  const onUnauthorized = async (status: number): Promise<void> => {
    if (status === 401) {
      return redirectToLogin(`/emergencies/${slug}/manage`);
    }
  };

  // Resources: ask for one row only — we just need the `total`.
  const [
    resourcesPending,
    needsPending,
    offersPending,
    shipmentsActive,
    disputesPending,
    autoHideOnDispute,
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
    // #171: the auto-hide-on-dispute policy is only exposed on the
    // authenticated "mine" view — find this emergency's entry there so the
    // coordinator panel can show/save its current value.
    access.canCoordinate
      ? api
          .GET('/emergencies/mine', { headers })
          .then(async (r) => {
            await onUnauthorized(r.response.status);
            return (
              r.data?.find((e) => e.id === emergencyId)?.autoHideOnDispute ??
              null
            );
          })
      : Promise.resolve(null),
  ]);

  const base = `/emergencies/${slug}/manage`;

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
              href={`${base}/resources`}
              label={tc.hub_resources_label}
              description={tc.hub_resources_description}
              count={resourcesPending}
              countAria={tc.hub_count_aria}
            />
          )}
          {disputesPending !== null && (
            <CoordinationSectionLink
              href={`${base}/resources/disputes`}
              label={tc.hub_disputes_label}
              description={tc.hub_disputes_description}
              count={disputesPending}
              countAria={tc.hub_count_aria}
            />
          )}
          {needsPending !== null && (
            <CoordinationSectionLink
              href={`${base}/needs`}
              label={tc.hub_needs_label}
              description={tc.hub_needs_description}
              count={needsPending}
              countAria={tc.hub_count_aria}
            />
          )}
          {offersPending !== null && (
            <CoordinationSectionLink
              href={`${base}/offers`}
              label={tc.hub_offers_label}
              description={tc.hub_offers_description}
              count={offersPending}
              countAria={tc.hub_count_aria}
            />
          )}
          {shipmentsActive !== null && (
            <CoordinationSectionLink
              href={`${base}/logistics`}
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
                href={`${base}/volunteers`}
                label={tc.hub_volunteers_label}
                description={tc.hub_volunteers_description}
              />
              <CoordinationSectionLink
                href={`${base}/reports`}
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
            autoHideOnDispute={autoHideOnDispute ?? undefined}
          />
        </>
      )}
    </>
  );
}
