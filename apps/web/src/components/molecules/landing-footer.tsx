/**
 * LandingFooter — trust line + coordination access for the emergency landing.
 * Surfaces the authenticated self-service links only when a session is present.
 */
import Link from 'next/link';
import type { Messages } from '@/i18n/messages/es';

interface LandingFooterProps {
  slug: string;
  te: Messages['emergency'];
  authed: boolean;
}

const linkClass =
  'text-[12.5px] text-muted-soft underline underline-offset-2 transition-colors hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded w-fit';

export function LandingFooter({ slug, te, authed }: LandingFooterProps) {
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
    </footer>
  );
}
