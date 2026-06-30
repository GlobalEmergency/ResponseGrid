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
import {
  CategoryAlreadyExistsError,
  CategoryNotFoundError,
  CategoryParentNotFoundError,
  CategoryValidationError,
} from '../../application/category-admin.errors';

type DomainError =
  | ContainerNotFoundError
  | ContainerSealedError
  | ContainerCycleError
  | ContainerEmergencyMismatchError
  | ContainerValidationError
  | SupplyLineValidationError
  | CategoryAlreadyExistsError
  | CategoryNotFoundError
  | CategoryParentNotFoundError
  | CategoryValidationError;

/**
 * Maps supplies domain errors to HTTP codes. The supplies context owns the
 * SupplyLine value object, so its validation error is mapped here (→ 400)
 * rather than in another context's filter.
 *
 * - not-found → 404
 * - sealed / already exists (conflict) → 409
 * - cycle / validation → 422
 * - SupplyLineValidationError → 400
 */
@Catch(
  ContainerNotFoundError,
  ContainerSealedError,
  ContainerCycleError,
  ContainerEmergencyMismatchError,
  ContainerValidationError,
  SupplyLineValidationError,
  CategoryAlreadyExistsError,
  CategoryNotFoundError,
  CategoryParentNotFoundError,
  CategoryValidationError,
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
    if (
      exception instanceof ContainerNotFoundError ||
      exception instanceof CategoryNotFoundError ||
      exception instanceof CategoryParentNotFoundError
    ) {
      return HttpStatus.NOT_FOUND;
    }
    if (
      exception instanceof ContainerSealedError ||
      exception instanceof CategoryAlreadyExistsError
    ) {
      return HttpStatus.CONFLICT;
    }
    if (exception instanceof SupplyLineValidationError) {
      return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.UNPROCESSABLE_ENTITY;
  }
}
