import { DomainEventEnvelope } from '../../../shared/events/fan-out';
import { EventHandler } from '../../../shared/events/consumer-worker';
import { NotificationsPort } from '../domain/ports/notifications.port';
import { NotificationType } from '../domain/notification-type';

/**
 * Handler for `donation_intake.received` on the notifications consumer queue:
 * tell the donor their donation was received. Only fires when the donation is
 * linked to a platform user (`donorUserId`); anonymous donations are skipped.
 * Idempotency is handled by the ConsumerWorker's ledger.
 */
export function notifyDonorOnReception(
  notifications: NotificationsPort,
): EventHandler {
  return async (event: DomainEventEnvelope): Promise<void> => {
    const payload = event.payload as {
      emergencyId?: unknown;
      donorUserId?: unknown;
    };
    if (typeof payload.donorUserId !== 'string') return;

    await notifications.create({
      userId: payload.donorUserId,
      ...(typeof payload.emergencyId === 'string'
        ? { emergencyId: payload.emergencyId }
        : {}),
      type: NotificationType.DonationReceived,
      message: 'Tu donación ha sido recibida en el punto de acopio',
      link: '/dashboard/donations',
    });
  };
}
