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
import { InvalidAuthorError } from '../../../../shared/domain/author';
import { SupplyLineValidationError } from '../../../supplies/domain/supply-line';

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
  | ResourceNotDisputedError
  | InvalidAuthorError
  | SupplyLineValidationError;

type ErrorCtor = new (...args: never[]) => Error;

// Domain error → HTTP status, matched by instanceof. Anything not listed
// (validation-style invariants like InvalidPublicStatusTransitionError) falls
// through to 400.
const STATUS_BY_ERROR: ReadonlyArray<readonly [ErrorCtor, HttpStatus]> = [
  [ResourceNotFoundError, HttpStatus.NOT_FOUND],
  [UnauthorizedStatusChangeError, HttpStatus.FORBIDDEN],
  [OwnerCannotReportValidityError, HttpStatus.FORBIDDEN],
  [EmergencyNotAcceptingIntakeError, HttpStatus.CONFLICT],
  [ResourceAlreadyPublishedError, HttpStatus.CONFLICT],
  [ResourceNotVerifiedError, HttpStatus.CONFLICT],
  [ResourceNotPendingError, HttpStatus.CONFLICT],
  [ResourceNotEditableError, HttpStatus.CONFLICT],
  [ResourceNotReportableError, HttpStatus.CONFLICT],
  [ResourceNotDisputedError, HttpStatus.CONFLICT],
];

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
  InvalidAuthorError,
  SupplyLineValidationError,
)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const match = STATUS_BY_ERROR.find(
      ([ErrorClass]) => exception instanceof ErrorClass,
    );
    const statusCode = match ? match[1] : HttpStatus.BAD_REQUEST;
    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }
}
