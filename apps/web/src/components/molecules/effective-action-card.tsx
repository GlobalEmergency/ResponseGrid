/**
 * EffectiveActionCard — the accent "Lo más eficaz ahora" card steering people to
 * verified money donations (the highest-leverage action in an emergency).
 */
import Link from 'next/link';

interface EffectiveActionCardProps {
  href: string;
  overline: string;
  title: string;
  cta: string;
}

export function EffectiveActionCard({ href, overline, title, cta }: EffectiveActionCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-card bg-accent px-[18px] pb-5 pt-[18px] text-white transition-colors hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
    >
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] opacity-90">
        {overline}
      </p>
      <p className="mb-3.5 font-display text-[19px] font-bold leading-[1.18]">{title}</p>
      <span className="block rounded-[11px] bg-white px-3 py-3 text-center text-[15px] font-bold text-navy">
        {cta} →
      </span>
    </Link>
  );
}
