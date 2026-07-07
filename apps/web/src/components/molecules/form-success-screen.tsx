'use client';

import { LinkButton } from '@/components/atoms/link-button';

interface SuccessLink {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary';
}

interface FormSuccessScreenProps {
  message: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  /** Optional extra shortcuts rendered above the two default buttons. */
  extraLinks?: readonly SuccessLink[];
}

export function FormSuccessScreen({
  message,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  extraLinks = [],
}: FormSuccessScreenProps) {
  // Single list of {href, label, variant} instead of three parallel renders
  // (extraLinks / primary / secondary) — one map covers every link.
  const links: ReadonlyArray<SuccessLink & { onClick?: () => void }> = [
    ...extraLinks.map((link) => ({ ...link, variant: 'secondary' as const })),
    {
      href: primaryHref,
      label: primaryLabel,
      variant: 'primary' as const,
      // Hard navigation so the form page re-mounts and all controlled state resets.
      onClick: () => {
        window.location.href = primaryHref;
      },
    },
    { href: secondaryHref, label: secondaryLabel, variant: 'secondary' as const },
  ];

  return (
    <section
      role="alert"
      aria-live="polite"
      className="flex flex-col gap-6 rounded-lg border-2 border-navy bg-white p-6"
    >
      <p className="text-lg font-semibold text-ink leading-snug">
        {message}
      </p>
      <div className="flex flex-col gap-3">
        {links.map(({ href, label, variant, onClick }) => (
          <LinkButton key={href} href={href} variant={variant} fullWidth onClick={onClick}>
            {label}
          </LinkButton>
        ))}
      </div>
    </section>
  );
}
