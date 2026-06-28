import type { Metadata } from 'next';
import Link from 'next/link';
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
import { NeedsQueue, ResourcesQueue, OffersQueue } from '@/components/organisms/coordination-queues';
import { ExpiredNeedCard } from '@/components/organisms/expired-need-card';
import { EmergencyControls } from '@/components/organisms/emergency-controls';
import { NeedsFilter } from '@/components/molecules/needs-filter';
import { EmptyState } from '@/components/molecules/empty-state';
import { Badge } from '@/components/atoms/badge';
import { getT } from '@/i18n/server';
import type { Messages } from '@/i18n/messages/es';

// Always fetch live data — never serve a stale cached page.
export const dynamic = 'force-dynamic';

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
    title: t.coord.dashboard_meta_title.replace('{name}', emergency.name),
    description: t.coord.dashboard_meta_description.replace('{name}', emergency.name),
  };
}

/** Friendly per-role label, falling back to the catalog description. */
function roleLabel(
  roleId: string,
  tc: Messages['coord'],
  roleDesc: Map<string, string>,
): string {
  switch (roleId) {
    case 'emergency_coordinator':
      return tc.role_emergency_coordinator;
    case 'emergency_verifier':
      return tc.role_emergency_verifier;
    case 'platform_admin':
      return tc.role_platform_admin;
    case 'platform_operator':
      return tc.role_platform_operator;
    default:
      return roleDesc.get(roleId) ?? roleId;
  }
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

  // --- Effective permissions for THIS emergency -------------------------
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
  const roleDesc = new Map(roles.map((r) => [r.id, r.description ?? r.id]));

  // --- Parse and validate need filter params ----------------------------
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

  // On a mid-flight 401 from any authed call, drop the token and re-login.
  // `redirect()` throws a NEXT_REDIRECT that propagates out of Promise.all.
  const onUnauthorized = async (status: number): Promise<void> => {
    if (status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion`);
    }
  };

  // --- Conditionally fetch only the queues the user can act on ----------
  const [resourceQueue, needsQueue, offersQueue, validatedNeeds, expiredNeeds] =
    await Promise.all([
      access.canVerifyResources
        ? api
            .GET('/emergencies/{emergencyId}/coordination/queue', {
              params: { path: { emergencyId } },
              headers,
            })
            .then(async (r) => {
              await onUnauthorized(r.response.status);
              return r.data ?? [];
            })
        : Promise.resolve([]),
      access.canValidateNeeds
        ? api
            .GET('/emergencies/{emergencyId}/needs/queue', {
              params: {
                path: { emergencyId },
                query: {
                  ...(category !== undefined && { category }),
                  ...(priority !== undefined && { priority }),
                },
              },
              headers,
            })
            .then(async (r) => {
              await onUnauthorized(r.response.status);
              return r.data ?? [];
            })
        : Promise.resolve([]),
      access.canMatchOffers
        ? api
            .GET('/emergencies/{emergencyId}/offers/queue', {
              params: { path: { emergencyId } },
              headers,
            })
            .then(async (r) => {
              await onUnauthorized(r.response.status);
              return r.data ?? [];
            })
        : Promise.resolve([]),
      access.canMatchOffers
        ? api
            .GET('/emergencies/{emergencyId}/public/needs', {
              params: { path: { emergencyId } },
            })
            .then((r) => r.data ?? [])
        : Promise.resolve([]),
      access.canCoordinate
        ? api
            .GET('/emergencies/{emergencyId}/needs/expired', {
              params: { path: { emergencyId } },
              headers,
            })
            .then(async (r) => {
              await onUnauthorized(r.response.status);
              return r.data ?? [];
            })
        : Promise.resolve([]),
    ]);

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-5 pb-12 pt-6 lg:max-w-5xl lg:px-8">

        <header className="flex flex-col gap-2">
          <h1 className="font-display text-xl font-bold text-navy lg:text-2xl">{tc.dashboard_title}</h1>
          <p className="text-sm text-muted">{emergency.name}</p>
          {access.roleIds.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">{tc.your_role_heading}</span>
              {access.roleIds.map((rid) => (
                <Badge key={rid} variant="role-owner">{roleLabel(rid, tc, roleDesc)}</Badge>
              ))}
            </div>
          )}
        </header>

        {/* ── CONTROLES (solo coordinación) ───────────────────────────── */}
        {access.canCoordinate && (
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
        )}

        {/* ── ENLACES DE COORDINACIÓN (solo coordinación) ─────────────── */}
        {access.canCoordinate && (
          <>
            <Link
              href={`/e/${slug}/coordinacion/voluntarios`}
              className="flex items-center justify-between gap-3 rounded-lg border-2 border-navy bg-white px-5 py-4 font-semibold text-ink transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
            >
              <span>{tc.link_volunteers}</span>
              <span aria-hidden="true" className="text-lg">→</span>
            </Link>

            <Link
              href={`/e/${slug}/coordinacion/reportes`}
              className="flex items-center justify-between gap-3 rounded-lg border-2 border-navy bg-white px-5 py-4 font-semibold text-ink transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
            >
              <span>{tc.link_reports}</span>
              <span aria-hidden="true" className="text-lg">→</span>
            </Link>
          </>
        )}

        {/* ── SIN COLAS ACCIONABLES ───────────────────────────────────── */}
        {!access.canActOnAnyQueue && !access.canCoordinate && (
          <EmptyState
            title={tc.no_actionable_queues_title}
            description={tc.no_actionable_queues_description}
          />
        )}

        {/* ── RECURSOS PENDIENTES (resource:verify) ───────────────────── */}
        {access.canVerifyResources && (
          <>
            <hr className="border-line" />
            <section aria-labelledby="resources-heading" className="flex flex-col gap-4">
              <h2 id="resources-heading" className="text-xl font-bold text-ink">
                {tc.resources_heading}
              </h2>
              <ResourcesQueue
                resources={resourceQueue}
                slug={slug}
                canVerify={access.canVerifyResources}
                listLabel={tc.resources_list_label}
                emptyTitle={tc.resources_empty_title}
                emptyDescription={tc.resources_empty_description}
              />
            </section>
          </>
        )}

        {/* ── PETICIONES PENDIENTES (need:validate) ───────────────────── */}
        {access.canValidateNeeds && (
          <>
            <hr className="border-line" />
            <section aria-labelledby="needs-heading" className="flex flex-col gap-4">
              <h2 id="needs-heading" className="text-xl font-bold text-ink">
                {tc.needs_heading}
              </h2>
              <NeedsFilter />
              <NeedsQueue
                needs={needsQueue}
                slug={slug}
                canValidate={access.canValidateNeeds}
                listLabel={tc.needs_list_label}
                emptyTitle={tc.needs_empty_title}
                emptyDescription={tc.needs_empty_description}
              />
            </section>
          </>
        )}

        {/* ── OFERTAS DE MATERIAL (offer:match) ───────────────────────── */}
        {access.canMatchOffers && (
          <>
            <hr className="border-line" />
            <section aria-labelledby="offers-heading" className="flex flex-col gap-4">
              <h2 id="offers-heading" className="text-xl font-bold text-ink">
                {tc.offers_heading}
              </h2>
              <OffersQueue
                offers={offersQueue}
                validatedNeeds={validatedNeeds}
                slug={slug}
                canMatch={access.canMatchOffers}
                listLabel={tc.offers_list_label}
                emptyTitle={tc.offers_empty_title}
                emptyDescription={tc.offers_empty_description}
              />
            </section>
          </>
        )}

        {/* ── PETICIONES CADUCADAS (solo coordinación / renovar) ──────── */}
        {access.canCoordinate && (
          <>
            <hr className="border-line" />
            <section aria-labelledby="expired-heading" className="flex flex-col gap-4">
              <h2 id="expired-heading" className="text-xl font-bold text-ink">
                {tc.expired_heading}
              </h2>
              {expiredNeeds.length === 0 ? (
                <EmptyState
                  title={tc.expired_empty_title}
                  description={tc.expired_empty_description}
                />
              ) : (
                <ul className="flex flex-col gap-4" aria-label={tc.expired_list_label}>
                  {expiredNeeds.map((need) => (
                    <li key={need.id}>
                      <ExpiredNeedCard need={need} slug={slug} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

      </div>
    </main>
  );
}
