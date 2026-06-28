import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  AlreadyMemberError,
  GroupAccessDeniedError,
  GroupNotFoundError,
  GroupNotPublicError,
  GroupPrivilegeEscalationError,
  MemberNotFoundError,
  UserNotFoundByEmailError,
} from '../../domain/errors';

type GroupError =
  | GroupNotFoundError
  | GroupNotPublicError
  | AlreadyMemberError
  | MemberNotFoundError
  | UserNotFoundByEmailError
  | GroupAccessDeniedError
  | GroupPrivilegeEscalationError;

function statusFor(error: GroupError): HttpStatus {
  if (
    error instanceof GroupAccessDeniedError ||
    error instanceof GroupPrivilegeEscalationError
  ) {
    return HttpStatus.FORBIDDEN;
  }
  if (
    error instanceof GroupNotFoundError ||
    error instanceof MemberNotFoundError ||
    error instanceof UserNotFoundByEmailError
  ) {
    return HttpStatus.NOT_FOUND;
  }
  // GroupNotPublicError, AlreadyMemberError → conflict with current state.
  return HttpStatus.CONFLICT;
}

@Catch(
  GroupNotFoundError,
  GroupNotPublicError,
  AlreadyMemberError,
  MemberNotFoundError,
  UserNotFoundByEmailError,
  GroupAccessDeniedError,
  GroupPrivilegeEscalationError,
)
export class GroupExceptionFilter implements ExceptionFilter {
  catch(exception: GroupError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = statusFor(exception);
    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }
}
