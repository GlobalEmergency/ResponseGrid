import Link from 'next/link';
import type { Messages } from '@/i18n/messages/es';

interface AccountNavProps {
  t: Messages['home'];
  authed: boolean;
  isAdmin: boolean;
  /** Can administer at least one scope (platform, org, group, emergency). */
  canAdminister?: boolean;
  notificationUnreadCount: number;
}

const linkClass =
  'text-sm font-medium text-muted underline underline-offset-2 transition-colors hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded';

export function AccountNav({
  t,
  authed,
  isAdmin,
  canAdminister = false,
  notificationUnreadCount,
}: AccountNavProps) {
  return (
    <nav
      aria-label={t.aria_secondary_nav}
      className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-5"
    >
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-soft">
        {t.account_heading}
      </span>
      <Link href="/panel/organizaciones" className={linkClass}>{t.my_orgs}</Link>
      {authed && canAdminister && (
        <Link href="/admin" className={linkClass}>{t.administration}</Link>
      )}
      {authed && (
        <>
          <Link href="/panel/grupos" className={linkClass}>{t.groups}</Link>
          <Link href="/dashboard/permissions" className={linkClass}>{t.my_permissions}</Link>
          <Link href="/dashboard/notifications" className={linkClass}>
            {notificationUnreadCount > 0
              ? t.notifications_with_count.replace('{count}', String(notificationUnreadCount))
              : t.notifications}
          </Link>
        </>
      )}
      <Link href="/login" className={linkClass}>{t.coordination_access}</Link>
      {isAdmin && (
        <>
          <Link href="/admin/accreditations" className={linkClass}>{t.admin}</Link>
          <Link href="/admin/permissions" className={linkClass}>{t.admin_permissions}</Link>
          <Link href="/admin/api-keys" className={linkClass}>{t.admin_api_keys}</Link>
          <Link href="/admin/templates" className={linkClass}>{t.templates}</Link>
          <Link href="/admin/audit" className={linkClass}>{t.audit}</Link>
        </>
      )}
    </nav>
  );
}
