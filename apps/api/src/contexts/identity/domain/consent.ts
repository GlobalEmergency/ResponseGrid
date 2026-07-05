/**
 * Legal consent the platform must collect and record for every user account
 * (RGPD): acceptance of the Terms of Service and the Privacy Policy. Stored
 * versioned in `user_consents` so we keep *when* and *which version* was
 * accepted (migration 0038).
 */
export enum ConsentDocument {
  Terms = 'terms',
  Privacy = 'privacy',
}

export const ALL_CONSENT_DOCUMENTS: readonly ConsentDocument[] = [
  ConsentDocument.Terms,
  ConsentDocument.Privacy,
];

/**
 * Current published version of each legal document. Bump the string when the
 * document text changes so that a user whose latest acceptance predates it is
 * treated as not-yet-consented (future re-consent flow). Kept as a plain
 * constant — no external source needed today.
 */
export const CURRENT_CONSENT_VERSIONS: Record<ConsentDocument, string> = {
  [ConsentDocument.Terms]: '2026-07-01',
  [ConsentDocument.Privacy]: '2026-07-01',
};

export interface ConsentSnapshot {
  document: ConsentDocument;
  version: string;
  /** Request IP at acceptance (audit); null if not captured. */
  ip: string | null;
  /** Request User-Agent at acceptance (audit); null if not captured. */
  userAgent: string | null;
  acceptedAt: Date;
}

/** True when the user has accepted the current version of every legal document. */
export function hasAcceptedCurrentConsents(
  consents: readonly ConsentSnapshot[],
): boolean {
  return ALL_CONSENT_DOCUMENTS.every((doc) =>
    consents.some(
      (c) => c.document === doc && c.version === CURRENT_CONSENT_VERSIONS[doc],
    ),
  );
}

/** Documents whose current version the user has NOT yet accepted. */
export function missingConsents(
  consents: readonly ConsentSnapshot[],
): ConsentDocument[] {
  return ALL_CONSENT_DOCUMENTS.filter(
    (doc) =>
      !consents.some(
        (c) =>
          c.document === doc && c.version === CURRENT_CONSENT_VERSIONS[doc],
      ),
  );
}

/**
 * A profile is complete when the user has a contact phone AND has accepted the
 * current version of both legal documents. Drives the social-login onboarding
 * gate: social accounts are created without either and must complete before use.
 */
export function isProfileComplete(
  phone: string | null,
  consents: readonly ConsentSnapshot[],
): boolean {
  return (
    phone !== null &&
    phone.trim() !== '' &&
    hasAcceptedCurrentConsents(consents)
  );
}
