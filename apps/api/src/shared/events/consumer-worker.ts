import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import IORedis, { type Redis as IORedisConnection } from 'ioredis';
import { toBullMqConnection } from '../bullmq-connection';
import { consumerQueueName } from './subscriptions';
import { DomainEventEnvelope } from './fan-out';
import { ProcessedEventStore, runOnce } from './idempotent-consumer';

export type EventHandler = (event: DomainEventEnvelope) => Promise<void>;

type DomainEventJobData = DomainEventEnvelope;

/**
 * Generic worker for a single bounded context's private fan-out queue
 * (`domain-events.<consumer>`). Each subscribed event is dispatched to its
 * handler and applied at most once via the idempotency ledger, so a redelivery
 * from the at-least-once queue does not re-run the effect.
 *
 * A context wires one of these with its own handler map — reception → inventory,
 * reception → donor notification, etc. — instead of one shared worker that
 * competes for and silently drops other contexts' events.
 */
export class ConsumerWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger;
  private worker: Worker<DomainEventJobData> | null = null;
  private connection: IORedisConnection | null = null;

  constructor(
    private readonly consumer: string,
    private readonly store: ProcessedEventStore,
    private readonly handlers: Record<string, EventHandler>,
  ) {
    this.logger = new Logger(`ConsumerWorker:${consumer}`);
  }

  onModuleInit(): void {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL is required');
    // BullMQ workers need a dedicated connection with blocking commands enabled.
    const connection = new IORedis(url, { maxRetriesPerRequest: null });
    this.connection = connection;
    this.worker = new Worker<DomainEventJobData>(
      consumerQueueName(this.consumer),
      (job: Job<DomainEventJobData>) => this.handle(job),
      { connection: toBullMqConnection(connection) },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `job ${job?.id ?? '?'} (${job?.name ?? '?'}) failed: ${err.message}`,
      );
    });
  }

  private async handle(job: Job<DomainEventJobData>): Promise<void> {
    const handler = this.handlers[job.data.name];
    // Defensive: the dispatcher only routes subscribed events here, but ignore
    // anything unexpected rather than failing the job.
    if (!handler) return;
    const result = await runOnce(this.consumer, job.data, this.store, handler);
    if (result === 'skipped') {
      this.logger.debug(
        `${job.data.name} ${job.data.aggregateId} already processed; skipped`,
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
