import { UserId } from '../user-id';
import { ConsentDocument, ConsentSnapshot } from '../consent';

export const CONSENT_REPOSITORY = Symbol('ConsentRepository');

export interface ConsentEntry {
  document: ConsentDocument;
  version: string;
}

/** Audit metadata captured once for a batch of acceptances (same request). */
export interface ConsentContext {
  ip: string | null;
  userAgent: string | null;
  /**
   * The service account that recorded this consent on the user's behalf, when
   * the acceptance came through a trusted channel (bot) rather than a browser
   * (#315). Null/absent for the normal web flows.
   */
  serviceAccountId?: string | null;
}

export interface ConsentRepository {
  /** Appends one acceptance row per entry, stamped with the current time. */
  record(
    userId: UserId,
    entries: ConsentEntry[],
    context: ConsentContext,
  ): Promise<void>;
  /** All consent acceptances recorded for the user. */
  findByUser(userId: UserId): Promise<ConsentSnapshot[]>;
}
