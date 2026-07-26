import { ArgumentsHost } from '@nestjs/common';
import { LogisticsDomainExceptionFilter } from './domain-exception.filter';
import {
  CapacityMustHaveWeightOrVolumeError,
  InvalidCapacityAmountError,
  InvalidCapacityWindowError,
  InvalidCoverageError,
} from '@globalemergency/warehouse-core/logistics';
import { CapacityNotFoundError } from '../../application/capacity-not-found.error';

function respond(exception: Error): { body: unknown } {
  const filter = new LogisticsDomainExceptionFilter();
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

describe('LogisticsDomainExceptionFilter', () => {
  it('incluye el code estable de CapacityMustHaveWeightOrVolumeError en el body (#348)', () => {
    const { body } = respond(new CapacityMustHaveWeightOrVolumeError());
    expect(body).toMatchObject({
      code: 'capacity_weight_or_volume_required',
    });
  });

  it('incluye el code estable de InvalidCapacityAmountError en el body (#348)', () => {
    const { body } = respond(new InvalidCapacityAmountError('weightKg', -3));
    expect(body).toMatchObject({ code: 'capacity_amount_invalid' });
  });

  it('incluye el code estable de InvalidCoverageError (area) en el body (#348)', () => {
    const { body } = respond(
      new InvalidCoverageError(
        'Area coverage must not be empty',
        'coverage_area_required',
      ),
    );
    expect(body).toMatchObject({ code: 'coverage_area_required' });
  });

  it('incluye los codes distintos de InvalidCapacityWindowError en el body (#348)', () => {
    const { body: invalidDate } = respond(
      new InvalidCapacityWindowError(
        "Capacity window from must be a valid ISO date, got 'nope'",
        'capacity_window_invalid_date',
      ),
    );
    expect(invalidDate).toMatchObject({
      code: 'capacity_window_invalid_date',
    });

    const { body: orderInvalid } = respond(
      new InvalidCapacityWindowError(
        "Capacity window 'from' (2026-01-02) must not be after 'to' (2026-01-01)",
        'capacity_window_order_invalid',
      ),
    );
    expect(orderInvalid).toMatchObject({
      code: 'capacity_window_order_invalid',
    });
  });

  it('omite code cuando la excepción no expone uno', () => {
    const { body } = respond(new CapacityNotFoundError('missing-id'));
    expect(body).not.toHaveProperty('code');
  });
});
