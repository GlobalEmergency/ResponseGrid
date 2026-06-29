import Link from 'next/link';

type Variant = 'primary' | 'default' | 'danger';

interface HelpActionRowProps {
  href: string;
  icon: string;
  title: string;
  subtitle?: string;
  variant?: Variant;
}

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-navy text-white border border-navy hover:bg-navy-700 focus:ring-navy',
  default: 'bg-white text-ink border-[1.5px] border-line-strong hover:bg-surface focus:ring-navy',
  danger: 'bg-danger-tint text-danger-strong border-[1.5px] border-danger-line hover:brightness-[0.98] focus:ring-danger',
};

const ARROW: Record<Variant, string> = {
  primary: 'opacity-60',
  default: 'text-muted-soft',
  danger: '',
};

export function HelpActionRow({ href, icon, title, subtitle, variant = 'default' }: HelpActionRowProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[13px] px-4 py-4 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${CONTAINER[variant]}`}
    >
      <span className="text-xl leading-none" aria-hidden="true">{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[15.5px] font-bold leading-tight">{title}</span>
        {subtitle !== undefined && (
          <span className={`text-xs ${variant === 'primary' ? 'opacity-70' : 'text-muted'}`}>
            {subtitle}
          </span>
        )}
      </span>
      <span className={`ml-auto pl-2 ${ARROW[variant]}`} aria-hidden="true">→</span>
    </Link>
  );
}
