import { Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { BullMqEventBus } from './bullmq-event-bus';
import type { DomainEvent } from '../domain/events/domain-event';

const event: DomainEvent = {
  eventName: 'resource.test',
  occurredOn: new Date('2026-01-01T00:00:00.000Z'),
  aggregateId: 'agg-1',
  payload: { foo: 'bar' },
};

describe('BullMqEventBus (resources)', () => {
  it('publishes events to the queue when the broker is healthy', async () => {
    const addBulk = jest.fn().mockResolvedValue(undefined);
    const bus = new BullMqEventBus({ addBulk } as unknown as Queue);

    await bus.publish([event]);

    expect(addBulk).toHaveBeenCalledTimes(1);
    expect(addBulk).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'resource.test' }),
    ]);
  });

  it('fails open (does not throw) and logs when the broker is unavailable', async () => {
    const addBulk = jest.fn().mockRejectedValue(new Error('ECONNREFUSED 6380'));
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const bus = new BullMqEventBus({ addBulk } as unknown as Queue);

    await expect(bus.publish([event])).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});
