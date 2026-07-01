import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { loginHref, getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getMe, getRoles } from '@/lib/navigation-data';
import {
  resolveEmergencyAccess,
  type EmergencyAccess,
} from '@/lib/emergency-permissions';
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';
import { NeedsQueue } from '@/components/organisms/coordination-queues';
import { ExpiredNeedCard } from '@/components/organisms/expired-need-card';
import { NeedsFilter } from '@/components/molecules/needs-filter';
import { SearchBox } from '@/components/molecules/search-box';
import { EmptyState } from '@/components/molecules/empty-state';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = [
  'hygiene', 'water', 'food', 'medical', 'shelter', 'tools', 'other',
  'medicines', 'medical_equipment', 'medical_supplies', 'medical_personnel',
] as const;
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
type NeedCategory = (typeof VALID_CATEGORIES)[number];
type Priority = (typeof VALID_PRIORITIES)[number];

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
    title: t.coord.needs_section_meta_title.replace('{name}', emergency.name),
    description: t.coord.needs_section_meta_description.replace('{name}', emergency.name),
  };
}

export default async function CoordinacionPeticionesPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const token = await getToken();
  if (token === null) {
    redirect(loginHref(`/e/${slug}/coordinacion/peticiones`));
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
    redirect(loginHref(`/e/${slug}/coordinacion/peticiones`));
  }

  const access: EmergencyAccess = resolveEmergencyAccess(
    emergencyId,
    (me.grants ?? []) as MeGrant[],
    roles as RoleCatalogEntry[],
  );

  // Permission gate: a principal without need:validate is bounced to the hub.
  if (!access.canValidateNeeds) {
    redirect(`/e/${slug}/coordinacion`);
  }

  const rawCategory =
    typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined;
  const rawPriority =
    typeof resolvedSearchParams.priority === 'string' ? resolvedSearchParams.priority : undefined;
  const category = VALID_CATEGORIES.includes(rawCategory as NeedCategory)
    ? (rawCategory as NeedCategory)
    : undefined;
  const priority = VALID_PRIORITIES.includes(rawPriority as Priority)
    ? (rawPriority as Priority)
    : undefined;
  const q = (
    typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q.trim() : ''
  )
    .slice(0, 100)
    .toLowerCase();

  const { t } = await getT();
  const tc = t.coord;

  const onUnauthorized = async (status: number): Promise<void> => {
    if (status === 401) {
      await clearToken();
      redirect(loginHref(`/e/${slug}/coordinacion/peticiones`));
    }
  };

  const [needsQueue, expiredNeeds] = await Promise.all([
    api
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
        if (r.response.status === 403) redirect(`/e/${slug}/coordinacion`);
        return r.data ?? [];
      }),
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

  // Free-text search is applied here (the queue endpoint has no `q`): match on
  // the need title or any requested item name.
  const visibleNeeds =
    q === ''
      ? needsQueue
      : needsQueue.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.items.some((it) => it.name.toLowerCase().includes(q)),
        );

  const isFiltered = q !== '' || category !== undefined || priority !== undefined;

  return (
    <>
      <section aria-labelledby="needs-heading" className="flex flex-col gap-5">
        <h2 id="needs-heading" className="text-xl font-bold text-ink">
          {tc.needs_heading}
        </h2>

        <div className="flex flex-col gap-3">
          <SearchBox />
          <NeedsFilter />
        </div>

        <NeedsQueue
          needs={visibleNeeds}
          slug={slug}
          canValidate={access.canValidateNeeds}
          listLabel={tc.needs_list_label}
          emptyTitle={isFiltered ? tc.needs_no_match_title : tc.needs_empty_title}
          emptyDescription={
            isFiltered ? tc.needs_no_match_description : tc.needs_empty_description
          }
        />
      </section>

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
    </>
  );
}
