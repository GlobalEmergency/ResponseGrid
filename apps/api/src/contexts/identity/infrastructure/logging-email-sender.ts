import { Injectable, Logger } from '@nestjs/common';
import { EmailMessage, EmailSender } from '../domain/ports/email-sender';

/**
 * Default {@link EmailSender}: logs the message instead of delivering it. This is
 * the delivery seam — the token/template logic around it is real and tested; the
 * only piece still to wire for production is a concrete transport adapter (SMTP/
 * SES/hosted API), which needs delivery credentials. Swapping this provider does
 * not touch any caller.
 */
@Injectable()
export class LoggingEmailSender implements EmailSender {
  private readonly logger = new Logger(LoggingEmailSender.name);

  send(message: EmailMessage): Promise<void> {
    this.logger.log(`email → ${message.to} · ${message.subject}`);
    this.logger.debug(message.text);
    return Promise.resolve();
  }
}
