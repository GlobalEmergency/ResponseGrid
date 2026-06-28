import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, authHeaders } from '@/lib/auth';
import { EmptyState } from '@/components/molecules/empty-state';
import { NotificationItem } from '@/components/molecules/notification-item';
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
    <main className="flex-1 flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-10">

        {/* ── CABECERA ─────────────────────────────────────────────── */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← Inicio
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Notificaciones
              {hasUnread && (
                <span className="ml-2 text-lg font-semibold text-blue-600">
                  ({unreadCount} sin leer)
                </span>
              )}
            </h1>
            <MarkAllReadButton hasUnread={hasUnread} />
          </div>
        </header>

        {/* ── LISTA DE NOTIFICACIONES ───────────────────────────────── */}
        <section aria-labelledby="notifications-heading" className="flex flex-col gap-4">
          <h2 id="notifications-heading" className="sr-only">
            Tus notificaciones
          </h2>

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
    </main>
  );
}
