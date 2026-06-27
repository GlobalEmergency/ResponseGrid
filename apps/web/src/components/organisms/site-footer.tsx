/**
 * SiteFooter — Home page footer. States that ResponseGrid is a Global Emergency
 * project and links to the org's shared privacy/terms pages, carries the
 * indexable SEO blurb, and preserves the functional coordination/account nav.
 */
import Link from 'next/link';
import type { Messages } from '@/i18n/messages/es';
import { GLOBAL_EMERGENCY } from '@/lib/global-emergency';

interface SiteFooterProps {
  t: Messages['home'];
  tf: Messages['common']['footer'];
  authed: boolean;
  isAdmin: boolean;
  notificationUnreadCount: number;
}

const navLinkClass =
  'text-sm font-medium text-muted underline underline-offset-2 transition-colors hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded';

const legalLinkClass =
  'font-semibold text-navy underline underline-offset-2 transition-colors hover:text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded';

export function SiteFooter({ t, tf, authed, isAdmin, notificationUnreadCount }: SiteFooterProps) {
  return (
    <footer className="mt-2 border-t border-line pt-5">
      <p className="font-display text-sm font-extrabold text-navy">
        {tf.project_of}{' '}
        <a
          href={GLOBAL_EMERGENCY.site}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 transition-colors hover:text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded"
        >
          {tf.org}
        </a>
      </p>
      <p className="mt-1.5 mb-3 text-[12.5px] leading-[1.5] text-muted-soft">{t.footer_tagline}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] font-semibold text-navy">
        <a href={GLOBAL_EMERGENCY.privacy} target="_blank" rel="noopener noreferrer" className={legalLinkClass}>
          {tf.privacy}
        </a>
        <a href={GLOBAL_EMERGENCY.terms} target="_blank" rel="noopener noreferrer" className={legalLinkClass}>
          {tf.terms}
        </a>
        <span>{t.footer_about}</span>
        <span>{t.footer_transparency}</span>
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
