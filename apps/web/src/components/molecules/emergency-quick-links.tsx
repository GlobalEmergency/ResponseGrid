import Link from 'next/link';
import type { Messages } from '@/i18n/messages/es';

interface EmergencyQuickLinksProps {
  slug: string;
  te: Messages['emergency'];
}

const linkClass =
  'text-[12.5px] text-muted-soft underline underline-offset-2 transition-colors hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded w-fit';

export function EmergencyQuickLinks({ slug, te }: EmergencyQuickLinksProps) {
  return (
    <nav aria-label={te.footer_coordination} className="mt-2 flex flex-col gap-3 border-t border-line pt-5">
      <Link
        href="/verificar"
        className="text-[13px] font-semibold text-navy underline underline-offset-2 transition-colors hover:text-accent focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded w-fit"
      >
        {te.footer_verify}
      </Link>

      <Link href={`/e/${slug}/coordinacion`} className={linkClass}>
        {te.footer_coordination} →
      </Link>
    </nav>
  );
}
