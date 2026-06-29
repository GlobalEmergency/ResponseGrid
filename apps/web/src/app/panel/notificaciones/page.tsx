import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, authHeaders } from '@/lib/auth';
import { EmptyState } from '@/components/molecules/empty-state';
import { NotificationItem } from '@/components/molecules/notification-item';
import { PageContainer } from '@/components/molecules/page-container';
import { PageHeader } from '@/components/molecules/page-header';
import { MarkAllReadButton } from './mark-all-read-button';
import { getT } from '@/i18n/server';

// Always reflect the latest notifications state.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.notificaciones.meta_title,
    description: t.notificaciones.meta_description,
  };
}

export default async function NotificacionesPage() {
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/panel/notificaciones');
  }

  const { data } = await api.GET('/notifications/mine', {
    headers: authHeaders(token),
  });

  const notifications = data != null ? data.notifications : [];
  const unreadCount = data != null ? data.unreadCount : 0;
  const hasUnread = unreadCount > 0;
  const { t } = await getT();
  const tn = t.notificaciones;

  return (
    <main className="flex-1 bg-surface">
      <PageContainer>
        <PageHeader
          title={hasUnread ? tn.title_unread.replace('{count}', String(unreadCount)) : tn.title}
        />

        {/* ── LISTA DE NOTIFICACIONES ───────────────────────────────── */}
        <section aria-labelledby="notifications-heading" className="flex flex-col gap-4">
          <h2 id="notifications-heading" className="sr-only">
            {tn.heading_sr}
          </h2>

          {hasUnread && (
            <div className="flex justify-end">
              <MarkAllReadButton hasUnread={hasUnread} />
            </div>
          )}

          {notifications.length === 0 ? (
            <EmptyState title={tn.empty_title} description={tn.empty_description} />
          ) : (
            <ul
              className="flex flex-col gap-3"
              role="list"
              aria-label={tn.aria_list}
            >
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  id={notification.id}
                  message={notification.message}
                  createdAt={notification.createdAt}
                  read={notification.read}
                  link={notification.link}
                />
              ))}
            </ul>
          )}
        </section>
      </PageContainer>
    </main>
  );
}
