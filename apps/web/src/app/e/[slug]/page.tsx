import type { Metadata, ResolvingMetadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getToken } from '@/lib/auth';
import { PublicResourceCard } from '@/components/organisms/public-resource-card';
import { EmergencyMapWrapper } from '@/components/emergency-map-wrapper';
import { NeedsFilter } from '@/components/needs-filter';
import { Badge } from '@/components/atoms/badge';
import { EmptyState } from '@/components/molecules/empty-state';
import { MetricCard } from '@/components/molecules/metric-card';
import { StatusBanner } from '@/components/molecules/status-banner';
import { AnnouncementCard } from '@/components/molecules/announcement-card';
import { LanguageSwitcher } from '@/components/molecules/language-switcher';
import type { MapPoint } from '@/components/emergency-map';
import { getT } from '@/i18n/server';
import { FreshnessIndicator } from '@/components/atoms/freshness-indicator';

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
  const { t } = await getT();

  if (!emergency) {
    return { title: 'Emergencia no encontrada · ReliefHub' };
  }

  return {
    title: `${emergency.name} · ReliefHub`,
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
  const { t } = await getT();

  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;
  const token = await getToken();

  const rawCategory = typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined;
  const rawPriority = typeof resolvedSearchParams.priority === 'string' ? resolvedSearchParams.priority : undefined;

  const category = VALID_CATEGORIES.includes(rawCategory as NeedCategory) ? rawCategory as NeedCategory : undefined;
  const priority = VALID_PRIORITIES.includes(rawPriority as Priority) ? rawPriority as Priority : undefined;

  const [
    { data: resources },
    { data: needs },
    { data: metrics },
  ] = await Promise.all([
    api.GET('/emergencies/{emergencyId}/public/resources', {
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

  const activeResources = resources ?? [];
  const validatedNeeds = needs ?? [];

  // Build map points from resources and needs that have valid coordinates
  const mapPoints: MapPoint[] = [
    ...activeResources
      .filter(
        (r) =>
          r.location.latitude !== 0 &&
          r.location.longitude !== 0,
      )
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
      .filter(
        (n) =>
          n.location.latitude !== 0 &&
          n.location.longitude !== 0,
      )
      .map(
        (n): MapPoint => ({
          id: n.id,
          lat: n.location.latitude,
          lng: n.location.longitude,
          label: n.title,
          kind: 'need',
        }),
      ),
  ];

  const te = t.emergency;

  return (
    <main className="min-h-screen flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-10">

        {/* ── 1. CABECERA OFICIAL ───────────────────────────────────────── */}
        <header className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <Link
              href="/"
              className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded w-fit"
            >
              {te.back_all}
            </Link>
            <LanguageSwitcher />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {emergency.name}
            </h1>
            {emergency.status === 'active' && (
              <Badge variant="active" aria-label={te.status_active_aria}>
                {te.status_active}
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium text-gray-500 tracking-wide uppercase">
            {te.official_source}
          </p>
        </header>

        {/* ── 1b. BANNER DE ESTADO ─────────────────────────────────────── */}
        <StatusBanner status={emergency.status} t={t.status_banner} />

        {/* ── 1c. COMUNICADO OFICIAL ───────────────────────────────────── */}
        <AnnouncementCard
          announcement={
            typeof emergency.announcement === 'string'
              ? emergency.announcement
              : null
          }
          updatedAt={emergency.updatedAt}
          t={t.announcement}
        />

        {/* ── 2. RESUMEN (métricas) ────────────────────────────────────── */}
        {metrics !== undefined && (
          <section aria-labelledby="metrics-heading" className="flex flex-col gap-3">
            <h2
              id="metrics-heading"
              className="text-xl font-bold text-gray-900"
            >
              {te.metrics_heading}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard value={metrics.needs.open} label={te.metric_needs_open} />
              <MetricCard value={metrics.needs.closed} label={te.metric_needs_closed} />
              <MetricCard value={metrics.resources.active} label={te.metric_resources_active} />
              <MetricCard value={metrics.resources.pending} label={te.metric_resources_pending} />
            </div>
          </section>
        )}

        {/* ── 3. QUÉ NO LLEVAR ─────────────────────────────────────────── */}
        <section aria-labelledby="dont-bring-heading" className="flex flex-col gap-4">
          <h2
            id="dont-bring-heading"
            className="text-xl font-bold text-gray-900"
          >
            {te.dont_bring_heading}
          </h2>
          <p className="text-sm text-gray-600">
            {te.dont_bring_intro}
          </p>
          <ul className="flex flex-col gap-2" role="list">
            {(emergency.dontBringList.length > 0 ? emergency.dontBringList : te.dont_bring_items).map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-gray-800"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-900 flex items-center justify-center font-bold text-gray-900 text-xs"
                >
                  ✕
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* ── 4. BOTONES DE ACCIÓN ─────────────────────────────────────── */}
        <section aria-labelledby="actions-heading" className="flex flex-col gap-4">
          <h2
            id="actions-heading"
            className="text-xl font-bold text-gray-900"
          >
            {te.actions_heading}
          </h2>
          {emergency.status === 'active' ? (
            <div className="flex flex-col gap-3">
              <Link
                href={`/e/${slug}/registrar`}
                className="flex items-center justify-center w-full py-4 px-6 text-lg font-semibold text-white bg-gray-900 rounded-lg border-2 border-gray-900 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
              >
                {te.action_offer_resource}
              </Link>
              <Link
                href={`/e/${slug}/peticion`}
                className="flex items-center justify-center w-full py-4 px-6 text-lg font-semibold text-gray-900 bg-white rounded-lg border-2 border-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
              >
                {te.action_submit_petition}
              </Link>
              <Link
                href={`/e/${slug}/donar`}
                className="flex items-center justify-center w-full py-4 px-6 text-lg font-semibold text-gray-900 bg-white rounded-lg border-2 border-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
              >
                {te.action_donate}
              </Link>
              <Link
                href={`/e/${slug}/voluntario`}
                className="flex items-center justify-center w-full py-4 px-6 text-lg font-semibold text-gray-900 bg-white rounded-lg border-2 border-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
              >
                {te.action_volunteer}
              </Link>
            </div>
          ) : null}

          {/* "Buscar familiar" — visible whether active or paused */}
          <div
            className={`${emergency.status === 'active' ? 'border-t border-gray-200 pt-4' : ''}`}
          >
            <Link
              href={`/e/${slug}/buscar-familiar`}
              className="flex items-center justify-center w-full py-4 px-6 text-lg font-semibold text-gray-900 bg-amber-50 rounded-lg border-2 border-amber-600 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 transition-colors"
            >
              {te.action_find_family}
            </Link>
            <p className="mt-2 text-xs text-center text-gray-500">
              Los datos son privados y solo accesibles para personal autorizado.
            </p>
          </div>

          {emergency.status !== 'active' && (
            <p className="rounded-lg border-2 border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-500">
              {te.actions_paused}
            </p>
          )}
        </section>

        {/* ── 5. PUNTOS ACTIVOS ────────────────────────────────────────── */}
        <section aria-labelledby="points-heading" className="flex flex-col gap-4">
          <h2
            id="points-heading"
            className="text-xl font-bold text-gray-900"
          >
            {te.points_heading}
          </h2>

          {activeResources.length === 0 ? (
            <EmptyState
              title={te.points_empty_title}
              description={te.points_empty_description}
            />
          ) : (
            <ul
              className="flex flex-col gap-3"
              aria-label={te.points_aria_label}
              role="list"
            >
              {activeResources.map((resource) => (
                <li key={resource.id}>
                  <PublicResourceCard
                    resource={resource}
                    t={t.resource_card}
                    tVerification={t.verification_badge}
                    tStatusLight={t.status_light}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── 6. NECESIDADES VALIDADAS ─────────────────────────────────── */}
        <section aria-labelledby="needs-heading" className="flex flex-col gap-4">
          <h2
            id="needs-heading"
            className="text-xl font-bold text-gray-900"
          >
            {te.needs_heading}
          </h2>

          <NeedsFilter t={t.needs_filter} te={t.emergency} />

          {validatedNeeds.length === 0 ? (
            <EmptyState title={te.needs_empty_title} />
          ) : (
            <ul className="flex flex-col gap-3" role="list" aria-label={te.needs_aria_label}>
              {validatedNeeds.map((need) => (
                <li
                  key={need.id}
                  className="flex flex-col gap-3 rounded-lg border-2 border-gray-900 bg-white p-4"
                >
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-bold text-gray-900 leading-tight">
                      {need.title}
                    </h3>
                    <FreshnessIndicator
                      expiresAt={need.expiresAt}
                      lastVerifiedAt={need.lastVerifiedAt}
                    />
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                      {need.items[0] !== undefined && (
                        <span className="font-medium">
                          {te[`category_${need.items[0].category}` as keyof typeof te] ?? need.items[0].category}
                        </span>
                      )}
                      <span aria-hidden="true" className="text-gray-300">·</span>
                      <span>{te.needs_priority_label} {te[`priority_${need.priority}` as keyof typeof te] ?? need.priority}</span>
                      {need.items.length > 0 && (
                        <>
                          <span aria-hidden="true" className="text-gray-300">·</span>
                          <span>
                            {String(need.items[0]?.quantity ?? '')}
                            {need.items[0]?.unit != null ? ` ${String(need.items[0].unit)}` : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {emergency.status === 'active' && (
                    <Link
                      href={`/e/${slug}/donar?needId=${need.id}`}
                      className="inline-flex items-center justify-center rounded-lg border-2 border-gray-900 px-4 py-2 text-sm font-semibold text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors w-fit"
                    >
                      {te.needs_offer_button}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── 7. MAPA DE LA EMERGENCIA ─────────────────────────────────── */}
        <section aria-labelledby="map-heading" className="flex flex-col gap-4">
          <h2
            id="map-heading"
            className="text-xl font-bold text-gray-900"
          >
            {te.map_heading}
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500" aria-hidden="true" />
              {te.map_legend_active}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-400" aria-hidden="true" />
              {te.map_legend_saturated}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-orange-500" aria-hidden="true" />
              {te.map_legend_paused}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500" aria-hidden="true" />
              {te.map_legend_need}
            </span>
          </div>
          <EmergencyMapWrapper points={mapPoints} />
        </section>

        {/* ── 8. PIE ───────────────────────────────────────────────────── */}
        <footer className="border-t border-gray-200 pt-6 flex items-center justify-between gap-4 flex-wrap">
          {token !== null && (
            <div className="flex items-center gap-4 flex-wrap">
              <Link
                href={`/e/${slug}/mis-puntos`}
                className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded"
              >
                {te.footer_my_points}
              </Link>
              <Link
                href={`/e/${slug}/mi-voluntariado`}
                className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded"
              >
                {te.footer_my_volunteer}
              </Link>
              <Link
                href={`/e/${slug}/mi-busqueda`}
                className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded"
              >
                {te.footer_my_search}
              </Link>
              <Link
                href={`/e/${slug}/reportar`}
                className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded"
              >
                {te.footer_report}
              </Link>
            </div>
          )}
          <Link
            href={`/e/${slug}/coordinacion`}
            className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded ml-auto"
          >
            {te.footer_coordination}
          </Link>
        </footer>

      </div>
    </main>
  );
}
