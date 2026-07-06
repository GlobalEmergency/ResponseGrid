import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { requireSession, authHeaders, redirectToLogin } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getMe, getRoles } from '@/lib/navigation-data';
import {
  resolveEmergencyAccess,
  type EmergencyAccess,
} from '@/lib/emergency-permissions';
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';
import { AppBar } from '@/components/organisms/app-bar';
import { PageHeading } from '@/components/atoms/page-heading';
import { EmptyState } from '@/components/molecules/empty-state';
import { formatDate } from '@/lib/format-date';
import { labelForCategory } from '@/domain/supplies/category';
import { getCategoriesCached } from '@/adapters/get-categories';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

/** Resource types whose pending intakes an operator receives. */
const COLLECTION_TYPES = new Set(['collection_point', 'collection_and_delivery']);

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: 'Emergencia no encontrada · ResponseGrid' };
  return {
    title: t.recepcion.meta_title.replace('{emergencyName}', emergency.name),
    description: t.recepcion.meta_description,
  };
}

export default async function RecepcionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const token = await requireSession(`/e/${slug}/recepcion`);

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;
  const headers = authHeaders(token);

  const [me, roles] = await Promise.all([getMe(), getRoles()]);
  if (me == null) {
    return redirectToLogin(`/e/${slug}/recepcion`);
  }

  const access: EmergencyAccess = resolveEmergencyAccess(
    emergencyId,
    (me.grants ?? []) as MeGrant[],
    roles as RoleCatalogEntry[],
  );
  // Reception is for point operators / coordinators holding intake:read.
  if (!access.canReadIntakes) {
    redirect(`/e/${slug}`);
  }

  const { t, locale } = await getT();
  const tr = t.recepcion;
  const categories = await getCategoriesCached(locale);

  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : '';

  // The operator's own collection points — each one is a "centro de recepción".
  const mineRes = await api.GET('/emergencies/{emergencyId}/resources/mine', {
    params: { path: { emergencyId } },
    headers,
  });
  if (mineRes.response.status === 401) {
    return redirectToLogin(`/e/${slug}/recepcion`);
  }
  const myPoints = (mineRes.data ?? []).filter((r) =>
    COLLECTION_TYPES.has(r.type),
  );

  // Search mode (by code/email/phone) vs. the per-center desk.
  const searching = q !== '';

  const searchHits = searching
    ? await api
        .GET('/emergencies/{emergencyId}/donation-intakes/search', {
          params: { path: { emergencyId }, query: { q } },
          headers,
        })
        .then((r) => r.data ?? [])
    : [];

  // Per-center desk: each managed center carries its own incoming forecast (#200)
  // and its own pending intakes, so the operator works "respecto al centro de
  // recepción", not against one aggregate across every point.
  const centers = !searching
    ? await Promise.all(
        myPoints.map(async (point) => {
          const [pendingRes, incomingRes] = await Promise.all([
            api.GET('/resources/{resourceId}/donation-intakes/pending', {
              params: { path: { resourceId: point.id } },
              headers,
            }),
            api.GET(
              '/resources/{resourceId}/donation-intakes/incoming-summary',
              { params: { path: { resourceId: point.id } }, headers },
            ),
          ]);
          return {
            point,
            pending: pendingRes.data ?? [],
            incoming: incomingRes.data ?? { lines: [], totalPendingIntakes: 0 },
          };
        }),
      )
    : [];

  const statusLabel = (s: string): string =>
    s === 'received'
      ? tr.status_received
      : s === 'rejected'
        ? tr.status_rejected
        : s === 'incomplete'
          ? tr.status_incomplete
          : tr.status_pending;

  const rowClass =
    'flex items-center justify-between gap-3 rounded-lg border-2 border-line bg-white px-4 py-3.5 transition-colors hover:border-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2';

  const subheading = 'text-sm font-bold uppercase tracking-wide text-muted';

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <AppBar
          variant="action"
          slug={slug}
          backHref={`/emergencies/${slug}/manage`}
          currentPath={`/e/${slug}/recepcion`}
        />
        <PageHeading title={tr.page_title} subtitle={tr.page_subtitle} />
        <div className="flex flex-col gap-5 px-4 pb-12 pt-6">
          <Link
            href={`/e/${slug}/pre-registro`}
            className="flex items-center justify-center w-full rounded-lg border-2 border-navy bg-white py-3 px-4 text-base font-semibold text-navy transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          >
            + {tr.new_intake_cta}
          </Link>

          <form method="get" role="search" className="flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={tr.search_placeholder}
              aria-label={tr.search_label}
              className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-navy px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
            >
              {tr.search_button}
            </button>
          </form>

          {searching ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-base font-bold text-navy">
                {tr.search_results_heading}
              </h2>
              {searchHits.length === 0 ? (
                <EmptyState title={tr.search_empty} />
              ) : (
                <ul className="flex flex-col gap-2.5" role="list">
                  {searchHits.map((hit) => (
                    <li key={hit.id}>
                      <Link
                        href={`/e/${slug}/recepcion/${hit.id}`}
                        className={rowClass}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="font-display text-base font-bold tracking-wide text-navy">
                            {hit.intakeCode}
                          </span>
                          <span className="truncate text-[13px] text-ink">
                            {hit.donorName}
                          </span>
                          <span className="text-[12px] text-muted">
                            {tr.item_lines.replace('{n}', String(hit.itemCount))}{' '}
                            · {statusLabel(hit.status)}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-navy">
                          {tr.item_select} →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : myPoints.length === 0 ? (
            <EmptyState title={tr.no_points_note} />
          ) : (
            <div className="flex flex-col gap-5">
              {centers.map(({ point, pending, incoming }) => (
                <section
                  key={point.id}
                  aria-label={point.name}
                  className="flex flex-col gap-4 rounded-lg border-2 border-navy bg-white p-4"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {tr.center_label}
                    </span>
                    <h2 className="font-display text-lg font-bold text-navy">
                      {point.name}
                    </h2>
                  </div>

                  {/* Por entrar (previsión) del centro */}
                  <div className="flex flex-col gap-2">
                    <h3 className={subheading}>{tr.incoming_heading}</h3>
                    {incoming.lines.length === 0 ? (
                      <p className="text-sm text-muted">{tr.incoming_empty}</p>
                    ) : (
                      <ul className="flex flex-col gap-2" role="list">
                        {incoming.lines.map((line, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2.5"
                          >
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate text-[15px] font-semibold text-ink">
                                {line.name}
                              </span>
                              <span className="text-[12.5px] text-muted">
                                {labelForCategory(line.category, categories)} ·{' '}
                                {tr.incoming_from_intakes.replace(
                                  '{n}',
                                  String(line.intakeCount),
                                )}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold text-ink">
                              {line.totalQuantity}
                              {line.unit != null && line.unit !== ''
                                ? ` ${line.unit}`
                                : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Entregas pendientes del centro */}
                  <div className="flex flex-col gap-2">
                    <h3 className={subheading}>{tr.pending_heading}</h3>
                    {pending.length === 0 ? (
                      <p className="text-sm text-muted">{tr.pending_empty}</p>
                    ) : (
                      <ul className="flex flex-col gap-2.5" role="list">
                        {pending.map((it) => (
                          <li key={it.id}>
                            <Link
                              href={`/e/${slug}/recepcion/${it.id}`}
                              className={rowClass}
                            >
                              <span className="flex min-w-0 flex-col">
                                <span className="font-display text-base font-bold tracking-wide text-navy">
                                  {it.intakeCode}
                                </span>
                                <span className="truncate text-[12.5px] text-muted">
                                  {tr.item_lines.replace(
                                    '{n}',
                                    String(it.itemCount),
                                  )}{' '}
                                  · {formatDate(it.createdAt, locale)}
                                </span>
                              </span>
                              <span className="shrink-0 text-sm font-semibold text-navy">
                                {tr.item_select} →
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
