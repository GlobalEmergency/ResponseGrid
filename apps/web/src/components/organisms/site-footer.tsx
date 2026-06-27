/**
 * SiteFooter — Home page footer. Carries the indexable GlobalEmergency blurb +
 * SEO link row, and preserves the functional coordination/account navigation.
 */
import Link from 'next/link';
import type { Messages } from '@/i18n/messages/es';

interface SiteFooterProps {
  t: Messages['home'];
  authed: boolean;
  isAdmin: boolean;
  notificationUnreadCount: number;
}

const navLinkClass =
  'text-sm font-medium text-muted underline underline-offset-2 transition-colors hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded';

export function SiteFooter({ t, authed, isAdmin, notificationUnreadCount }: SiteFooterProps) {
  return (
    <footer className="mt-2 border-t border-line pt-5">
      <p className="font-display text-sm font-extrabold text-navy">{t.footer_org}</p>
      <p className="mt-1.5 mb-3 text-[12.5px] leading-[1.5] text-muted-soft">{t.footer_tagline}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] font-semibold text-navy">
        <span>{t.footer_about}</span>
        <span>{t.footer_transparency}</span>
        <span>{t.footer_privacy}</span>
        <span>{t.footer_verify_campaign}</span>
      </div>

      <nav
        aria-label={t.aria_secondary_nav}
        className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-4"
      >
        <Link href="/organizaciones" className={navLinkClass}>{t.my_orgs}</Link>
        {authed && (
          <Link href="/notificaciones" className={navLinkClass}>
            {notificationUnreadCount > 0
              ? t.notifications_with_count.replace('{count}', String(notificationUnreadCount))
              : t.notifications}
          </Link>
        )}
        <Link href="/login" className={navLinkClass}>{t.coordination_access}</Link>
        {isAdmin && (
          <>
            <Link href="/admin/acreditaciones" className={navLinkClass}>{t.admin}</Link>
            <Link href="/admin/templates" className={navLinkClass}>{t.templates}</Link>
            <Link href="/admin/auditoria" className={navLinkClass}>{t.audit}</Link>
          </>
        )}
      </nav>
    </footer>
  );
}
