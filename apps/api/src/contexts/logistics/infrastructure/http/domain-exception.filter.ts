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
import { ShipmentNotFoundError } from '../../application/shipment-not-found.error';
import { ShipmentActionUnauthorizedError } from '../../application/mark-shipment-in-transit';
import {
  InvalidShipmentRouteError,
  InvalidShipmentTransitionError,
  ShipmentItemValidationError,
  ShipmentMustHaveItemsError,
} from '../../domain/shipment-errors';
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
  | ShipmentNotFoundError
  | ShipmentActionUnauthorizedError
  | InvalidShipmentTransitionError
  | InvalidShipmentRouteError
  | ShipmentItemValidationError
  | ShipmentMustHaveItemsError
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
  ShipmentNotFoundError,
  ShipmentActionUnauthorizedError,
  InvalidShipmentTransitionError,
  InvalidShipmentRouteError,
  ShipmentItemValidationError,
  ShipmentMustHaveItemsError,
  EmergencyNotAcceptingIntakeError,
)
export class LogisticsDomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = this.statusFor(exception);
    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }

  private statusFor(exception: DomainError): HttpStatus {
    if (
      exception instanceof CapacityNotFoundError ||
      exception instanceof ShipmentNotFoundError
    ) {
      return HttpStatus.NOT_FOUND;
    }
    if (
      exception instanceof CapacityWithdrawUnauthorizedError ||
      exception instanceof ShipmentActionUnauthorizedError
    ) {
      return HttpStatus.FORBIDDEN;
    }
    if (
      exception instanceof EmergencyNotAcceptingIntakeError ||
      exception instanceof CapacityAlreadyWithdrawnError ||
      exception instanceof CapacityNotAvailableError ||
      exception instanceof InvalidShipmentTransitionError
    ) {
      return HttpStatus.CONFLICT;
    }
    return HttpStatus.UNPROCESSABLE_ENTITY;
  }
}
