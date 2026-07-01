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
import { ResourcesQueue } from '@/components/organisms/coordination-queues';
import { SearchBox } from '@/components/molecules/search-box';
import { ResourceTypeFilter } from '@/components/molecules/resource-type-filter';
import { Pagination } from '@/components/molecules/pagination';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

const VALID_TYPES = [
  'collection_point',
  'delivery_point',
  'collection_and_delivery',
  'warehouse',
  'transport',
  'supplier',
  'venue',
] as const;
type ResourceType = (typeof VALID_TYPES)[number];

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
    title: t.coord.resources_section_meta_title.replace('{name}', emergency.name),
    description: t.coord.resources_section_meta_description.replace(
      '{name}',
      emergency.name,
    ),
  };
}

export default async function CoordinacionRecursosPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const token = await getToken();
  if (token === null) {
    redirect(loginHref(`/e/${slug}/coordinacion/recursos`));
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
    redirect(loginHref(`/e/${slug}/coordinacion/recursos`));
  }

  const access: EmergencyAccess = resolveEmergencyAccess(
    emergencyId,
    (me.grants ?? []) as MeGrant[],
    roles as RoleCatalogEntry[],
  );

  // Permission gate: a principal without resource:verify is bounced to the hub.
  if (!access.canVerifyResources) {
    redirect(`/e/${slug}/coordinacion`);
  }

  const rawQ =
    typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q.trim() : '';
  const q = rawQ.slice(0, 100);

  const rawType =
    typeof resolvedSearchParams.type === 'string' ? resolvedSearchParams.type : undefined;
  const type = VALID_TYPES.includes(rawType as ResourceType)
    ? (rawType as ResourceType)
    : undefined;

  const rawPage =
    typeof resolvedSearchParams.page === 'string'
      ? Number.parseInt(resolvedSearchParams.page, 10)
      : 1;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const { t } = await getT();
  const tc = t.coord;

  const result = await api.GET('/emergencies/{emergencyId}/coordination/queue', {
    params: {
      path: { emergencyId },
      query: {
        page,
        limit: PAGE_SIZE,
        ...(type !== undefined && { type }),
        ...(q !== '' && { q }),
      },
    },
    headers,
  });

  if (result.response.status === 401) {
    await clearToken();
    redirect(loginHref(`/e/${slug}/coordinacion/recursos`));
  }
  if (result.response.status === 403) {
    redirect(`/e/${slug}/coordinacion`);
  }

  const resources = result.data?.items ?? [];
  const total = result.data?.total ?? 0;
  const isFiltered = q !== '' || type !== undefined;

  const preserve: Record<string, string> = {
    ...(q !== '' && { q }),
    ...(type !== undefined && { type }),
  };

  return (
    <section aria-labelledby="resources-heading" className="flex flex-col gap-5">
      <h2 id="resources-heading" className="text-xl font-bold text-ink">
        {tc.resources_heading}
      </h2>

      <div className="flex flex-col gap-3">
        <SearchBox />
        <ResourceTypeFilter />
      </div>

      <ResourcesQueue
        resources={resources}
        slug={slug}
        canVerify={access.canVerifyResources}
        listLabel={tc.resources_list_label}
        emptyTitle={isFiltered ? tc.resources_no_match_title : tc.resources_empty_title}
        emptyDescription={
          isFiltered
            ? tc.resources_no_match_description
            : tc.resources_empty_description
        }
      />

      <Pagination
        page={page}
        limit={PAGE_SIZE}
        total={total}
        preserve={preserve}
        labels={{
          prev: tc.pagination_prev,
          next: tc.pagination_next,
          summary: tc.pagination_summary,
        }}
      />
    </section>
  );
}
