import { redactContact } from './redact-contact';
import { ResourceView } from './resource-view';
import {
  ResourceType,
  VerificationLevel,
  PublicStatus,
} from '../domain/resource-enums';

function view(overrides: Partial<ResourceView> = {}): ResourceView {
  return {
    id: 'r1',
    type: ResourceType.CollectionPoint,
    name: 'Punto',
    description: null,
    location: { address: '—', latitude: 0, longitude: 0 },
    verificationLevel: VerificationLevel.Unverified,
    publicStatus: PublicStatus.Active,
    ownerOrganizationId: null,
    accepts: [],
    contact: '+58 212 555 0000',
    hasContact: true,
    schedule: null,
    manager: null,
    sourceName: null,
    externalUpdatedAt: null,
    country: null,
    city: null,
    isFinalRecipient: false,
    recipientType: null,
    disputed: false,
    disputedAt: null,
    ...overrides,
  };
}

describe('redactContact', () => {
  it('hides the contact from an anonymous caller for a non-official resource', () => {
    const result = redactContact(view(), false);
    expect(result.contact).toBeNull();
    // still signals that a contact exists behind auth
    expect(result.hasContact).toBe(true);
  });

  it('reveals the contact to an authenticated caller', () => {
    const result = redactContact(view(), true);
    expect(result.contact).toBe('+58 212 555 0000');
  });

  it('reveals the contact of an official resource even to anonymous callers', () => {
    const result = redactContact(
      view({ verificationLevel: VerificationLevel.Official }),
      false,
    );
    expect(result.contact).toBe('+58 212 555 0000');
  });

  it('leaves a null contact untouched (hasContact false)', () => {
    const result = redactContact(
      view({ contact: null, hasContact: false }),
      false,
    );
    expect(result.contact).toBeNull();
    expect(result.hasContact).toBe(false);
  });

  it('does not mutate the original view', () => {
    const original = view();
    redactContact(original, false);
    expect(original.contact).toBe('+58 212 555 0000');
  });
});
