import { GLOBAL_EMERGENCY } from '@/lib/global-emergency';
import type { Messages } from '@/i18n/messages/es';

const linkClass =
  'font-semibold text-navy underline underline-offset-2 hover:text-ink';

/**
 * Consent-checkbox label with inline links to the Terms of Service and Privacy
 * Policy (Global Emergency legal pages). Shared by the signup and social
 * onboarding forms so both worded and linked identically.
 */
export function ConsentLabel({ t }: { t: Messages['consent'] }) {
  return (
    <span>
      {t.prefix}
      <a
        href={GLOBAL_EMERGENCY.terms}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {t.terms}
      </a>
      {t.and}
      <a
        href={GLOBAL_EMERGENCY.privacy}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {t.privacy}
      </a>
    </span>
  );
}
