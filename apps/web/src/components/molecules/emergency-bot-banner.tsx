'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import { BotChannels } from '@/components/molecules/bot-channels';

/** Delay before the banner slides in, so it never competes with the fold. */
const APPEAR_AFTER_MS = 9000;
const DISMISS_KEY = 'rh_bot_banner_dismissed';

/**
 * Timed, dismissible banner promoting the chat assistants on an emergency page.
 * It slides in from the bottom after a short delay (so it doesn't fight the
 * initial view), and stays dismissed for the rest of the browsing session via
 * `sessionStorage` — non-nagging by design. Client-only: it reads locale from
 * context and owns a timer + dismissal state.
 */
export function EmergencyBotBanner() {
  const t = getMessages(useLocale()).common.bots;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    const timer = setTimeout(() => setVisible(true), APPEAR_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Private mode / storage disabled — a non-persisted dismissal is fine.
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t.banner_heading}
      className="fixed inset-x-3 bottom-3 z-[1000] mx-auto max-w-md animate-[bot-banner-in_.35s_ease-out] rounded-2xl border border-line bg-white p-4 shadow-2xl sm:inset-x-auto sm:right-4"
    >
      <style>{'@keyframes bot-banner-in{from{opacity:0;transform:translateY(1rem)}to{opacity:1;transform:none}}'}</style>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t.banner_dismiss}
        className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy"
      >
        ✕
      </button>
      <p className="pr-6 font-display text-[15px] font-bold text-navy">{t.banner_heading}</p>
      <p className="mt-1 text-[13px] leading-snug text-muted">{t.banner_body}</p>
      <BotChannels t={t} variant="buttons" className="mt-3" />
    </div>
  );
}
