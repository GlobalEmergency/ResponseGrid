import type { Redis as IORedisConnection } from 'ioredis';
import type { ConnectionOptions } from 'bullmq';

/**
 * BullMQ's connection type is pinned through a different ioredis version in the
 * dependency graph, so we centralize the compatibility cast here instead of
 * repeating it at every call site.
 */
export function toBullMqConnection(
  connection: IORedisConnection,
): ConnectionOptions {
  return connection as unknown as ConnectionOptions;
}
