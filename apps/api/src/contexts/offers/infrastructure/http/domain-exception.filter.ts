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
  OfferItemsRequiredError,
} from '../../domain/offer-errors';
import { EmergencyNotAcceptingIntakeError } from '../../../emergencies/domain/emergency-not-accepting-intake.error';
import { OfferCancelUnauthorizedError } from '../../application/cancel-offer';
import { OfferNeedEmergencyMismatchError } from '../../application/match-offer';
import {
  TargetNeedNotFoundError,
  TargetNeedWrongEmergencyError,
} from '../../application/submit-offer';
import { NeedForSuggestNotFoundError } from '../../application/suggest-offers-for-need';
import { DonationIntakeNotFoundError } from '../../application/donation-intake-not-found.error';
import {
  DonationIntakeAlreadyProcessedError,
  DonationIntakeContactMismatchError,
  InvalidDonationIntakeContactError,
  InvalidIntakeTargetResourceError,
  DonationIntakeLineLimitError,
} from '../../domain/donation-intake-errors';
import { SupplyLineValidationError } from '../../../supplies/domain/supply-line';
import { InvalidAuthorError } from '../../../../shared/domain/author';

type DomainError =
  | OfferNotFoundError
  | OfferNotOpenError
  | OfferNotMatchedError
  | OfferCannotBeCancelledError
  | OfferNotEditableError
  | OfferItemsRequiredError
  | EmergencyNotAcceptingIntakeError
  | OfferCancelUnauthorizedError
  | OfferNeedEmergencyMismatchError
  | TargetNeedNotFoundError
  | TargetNeedWrongEmergencyError
  | NeedForSuggestNotFoundError
  | DonationIntakeNotFoundError
  | DonationIntakeAlreadyProcessedError
  | DonationIntakeContactMismatchError
  | InvalidDonationIntakeContactError
  | InvalidIntakeTargetResourceError
  | DonationIntakeLineLimitError
  | SupplyLineValidationError
  | InvalidAuthorError;

@Catch(
  OfferNotFoundError,
  OfferNotOpenError,
  OfferNotMatchedError,
  OfferCannotBeCancelledError,
  OfferNotEditableError,
  OfferItemsRequiredError,
  EmergencyNotAcceptingIntakeError,
  OfferCancelUnauthorizedError,
  OfferNeedEmergencyMismatchError,
  TargetNeedNotFoundError,
  TargetNeedWrongEmergencyError,
  NeedForSuggestNotFoundError,
  DonationIntakeNotFoundError,
  DonationIntakeAlreadyProcessedError,
  DonationIntakeContactMismatchError,
  InvalidDonationIntakeContactError,
  InvalidIntakeTargetResourceError,
  DonationIntakeLineLimitError,
  SupplyLineValidationError,
  InvalidAuthorError,
)
export class OffersDomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof OfferNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof DonationIntakeNotFoundError
          ? HttpStatus.NOT_FOUND
          : exception instanceof NeedForSuggestNotFoundError
            ? HttpStatus.NOT_FOUND
            : exception instanceof TargetNeedNotFoundError
              ? HttpStatus.UNPROCESSABLE_ENTITY
              : exception instanceof TargetNeedWrongEmergencyError
                ? HttpStatus.UNPROCESSABLE_ENTITY
                : exception instanceof InvalidIntakeTargetResourceError
                  ? HttpStatus.UNPROCESSABLE_ENTITY
                  : exception instanceof OfferItemsRequiredError
                    ? HttpStatus.BAD_REQUEST
                    : exception instanceof InvalidDonationIntakeContactError
                      ? HttpStatus.BAD_REQUEST
                      : exception instanceof DonationIntakeLineLimitError
                        ? HttpStatus.BAD_REQUEST
                        : exception instanceof SupplyLineValidationError
                          ? HttpStatus.BAD_REQUEST
                          : exception instanceof InvalidAuthorError
                            ? HttpStatus.BAD_REQUEST
                            : exception instanceof
                                EmergencyNotAcceptingIntakeError
                              ? HttpStatus.CONFLICT
                              : exception instanceof
                                  OfferCancelUnauthorizedError
                                ? HttpStatus.FORBIDDEN
                                : exception instanceof
                                    DonationIntakeContactMismatchError
                                  ? HttpStatus.FORBIDDEN
                                  : HttpStatus.CONFLICT;
    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }
}
