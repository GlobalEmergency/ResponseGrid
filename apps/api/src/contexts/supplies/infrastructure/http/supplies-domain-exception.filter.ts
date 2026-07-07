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
  ContainerScopeMismatchError,
  ContainerSealedError,
  ContainerValidationError,
} from '@globalemergency/warehouse-core/containers';
import { SupplyLineValidationError } from '@globalemergency/warehouse-core/kernel';
import {
  SupplyValidationError,
  SupplyAliasValidationError,
  AliasConflictError,
  CategoryNotFoundError,
  MergeIntoSelfError,
  SupplyCodeConflictError,
  SupplyNotFoundError,
  VariantTargetNotFoundError,
  AttributeValidationError,
  AttributeKeyCollisionError,
  AttributeDefinitionValidationError,
} from '@globalemergency/warehouse-core/catalog';
import {
  CategoryAlreadyExistsError,
  CategoryNotFoundError as CategoryAdminNotFoundError,
  CategoryParentNotFoundError,
  CategoryProtectedError,
  CategoryValidationError,
} from '../../application/category-admin.errors';

type DomainError =
  | ContainerNotFoundError
  | ContainerSealedError
  | ContainerCycleError
  | ContainerScopeMismatchError
  | ContainerValidationError
  | SupplyLineValidationError
  | SupplyValidationError
  | SupplyAliasValidationError
  | SupplyNotFoundError
  | SupplyCodeConflictError
  | VariantTargetNotFoundError
  | CategoryNotFoundError
  | MergeIntoSelfError
  | AliasConflictError
  | AttributeValidationError
  | AttributeKeyCollisionError
  | AttributeDefinitionValidationError
  | CategoryAlreadyExistsError
  | CategoryAdminNotFoundError
  | CategoryParentNotFoundError
  | CategoryProtectedError
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
  ContainerScopeMismatchError,
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
  AttributeValidationError,
  AttributeKeyCollisionError,
  AttributeDefinitionValidationError,
  CategoryAlreadyExistsError,
  CategoryAdminNotFoundError,
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
      exception instanceof SupplyNotFoundError ||
      exception instanceof VariantTargetNotFoundError ||
      exception instanceof CategoryNotFoundError ||
      exception instanceof CategoryAdminNotFoundError ||
      exception instanceof CategoryParentNotFoundError
    ) {
      return HttpStatus.NOT_FOUND;
    }
    if (
      exception instanceof ContainerSealedError ||
      exception instanceof SupplyCodeConflictError ||
      exception instanceof AliasConflictError ||
      exception instanceof CategoryAlreadyExistsError ||
      exception instanceof CategoryProtectedError
    ) {
      return HttpStatus.CONFLICT;
    }
    if (
      exception instanceof SupplyLineValidationError ||
      exception instanceof SupplyValidationError ||
      exception instanceof SupplyAliasValidationError ||
      exception instanceof MergeIntoSelfError ||
      exception instanceof AttributeValidationError
    ) {
      return HttpStatus.BAD_REQUEST;
    }
    // AttributeKeyCollisionError / AttributeDefinitionValidationError → 422.
    return HttpStatus.UNPROCESSABLE_ENTITY;
  }
}
