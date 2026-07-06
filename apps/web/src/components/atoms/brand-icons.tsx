/**
 * Brand glyphs used to promote the chat assistants and the source repository.
 *
 * Each icon inherits its colour from `currentColor` (single-path marks) so the
 * caller controls tone via `className`. Purely decorative — always paired with a
 * visible text label, hence `aria-hidden`.
 */

type IconProps = { className?: string };

/** Telegram paper-plane mark. */
export function TelegramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M21.94 4.66a1.2 1.2 0 0 0-1.24-.2L3.3 11.2c-.9.35-.88 1.64.03 1.96l4.3 1.5 1.66 5.32a1 1 0 0 0 1.63.43l2.4-2.16 4.32 3.18a1.2 1.2 0 0 0 1.9-.72l2.86-14.9a1.2 1.2 0 0 0-.46-1.15ZM9.9 14.2l-.62 3.9-1.16-3.9 8.2-5.44-6.42 5.44Z" />
    </svg>
  );
}

/** WhatsApp speech-bubble + handset mark. */
export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.95 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35ZM12.05 21.5h-.01a9.44 9.44 0 0 1-4.8-1.32l-.35-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.45-5.02c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.89.98 6.67 2.77a9.38 9.38 0 0 1 2.76 6.68c-.01 5.2-4.24 9.45-9.44 9.45Zm8.04-17.49A11.36 11.36 0 0 0 12.04.75C5.8.75.72 5.83.72 12.07c0 2 .52 3.95 1.52 5.67L.62 23.25l5.65-1.48a11.3 11.3 0 0 0 5.77 1.58h.01c6.24 0 11.32-5.08 11.32-11.32 0-3.03-1.18-5.87-3.28-8.02Z" />
    </svg>
  );
}

/** GitHub Octocat mark. */
export function GitHubIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58l-.01-2.05c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.08 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.49.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22l-.01 3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}
