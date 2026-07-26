import { ArgumentsHost } from '@nestjs/common';
import { DomainExceptionFilter } from './domain-exception.filter';
import { SupplyLineValidationError } from '@globalemergency/warehouse-core/kernel';
import { ResourceNotFoundError } from '../../application/resource-not-found.error';

function respond(exception: Error): { body: unknown } {
  const filter = new DomainExceptionFilter();
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
  return { body };
}

describe('resources DomainExceptionFilter', () => {
  it('incluye el code estable de SupplyLineValidationError en el body (#348)', () => {
    const { body } = respond(
      new SupplyLineValidationError(
        'SupplyLine name must not be empty',
        'supply_name_required',
      ),
    );
    expect(body).toMatchObject({ code: 'supply_name_required' });
  });

  it('omite code cuando la excepción no expone uno', () => {
    const { body } = respond(new ResourceNotFoundError('missing-id'));
    expect(body).not.toHaveProperty('code');
  });
});
