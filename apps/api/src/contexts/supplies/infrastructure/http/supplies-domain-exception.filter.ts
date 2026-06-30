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
import { SupplyValidationError } from '../../domain/supply';
import { SupplyAliasValidationError } from '../../domain/supply-alias';
import {
  AliasConflictError,
  CategoryNotFoundError,
  MergeIntoSelfError,
  SupplyCodeConflictError,
  SupplyNotFoundError,
  VariantTargetNotFoundError,
} from '../../domain/supply-errors';

type DomainError =
  | ContainerNotFoundError
  | ContainerSealedError
  | ContainerCycleError
  | ContainerEmergencyMismatchError
  | ContainerValidationError
  | SupplyLineValidationError
  | SupplyValidationError
  | SupplyAliasValidationError
  | SupplyNotFoundError
  | SupplyCodeConflictError
  | VariantTargetNotFoundError
  | CategoryNotFoundError
  | MergeIntoSelfError
  | AliasConflictError;

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
  SupplyValidationError,
  SupplyAliasValidationError,
  SupplyNotFoundError,
  SupplyCodeConflictError,
  VariantTargetNotFoundError,
  CategoryNotFoundError,
  MergeIntoSelfError,
  AliasConflictError,
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
      exception instanceof SupplyNotFoundError ||
      exception instanceof VariantTargetNotFoundError ||
      exception instanceof CategoryNotFoundError
    ) {
      return HttpStatus.NOT_FOUND;
    }
    if (
      exception instanceof ContainerSealedError ||
      exception instanceof SupplyCodeConflictError ||
      exception instanceof AliasConflictError
    ) {
      return HttpStatus.CONFLICT;
    }
    if (
      exception instanceof SupplyLineValidationError ||
      exception instanceof SupplyValidationError ||
      exception instanceof SupplyAliasValidationError ||
      exception instanceof MergeIntoSelfError
    ) {
      return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.UNPROCESSABLE_ENTITY;
  }
}
