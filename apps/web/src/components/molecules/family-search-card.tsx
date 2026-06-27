/**
 * FamilySearchCard — discreet entry point to family reunification. Visible
 * whether the emergency is active or paused; data is private by design.
 */
import Link from 'next/link';

interface FamilySearchCardProps {
  href: string;
  title: string;
  subtitle: string;
}

export function FamilySearchCard({ href, title, subtitle }: FamilySearchCardProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-card border-[1.5px] border-family-line bg-family-soft px-4 py-3.5 transition-[filter] hover:brightness-[0.99] focus:outline-none focus:ring-2 focus:ring-family-line focus:ring-offset-2"
    >
      <span className="text-xl leading-none" aria-hidden="true">👪</span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] font-bold text-family-ink">{title}</span>
        <span className="text-[11.5px] text-[#9c7b33]">{subtitle}</span>
      </span>
      <span className="ml-auto pl-2 font-bold text-[#c9a94e]" aria-hidden="true">→</span>
    </Link>
  );
}
