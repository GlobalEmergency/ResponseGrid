import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getMe, getRoles } from '@/lib/navigation-data';
import {
  resolveEmergencyAccess,
  type EmergencyAccess,
} from '@/lib/emergency-permissions';
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';
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

export default async function CoordinacionActividadPage({ params }: Props) {
  const { slug } = await params;

  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion/actividad`);
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
    redirect(`/login?next=/e/${slug}/coordinacion/actividad`);
  }

  const access: EmergencyAccess = resolveEmergencyAccess(
    emergencyId,
    (me.grants ?? []) as MeGrant[],
    roles as RoleCatalogEntry[],
  );

  // Coordinator-only: the activity trail is not visible to plain validators.
  if (!access.canViewAudit) {
    redirect(`/e/${slug}/coordinacion`);
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
        redirect(`/login?next=/e/${slug}/coordinacion/actividad`);
      }
      if (r.response.status === 403) redirect(`/e/${slug}/coordinacion`);
      return r.data?.entries ?? [];
    });

  return (
    <section aria-labelledby="activity-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 id="activity-heading" className="text-xl font-bold text-ink">
          {tc.activity_title}
        </h2>
        <p className="text-sm text-muted">{tc.activity_subtitle}</p>
      </div>

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
    </section>
  );
}
