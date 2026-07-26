import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { NeedNotFoundError } from '../../application/need-not-found.error';
import {
  NeedNotPendingError,
  NeedNotEditableError,
  NeedTitleRequiredError,
  NeedResourceNotInEmergencyError,
} from '../../domain/need-errors';
import { EmergencyNotAcceptingIntakeError } from '../../../emergencies/domain/emergency-not-accepting-intake.error';
import { InvalidAuthorError } from '../../../../shared/domain/author';
import { SupplyLineValidationError } from '@globalemergency/warehouse-core/kernel';
import { domainErrorResponseBody } from '../../../../shared/http/domain-error-response';

type DomainError =
  | NeedNotFoundError
  | NeedNotPendingError
  | NeedNotEditableError
  | NeedTitleRequiredError
  | NeedResourceNotInEmergencyError
  | EmergencyNotAcceptingIntakeError
  | InvalidAuthorError
  | SupplyLineValidationError;

// Only catches domain errors from the needs context; everything else falls through
// to Nest's default handler.
@Catch(
  NeedNotFoundError,
  NeedNotPendingError,
  NeedNotEditableError,
  NeedTitleRequiredError,
  NeedResourceNotInEmergencyError,
  EmergencyNotAcceptingIntakeError,
  InvalidAuthorError,
  SupplyLineValidationError,
)
export class NeedsDomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof NeedNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof NeedTitleRequiredError ||
            exception instanceof NeedResourceNotInEmergencyError ||
            exception instanceof InvalidAuthorError ||
            exception instanceof SupplyLineValidationError
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.CONFLICT;
    response
      .status(statusCode)
      .json(domainErrorResponseBody(statusCode, exception));
  }
}
