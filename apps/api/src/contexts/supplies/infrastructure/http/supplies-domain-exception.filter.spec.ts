import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { SuppliesDomainExceptionFilter } from './supplies-domain-exception.filter';
import {
  CategoryNotFoundError,
  CategoryProtectedError,
  CategoryValidationError,
} from '../../application/category-admin.errors';

function statusFor(
  exception:
    CategoryNotFoundError | CategoryProtectedError | CategoryValidationError,
): number {
  const filter = new SuppliesDomainExceptionFilter();
  let statusCode = 0;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
  filter.catch(exception, host);
  return statusCode;
}

describe('SuppliesDomainExceptionFilter — categorías admin', () => {
  it('mapea el CategoryNotFoundError de application a 404 (regresión: antes 500)', () => {
    expect(statusFor(new CategoryNotFoundError('missing'))).toBe(
      HttpStatus.NOT_FOUND,
    );
  });

  it('mapea CategoryProtectedError (slug núcleo) a 409', () => {
    expect(statusFor(new CategoryProtectedError('food'))).toBe(
      HttpStatus.CONFLICT,
    );
  });

  it('mapea CategoryValidationError a 422', () => {
    expect(statusFor(new CategoryValidationError('bad'))).toBe(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  });
});
