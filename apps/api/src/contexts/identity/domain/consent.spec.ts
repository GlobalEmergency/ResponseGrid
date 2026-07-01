import {
  ConsentDocument,
  CURRENT_CONSENT_VERSIONS,
  hasAcceptedCurrentConsents,
  isProfileComplete,
  missingConsents,
  type ConsentSnapshot,
} from './consent';

const at = new Date('2026-07-01T00:00:00Z');

function accepted(doc: ConsentDocument, version?: string): ConsentSnapshot {
  return {
    document: doc,
    version: version ?? CURRENT_CONSENT_VERSIONS[doc],
    acceptedAt: at,
  };
}

describe('consent helpers', () => {
  describe('hasAcceptedCurrentConsents', () => {
    it('true when both terms and privacy accepted at current version', () => {
      expect(
        hasAcceptedCurrentConsents([
          accepted(ConsentDocument.Terms),
          accepted(ConsentDocument.Privacy),
        ]),
      ).toBe(true);
    });

    it('false when one document is missing', () => {
      expect(
        hasAcceptedCurrentConsents([accepted(ConsentDocument.Terms)]),
      ).toBe(false);
    });

    it('false when the accepted version is stale', () => {
      expect(
        hasAcceptedCurrentConsents([
          accepted(ConsentDocument.Terms, '2020-01-01'),
          accepted(ConsentDocument.Privacy),
        ]),
      ).toBe(false);
    });
  });

  describe('missingConsents', () => {
    it('lists documents not accepted at current version', () => {
      expect(missingConsents([accepted(ConsentDocument.Terms)])).toEqual([
        ConsentDocument.Privacy,
      ]);
    });

    it('empty when everything is accepted', () => {
      expect(
        missingConsents([
          accepted(ConsentDocument.Terms),
          accepted(ConsentDocument.Privacy),
        ]),
      ).toEqual([]);
    });
  });

  describe('isProfileComplete', () => {
    const bothAccepted = [
      accepted(ConsentDocument.Terms),
      accepted(ConsentDocument.Privacy),
    ];

    it('true with phone and both consents', () => {
      expect(isProfileComplete('+58 412 555 0101', bothAccepted)).toBe(true);
    });

    it('false without phone', () => {
      expect(isProfileComplete(null, bothAccepted)).toBe(false);
      expect(isProfileComplete('   ', bothAccepted)).toBe(false);
    });

    it('false without consents even if phone present', () => {
      expect(isProfileComplete('+58 412 555 0101', [])).toBe(false);
    });
  });
});
