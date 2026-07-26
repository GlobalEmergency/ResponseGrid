import { resourceDisputedHandler } from './resource-disputed.handler';
import { AutoHideDisputedResource } from '../application/auto-hide-disputed-resource';
import { DomainEventEnvelope } from '../../../shared/events/fan-out';

const event = (payload: Record<string, unknown>): DomainEventEnvelope => ({
  name: 'resource.disputed',
  occurredOn: '2026-07-01T00:00:00.000Z',
  aggregateId: 'resource-1',
  payload,
});

describe('resourceDisputedHandler', () => {
  it('delegates to AutoHideDisputedResource with the resource and emergency ids', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const autoHide = { execute } as unknown as AutoHideDisputedResource;
    const handler = resourceDisputedHandler(autoHide);

    await handler(event({ emergencyId: 'emg-1' }));

    expect(execute).toHaveBeenCalledWith({
      resourceId: 'resource-1',
      emergencyId: 'emg-1',
    });
  });

  it('ignores a malformed payload without calling the use case', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const autoHide = { execute } as unknown as AutoHideDisputedResource;
    const handler = resourceDisputedHandler(autoHide);

    await handler(event({}));

    expect(execute).not.toHaveBeenCalled();
  });
});
