'use client';

import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

/**
 * IntakeReceipt — molecule.
 *
 * The donor's proof of a delivery pre-registration (#130): the short, human
 * code plus a QR encoding it, shown after a successful pre-registration so the
 * person can present it at the collection-point desk. The desk operator finds
 * the intake by typing or scanning this code (search by code already exists in
 * the API; the camera scanner is a follow-up).
 *
 * The primary link hard-navigates so the form page re-mounts and resets.
 */

interface IntakeReceiptProps {
  /** Short delivery code (e.g. "ACO-7F3K") — both shown and encoded in the QR. */
  code: string;
  title: string;
  /** Body copy, already interpolated with the point name. */
  body: string;
  codeLabel: string;
  qrAlt: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}

export function IntakeReceipt({
  code,
  title,
  body,
  codeLabel,
  qrAlt,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: IntakeReceiptProps) {
  return (
    <section
      role="alert"
      aria-live="polite"
      className="flex flex-col gap-6 rounded-lg border-2 border-navy bg-white p-6"
    >
      <div className="flex flex-col gap-2">
        <p className="text-lg font-semibold text-ink leading-snug">{title}</p>
        <p className="text-sm text-muted">{body}</p>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-lg bg-surface px-4 py-6">
        <div className="rounded-lg border-2 border-navy bg-white p-3">
          <QRCodeSVG value={code} size={188} title={qrAlt} marginSize={0} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            {codeLabel}
          </span>
          <span className="font-display text-3xl font-bold tracking-widest text-navy">
            {code}
          </span>
        </div>
      </div>

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
