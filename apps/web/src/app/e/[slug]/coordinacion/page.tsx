import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { CoordinationResourceCard } from '@/components/organisms/coordination-resource-card';
import { CoordinationNeedCard } from '@/components/organisms/coordination-need-card';
import { NeedsFilter } from '@/components/needs-filter';
import { EmptyState } from '@/components/molecules/empty-state';
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
  if (!emergency) return { title: 'Emergencia no encontrada · ReliefHub' };
  return {
    title: `Coordinación — ${emergency.name} · ReliefHub`,
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

  const VALID_CATEGORIES = ['hygiene', 'water', 'food', 'medical', 'shelter', 'tools', 'other'] as const;
  const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

  type NeedCategory = typeof VALID_CATEGORIES[number];
  type Priority = typeof VALID_PRIORITIES[number];

  const category = VALID_CATEGORIES.includes(rawCategory as NeedCategory) ? rawCategory as NeedCategory : undefined;
  const priority = VALID_PRIORITIES.includes(rawPriority as Priority) ? rawPriority as Priority : undefined;

  // --- Fetch coordination queues ----------------------------------------
  const [queueResult, needsResult] = await Promise.all([
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
  ]);

  // Handle 401 (expired / invalid token) from either call
  if (
    queueResult.response.status === 401 ||
    needsResult.response.status === 401
  ) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  const resourceQueue = queueResult.data ?? [];
  const needsQueue = needsResult.data ?? [];

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-4 py-10 bg-white">
      <div className="w-full max-w-xl flex flex-col gap-8">

        {/* ── CABECERA ────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Panel de coordinación
              </h1>
              <p className="text-base text-gray-600 font-medium">
                {emergency.name}
              </p>
            </div>

            {/* Logout button */}
            <form action={logout} className="flex-shrink-0">
              <button
                type="submit"
                className="rounded-lg border-2 border-gray-900 px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
              >
                Salir
              </button>
            </form>
          </div>
        </header>

        {/* ── RECURSOS PENDIENTES ─────────────────────────────────────── */}
        <section aria-labelledby="resources-heading" className="flex flex-col gap-4">
          <h2
            id="resources-heading"
            className="text-xl font-bold text-gray-900"
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
            className="text-xl font-bold text-gray-900"
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

      </div>
    </main>
  );
}
