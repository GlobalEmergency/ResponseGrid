import type { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getToken } from '@/lib/auth';
import { type ResourceViewDto } from '@/lib/group-by-country';
import { OfficialHeaderBand } from '@/components/organisms/official-header-band';
import { ResourceList } from '@/components/organisms/resource-list';
import { EmergencyMapWrapper } from '@/components/organisms/emergency-map-wrapper';
import { NeedsFilter } from '@/components/molecules/needs-filter';
import { MetricCard } from '@/components/molecules/metric-card';
import { Card } from '@/components/atoms/card';
import { StatusBanner } from '@/components/molecules/status-banner';
import { AnnouncementCard } from '@/components/molecules/announcement-card';
import { HelpActionRow } from '@/components/molecules/help-action-row';
import { NeedsList } from '@/components/organisms/needs-list';
import { EmergencyExplorer } from '@/components/organisms/emergency-explorer';
import { EmergencyQuickLinks } from '@/components/molecules/emergency-quick-links';
import type { MapPoint } from '@/components/organisms/emergency-map';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);

  if (!emergency) {
    return { title: 'Emergencia no encontrada · ResponseGrid' };
  }

  return {
    title: `${emergency.name} · ResponseGrid`,
    description: `Información oficial y puntos activos de ayuda para ${emergency.name}. Coordina la ayuda material: ofrece recursos, consulta las necesidades validadas y evita saturar la logística.`,
  };
}

const VALID_CATEGORIES = [
  'hygiene', 'water', 'food', 'medical', 'shelter', 'tools', 'other',
  'medicines', 'medical_equipment', 'medical_supplies', 'medical_personnel',
] as const;
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

