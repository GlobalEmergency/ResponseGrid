import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  NotOrganizationOwnerError,
  UserNotFoundError,
  AlreadyMemberError,
  NotMemberError,
  CannotRemoveSelfError,
  OrganizationNotFoundError,
} from '../../domain/errors';

type OrgDomainError =
  | NotOrganizationOwnerError
  | UserNotFoundError
  | AlreadyMemberError
  | NotMemberError
  | CannotRemoveSelfError
  | OrganizationNotFoundError;

@Catch(
  NotOrganizationOwnerError,
  UserNotFoundError,
  AlreadyMemberError,
  NotMemberError,
  CannotRemoveSelfError,
  OrganizationNotFoundError,
)
export class OrganizationExceptionFilter implements ExceptionFilter {
  catch(exception: OrgDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    let status: number;

    if (exception instanceof NotOrganizationOwnerError) {
      status = HttpStatus.FORBIDDEN;
    } else if (exception instanceof UserNotFoundError) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof OrganizationNotFoundError) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof AlreadyMemberError) {
      status = HttpStatus.CONFLICT;
    } else if (exception instanceof NotMemberError) {
      status = HttpStatus.FORBIDDEN;
    } else {
      // CannotRemoveSelfError
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    }

    response
      .status(status)
      .json({ statusCode: status, message: exception.message });
  }
}
