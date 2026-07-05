import { consumersFor, allConsumers, EventSubscription } from './subscriptions';

const SUBS: EventSubscription[] = [
  { consumer: 'resources', events: ['donation_intake.received'] },
  {
    consumer: 'notifications',
    events: ['donation_intake.received', 'offer.matched'],
  },
];

describe('consumersFor', () => {
  it('returns every consumer subscribed to the event', () => {
    expect(consumersFor('donation_intake.received', SUBS).sort()).toEqual([
      'notifications',
      'resources',
    ]);
  });

  it('returns a single consumer when only one subscribes', () => {
    expect(consumersFor('offer.matched', SUBS)).toEqual(['notifications']);
  });

  it('returns an empty list for an event nobody subscribes to', () => {
    expect(consumersFor('need.created', SUBS)).toEqual([]);
  });
});

describe('allConsumers', () => {
  it('returns each consumer once, even if it appears in several subscriptions', () => {
    const subs: EventSubscription[] = [
      { consumer: 'resources', events: ['a'] },
      { consumer: 'notifications', events: ['a'] },
      { consumer: 'notifications', events: ['b'] },
    ];
    expect(allConsumers(subs).sort()).toEqual(['notifications', 'resources']);
  });
});