type NeedCategory = typeof VALID_CATEGORIES[number];
type Priority = typeof VALID_PRIORITIES[number];
export default async function EmergencyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const emergency = await getEmergencyBySlug(slug);
  const { t, locale } = await getT();

  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;
  const token = await getToken();
  const isActive = emergency.status === 'active';

  const rawCategory = typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined;
  const rawPriority = typeof resolvedSearchParams.priority === 'string' ? resolvedSearchParams.priority : undefined;

  const category = VALID_CATEGORIES.includes(rawCategory as NeedCategory) ? rawCategory as NeedCategory : undefined;
  const priority = VALID_PRIORITIES.includes(rawPriority as Priority) ? rawPriority as Priority : undefined;

  const [
    { data: resourcesPage },
    { data: facets },
    { data: needs },
    { data: metrics },
  ] = await Promise.all([
    api.GET('/emergencies/{emergencyId}/public/resources', {
      params: {
        path: { emergencyId },
        query: { page: 1, limit: 50 },
      },
    }),
    api.GET('/emergencies/{emergencyId}/public/resources/facets', {
      params: { path: { emergencyId } },
    }),
    api.GET('/emergencies/{emergencyId}/public/needs', {
      params: {
        path: { emergencyId },
        query: {
          limit: '50',
          ...(category !== undefined && { category }),
          ...(priority !== undefined && { priority }),
        },
      },
    }),
    api.GET('/emergencies/{emergencyId}/metrics', {
      params: { path: { emergencyId } },
    }),
  ]);

  const activeResources = (resourcesPage?.items ?? []) as ResourceViewDto[];
  const resourcesTotal = resourcesPage?.total ?? 0;
  const facetsByCategory = (facets?.byCategory ?? {}) as Record<string, number>;
  const facetsByCountry = (facets?.byCountry ?? {}) as Record<string, number>;
  const validatedNeeds = needs ?? [];
  const officialContacts = activeResources
    .filter((resource: ResourceViewDto) => resource.verificationLevel === 'official' && resource.contact != null)
    .slice(0, 3);

  const mapPoints: MapPoint[] = [
    ...activeResources
      .filter((r) => r.location.latitude !== 0 && r.location.longitude !== 0)
      .map(
        (r): MapPoint => ({
          id: r.id,
          lat: r.location.latitude,
          lng: r.location.longitude,
          label: r.name,
          kind: 'resource',
          status: r.publicStatus,
          disputed: r.disputed,
        }),
      ),
    ...validatedNeeds
      .filter((n) => n.location.latitude !== 0 && n.location.longitude !== 0)
      .map(
        (n): MapPoint => ({
          id: n.id,
          lat: n.location.latitude,
          lng: n.location.longitude,
          label: n.title,
          kind: 'need',
          approximate: n.locationSensitivity === 'approximate',
        }),
      ),
  ];

  const te = t.emergency;
  const dontList: string[] =
    emergency.dontBringList.length > 0 ? emergency.dontBringList : te.dont_bring_items;
  const sectionTitle = 'font-display text-base font-bold text-navy';
  const announcement = typeof emergency.announcement === 'string' ? emergency.announcement : null;

  const initialTab: 'points' | 'needs' =
    category !== undefined || priority !== undefined ? 'needs' : 'points';

  const legendItems = [
    { color: 'bg-green-500', label: te.map_legend_active },
    { color: 'bg-yellow-400', label: te.map_legend_saturated },
    { color: 'bg-orange-500', label: te.map_legend_paused },
    { color: 'bg-red-500', label: te.map_legend_need },
  ];

  const pointsSlot = (
    <ResourceList
      emergencyId={emergencyId}
      slug={slug}
      initialItems={activeResources}
      total={resourcesTotal}
      facetsByCategory={facetsByCategory}
      facetsByCountry={facetsByCountry}
      t={t.resource_card}
      tVerification={t.verification_badge}
      tStatusLight={t.status_light}
      tList={t.resource_list}
      tFilter={t.resource_filter}
      tNearby={t.nearby_points}
      tEmpty={{
        title: te.points_empty_title,
        description: te.points_empty_description,
      }}
      locale={locale}
    />
  );

  const needsSlot = (
    <NeedsList
      emergencyId={emergencyId}
      slug={slug}
      initialItems={validatedNeeds}
      te={te}
      tNearby={t.nearby_needs}
      tList={t.resource_list}
      emptyTitle={te.needs_empty_title}
      active={isActive}
      locale={locale}
      {...(category !== undefined && { category })}
      {...(priority !== undefined && { priority })}
      filterSlot={<NeedsFilter t={t.needs_filter} te={t.emergency} />}
    />
  );

  return (
    <main className="flex-1 bg-surface">
      <OfficialHeaderBand
        name={emergency.name}
        status={emergency.status}
        updatedAt={emergency.updatedAt}
        te={te}
      />

      {!isActive && (
        <div className="px-4 pt-4 lg:px-8">
          <StatusBanner status={emergency.status} t={t.status_banner} />
        </div>
      )}

      <div className="lg:flex lg:items-start">
        <section
          aria-labelledby="map-heading"
          className="relative lg:sticky lg:top-0 lg:h-screen lg:w-[58%] lg:shrink-0"
        >
          <h2 id="map-heading" className="sr-only">{te.map_heading}</h2>
          <EmergencyMapWrapper
            points={mapPoints}
            emergencyId={emergencyId}
            slug={slug}
            containerClassName="h-[44vh] min-h-[300px] max-h-[480px] border-y border-line lg:h-full lg:min-h-0 lg:max-h-none lg:border-y-0 lg:border-r"
          />
          <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-white/95 px-3 py-2 text-[11px] font-medium text-muted shadow-md backdrop-blur-sm">
            {legendItems.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${item.color}`} aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </div>
        </section>

        <div className="flex min-w-0 flex-1 flex-col gap-6 px-4 pb-12 pt-5 lg:mx-auto lg:max-w-3xl lg:px-8 lg:pt-7">
          {announcement !== null && (
            <AnnouncementCard
              announcement={announcement}
              updatedAt={emergency.updatedAt}
              t={t.announcement}
            />
          )}

          <section aria-labelledby="quick-access-heading" className="flex flex-col gap-3">
            <h2 id="quick-access-heading" className={sectionTitle}>
              {te.quick_access_heading}
            </h2>
            <div className="grid gap-2.5 lg:grid-cols-3">
              <Card as="div" className="flex flex-col gap-3 p-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
                    {te.quick_access_card_label}
                  </p>
                  <h3 className="mt-1 text-[15px] font-bold text-ink">
                    {te.actions_heading}
                  </h3>
                  <p className="mt-1 text-xs text-muted">{te.quick_access_help_intro}</p>
                </div>
                <HelpActionRow
                  href="#actions-heading"
                  icon="🧭"
                  title={te.quick_access_help_cta}
                />
              </Card>

              <Card as="div" className="flex flex-col gap-3 p-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
                    {te.quick_access_card_label}
                  </p>
                  <h3 className="mt-1 text-[15px] font-bold text-ink">
                    {te.explore_heading}
                  </h3>
                  <p className="mt-1 text-xs text-muted">{te.quick_access_where_intro}</p>
                </div>
                <HelpActionRow
                  href="#explore-heading"
                  icon="📍"
                  title={te.quick_access_where_cta}
                />
              </Card>

              <Card as="div" className="flex flex-col gap-3 p-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
                    {te.quick_access_card_label}
                  </p>
                  <h3 className="mt-1 text-[15px] font-bold text-ink">
                    {te.quick_access_call_heading}
                  </h3>
                  <p className="mt-1 text-xs text-muted">{te.quick_access_call_intro}</p>
                </div>

                {officialContacts.length > 0 ? (
                  <ul className="flex flex-col gap-2" role="list">
                    {officialContacts.map((resource) => (
                      <li key={resource.id} className="rounded-[13px] border border-line bg-surface-alt px-3 py-2">
                        <p className="text-xs font-semibold text-navy">{resource.name}</p>
                        <p className="text-[12.5px] text-muted">
                          {t.resource_card.meta_contact_official} {resource.contact}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs italic text-muted-soft">
                    {te.quick_access_no_official_contact}
                  </p>
                )}
              </Card>
            </div>
          </section>

          {metrics !== undefined && (
            <section aria-labelledby="metrics-heading" className="flex flex-col gap-2.5">
              <div>
                <h2 id="metrics-heading" className={sectionTitle}>{te.metrics_heading}</h2>
                <p className="mt-0.5 text-[12.5px] text-muted">{te.metrics_caption}</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <MetricCard value={metrics.needs.open} label={te.metric_tile_open} tone="navy" />
                <MetricCard value={metrics.resources.active} label={te.metric_tile_points} tone="navy" />
                <MetricCard value={metrics.needs.closed} label={te.metric_tile_covered} tone="success" />
                <MetricCard value={metrics.resources.pending} label={te.metric_tile_queue} tone="accent" />
              </div>
            </section>
          )}

          <section aria-labelledby="actions-heading" className="flex flex-col gap-3">
            <h2 id="actions-heading" className={sectionTitle}>{te.actions_heading}</h2>
            {isActive ? (
              <div className="flex flex-col gap-2.5">
                <HelpActionRow
                  href={`/e/${slug}/donar`}
                  icon="📦"
                  title={te.action_donate}
                  subtitle={te.help_donate_subtitle}
                  variant="primary"
                />
                <HelpActionRow
                  href={`/e/${slug}/registrar`}
                  icon="🏬"
                  title={te.action_offer_resource}
                  subtitle={te.help_offer_subtitle}
                />
                <HelpActionRow
                  href={`/e/${slug}/voluntario`}
                  icon="🙋"
                  title={te.action_volunteer}
                  subtitle={te.help_volunteer_subtitle}
                />
                <HelpActionRow
                  href={`/e/${slug}/peticion`}
                  icon="🧾"
                  title={te.action_submit_petition}
                  subtitle={te.help_petition_subtitle}
                />
                <HelpActionRow
                  href={`/e/${slug}/ofrecer-transporte`}
                  icon="🚚"
                  title={te.action_offer_transport}
                  subtitle={te.help_transport_subtitle}
                />
              </div>
            ) : (
              <p className="rounded-card border border-line bg-surface-alt px-4 py-4 text-sm text-muted">
                {te.actions_paused}
              </p>
            )}
          </section>

          <section aria-labelledby="explore-heading" className="flex flex-col gap-3">
            <h2 id="explore-heading" className={sectionTitle}>{te.explore_heading}</h2>
            <EmergencyExplorer
              ariaLabel={te.explore_aria}
              pointsLabel={te.tab_points}
              needsLabel={te.tab_needs}
              pointsCount={resourcesTotal}
              needsCount={validatedNeeds.length}
              pointsSlot={pointsSlot}
              needsSlot={needsSlot}
              initialTab={initialTab}
            />
          </section>

          <details className="group rounded-card border border-line bg-surface-alt px-4 py-3.5 open:pb-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <span className="flex flex-col">
                <span className={sectionTitle}>{te.dont_do_heading}</span>
                <span className="mt-0.5 text-[12.5px] text-muted">{te.dont_do_intro}</span>
              </span>
              <span
                aria-hidden="true"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-line bg-white text-muted transition-transform group-open:rotate-180"
              >
                ⌄
              </span>
            </summary>
            <ul className="mt-3 flex flex-col gap-2.5" role="list">
              {dontList.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-ink">
                  <span
                    aria-hidden="true"
                    className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-danger-soft text-xs font-extrabold text-danger"
                  >
                    ✕
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </details>

          <EmergencyQuickLinks slug={slug} te={te} authed={token !== null} />
        </div>
      </div>
    </main>
  );
}
