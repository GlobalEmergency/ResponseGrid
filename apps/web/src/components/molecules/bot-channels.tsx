import { TelegramIcon, WhatsAppIcon } from '@/components/atoms/brand-icons';
import { AID_BOTS } from '@/lib/bots';
import type { Messages } from '@/i18n/messages/es';

type BotsMessages = Messages['common']['bots'];

interface BotChannelsProps {
  t: BotsMessages;
  /**
   * `buttons` — prominent pill CTAs (home hero band, emergency banner).
   * `footer` — compact text links tinted for the dark footer.
   */
  variant?: 'buttons' | 'footer';
  className?: string;
}

const TELEGRAM_BRAND = '#229ED9';
const WHATSAPP_BRAND = '#25D366';

/**
 * Reusable pair of links to the Telegram and WhatsApp aid assistants. Rendered
 * on every surface that promotes the bots (footer, home, emergency banner) so
 * the copy and deep links stay in one place. Pure presentational — the links
 * (see `@/lib/bots`) and labels (i18n) are injected.
 */
export function BotChannels({ t, variant = 'buttons', className = '' }: BotChannelsProps) {
  if (variant === 'footer') {
    const linkClass =
      'flex items-center gap-2 text-sm text-white/75 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60 rounded';
    return (
      <div aria-label={t.channels_aria} className={`flex flex-col gap-2.5 ${className}`}>
        <a href={AID_BOTS.telegram.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
          <TelegramIcon className="h-4 w-4 flex-shrink-0" />
          {t.telegram}
        </a>
        <a href={AID_BOTS.whatsapp.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
          <WhatsAppIcon className="h-4 w-4 flex-shrink-0" />
          {t.whatsapp}
        </a>
      </div>
    );
  }

  const buttonClass =
    'flex flex-1 items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-[15px] font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2';

  return (
    <div
      aria-label={t.channels_aria}
      className={`flex flex-col gap-2.5 sm:flex-row ${className}`}
    >
      <a
        href={AID_BOTS.whatsapp.url}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        style={{ backgroundColor: WHATSAPP_BRAND }}
      >
        <WhatsAppIcon className="h-5 w-5 flex-shrink-0" />
        {t.open_whatsapp}
      </a>
      <a
        href={AID_BOTS.telegram.url}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        style={{ backgroundColor: TELEGRAM_BRAND }}
      >
        <TelegramIcon className="h-5 w-5 flex-shrink-0" />
        {t.open_telegram}
      </a>
    </div>
  );
}
