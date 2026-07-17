import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { SuppliesDomainExceptionFilter } from './supplies-domain-exception.filter';
import {
  CategoryNotFoundError,
  CategoryProtectedError,
  CategoryValidationError,
} from '../../application/category-admin.errors';
import { SupplyLineValidationError } from '@globalemergency/warehouse-core/kernel';

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

function bodyFor(exception: Error): unknown {
  const filter = new SuppliesDomainExceptionFilter();
  let body: unknown;
  const res = {
    status() {
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
  filter.catch(exception, host);
  return body;
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

  it('incluye el code estable de SupplyLineValidationError en el body (#348)', () => {
    const body = bodyFor(
      new SupplyLineValidationError(
        'SupplyLine name must not be empty',
        'supply_name_required',
      ),
    );
    expect(body).toMatchObject({ code: 'supply_name_required' });
  });

  it('omite code cuando la excepción no expone uno', () => {
    const body = bodyFor(new CategoryNotFoundError('missing'));
    expect(body).not.toHaveProperty('code');
  });
});
