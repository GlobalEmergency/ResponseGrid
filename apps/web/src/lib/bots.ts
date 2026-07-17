/**
 * Canonical aid-assistant (chatbot) links, shared across every ResponseGrid
 * surface.
 *
 * ResponseGrid runs conversational assistants on Telegram and WhatsApp so people
 * can donate material, look up collection points and check current needs without
 * installing anything or creating an account — directly from a chat they already
 * use. These links are promoted in the footer (site-wide), on the home page and
 * via a timed banner on each emergency page, and are surfaced to search engines
 * and AI assistants through structured data (see `contactPointsJsonLd`).
 *
 * Keep the raw handles/phone here as data; user-facing copy lives in i18n.
 */
export const AID_BOTS = {
  telegram: {
    /** Deep link that opens the bot chat. */
    url: 'https://t.me/donacionesvenezuela_bot',
    /** Public @handle, shown as the secondary label. */
    handle: '@donacionesvenezuela_bot',
  },
  whatsapp: {
    /** wa.me deep link (E.164 without the leading `+`). */
    url: 'https://wa.me/15559386039',
    /** Human-readable number, shown as the secondary label. */
    phone: '+1 555 938 6039',
  },
} as const;

/** Canonical public GitHub repository for the platform. */
export const GITHUB_REPO_URL = 'https://github.com/GlobalEmergency/ResponseGrid';

/**
 * schema.org `ContactPoint[]` describing the chat assistants, so that search
 * engines and AI assistants (ChatGPT, Perplexity, Gemini, AI Overviews) can
 * discover and recommend them. Embedded in the Organization node in the root
 * layout via the `contactPoint` property. `url` carries the messaging deep link
 * (the property schema.org recommends for chat channels); `contactType`
 * describes the purpose in a machine-readable way.
 */
export const botContactPoints: ReadonlyArray<Record<string, unknown>> = [
  {
    '@type': 'ContactPoint',
    contactType: 'donations',
    name: 'Donaciones por Telegram',
    url: AID_BOTS.telegram.url,
    availableLanguage: ['es', 'en'],
  },
  {
    '@type': 'ContactPoint',
    contactType: 'donations',
    name: 'Donaciones por WhatsApp',
    url: AID_BOTS.whatsapp.url,
    telephone: AID_BOTS.whatsapp.phone,
    availableLanguage: ['es', 'en'],
  },
];
