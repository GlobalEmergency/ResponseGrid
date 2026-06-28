import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ContainerNotFoundError } from '../../application/container-not-found.error';
import {
  ContainerCycleError,
  ContainerEmergencyMismatchError,
  ContainerSealedError,
  ContainerValidationError,
} from '../../domain/container-errors';
import { SupplyLineValidationError } from '../../domain/supply-line';

type DomainError =
  | ContainerNotFoundError
  | ContainerSealedError
  | ContainerCycleError
  | ContainerEmergencyMismatchError
  | ContainerValidationError
  | SupplyLineValidationError;

/**
 * Maps supplies/container domain errors to HTTP codes: not-found → 404; sealed
 * conflict and cycle/emergency-mismatch invariants → 409; the rest of the
 * validation errors → 422. Mirrors the per-context filters of resources,
 * needs, offers and logistics.
 */
@Catch(
  ContainerNotFoundError,
  ContainerSealedError,
  ContainerCycleError,
  ContainerEmergencyMismatchError,
  ContainerValidationError,
  SupplyLineValidationError,
)
export class SuppliesDomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = this.statusFor(exception);
    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }

  private statusFor(exception: DomainError): HttpStatus {
    if (exception instanceof ContainerNotFoundError) {
      return HttpStatus.NOT_FOUND;
    }
    if (
      exception instanceof ContainerSealedError ||
      exception instanceof ContainerCycleError ||
      exception instanceof ContainerEmergencyMismatchError
    ) {
      return HttpStatus.CONFLICT;
    }
    return HttpStatus.UNPROCESSABLE_ENTITY;
  }
}
