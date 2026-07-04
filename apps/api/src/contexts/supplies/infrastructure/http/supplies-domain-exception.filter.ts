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
  CategoryProtectedError,
  CategoryValidationError,
} from '../../domain/category-errors';

type DomainError =
  | ContainerNotFoundError
  | ContainerSealedError
  | ContainerCycleError
  | ContainerEmergencyMismatchError
  | ContainerValidationError
  | SupplyLineValidationError
  | CategoryNotFoundError
  | CategoryAlreadyExistsError
  | CategoryParentNotFoundError
  | CategoryProtectedError
  | CategoryValidationError;

/**
 * Maps supplies domain errors to HTTP codes. The supplies context owns the
 * SupplyLine value object, so its validation error is mapped here (→ 400)
 * rather than in another context's filter.
 *
 * - not-found → 404
 * - sealed (a state conflict: mutating/re-sealing a precintado container) → 409
 * - cycle / cross-emergency nest / other container validation → 422
 *   (matches how the codebase maps "wrong emergency", e.g. offers'
 *   TargetNeedWrongEmergencyError → 422)
 * - SupplyLineValidationError (e.g. a whitespace-only line name) → 400
 *
 * Category admin (#221):
 * - CategoryNotFoundError → 404
 * - CategoryAlreadyExistsError / CategoryProtectedError (core slug) → 409
 * - CategoryValidationError (empty label/vertical, own-parent) → 400
 * - CategoryParentNotFoundError → 422 (bad reference; default bucket)
 */
@Catch(
  ContainerNotFoundError,
  ContainerSealedError,
  ContainerCycleError,
  ContainerEmergencyMismatchError,
  ContainerValidationError,
  SupplyLineValidationError,
  CategoryNotFoundError,
  CategoryAlreadyExistsError,
  CategoryParentNotFoundError,
  CategoryProtectedError,
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
      exception instanceof CategoryNotFoundError
    ) {
      return HttpStatus.NOT_FOUND;
    }
    if (
      exception instanceof ContainerSealedError ||
      exception instanceof CategoryAlreadyExistsError ||
      exception instanceof CategoryProtectedError
    ) {
      return HttpStatus.CONFLICT;
    }
    if (
      exception instanceof SupplyLineValidationError ||
      exception instanceof CategoryValidationError
    ) {
      return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.UNPROCESSABLE_ENTITY;
  }
}
