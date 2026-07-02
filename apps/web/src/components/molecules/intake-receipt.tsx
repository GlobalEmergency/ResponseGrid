"use client";

import { LinkButton } from "@/components/atoms/link-button";
import { QRCodeSVG } from "qrcode.react";

/**
 * The donor's proof of a delivery pre-registration (#130): the short, human
 * code plus a QR encoding it, shown after a successful pre-registration so the
 * person can present it at the collection-point desk. The desk operator finds
 * the intake by typing or scanning this code (search by code already exists in
 * the API; the camera scanner is a follow-up).
 *
 * The primary link hard-navigates so the form page re-mounts and resets.
 */

interface IntakeReceiptProps {
  /** Short delivery code (e.g. "ACO-7F3K") shown to the donor. */
  code: string;
  /**
   * App-relative path the QR should encode (e.g. `/e/{slug}/donacion/{code}`),
   * turned into an absolute URL client-side so scanning opens the tracking page.
   * Falls back to encoding the bare code when absent.
   */
  trackUrl?: string;
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
  trackUrl,
  title,
  body,
  codeLabel,
  qrAlt,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: IntakeReceiptProps) {
  // Encode an absolute tracking URL so a phone camera opens the page; fall back
  // to the bare code. Rendered only client-side (after submit), so window exists.
  const qrValue =
    trackUrl != null && trackUrl !== ""
      ? `${typeof window !== "undefined" ? window.location.origin : ""}${trackUrl}`
      : code;

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
          <QRCodeSVG value={qrValue} size={188} title={qrAlt} marginSize={0} />
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
        <LinkButton
          href={primaryHref}
          fullWidth
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
