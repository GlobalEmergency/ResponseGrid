import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { CoordinationResourceCard } from '@/components/organisms/coordination-resource-card';
import { CoordinationNeedCard } from '@/components/organisms/coordination-need-card';
import { CoordinationOfferCard } from '@/components/organisms/coordination-offer-card';
import { ExpiredNeedCard } from '@/components/organisms/expired-need-card';
import { EmergencyControls } from '@/components/organisms/emergency-controls';
import { NeedsFilter } from '@/components/needs-filter';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { logout } from './actions';

// Always fetch live data — never serve a stale cached page.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: 'Emergencia no encontrada · ResponseGrid' };
  return {
    title: `Coordinación — ${emergency.name} · ResponseGrid`,
    description: `Panel de coordinación de ${emergency.name}.`,
  };
}

export default async function CoordinacionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  // --- Auth guard -------------------------------------------------------
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  // --- Emergency resolution ---------------------------------------------
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;
  const headers = authHeaders(token);

  // --- Parse and validate filter params ---------------------------------
  const rawCategory = typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined;
  const rawPriority = typeof resolvedSearchParams.priority === 'string' ? resolvedSearchParams.priority : undefined;

  const VALID_CATEGORIES = [
    'hygiene', 'water', 'food', 'medical', 'shelter', 'tools', 'other',
    'medicines', 'medical_equipment', 'medical_supplies', 'medical_personnel',
  ] as const;
  const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

  type NeedCategory = typeof VALID_CATEGORIES[number];
  type Priority = typeof VALID_PRIORITIES[number];

  const category = VALID_CATEGORIES.includes(rawCategory as NeedCategory) ? rawCategory as NeedCategory : undefined;
  const priority = VALID_PRIORITIES.includes(rawPriority as Priority) ? rawPriority as Priority : undefined;

  // --- Fetch coordination queues ----------------------------------------
  const [queueResult, needsResult, offersQueueResult, validatedNeedsResult, expiredNeedsResult] = await Promise.all([
    api.GET('/emergencies/{emergencyId}/coordination/queue', {
      params: { path: { emergencyId } },
      headers,
    }),
    api.GET('/emergencies/{emergencyId}/needs/queue', {
      params: {
        path: { emergencyId },
        query: {
          ...(category !== undefined && { category }),
          ...(priority !== undefined && { priority }),
        },
      },
      headers,
    }),
    api.GET('/emergencies/{emergencyId}/offers/queue', {
      params: { path: { emergencyId } },
      headers,
    }),
    api.GET('/emergencies/{emergencyId}/public/needs', {
      params: { path: { emergencyId } },
    }),
    api.GET('/emergencies/{emergencyId}/needs/expired', {
      params: { path: { emergencyId } },
      headers,
    }),
  ]);

  // Handle 401 (expired / invalid token) from either authed call
  if (
    queueResult.response.status === 401 ||
    needsResult.response.status === 401 ||
    offersQueueResult.response.status === 401 ||
    expiredNeedsResult.response.status === 401
  ) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  const resourceQueue = queueResult.data ?? [];
  const needsQueue = needsResult.data ?? [];
  const offersQueue = offersQueueResult.data ?? [];
  const validatedNeeds = validatedNeedsResult.data ?? [];
  const expiredNeeds = expiredNeedsResult.data ?? [];

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-xl">
        <PageHeaderBand
          backHref={`/e/${slug}`}
          backLabel={emergency.name}
          title="Panel de coordinación"
          subtitle={emergency.name}
        />
        <div className="flex flex-col gap-8 px-4 pb-12 pt-6">

        {/* ── SALIR ───────────────────────────────────────────────────── */}
        <form action={logout} className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg border-2 border-navy px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          >
            Salir
          </button>
        </form>

        {/* ── CONTROLES DE LA EMERGENCIA ──────────────────────────────── */}
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

        {/* ── ENLACE A VOLUNTARIOS Y TAREAS ───────────────────────────── */}
        <Link
          href={`/e/${slug}/coordinacion/voluntarios`}
          className="flex items-center justify-between gap-3 rounded-lg border-2 border-navy bg-white px-5 py-4 font-semibold text-ink transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          <span>Voluntarios y tareas</span>
          <span aria-hidden="true" className="text-lg">→</span>
        </Link>

        {/* ── ENLACE A REPORTES DE CAMPO ──────────────────────────────── */}
        <Link
          href={`/e/${slug}/coordinacion/reportes`}
          className="flex items-center justify-between gap-3 rounded-lg border-2 border-navy bg-white px-5 py-4 font-semibold text-ink transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          <span>Reportes de campo</span>
          <span aria-hidden="true" className="text-lg">→</span>
        </Link>

        <hr className="border-line" />

        {/* ── RECURSOS PENDIENTES ─────────────────────────────────────── */}
        <section aria-labelledby="resources-heading" className="flex flex-col gap-4">
          <h2
            id="resources-heading"
            className="text-xl font-bold text-ink"
          >
            Recursos pendientes
          </h2>

          {resourceQueue.length === 0 ? (
            <EmptyState
              title="No hay recursos pendientes de revisión."
              description="Cuando alguien registre un recurso aparecerá aquí."
            />
          ) : (
            <ul className="flex flex-col gap-4" aria-label="Cola de recursos">
              {resourceQueue.map((resource) => (
                <li key={resource.id}>
                  <CoordinationResourceCard resource={resource} slug={slug} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── PETICIONES PENDIENTES ───────────────────────────────────── */}
        <section aria-labelledby="needs-heading" className="flex flex-col gap-4">
          <h2
            id="needs-heading"
            className="text-xl font-bold text-ink"
          >
            Peticiones pendientes
          </h2>

          <NeedsFilter />

          {needsQueue.length === 0 ? (
            <EmptyState
              title="No hay peticiones pendientes de validación."
              description="Las peticiones ciudadanas aparecerán aquí cuando lleguen."
            />
          ) : (
            <ul className="flex flex-col gap-4" aria-label="Cola de peticiones">
              {needsQueue.map((need) => (
                <li key={need.id}>
                  <CoordinationNeedCard need={need} slug={slug} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr className="border-line" />

        {/* ── OFERTAS DE MATERIAL ─────────────────────────────────────── */}
        <section aria-labelledby="offers-heading" className="flex flex-col gap-4">
          <h2
            id="offers-heading"
            className="text-xl font-bold text-ink"
          >
            Ofertas de material
          </h2>

          {offersQueue.length === 0 ? (
            <EmptyState
              title="No hay ofertas de material pendientes."
              description="Las ofertas de donantes aparecerán aquí para que puedas asignarlas a necesidades validadas."
            />
          ) : (
            <ul className="flex flex-col gap-4" aria-label="Cola de ofertas de material">
              {offersQueue.map((offer) => (
                <li key={offer.id}>
                  <CoordinationOfferCard
                    offer={offer}
                    validatedNeeds={validatedNeeds}
                    slug={slug}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr className="border-line" />

        {/* ── PETICIONES CADUCADAS ────────────────────────────────────── */}
        <section aria-labelledby="expired-heading" className="flex flex-col gap-4">
          <h2
            id="expired-heading"
            className="text-xl font-bold text-ink"
          >
            Peticiones caducadas
          </h2>

          {expiredNeeds.length === 0 ? (
            <EmptyState
              title="No hay peticiones caducadas."
              description="Las peticiones cuya fecha de validez haya vencido aparecerán aquí para que puedas renovarlas."
            />
          ) : (
            <ul className="flex flex-col gap-4" aria-label="Peticiones caducadas">
              {expiredNeeds.map((need) => (
                <li key={need.id}>
                  <ExpiredNeedCard need={need} slug={slug} />
                </li>
              ))}
            </ul>
          )}
        </section>

        </div>
      </div>
    </main>
  );
}
