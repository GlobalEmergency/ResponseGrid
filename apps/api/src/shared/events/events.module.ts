import { Module } from '@nestjs/common';
import { EventDispatcher } from './event-dispatcher';

/**
 * Cross-cutting event fan-out. Boots the single dispatcher that routes every
 * published domain event from the shared `domain-events` queue to each
 * subscribed consumer's private queue (see `subscriptions.ts`). Imported once
 * by AppModule; consumers wire their own worker inside their context module.
 */
@Module({
  providers: [
    { provide: EventDispatcher, useFactory: () => new EventDispatcher() },
  ],
})
export class EventsModule {}
