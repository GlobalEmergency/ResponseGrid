/**
 * EmergencyQuickLinks — in-page quick access for the emergency landing.
 *
 * Was previously a second <footer>; now a plain nav section so the page keeps a
 * single (global) footer. Surfaces authenticated self-service links and the
 * coordination entry, and points the trust line at the public verify guide.
 */
import Link from 'next/link';
import type { Messages } from '@/i18n/messages/es';

interface EmergencyQuickLinksProps {
  slug: string;
  te: Messages['emergency'];
  authed: boolean;
}

const linkClass =
  'text-[12.5px] text-muted-soft underline underline-offset-2 transition-colors hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded w-fit';

export function EmergencyQuickLinks({ slug, te, authed }: EmergencyQuickLinksProps) {
  return (
    <nav aria-label={te.footer_coordination} className="mt-2 flex flex-col gap-3 border-t border-line pt-5">
      <Link
        href="/verificar"
        className="text-[13px] font-semibold text-navy underline underline-offset-2 transition-colors hover:text-accent focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded w-fit"
      >
        {te.footer_verify}
      </Link>

      {authed && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          <Link href={`/e/${slug}/mis-puntos`} className={linkClass}>{te.footer_my_points}</Link>
          <Link href={`/e/${slug}/mi-voluntariado`} className={linkClass}>{te.footer_my_volunteer}</Link>
          <Link href={`/e/${slug}/reportar`} className={linkClass}>{te.footer_report}</Link>
        </div>
      )}

      <Link href={`/e/${slug}/coordinacion`} className={linkClass}>
        {te.footer_coordination} →
      </Link>
    </nav>
  );
}
