/**
 * PrivacyLocationNotice — Atom (F09 · Privacidad de ubicación)
 *
 * Renders a discrete notice when a need has approximate coordinates.
 * Only shows when `locationSensitivity === 'approximate'`.
 */

interface PrivacyLocationNoticeProps {
  /** Translated message text from i18n. */
  text: string;
}

export function PrivacyLocationNotice({ text }: PrivacyLocationNoticeProps) {
  return (
    <p
      role="note"
      className="flex items-start gap-1.5 text-xs text-warning"
    >
      <span aria-hidden="true" className="flex-shrink-0 leading-none mt-0.5">
        📍
      </span>
      {text}
    </p>
  );
}
