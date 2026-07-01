import Link from 'next/link';

export interface PublicLink {
  href: string;
  label: string;
}

export function PublicMenu({
  links,
  className = '',
  ariaLabel,
}: {
  links: PublicLink[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <nav
      className={`hidden items-center gap-5 lg:flex ${className}`.trim()}
      {...(ariaLabel !== undefined && { 'aria-label': ariaLabel })}
    >
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="text-[13px] text-on-navy transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60 rounded"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
