import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { redirectToLogin } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { resolveManageAccess } from '@/lib/manage-access';
import { WorkQueue } from '@/components/organisms/work-queue';
import { QueueToolbar } from '@/components/molecules/queue-toolbar';
import { NeedsQueue } from '@/components/organisms/coordination-queues';
import { ExpiredNeedCard } from '@/components/organisms/expired-need-card';
import { NeedsFilter } from '@/components/molecules/needs-filter';
import { SearchBox } from '@/components/molecules/search-box';
import { EmptyState } from '@/components/molecules/empty-state';
import { getT } from '@/i18n/server';
import { getCategoriesCached } from '@/adapters/get-categories';
import type { paths } from '@reliefhub/api-client';

export const dynamic = 'force-dynamic';

const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
type NeedCategory = NonNullable<
  paths['/emergencies/{emergencyId}/needs/queue']['get']['parameters']['query']
>['category'];
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

export default async function ManageNeedsPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const returnPath = `/emergencies/${slug}/manage/needs`;
  const { emergency, access, headers } = await resolveManageAccess(slug, returnPath);
  const emergencyId = emergency.id;

  // Permission gate: a principal without need:validate is bounced to the hub.
  if (!access.canValidateNeeds) {
    redirect(`/emergencies/${slug}/manage`);
  }

  const { t, locale } = await getT();
  const tc = t.coord;

  // Needs can carry any category (incl. clothing/medical/personnel — see
  // NeedsFilter, which lists the full DB catalogue), so we validate against
  // ALL category slugs, not just material ones (unlike offers).
  const categorySlugs = (await getCategoriesCached(locale)).map((c) => c.slug);

  const rawCategory =
    typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined;
  const rawPriority =
    typeof resolvedSearchParams.priority === 'string' ? resolvedSearchParams.priority : undefined;
  const category =
    rawCategory !== undefined && categorySlugs.includes(rawCategory)
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

  const onUnauthorized = async (status: number): Promise<void> => {
    if (status === 401) {
      return redirectToLogin(`/emergencies/${slug}/manage/needs`);
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
        if (r.response.status === 403) redirect(`/emergencies/${slug}/manage`);
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
      <WorkQueue
        title={tc.needs_heading}
        headingId="needs-heading"
        toolbar={
          <QueueToolbar>
            <SearchBox />
            <NeedsFilter />
          </QueueToolbar>
        }
      >
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
      </WorkQueue>

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
