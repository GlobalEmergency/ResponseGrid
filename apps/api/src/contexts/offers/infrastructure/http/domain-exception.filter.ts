import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { OfferNotFoundError } from '../../application/offer-not-found.error';
import {
  OfferNotOpenError,
  OfferNotMatchedError,
  OfferCannotBeCancelledError,
  OfferNotEditableError,
  OfferDescriptionRequiredError,
  OfferQuantityInvalidError,
} from '../../domain/offer-errors';
import { EmergencyNotAcceptingIntakeError } from '../../../emergencies/domain/emergency-not-accepting-intake.error';
import { OfferCancelUnauthorizedError } from '../../application/cancel-offer';
import { OfferNeedEmergencyMismatchError } from '../../application/match-offer';
import {
  TargetNeedNotFoundError,
  TargetNeedWrongEmergencyError,
} from '../../application/submit-offer';
import { NeedForSuggestNotFoundError } from '../../application/suggest-offers-for-need';

type DomainError =
  | OfferNotFoundError
  | OfferNotOpenError
  | OfferNotMatchedError
  | OfferCannotBeCancelledError
  | OfferNotEditableError
  | OfferDescriptionRequiredError
  | OfferQuantityInvalidError
  | EmergencyNotAcceptingIntakeError
  | OfferCancelUnauthorizedError
  | OfferNeedEmergencyMismatchError
  | TargetNeedNotFoundError
  | TargetNeedWrongEmergencyError
  | NeedForSuggestNotFoundError;

@Catch(
  OfferNotFoundError,
  OfferNotOpenError,
  OfferNotMatchedError,
  OfferCannotBeCancelledError,
  OfferNotEditableError,
  OfferDescriptionRequiredError,
  OfferQuantityInvalidError,
  EmergencyNotAcceptingIntakeError,
  OfferCancelUnauthorizedError,
  OfferNeedEmergencyMismatchError,
  TargetNeedNotFoundError,
  TargetNeedWrongEmergencyError,
  NeedForSuggestNotFoundError,
)
export class OffersDomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof OfferNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof NeedForSuggestNotFoundError
          ? HttpStatus.NOT_FOUND
          : exception instanceof TargetNeedNotFoundError
            ? HttpStatus.UNPROCESSABLE_ENTITY
            : exception instanceof TargetNeedWrongEmergencyError
              ? HttpStatus.UNPROCESSABLE_ENTITY
              : exception instanceof OfferDescriptionRequiredError
                ? HttpStatus.BAD_REQUEST
                : exception instanceof OfferQuantityInvalidError
                  ? HttpStatus.BAD_REQUEST
                  : exception instanceof EmergencyNotAcceptingIntakeError
                    ? HttpStatus.CONFLICT
                    : exception instanceof OfferCancelUnauthorizedError
                      ? HttpStatus.FORBIDDEN
                      : HttpStatus.CONFLICT;
    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }
}
