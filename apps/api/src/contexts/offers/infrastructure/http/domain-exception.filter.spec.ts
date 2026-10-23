import { ArgumentsHost } from '@nestjs/common';
import { OffersDomainExceptionFilter } from './domain-exception.filter';
import { OfferItemsRequiredError } from '../../domain/offer-errors';
import {
  TargetNeedNotFoundError,
  TargetNeedWrongEmergencyError,
} from '../../application/submit-offer';
import { OfferNotFoundError } from '../../application/offer-not-found.error';

function respond(exception: Error): { statusCode: number; body: unknown } {
  const filter = new OffersDomainExceptionFilter();
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

describe('OffersDomainExceptionFilter', () => {
  it('incluye el code estable de OfferItemsRequiredError en el body (#348)', () => {
    const { body } = respond(new OfferItemsRequiredError());
    expect(body).toMatchObject({
      code: 'offer_items_required',
      message: 'An offer must have at least one supply line',
    });
  });

  it('incluye el code estable de TargetNeedNotFoundError en el body (#348)', () => {
    const { body } = respond(new TargetNeedNotFoundError('some-need-id'));
    expect(body).toMatchObject({ code: 'target_need_not_found' });
  });

  it('incluye el code estable de TargetNeedWrongEmergencyError en el body (#348)', () => {
    const { body } = respond(
      new TargetNeedWrongEmergencyError('need-id', 'emergency-id'),
    );
    expect(body).toMatchObject({ code: 'target_need_wrong_emergency' });
  });

  it('omite code cuando la excepción no expone uno', () => {
    const { body } = respond(new OfferNotFoundError('missing-id'));
    expect(body).not.toHaveProperty('code');
  });
});
