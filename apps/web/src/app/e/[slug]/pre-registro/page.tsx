import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { api } from '@/lib/api';
import { getT } from '@/i18n/server';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { EmptyState } from '@/components/molecules/empty-state';
import { submitPreRegistration } from './actions';
import { PreRegistroForm } from './pre-registro-form';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Resource types that accept donation pre-registration (mirrors the API). */
const COLLECTION_TYPES = new Set(['collection_point', 'collection_and_delivery']);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  const { t } = await getT();

  if (!emergency) {
    return { title: 'Emergencia no encontrada · ResponseGrid' };
  }

  return {
    title: t.prereg.meta_title.replace('{emergencyName}', emergency.name),
    description: t.prereg.meta_description.replace(
      '{emergencyName}',
      emergency.name,
    ),
  };
}

export default async function PreRegistroPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const tp = t.prereg;

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const resourceId =
    typeof sp.resourceId === 'string' ? sp.resourceId.trim() : '';

  // ── Step 1 — choose the delivery point (no resourceId yet) ────────────────
  // The donation flow always starts by picking where the material is going.
  // Server-side search (`q`) over name/address/city scales past the hundreds of
  // points an emergency can have; results are filtered to active collection
  // points (the only targets the API accepts for an intake).
  if (resourceId === '') {
    const q = typeof sp.q === 'string' ? sp.q.trim() : '';
    const { data: page } = await api.GET(
      '/emergencies/{emergencyId}/public/resources',
      {
        params: {
          path: { emergencyId: emergency.id },
          query: { page: 1, limit: 50, ...(q !== '' ? { q } : {}) },
        },
      },
    );
    const points = (page?.items ?? []).filter(
      (r) => COLLECTION_TYPES.has(r.type) && r.publicStatus === 'active',
    );

    return (
      <main className="flex-1 bg-surface">
        <div className="mx-auto w-full max-w-3xl">
          <PageHeaderBand
            backHref={`/e/${slug}`}
            backLabel={t.common.back_to_emergency}
            title={tp.pick_title}
            subtitle={tp.pick_hint}
          />
          <div className="flex flex-col gap-5 px-4 pb-12 pt-6">
            <form method="get" role="search" className="flex gap-2">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder={tp.pick_search_placeholder}
                aria-label={tp.pick_search_label}
                className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-navy px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
              >
                {tp.pick_search_button}
              </button>
            </form>

            {points.length === 0 ? (
              <EmptyState title={tp.pick_results_empty} />
            ) : (
              <>
                <p className="text-xs text-muted">{tp.pick_all_hint}</p>
                <ul className="flex flex-col gap-2.5" role="list">
                  {points.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/e/${slug}/pre-registro?resourceId=${p.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border-2 border-line bg-white px-4 py-3.5 transition-colors hover:border-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-[15px] font-semibold text-ink">
                            {p.name}
                          </span>
                          {p.city !== null && p.city !== '' && (
                            <span className="truncate text-[12.5px] text-muted">
                              {p.city}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-navy">
                          {tp.pick_select} →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ── Step 2 — point chosen → validate it, then show the pre-registration form ─
  const { data: resource } = await api.GET(
    '/emergencies/{emergencyId}/public/resources/{resourceId}',
    { params: { path: { emergencyId: emergency.id, resourceId } } },
  );

  const eligible =
    resource !== undefined &&
    COLLECTION_TYPES.has(resource.type) &&
    resource.publicStatus === 'active';

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeaderBand
          backHref={`/e/${slug}/pre-registro`}
          backLabel={tp.back_to_pick}
          title={tp.page_title}
          subtitle={
            eligible && resource !== undefined
              ? tp.page_subtitle.replace('{pointName}', resource.name)
              : undefined
          }
        />
        <div className="flex flex-col gap-6 px-4 pb-12 pt-6">
          {eligible && resource !== undefined ? (
            <PreRegistroForm
              action={submitPreRegistration.bind(
                null,
                emergency.id,
                resourceId,
              )}
              slug={slug}
              resourceId={resourceId}
              pointName={resource.name}
              t={tp}
              locale={locale}
              backToEmergencyLabel={t.common.back_to_emergency}
            />
          ) : (
            <>
              <EmptyState
                title={
                  resource === undefined
                    ? tp.no_point_title
                    : tp.not_eligible_title
                }
                description={
                  resource === undefined ? tp.no_point_body : tp.not_eligible_body
                }
              />
              <Link
                href={`/e/${slug}/pre-registro`}
                className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-white bg-navy rounded-lg hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 transition-colors"
              >
                {tp.no_point_cta}
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
