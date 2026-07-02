import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Queue, Job } from 'bullmq';
import IORedis, { type Redis as IORedisConnection } from 'ioredis';
import { toBullMqConnection } from '../bullmq-connection';
import { allConsumers, consumerQueueName } from './subscriptions';
import { fanOut, DomainEventEnvelope } from './fan-out';

type DomainEventJobData = DomainEventEnvelope;

/**
 * Turns the shared `domain-events` queue into a topic: reads every published
 * domain event and fans it out to one private queue per subscribed consumer
 * (`domain-events.<consumer>`), so consumers each get their own copy with
 * independent retries, idempotency and scaling — instead of competing for a
 * single queue (which delivered each event to only one worker and silently
 * dropped the rest).
 *
 * Adding a consumer is a registry entry in `subscriptions.ts`; producers are
 * untouched. The dispatcher itself is stateless routing, so it scales
 * horizontally (several instances share the ingest load).
 */
export class EventDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventDispatcher.name);
  private worker: Worker<DomainEventJobData> | null = null;
  private workerConnection: IORedisConnection | null = null;
  private queueConnection: IORedisConnection | null = null;
  private readonly consumerQueues = new Map<string, Queue>();

  onModuleInit(): void {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL is required');

    // One shared connection produces to the consumer queues.
    const queueConnection = new IORedis(url, { maxRetriesPerRequest: null });
    this.queueConnection = queueConnection;
    for (const consumer of allConsumers()) {
      this.consumerQueues.set(
        consumer,
        new Queue(consumerQueueName(consumer), {
          connection: toBullMqConnection(queueConnection),
        }),
      );
    }

    // The worker needs its own dedicated (blocking) connection.
    const workerConnection = new IORedis(url, { maxRetriesPerRequest: null });
    this.workerConnection = workerConnection;
    this.worker = new Worker<DomainEventJobData>(
      'domain-events',
      (job: Job<DomainEventJobData>) => this.dispatch(job),
      { connection: toBullMqConnection(workerConnection) },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `dispatch of job ${job?.id ?? '?'} (${job?.name ?? '?'}) failed: ${err.message}`,
      );
    });
  }

  private async dispatch(job: Job<DomainEventJobData>): Promise<void> {
    await fanOut(job.data, async (consumer, event) => {
      const queue = this.consumerQueues.get(consumer);
      if (!queue) return;
      await queue.add(event.name, event);
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.worker?.close();
    } catch {
      // ignore
    }
    for (const queue of this.consumerQueues.values()) {
      try {
        await queue.close();
      } catch {
        // ignore
      }
    }
    try {
      await this.workerConnection?.quit();
    } catch {
      // ignore
    }
    try {
      await this.queueConnection?.quit();
    } catch {
      // ignore
    }
  }
}
