import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { InvalidCredentialsError } from '../../domain/invalid-credentials.error';
import { EmailAlreadyRegisteredError } from '../../domain/email-already-registered.error';
import { AccountLinkRequiresAuthError } from '../../domain/account-link-requires-auth.error';

@Catch(
  InvalidCredentialsError,
  EmailAlreadyRegisteredError,
  AccountLinkRequiresAuthError,
)
export class IdentityExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | InvalidCredentialsError
      | EmailAlreadyRegisteredError
      | AccountLinkRequiresAuthError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    let status: HttpStatus;
    if (exception instanceof EmailAlreadyRegisteredError) {
      status = HttpStatus.CONFLICT;
    } else if (exception instanceof AccountLinkRequiresAuthError) {
      // 409 Conflict: the email is already claimed by a password account
      status = HttpStatus.CONFLICT;
    } else {
      status = HttpStatus.UNAUTHORIZED;
    }
    response
      .status(status)
      .json({ statusCode: status, message: exception.message });
  }
}
