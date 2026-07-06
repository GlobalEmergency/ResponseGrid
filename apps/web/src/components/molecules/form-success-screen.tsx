'use client';

import { LinkButton } from '@/components/atoms/link-button';

interface SuccessLink {
  href: string;
  label: string;
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
        {extraLinks.map(({ href, label }) => (
          <LinkButton key={href} href={href} variant="secondary" fullWidth>
            {label}
          </LinkButton>
        ))}
        <LinkButton
          href={primaryHref}
          fullWidth
          // Hard navigation so the form page re-mounts and all controlled state resets.
          onClick={() => {
            window.location.href = primaryHref;
          }}
        >
          {primaryLabel}
        </LinkButton>
        <LinkButton href={secondaryHref} variant="secondary" fullWidth>
          {secondaryLabel}
        </LinkButton>
      </div>
    </section>
  );
}
