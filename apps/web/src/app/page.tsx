import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getToken, authHeaders } from '@/lib/auth';
import { Badge } from '@/components/atoms/badge';
import { EmptyState } from '@/components/molecules/empty-state';
import { LanguageSwitcher } from '@/components/atoms/language-switcher';
import { getT } from '@/i18n/server';

// Emergency list must reflect live backend state on every request.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.home.meta_title,
    description: t.home.meta_description,
  };
}

export default async function HomePage() {
  const { t } = await getT();
  const { data: emergencies } = await api.GET('/emergencies');

  // Fetch notification unread count and admin status when authenticated.
  const token = await getToken();
  let notificationUnreadCount = 0;
  let isAdmin = false;
  if (token != null) {
    const [notifResult, meResult] = await Promise.all([
      api.GET('/notifications/mine', { headers: authHeaders(token) }),
      api.GET('/auth/me', { headers: authHeaders(token) }),
    ]);
    if (notifResult.data != null) {
      notificationUnreadCount = notifResult.data.unreadCount;
    }
    if (meResult.data != null) {
      isAdmin = meResult.data.isAdmin === true;
    }
  }

  const activeEmergencies = emergencies ?? [];

  return (
    <main className="min-h-screen flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-10">

        {/* ── CABECERA ─────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {t.home.title}
              </h1>
              <p className="text-base text-gray-600">
                {t.home.subtitle}
              </p>
            </div>
            <LanguageSwitcher />
          </div>
        </header>

        {/* ── EMERGENCIAS ACTIVAS ───────────────────────────────────────── */}
        <section aria-labelledby="emergencies-heading" className="flex flex-col gap-4">
          <h2
            id="emergencies-heading"
            className="text-xl font-bold text-gray-900"
          >
            {t.home.active_emergencies}
          </h2>

          {activeEmergencies.length === 0 ? (
            <EmptyState
              title={t.home.no_emergencies_title}
              description={t.home.no_emergencies_description}
            />
          ) : (
            <ul className="flex flex-col gap-3" role="list" aria-label={t.home.aria_emergency_list}>
              {activeEmergencies.map((emergency) => (
                <li key={emergency.id}>
                  <Link
                    href={`/e/${emergency.slug}`}
                    className="flex flex-col gap-2 rounded-lg border-2 border-gray-900 bg-white p-5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-lg font-bold text-gray-900 leading-tight">
                        {emergency.name}
                      </span>
                      <Badge variant="active" aria-label="Estado: activa">
                        {t.home.emergency_status_active}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">
                      {emergency.country}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── PIE / ENLACES ─────────────────────────────────────────── */}
        <footer className="border-t-2 border-gray-100 pt-6">
          <nav aria-label="Navegación secundaria" className="flex flex-wrap gap-4">
            <Link
              href="/organizaciones"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 underline underline-offset-2 transition-colors"
            >
              {t.home.my_orgs}
            </Link>
            {token != null && (
              <Link
                href="/notificaciones"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 underline underline-offset-2 transition-colors"
              >
                {notificationUnreadCount > 0
                  ? t.home.notifications_with_count.replace('{count}', String(notificationUnreadCount))
                  : t.home.notifications}
              </Link>
            )}
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 underline underline-offset-2 transition-colors"
            >
              {t.home.coordination_access}
            </Link>
            {isAdmin && (
              <>
                <Link
                  href="/admin/acreditaciones"
                  className="text-sm font-medium text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
                >
                  {t.home.admin}
                </Link>
                <Link
                  href="/admin/templates"
                  className="text-sm font-medium text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
                >
                  {t.home.templates}
                </Link>
                <Link
                  href="/admin/auditoria"
                  className="text-sm font-medium text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
                >
                  {t.home.audit}
                </Link>
              </>
            )}
          </nav>
        </footer>

      </div>
    </main>
  );
}
