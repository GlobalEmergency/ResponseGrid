'use client';

import Link from 'next/link';

/**
 * FormSuccessScreen — molecule.
 *
 * Renders the success state that appears after a form is submitted
 * successfully. Shared by peticion, registrar, donar and reportar forms.
 *
 * The primary link uses hard navigation (window.location.href) so the
 * form page re-mounts and all controlled state is reset.
 */

interface FormSuccessScreenProps {
  /** Main message displayed in the success card. */
  message: string;
  /** href for the primary "submit another" call-to-action. */
  primaryHref: string;
  /** Label for the primary call-to-action button. */
  primaryLabel: string;
  /** href for the secondary "back to emergency" link. */
  secondaryHref: string;
  /** Label for the secondary link. */
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
