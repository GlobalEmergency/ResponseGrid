import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireSession, loginHref, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getMe, getRoles } from '@/lib/navigation-data';
import {
  resolveEmergencyAccess,
  type EmergencyAccess,
} from '@/lib/emergency-permissions';
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';
import { WorkQueue } from '@/components/organisms/work-queue';
import { EmptyState } from '@/components/molecules/empty-state';
import { Badge } from '@/components/atoms/badge';
import { formatDateTime } from '@/lib/format-date';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: t.coord.meta_not_found };
  return { title: `${t.coord.activity_title} · ${emergency.name}` };
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export default async function ManageActivityPage({ params }: Props) {
  const { slug } = await params;

  const token = await requireSession(`/emergencies/${slug}/manage/activity`);

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;
  const headers = authHeaders(token);

  const [me, roles] = await Promise.all([getMe(), getRoles()]);
  if (me == null) {
    await clearToken();
    redirect(loginHref(`/emergencies/${slug}/manage/activity`));
  }

  const access: EmergencyAccess = resolveEmergencyAccess(
    emergencyId,
    (me.grants ?? []) as MeGrant[],
    roles as RoleCatalogEntry[],
  );

  // Coordinator-only: the activity trail is not visible to plain validators.
  if (!access.canViewAudit) {
    redirect(`/emergencies/${slug}/manage`);
  }

  const { t, locale } = await getT();
  const tc = t.coord;

  const entries = await api
    .GET('/emergencies/{emergencyId}/audit', {
      params: { path: { emergencyId }, query: { limit: 200 } },
      headers,
    })
    .then(async (r) => {
      if (r.response.status === 401) {
        await clearToken();
        redirect(loginHref(`/emergencies/${slug}/manage/activity`));
      }
      if (r.response.status === 403) redirect(`/emergencies/${slug}/manage`);
      return r.data?.entries ?? [];
    });

  return (
    <WorkQueue
      title={tc.activity_title}
      subtitle={tc.activity_subtitle}
      headingId="activity-heading"
    >
      {entries.length === 0 ? (
        <EmptyState title={tc.activity_empty} description="" />
      ) : (
        <ul className="flex flex-col gap-3" aria-label={tc.activity_title}>
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-ink">
                    {e.action}
                  </span>
                  {e.entityType != null && (
                    <Badge variant="role-member">{e.entityType}</Badge>
                  )}
                  {e.targetStatus != null && (
                    <span className="text-xs text-muted">
                      {tc.activity_target_label}:{' '}
                      <span className="font-medium text-ink">
                        {e.targetStatus}
                      </span>
                    </span>
                  )}
                </div>
                <time
                  dateTime={e.createdAt}
                  suppressHydrationWarning
                  className="text-xs text-muted"
                >
                  {formatDateTime(e.createdAt, locale)}
                </time>
              </div>

              <div className="text-sm text-ink">
                {e.actorName ?? tc.activity_actor_unknown}
              </div>

              {e.reason != null && e.reason !== '' && (
                <div className="text-sm">
                  <span className="text-muted">{tc.activity_reason_label}: </span>
                  <span className="text-ink">{e.reason}</span>
                </div>
              )}

              {e.changes != null && e.changes.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted">
                    {tc.activity_changes_label}
                  </span>
                  <ul className="flex flex-col gap-0.5">
                    {e.changes.map((c, i) => (
                      <li
                        key={`${c.field}-${i}`}
                        className="text-xs text-ink"
                      >
                        <span className="font-medium">{c.field}</span>:{' '}
                        <span className="text-muted line-through">
                          {formatValue(c.before)}
                        </span>{' '}
                        → <span>{formatValue(c.after)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </WorkQueue>
  );
}
