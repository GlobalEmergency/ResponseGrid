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
import { ConsentRequiredError } from '../../domain/consent-required.error';
import { PhoneRequiredError } from '../../domain/phone-required.error';

type IdentityError =
  | InvalidCredentialsError
  | EmailAlreadyRegisteredError
  | AccountLinkRequiresAuthError
  | ConsentRequiredError
  | PhoneRequiredError;

@Catch(
  InvalidCredentialsError,
  EmailAlreadyRegisteredError,
  AccountLinkRequiresAuthError,
  ConsentRequiredError,
  PhoneRequiredError,
)
export class IdentityExceptionFilter implements ExceptionFilter {
  catch(exception: IdentityError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    let status: HttpStatus;
    if (
      exception instanceof EmailAlreadyRegisteredError ||
      exception instanceof AccountLinkRequiresAuthError
    ) {
      // 409 Conflict: the email is already claimed.
      status = HttpStatus.CONFLICT;
    } else if (
      exception instanceof ConsentRequiredError ||
      exception instanceof PhoneRequiredError
    ) {
      status = HttpStatus.BAD_REQUEST;
    } else {
      status = HttpStatus.UNAUTHORIZED;
    }
    response
      .status(status)
      .json({ statusCode: status, message: exception.message });
  }
}
