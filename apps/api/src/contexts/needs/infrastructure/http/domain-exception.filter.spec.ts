import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { NeedsDomainExceptionFilter } from './domain-exception.filter';
import { NeedResourceNotInEmergencyError } from '../../domain/need-errors';
import { NeedNotFoundError } from '../../application/need-not-found.error';

function respond(exception: Error): { statusCode: number; body: unknown } {
  const filter = new NeedsDomainExceptionFilter();
  let statusCode = 0;
  let body: unknown;
  const res = {
    status(code: number) {
      statusCode = code;
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
  return { statusCode, body };
}

describe('NeedsDomainExceptionFilter', () => {
  it('incluye el code estable de NeedResourceNotInEmergencyError en el body (#348)', () => {
    const { statusCode, body } = respond(
      new NeedResourceNotInEmergencyError('some-id'),
    );
    expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(body).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'resource_not_in_emergency',
      message: 'Resource some-id does not exist in this emergency',
    });
  });

  it('omite code cuando la excepción no expone uno', () => {
    const { body } = respond(new NeedNotFoundError('missing-id'));
    expect(body).not.toHaveProperty('code');
  });
});
