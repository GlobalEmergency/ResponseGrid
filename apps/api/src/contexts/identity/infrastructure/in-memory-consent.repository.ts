import {
  ConsentContext,
  ConsentEntry,
  ConsentRepository,
} from '../domain/ports/consent.repository';
import { ConsentSnapshot } from '../domain/consent';
import { UserId } from '../domain/user-id';

export class InMemoryConsentRepository implements ConsentRepository {
  private byUser = new Map<string, ConsentSnapshot[]>();

  record(
    userId: UserId,
    entries: ConsentEntry[],
    context: ConsentContext,
  ): Promise<void> {
    const now = new Date();
    const rows = this.byUser.get(userId.value) ?? [];
    for (const e of entries) {
      rows.push({
        document: e.document,
        version: e.version,
        ip: context.ip,
        userAgent: context.userAgent,
        acceptedAt: now,
      });
    }
    this.byUser.set(userId.value, rows);
    return Promise.resolve();
  }

  findByUser(userId: UserId): Promise<ConsentSnapshot[]> {
    return Promise.resolve([...(this.byUser.get(userId.value) ?? [])]);
  }
}
