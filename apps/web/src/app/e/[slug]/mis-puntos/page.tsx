import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { fetchMyResources } from './actions';
import { StatusForm } from './status-form';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: t.account.emergency_not_found };
  return {
    title: t.account.points_meta_title.replace('{name}', emergency.name),
    description: t.account.points_meta_description.replace('{name}', emergency.name),
  };
}

export default async function MisPuntosPage({ params }: Props) {
  const { slug } = await params;
  const { t } = await getT();
  const ta = t.account;

  const TYPE_LABELS: Record<string, string> = {
    collection_point: ta.type_collection_point,
    delivery_point: ta.type_delivery_point,
    collection_and_delivery: ta.type_collection_and_delivery,
    warehouse: ta.type_warehouse,
    transport: ta.type_transport,
    supplier: ta.type_supplier,
    venue: ta.type_venue,
  };

  const STAGE_LABELS: Record<string, string> = {
    origin: ta.stage_origin,
    intermediate: ta.stage_intermediate,
    destination: ta.stage_destination,
  };

  // --- Auth guard -----------------------------------------------------------
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/mis-puntos`);
  }

  // --- Emergency resolution -------------------------------------------------
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  // --- Fetch my resources ---------------------------------------------------
  const myResources = await fetchMyResources(emergency.id, slug);

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeaderBand
          backHref={`/e/${slug}`}
          backLabel={emergency.name}
          title={ta.points_title}
          subtitle={ta.points_subtitle}
        />
        <div className="flex flex-col gap-8 px-5 pb-12 pt-6 lg:px-8">

        {/* ── LISTA DE PUNTOS ───────────────────────────────────────── */}
        <section aria-labelledby="my-points-heading" className="flex flex-col gap-4">
          <h2 id="my-points-heading" className="sr-only">
            {ta.points_list_heading}
          </h2>

          {myResources.length === 0 ? (
            <EmptyState
              title={ta.no_points_title}
              description={ta.no_points_description}
            />
          ) : (
            <ul className="flex flex-col gap-4" role="list" aria-label={ta.points_list_aria}>
              {myResources.map((resource) => (
                <li key={resource.id}>
                  <article
                    aria-label={ta.point_card_aria.replace('{name}', resource.name)}
                    className="flex flex-col gap-4 rounded-lg border-2 border-navy bg-white p-5"
                  >
                    <div className="flex flex-col gap-1">
                      <h3 className="text-lg font-bold text-ink leading-tight">
                        {resource.name}
                      </h3>
                      <p className="text-sm text-muted">
                        {TYPE_LABELS[resource.type] ?? resource.type}
                        {' · '}
                        {STAGE_LABELS[resource.stage] ?? resource.stage}
                      </p>
                    </div>

                    <StatusForm
                      resourceId={resource.id}
                      currentStatus={resource.publicStatus}
                      slug={slug}
                    />

                    <Link
                      href={`/e/${slug}/reportar?resourceId=${resource.id}`}
                      className="inline-flex items-center justify-center rounded-lg border-2 border-navy px-4 py-2 text-sm font-semibold text-ink bg-white hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 transition-colors w-fit"
                    >
                      {ta.report_incident_cta}
                    </Link>
                  </article>
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
