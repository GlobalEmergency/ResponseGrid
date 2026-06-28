import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, authHeaders } from '@/lib/auth';
import { EmptyState } from '@/components/molecules/empty-state';
import { NotificationItem } from '@/components/molecules/notification-item';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { MarkAllReadButton } from './mark-all-read-button';

// Always reflect the latest notifications state.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notificaciones — ResponseGrid',
  description: 'Tus notificaciones en ResponseGrid.',
};

export default async function NotificacionesPage() {
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/notificaciones');
  }

  const { data } = await api.GET('/notifications/mine', {
    headers: authHeaders(token),
  });

  const notifications = data != null ? data.notifications : [];
  const unreadCount = data != null ? data.unreadCount : 0;
  const hasUnread = unreadCount > 0;

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-xl">
        <PageHeaderBand
          backHref="/"
          backLabel="← Inicio"
          title={
            hasUnread ? `Notificaciones (${unreadCount} sin leer)` : 'Notificaciones'
          }
        />
        <div className="flex flex-col gap-8 px-4 pb-12 pt-6">

          {/* ── LISTA DE NOTIFICACIONES ───────────────────────────────── */}
          <section aria-labelledby="notifications-heading" className="flex flex-col gap-4">
            <h2 id="notifications-heading" className="sr-only">
              Tus notificaciones
            </h2>

            {hasUnread && (
              <div className="flex justify-end">
                <MarkAllReadButton hasUnread={hasUnread} />
              </div>
            )}

            {notifications.length === 0 ? (
              <EmptyState
                title="No tienes notificaciones todavía."
                description="Cuando haya novedades en tus emergencias o recursos aparecerán aquí."
              />
            ) : (
              <ul
                className="flex flex-col gap-3"
                role="list"
                aria-label="Lista de notificaciones"
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

        </div>
      </div>
    </main>
  );
}
