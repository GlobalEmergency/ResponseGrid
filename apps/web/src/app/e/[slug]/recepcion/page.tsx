import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getMe, getRoles } from '@/lib/navigation-data';
import {
  resolveEmergencyAccess,
  type EmergencyAccess,
} from '@/lib/emergency-permissions';
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { EmptyState } from '@/components/molecules/empty-state';
import { formatDate } from '@/lib/format-date';
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

  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/recepcion`);
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
    redirect(`/login?next=/e/${slug}/recepcion`);
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

  const q =
    typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : '';

  // The operator's own collection points (to list their pending intakes and
  // map a target resource id to a human name).
  const mineRes = await api.GET('/emergencies/{emergencyId}/resources/mine', {
    params: { path: { emergencyId } },
    headers,
  });
  if (mineRes.response.status === 401) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/recepcion`);
  }
  const myPoints = (mineRes.data ?? []).filter((r) =>
    COLLECTION_TYPES.has(r.type),
  );
  const pointName = new Map(myPoints.map((p) => [p.id, p.name]));

  // Search mode (by code/email/phone) vs. default pending list at my point(s).
  const searching = q !== '';

  const searchHits = searching
    ? await api
        .GET('/emergencies/{emergencyId}/donation-intakes/search', {
          params: { path: { emergencyId }, query: { q } },
          headers,
        })
        .then((r) => r.data ?? [])
    : [];

  const pending = !searching
    ? (
        await Promise.all(
          myPoints.map((p) =>
            api
              .GET('/resources/{resourceId}/donation-intakes/pending', {
                params: { path: { resourceId: p.id } },
                headers,
              })
              .then((r) => r.data ?? []),
          ),
        )
      ).flat()
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

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-md">
        <PageHeaderBand
          backHref={`/e/${slug}`}
          backLabel={t.common.back_to_emergency}
          title={tr.page_title}
          subtitle={tr.page_subtitle}
        />
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
          ) : (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-base font-bold text-navy">
                {tr.pending_heading}
              </h2>
              {myPoints.length === 0 ? (
                <EmptyState title={tr.no_points_note} />
              ) : pending.length === 0 ? (
                <EmptyState title={tr.pending_empty} />
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
                            {pointName.get(it.targetResourceId) ?? tr.point_label}{' '}
                            ·{' '}
                            {tr.item_lines.replace('{n}', String(it.itemCount))} ·{' '}
                            {formatDate(it.createdAt, locale)}
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
          )}
        </div>
      </div>
    </main>
  );
}
