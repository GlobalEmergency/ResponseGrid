import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  CannotRevokeOwnAdminError,
  GrantNotFoundError,
  InvalidGrantExpiryError,
  LegacyGrantNotRevocableError,
  NotAuthorizedToGrantError,
  NotAuthorizedToReadError,
  NotAuthorizedToRevokeError,
  PrivilegeEscalationError,
  UnknownRoleError,
} from '../../domain/authorization/errors';

type GrantError =
  | CannotRevokeOwnAdminError
  | GrantNotFoundError
  | InvalidGrantExpiryError
  | LegacyGrantNotRevocableError
  | NotAuthorizedToGrantError
  | NotAuthorizedToReadError
  | NotAuthorizedToRevokeError
  | PrivilegeEscalationError
  | UnknownRoleError;

@Catch(
  CannotRevokeOwnAdminError,
  GrantNotFoundError,
  InvalidGrantExpiryError,
  LegacyGrantNotRevocableError,
  NotAuthorizedToGrantError,
  NotAuthorizedToReadError,
  NotAuthorizedToRevokeError,
  PrivilegeEscalationError,
  UnknownRoleError,
)
export class GrantExceptionFilter implements ExceptionFilter {
  catch(exception: GrantError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = this.statusFor(exception);
    response.status(statusCode).json({
      statusCode,
      message: exception.message,
    });
  }

  private statusFor(exception: GrantError): number {
    if (exception instanceof GrantNotFoundError) return HttpStatus.NOT_FOUND;
    if (
      exception instanceof UnknownRoleError ||
      exception instanceof InvalidGrantExpiryError
    )
      return HttpStatus.BAD_REQUEST;
    if (exception instanceof LegacyGrantNotRevocableError)
      return HttpStatus.CONFLICT;
    // CannotRevokeOwnAdmin + NotAuthorizedToGrant/Revoke/Read + PrivilegeEscalation
    return HttpStatus.FORBIDDEN;
  }
}
