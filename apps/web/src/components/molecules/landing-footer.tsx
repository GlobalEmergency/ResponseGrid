/**
 * LandingFooter — trust line + coordination access for the emergency landing.
 * Surfaces the authenticated self-service links only when a session is present,
 * and closes with the Global Emergency attribution + shared legal links.
 */
import Link from 'next/link';
import type { Messages } from '@/i18n/messages/es';
import { GLOBAL_EMERGENCY } from '@/lib/global-emergency';

interface LandingFooterProps {
  slug: string;
  te: Messages['emergency'];
  tf: Messages['common']['footer'];
  authed: boolean;
}

const linkClass =
  'text-[12.5px] text-muted-soft underline underline-offset-2 transition-colors hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded w-fit';

const externalLinkClass =
  'underline underline-offset-2 transition-colors hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded';

export function LandingFooter({ slug, te, tf, authed }: LandingFooterProps) {
  return (
    <footer className="mt-2 flex flex-col gap-3 border-t border-line pt-5">
      <span className="text-[13px] font-semibold text-navy">{te.footer_verify}</span>

      {authed && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          <Link href={`/e/${slug}/mis-puntos`} className={linkClass}>{te.footer_my_points}</Link>
          <Link href={`/e/${slug}/mi-voluntariado`} className={linkClass}>{te.footer_my_volunteer}</Link>
          <Link href={`/e/${slug}/mi-busqueda`} className={linkClass}>{te.footer_my_search}</Link>
          <Link href={`/e/${slug}/reportar`} className={linkClass}>{te.footer_report}</Link>
        </div>
      )}

      <Link href={`/e/${slug}/coordinacion`} className={linkClass}>
        {te.footer_coordination} →
      </Link>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3 text-[12px] text-muted-soft">
        <span>
          {tf.project_of}{' '}
          <a
            href={GLOBAL_EMERGENCY.site}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-semibold text-navy ${externalLinkClass}`}
          >
            {tf.org}
          </a>
        </span>
        <a href={GLOBAL_EMERGENCY.privacy} target="_blank" rel="noopener noreferrer" className={externalLinkClass}>
          {tf.privacy}
        </a>
        <a href={GLOBAL_EMERGENCY.terms} target="_blank" rel="noopener noreferrer" className={externalLinkClass}>
          {tf.terms}
        </a>
      </div>
    </footer>
  );
}
