import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getT } from '@/i18n/server';
import { PageContainer } from '@/components/molecules/page-container';
import { PageHeader } from '@/components/molecules/page-header';
import { EmptyState } from '@/components/molecules/empty-state';
import { formatDate } from '@/lib/format-date';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.misDonaciones.meta_title,
    description: t.misDonaciones.meta_description,
  };
}

/**
 * "Mis donaciones" (#168) — platform-level view for a logged-in donor: every
 * donation they pre-registered while authenticated (linked by donorUserId),
 * across all emergencies, so they follow them from their account without keeping
 * a code. Each row links to the public tracking page. The operator's code/email
 * search is a separate, permission-gated surface.
 */
export default async function MisDonacionesPage() {
  const token = await getToken();
  if (token === null) {
    redirect('/login?next=/panel/mis-donaciones');
  }

  const { t, locale } = await getT();
  const tm = t.misDonaciones;

  const res = await api.GET('/me/donation-intakes', {
    headers: authHeaders(token),
  });
  if (res.response.status === 401) {
    await clearToken();
    redirect('/login?next=/panel/mis-donaciones');
  }
  const donations = res.data ?? [];

  const statusLabel = (s: string): string =>
    s === 'received'
      ? tm.status_received
      : s === 'rejected'
        ? tm.status_rejected
        : s === 'incomplete'
          ? tm.status_incomplete
          : tm.status_pending;

  const rowClass =
    'flex items-center justify-between gap-3 rounded-lg border-2 border-line bg-white px-4 py-3.5';

  return (
    <main className="flex-1 bg-surface">
      <PageContainer>
        <PageHeader title={tm.page_title} subtitle={tm.page_subtitle} />

        {donations.length === 0 ? (
          <EmptyState title={tm.empty_title} description={tm.empty_body} />
        ) : (
          <ul className="flex flex-col gap-2.5" role="list">
            {donations.map((d) => {
              const inner = (
                <>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-display text-base font-bold tracking-wide text-navy">
                      {d.intakeCode}
                    </span>
                    <span className="truncate text-[12.5px] text-muted">
                      {d.resourceName ?? tm.unknown_point} ·{' '}
                      {tm.item_lines.replace('{n}', String(d.itemCount))} ·{' '}
                      {formatDate(d.createdAt, locale)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-navy">
                    {statusLabel(d.status)}
                  </span>
                </>
              );
              return (
                <li key={`${d.emergencyId}-${d.intakeCode}`}>
                  {d.emergencySlug != null ? (
                    <Link
                      href={`/e/${d.emergencySlug}/donacion/${d.intakeCode}`}
                      className={`${rowClass} transition-colors hover:border-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2`}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className={rowClass}>{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PageContainer>
    </main>
  );
}
