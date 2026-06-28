import type { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getToken } from '@/lib/auth';
import { OfficialHeaderBand } from '@/components/organisms/official-header-band';
import { ResourceList } from '@/components/organisms/resource-list';
import { EmergencyMapWrapper } from '@/components/emergency-map-wrapper';
import { NeedsFilter } from '@/components/needs-filter';
import { EmptyState } from '@/components/molecules/empty-state';
import { MetricCard } from '@/components/molecules/metric-card';
import { StatusBanner } from '@/components/molecules/status-banner';
import { AnnouncementCard } from '@/components/molecules/announcement-card';
import { EffectiveActionCard } from '@/components/molecules/effective-action-card';
import { HelpActionRow } from '@/components/molecules/help-action-row';
import { FamilySearchCard } from '@/components/molecules/family-search-card';
import { NeedCard } from '@/components/molecules/need-card';
import { EmergencyQuickLinks } from '@/components/molecules/emergency-quick-links';
import type { MapPoint } from '@/components/emergency-map';
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
          ...(category !== undefined && { category }),
          ...(priority !== undefined && { priority }),
        },
      },
    }),
    api.GET('/emergencies/{emergencyId}/metrics', {
      params: { path: { emergencyId } },
    }),
  ]);

  const activeResources = resourcesPage?.items ?? [];
  const resourcesTotal = resourcesPage?.total ?? 0;
  // Facets: the schema types byCategory/byCountry as Record<string, never> due
  // to OpenAPI's additionalProperties representation, but at runtime they are
  // Record<string, number>. We cast here and default to empty objects.
  const facetsByCategory = (facets?.byCategory ?? {}) as Record<string, number>;
  const facetsByCountry = (facets?.byCountry ?? {}) as Record<string, number>;
  const validatedNeeds = needs ?? [];

  // Build map points from the SSR-fetched resources (page 1) and needs (all)
  // that have valid coordinates. EmergencyMapWrapper re-fetches ALL resource
  // points client-side and merges them with these needs, so the map is never
  // limited to the first page even though the list paginates.
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
  const dontList = emergency.dontBringList.length > 0 ? emergency.dontBringList : te.dont_bring_items;
  const sectionTitle = 'font-display text-base font-bold text-navy';

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-md bg-surface lg:max-w-6xl">
        <OfficialHeaderBand
          name={emergency.name}
          status={emergency.status}
          updatedAt={emergency.updatedAt}
          te={te}
        />

        <div className="flex flex-col gap-5 px-4 pb-12 pt-5 lg:gap-6 lg:px-8">
          <StatusBanner status={emergency.status} t={t.status_banner} />

          {/* Comunicado oficial + "Lo más eficaz ahora" (lado a lado en escritorio) */}
          {isActive ? (
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <AnnouncementCard
                  announcement={typeof emergency.announcement === 'string' ? emergency.announcement : null}
                  updatedAt={emergency.updatedAt}
                  t={t.announcement}
                />
              </div>
              <EffectiveActionCard
                href={`/e/${slug}/donar`}
                overline={te.effective_overline}
                title={te.effective_title}
                cta={te.effective_cta}
              />
            </div>
          ) : (
            <AnnouncementCard
              announcement={typeof emergency.announcement === 'string' ? emergency.announcement : null}
              updatedAt={emergency.updatedAt}
              t={t.announcement}
            />
          )}

          {/* Métricas (fila de KPIs) */}
          {metrics !== undefined && (
            <section aria-labelledby="metrics-heading">
              <h2 id="metrics-heading" className="sr-only">{te.metrics_heading}</h2>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <MetricCard value={metrics.needs.open} label={te.metric_tile_open} tone="navy" />
                <MetricCard value={metrics.resources.active} label={te.metric_tile_points} tone="navy" />
                <MetricCard value={metrics.needs.closed} label={te.metric_tile_covered} tone="success" />
                <MetricCard value={metrics.resources.pending} label={te.metric_tile_queue} tone="accent" />
              </div>
            </section>
          )}

          {/* Paneles — columna única en móvil, dashboard multi-columna en escritorio */}
          <div className="columns-1 gap-5 lg:columns-2 [&>*]:mb-5 [&>*]:break-inside-avoid">
          {/* ¿Cómo quieres ayudar? */}
          <section aria-labelledby="actions-heading" className="flex flex-col gap-3">
            <h2 id="actions-heading" className={sectionTitle}>{te.actions_heading}</h2>
            {isActive && (
              <div className="flex flex-col gap-2.5">
                <HelpActionRow
                  href={`/e/${slug}/registrar`}
                  icon="📦"
                  title={te.action_offer_resource}
                  subtitle={te.help_offer_subtitle}
                  variant="primary"
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
                  href={`/e/${slug}/reportar`}
                  icon="⚠️"
                  title={te.help_report_title}
                  variant="danger"
                />
              </div>
            )}

            <FamilySearchCard
              href={`/e/${slug}/buscar-familiar`}
              title={te.family_title}
              subtitle={te.family_subtitle}
            />

            {!isActive && (
              <p className="rounded-card border border-line bg-surface-alt px-4 py-4 text-sm text-muted">
                {te.actions_paused}
              </p>
            )}
          </section>

          {/* Qué NO hacer ahora */}
          <section aria-labelledby="dont-do-heading" className="flex flex-col gap-3">
            <div>
              <h2 id="dont-do-heading" className={sectionTitle}>{te.dont_do_heading}</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">{te.dont_do_intro}</p>
            </div>
            <ul className="flex flex-col gap-2.5" role="list">
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
          </section>

          {/* Puntos activos — lista paginada con filtros, búsqueda y agrupación geográfica */}
          <section aria-labelledby="points-heading" className="flex flex-col gap-3">
            <h2 id="points-heading" className={sectionTitle}>{te.points_heading}</h2>
            <ResourceList
              emergencyId={emergencyId}
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
          </section>

          {/* Necesidades validadas */}
          <section aria-labelledby="needs-heading" className="flex flex-col gap-3">
            <h2 id="needs-heading" className={sectionTitle}>{te.needs_heading}</h2>
            <NeedsFilter t={t.needs_filter} te={t.emergency} />
            {validatedNeeds.length === 0 ? (
              <EmptyState title={te.needs_empty_title} />
            ) : (
              <ul className="flex flex-col gap-2.5" role="list" aria-label={te.needs_aria_label}>
                {validatedNeeds.map((need) => (
                  <li key={need.id}>
                    <NeedCard need={need} te={te} slug={slug} active={isActive} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          </div>

          {/* Mapa de la emergencia (ancho completo) */}
          <section aria-labelledby="map-heading" className="flex flex-col gap-3">
            <h2 id="map-heading" className={sectionTitle}>{te.map_heading}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-green-500" aria-hidden="true" />
                {te.map_legend_active}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-yellow-400" aria-hidden="true" />
                {te.map_legend_saturated}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-orange-500" aria-hidden="true" />
                {te.map_legend_paused}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-red-500" aria-hidden="true" />
                {te.map_legend_need}
              </span>
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-soft">
              <span aria-hidden="true">🔒</span>
              {te.map_user_location_notice}
            </p>
            <EmergencyMapWrapper points={mapPoints} emergencyId={emergencyId} />
          </section>

          <EmergencyQuickLinks slug={slug} te={te} authed={token !== null} />
        </div>
      </div>
    </main>
  );
}
