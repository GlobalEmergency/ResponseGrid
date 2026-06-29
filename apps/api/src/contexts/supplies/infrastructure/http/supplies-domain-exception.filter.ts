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
    if (exception instanceof ContainerSealedError) {
      return HttpStatus.CONFLICT;
    }
    if (exception instanceof SupplyLineValidationError) {
      return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.UNPROCESSABLE_ENTITY;
  }
}
