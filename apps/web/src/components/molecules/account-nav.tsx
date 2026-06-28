/**
 * AccountNav — secondary account/coordination links for the home page.
 * Previously lived inside the home footer; now an in-page nav so the page keeps
 * a single (global) footer. Admin links surface only for admins.
 */
import Link from 'next/link';
import type { Messages } from '@/i18n/messages/es';

interface AccountNavProps {
  t: Messages['home'];
  authed: boolean;
  isAdmin: boolean;
  notificationUnreadCount: number;
}

const linkClass =
  'text-sm font-medium text-muted underline underline-offset-2 transition-colors hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded';

export function AccountNav({ t, authed, isAdmin, notificationUnreadCount }: AccountNavProps) {
  return (
    <nav
      aria-label={t.aria_secondary_nav}
      className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-5"
    >
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-soft">
        {t.account_heading}
      </span>
      <Link href="/organizaciones" className={linkClass}>{t.my_orgs}</Link>
      {authed && (
        <>
          <Link href="/grupos" className={linkClass}>{t.groups}</Link>
          <Link href="/mis-permisos" className={linkClass}>{t.my_permissions}</Link>
          <Link href="/notificaciones" className={linkClass}>
            {notificationUnreadCount > 0
              ? t.notifications_with_count.replace('{count}', String(notificationUnreadCount))
              : t.notifications}
          </Link>
        </>
      )}
      <Link href="/login" className={linkClass}>{t.coordination_access}</Link>
      {isAdmin && (
        <>
          <Link href="/admin/acreditaciones" className={linkClass}>{t.admin}</Link>
          <Link href="/admin/permisos" className={linkClass}>{t.admin_permissions}</Link>
          <Link href="/admin/api-keys" className={linkClass}>{t.admin_api_keys}</Link>
          <Link href="/admin/templates" className={linkClass}>{t.templates}</Link>
          <Link href="/admin/auditoria" className={linkClass}>{t.audit}</Link>
        </>
      )}
    </nav>
  );
}
