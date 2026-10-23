import { domainErrorResponseBody } from './domain-error-response';

class WithCode extends Error {
  readonly code = 'some_code';
}

class WithoutCode extends Error {}

class WithNonStringCode extends Error {
  readonly code = 42;
}

describe('domainErrorResponseBody', () => {
  it('includes code when the exception exposes a string code', () => {
    expect(domainErrorResponseBody(400, new WithCode('boom'))).toEqual({
      statusCode: 400,
      message: 'boom',
      code: 'some_code',
    });
  });

  it('omits code when the exception does not expose one', () => {
    expect(domainErrorResponseBody(404, new WithoutCode('missing'))).toEqual({
      statusCode: 404,
      message: 'missing',
    });
  });

  it('omits code when it is present but not a string (defensive)', () => {
    const body = domainErrorResponseBody(400, new WithNonStringCode('bad'));
    expect(body).toEqual({ statusCode: 400, message: 'bad' });
  });
});
