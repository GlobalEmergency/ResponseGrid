import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { loginHref, getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchAuditEntries } from './actions';
import { AuditFilter } from './audit-filter';
import { AuditEntryCard, AuditEntryRow } from '@/components/molecules/audit-entry-row';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageHeader } from '@/components/molecules/page-header';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.admin.audit_meta_title,
    description: t.admin.audit_meta_description,
  };
}

interface PageProps {
  searchParams: Promise<{
    entityType?: string;
    emergencyId?: string;
    offset?: string;
  }>;
}

const PAGE_LIMIT = 50;

export default async function AuditoriaPage({ searchParams }: PageProps) {
  const token = await getToken();
  if (!token) {
    redirect(loginHref('/panel/administracion/auditoria'));
  }

  const { data: me, response: meResponse } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });

  if (meResponse.status === 401 || !me) {
    redirect(loginHref('/panel/administracion/auditoria'));
  }

  if (!me.isAdmin) {
    redirect('/');
  }

  const params = await searchParams;
  const entityType = params.entityType ?? '';
  const emergencyId = params.emergencyId ?? '';
  const offset = Number(params.offset ?? '0');

  const { entries, total } = await fetchAuditEntries({
    ...(entityType ? { entityType } : {}),
    ...(emergencyId ? { emergencyId } : {}),
    limit: PAGE_LIMIT,
    offset,
  });

  const hasFilters = entityType !== '' || emergencyId !== '';
  const prevOffset = Math.max(0, offset - PAGE_LIMIT);
  const nextOffset = offset + PAGE_LIMIT;
  const hasPrev = offset > 0;
  const hasNext = nextOffset < total;

  function paginationHref(newOffset: number) {
    const p = new URLSearchParams();
    if (entityType) p.set('entityType', entityType);
    if (emergencyId) p.set('emergencyId', emergencyId);
    if (newOffset > 0) p.set('offset', String(newOffset));
    const qs = p.toString();
    return qs ? `?${qs}` : '?';
  }

  const { t } = await getT();
  const ta = t.admin;

  return (
    <>
      <PageHeader title={ta.audit_title} subtitle={ta.audit_subtitle} />

      {total > 0 && (
          <p className="text-xs text-muted-soft">
            {(total === 1 ? ta.audit_total_one : ta.audit_total_other).replace('{count}', String(total))}
            {hasFilters ? ta.audit_total_filtered : ''}
          </p>
        )}

        <section aria-label={ta.audit_filters_aria}>
          <AuditFilter />
        </section>

        <section aria-labelledby="audit-heading" className="flex flex-col gap-4">
          <h2 id="audit-heading" className="text-xl font-bold text-ink">
            {ta.audit_recent_heading}
          </h2>

          {entries.length === 0 ? (
            <EmptyState
              title={ta.audit_empty_title}
              description={
                hasFilters
                  ? ta.audit_empty_filtered
                  : ta.audit_empty_description
              }
            />
          ) : (
            <>
              <ul className="flex flex-col gap-3 md:hidden" role="list">
                {entries.map((entry) => (
                  <AuditEntryCard key={entry.id} entry={entry} />
                ))}
              </ul>

              <div className="hidden md:block overflow-x-auto rounded-lg border-2 border-navy">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface border-b-2 border-navy">
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
                        {ta.audit_col_action}
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
                        {ta.audit_col_actor}
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
                        {ta.audit_col_entity}
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
                        {ta.audit_col_request}
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
                        {ta.audit_col_status}
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
                        {ta.audit_col_date}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <AuditEntryRow key={entry.id} entry={entry} />
                    ))}
                  </tbody>
                </table>
              </div>

              {(hasPrev || hasNext) && (
                <nav
                  aria-label={ta.audit_pagination_aria}
                  className="flex items-center justify-between gap-4 pt-2"
                >
                  {hasPrev ? (
                    <Link
                      href={paginationHref(prevOffset)}
                      className="text-sm font-medium text-muted hover:text-ink underline underline-offset-2 transition-colors"
                    >
                      {ta.audit_prev}
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-muted-soft">
                    {ta.audit_range
                      .replace('{from}', String(offset + 1))
                      .replace('{to}', String(Math.min(offset + PAGE_LIMIT, total)))
                      .replace('{total}', String(total))}
                  </span>
                  {hasNext ? (
                    <Link
                      href={paginationHref(nextOffset)}
                      className="text-sm font-medium text-muted hover:text-ink underline underline-offset-2 transition-colors"
                    >
                      {ta.audit_next}
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </>
          )}
        </section>
    </>
  );
}
