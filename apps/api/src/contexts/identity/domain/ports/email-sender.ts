export const EMAIL_SENDER = Symbol('EmailSender');

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain-text body (fallback for clients that do not render HTML). */
  text: string;
  /** HTML body. */
  html: string;
}

/**
 * Output port for transactional email. Kept deliberately small and provider-
 * agnostic so a concrete transport (SMTP, SES, a hosted API…) can be dropped in
 * without touching callers. The default adapter logs the message — the transport
 * is the one remaining swap and needs delivery credentials to wire in prod.
 */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
