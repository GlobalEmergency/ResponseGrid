import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  GrantNotFoundError,
  NotAuthorizedToGrantError,
  NotAuthorizedToRevokeError,
  PrivilegeEscalationError,
  UnknownRoleError,
} from '../../domain/authorization/errors';

type GrantError =
  | GrantNotFoundError
  | NotAuthorizedToGrantError
  | NotAuthorizedToRevokeError
  | PrivilegeEscalationError
  | UnknownRoleError;

@Catch(
  GrantNotFoundError,
  NotAuthorizedToGrantError,
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
    if (exception instanceof UnknownRoleError) return HttpStatus.BAD_REQUEST;
    // NotAuthorizedToGrant/Revoke + PrivilegeEscalation
    return HttpStatus.FORBIDDEN;
  }
}
