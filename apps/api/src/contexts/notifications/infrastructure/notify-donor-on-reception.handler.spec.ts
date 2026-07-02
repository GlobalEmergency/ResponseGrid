import { notifyDonorOnReception } from './notify-donor-on-reception.handler';
import {
  CreateNotificationParams,
  NotificationsPort,
} from '../domain/ports/notifications.port';
import { NotificationType } from '../domain/notification-type';
import { DomainEventEnvelope } from '../../../shared/events/fan-out';

class CapturingNotifications implements NotificationsPort {
  readonly calls: CreateNotificationParams[] = [];
  create(params: CreateNotificationParams): Promise<void> {
    this.calls.push(params);
    return Promise.resolve();
  }
}

const event = (donorUserId: string | null): DomainEventEnvelope => ({
  name: 'donation_intake.received',
  occurredOn: '2026-07-01T00:00:00.000Z',
  aggregateId: 'intake-9',
  payload: {
    emergencyId: 'emg-1',
    targetResourceId: 'res-1',
    receivedByUserId: 'vol-1',
    donorUserId,
    lines: [],
  },
});

describe('notifyDonorOnReception', () => {
  it('notifies the donor when the donation is linked to a user', async () => {
    const notifications = new CapturingNotifications();
    const handler = notifyDonorOnReception(notifications);

    await handler(event('donor-7'));

    expect(notifications.calls).toHaveLength(1);
    expect(notifications.calls[0]).toMatchObject({
      userId: 'donor-7',
      emergencyId: 'emg-1',
      type: NotificationType.DonationReceived,
    });
  });

  it('does nothing for an anonymous donation (no user id)', async () => {
    const notifications = new CapturingNotifications();
    const handler = notifyDonorOnReception(notifications);

    await handler(event(null));

    expect(notifications.calls).toHaveLength(0);
  });
});
