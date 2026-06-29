import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { ReceiveDonationIntoInventory } from '../application/receive-donation-into-inventory';
import { SupplyLineSnapshot } from '../../supplies/domain/supply-line';

interface DomainEventJobData {
  name: string;
  occurredOn: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

const DONATION_RECEIVED = 'donation_intake.received';

/**
 * Consumes the shared `domain-events` queue and, for `donation_intake.received`,
 * applies the received lines to the target point's inventory (#129) — the first
 * domain-event consumer in the codebase.
 *
 * Limitation: a single BullMQ worker on the shared queue is a *competing*
 * consumer — it also acks (no-ops) every other event on the queue. That is fine
 * while this is the only consumer; a second consumer for a different event will
 * need per-event queues or a fan-out. Fail-open: an error fails only that job
 * (jobs are published with the BullMQ default of one attempt, so a malformed or
 * doomed event is dropped rather than retried forever).
 */
export class DonationEventsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DonationEventsWorker.name);
  private worker: Worker<DomainEventJobData> | null = null;
  private connection: IORedis | null = null;

  constructor(private readonly receive: ReceiveDonationIntoInventory) {}

  onModuleInit(): void {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL is required');
    // BullMQ workers need a dedicated connection with blocking commands enabled.
    this.connection = new IORedis(url, { maxRetriesPerRequest: null });
    this.worker = new Worker<DomainEventJobData>(
      'domain-events',
      (job: Job<DomainEventJobData>) => this.handle(job),
      { connection: this.connection },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `domain-events job ${job?.id ?? '?'} (${job?.name ?? '?'}) failed: ${err.message}`,
      );
    });
  }

  private async handle(job: Job<DomainEventJobData>): Promise<void> {
    if (job.data.name !== DONATION_RECEIVED) return;

    const payload = job.data.payload as {
      targetResourceId?: unknown;
      lines?: unknown;
    };
    if (
      typeof payload.targetResourceId !== 'string' ||
      !Array.isArray(payload.lines)
    ) {
      this.logger.warn(
        `Skipping malformed ${DONATION_RECEIVED} payload (job ${job.id ?? '?'})`,
      );
      return;
    }

    const result = await this.receive.execute({
      targetResourceId: payload.targetResourceId,
      lines: payload.lines as SupplyLineSnapshot[],
    });
    if (result === 'resource_not_found') {
      this.logger.warn(
        `${DONATION_RECEIVED}: target resource ${payload.targetResourceId} not found; inventory not updated`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.worker?.close();
    } catch {
      // ignore — let teardown proceed
    }
    try {
      await this.connection?.quit();
    } catch {
      // ignore
    }
  }
}
