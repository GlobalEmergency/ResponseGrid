import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { CapacityNotFoundError } from '../../application/capacity-not-found.error';
import { CapacityWithdrawUnauthorizedError } from '../../application/withdraw-capacity';
import {
  CapacityAlreadyWithdrawnError,
  CapacityMustHaveWeightOrVolumeError,
  CapacityNotAvailableError,
  InvalidCapacityAmountError,
  InvalidCapacityWindowError,
  InvalidCoverageError,
} from '../../domain/transport-capacity-errors';
import { EmergencyNotAcceptingIntakeError } from '../../../emergencies/domain/emergency-not-accepting-intake.error';

type DomainError =
  | CapacityNotFoundError
  | CapacityWithdrawUnauthorizedError
  | CapacityAlreadyWithdrawnError
  | CapacityNotAvailableError
  | CapacityMustHaveWeightOrVolumeError
  | InvalidCapacityAmountError
  | InvalidCapacityWindowError
  | InvalidCoverageError
  | EmergencyNotAcceptingIntakeError;

@Catch(
  CapacityNotFoundError,
  CapacityWithdrawUnauthorizedError,
  CapacityAlreadyWithdrawnError,
  CapacityNotAvailableError,
  CapacityMustHaveWeightOrVolumeError,
  InvalidCapacityAmountError,
  InvalidCapacityWindowError,
  InvalidCoverageError,
  EmergencyNotAcceptingIntakeError,
)
export class LogisticsDomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof CapacityNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof CapacityWithdrawUnauthorizedError
          ? HttpStatus.FORBIDDEN
          : exception instanceof EmergencyNotAcceptingIntakeError
            ? HttpStatus.CONFLICT
            : exception instanceof CapacityAlreadyWithdrawnError
              ? HttpStatus.CONFLICT
              : exception instanceof CapacityNotAvailableError
                ? HttpStatus.CONFLICT
                : HttpStatus.UNPROCESSABLE_ENTITY;
    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }
}
