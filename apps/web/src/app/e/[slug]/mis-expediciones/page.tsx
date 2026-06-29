import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { ShipmentsList } from '@/components/organisms/shipments-list';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

const RESOURCE_PAGE_SIZE = 100;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: t.account.emergency_not_found };
  return {
    title: t.account.ship_meta_title.replace('{name}', emergency.name),
    description: t.account.ship_meta_description.replace('{name}', emergency.name),
  };
}

export default async function MisExpedicionesPage({ params }: Props) {
  const { slug } = await params;
  const { t } = await getT();
  const ta = t.account;

  // --- Auth guard -----------------------------------------------------------
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/mis-expediciones`);
  }

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;
  const headers = authHeaders(token);

  // --- Fetch my shipments + resource names in parallel ----------------------
  const [shipments, resourcesPage] = await Promise.all([
    api
      .GET('/logistics/shipments/mine', {
        params: { query: { emergencyId } },
        headers,
      })
      .then(async (r) => {
        if (r.response.status === 401) {
          await clearToken();
          redirect(`/login?next=/e/${slug}/mis-expediciones`);
        }
        return r.data ?? [];
      }),
    api
      .GET('/emergencies/{emergencyId}/public/resources', {
        params: {
          path: { emergencyId },
          query: { page: 1, limit: RESOURCE_PAGE_SIZE },
        },
      })
      .then((r) => r.data?.items ?? []),
  ]);

  const resourceNames: Record<string, string> = {};
  for (const r of resourcesPage) resourceNames[r.id] = r.name;

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeaderBand
          backHref={`/e/${slug}`}
          backLabel={emergency.name}
          title={ta.ship_title}
          subtitle={ta.ship_subtitle}
        />
        <div className="flex flex-col gap-6 px-5 pb-12 pt-6 lg:px-8">
          <ShipmentsList
            shipments={shipments}
            slug={slug}
            resourceNames={resourceNames}
            capacities={[]}
            canManage={false}
            listLabel={ta.ship_list_label}
            emptyTitle={ta.ship_empty_title}
            emptyDescription={ta.ship_empty_description}
          />
        </div>
      </div>
    </main>
  );
}
