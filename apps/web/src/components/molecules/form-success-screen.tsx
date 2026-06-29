'use client';

import Link from 'next/link';

interface FormSuccessScreenProps {
  message: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}

export function FormSuccessScreen({
  message,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
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
        <Link
          href={primaryHref}
          className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-white bg-navy rounded-lg hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 transition-colors"
          // Hard navigation so the form page re-mounts and all controlled state resets.
          onClick={() => {
            window.location.href = primaryHref;
          }}
        >
          {primaryLabel}
        </Link>
        <Link
          href={secondaryHref}
          className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-ink bg-white border-2 border-navy rounded-lg hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 transition-colors"
        >
          {secondaryLabel}
        </Link>
      </div>
    </section>
  );
}
