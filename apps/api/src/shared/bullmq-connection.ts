import type { Redis as IORedisConnection } from 'ioredis';

/**
 * BullMQ's connection type is pinned through a different ioredis version in the
 * dependency graph, so we centralize the compatibility cast here instead of
 * repeating it at every call site.
 */
export function toBullMqConnection(connection: IORedisConnection): never {
  return connection as never;
}
