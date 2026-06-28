import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ResourceNotFoundError } from '../../application/resource-not-found.error';
import { UnauthorizedStatusChangeError } from '../../application/unauthorized-status-change.error';
import {
  ResourceAlreadyPublishedError,
  ResourceNotVerifiedError,
  InvalidVerificationLevelError,
  InvalidPublicStatusTransitionError,
  ResourceNotPublishedError,
  ResourceNotPendingError,
  ResourceNotEditableError,
  ResourceNameRequiredError,
  OwnerCannotReportValidityError,
  ResourceNotReportableError,
  ResourceNotDisputedError,
} from '../../domain/resource-errors';
import { EmergencyNotAcceptingIntakeError } from '../../../emergencies/domain/emergency-not-accepting-intake.error';

type DomainError =
  | ResourceNotFoundError
  | ResourceNotVerifiedError
  | ResourceAlreadyPublishedError
  | InvalidVerificationLevelError
  | EmergencyNotAcceptingIntakeError
  | UnauthorizedStatusChangeError
  | InvalidPublicStatusTransitionError
  | ResourceNotPublishedError
  | ResourceNotPendingError
  | ResourceNotEditableError
  | ResourceNameRequiredError
  | OwnerCannotReportValidityError
  | ResourceNotReportableError
  | ResourceNotDisputedError;

// Only catches domain errors; everything else (e.g. ValidationPipe's BadRequestException)
// falls through to Nest's default handler, which already returns clean JSON.
@Catch(
  ResourceNotFoundError,
  ResourceNotVerifiedError,
  ResourceAlreadyPublishedError,
  InvalidVerificationLevelError,
  EmergencyNotAcceptingIntakeError,
  UnauthorizedStatusChangeError,
  InvalidPublicStatusTransitionError,
  ResourceNotPublishedError,
  ResourceNotPendingError,
  ResourceNotEditableError,
  ResourceNameRequiredError,
  OwnerCannotReportValidityError,
  ResourceNotReportableError,
  ResourceNotDisputedError,
)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof ResourceNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof UnauthorizedStatusChangeError
          ? HttpStatus.FORBIDDEN
          : exception instanceof EmergencyNotAcceptingIntakeError
            ? HttpStatus.CONFLICT
            : exception instanceof ResourceAlreadyPublishedError
              ? HttpStatus.CONFLICT
              : exception instanceof ResourceNotVerifiedError
                ? HttpStatus.CONFLICT
                : exception instanceof ResourceNotPendingError
                  ? HttpStatus.CONFLICT
                  : exception instanceof ResourceNotEditableError
                    ? HttpStatus.CONFLICT
                    : exception instanceof OwnerCannotReportValidityError
                      ? HttpStatus.FORBIDDEN
                      : exception instanceof ResourceNotReportableError
                        ? HttpStatus.CONFLICT
                        : exception instanceof ResourceNotDisputedError
                          ? HttpStatus.CONFLICT
                          : HttpStatus.BAD_REQUEST;
    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }
}
