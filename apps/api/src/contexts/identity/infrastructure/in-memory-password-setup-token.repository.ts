import { PasswordSetupTokenRepository } from '../domain/ports/password-setup-token.repository';
import {
  PasswordSetupToken,
  PasswordSetupTokenSnapshot,
} from '../domain/password-setup-token';

export class InMemoryPasswordSetupTokenRepository implements PasswordSetupTokenRepository {
  private store = new Map<string, PasswordSetupTokenSnapshot>();

  save(token: PasswordSetupToken): Promise<void> {
    this.store.set(token.id, token.toSnapshot());
    return Promise.resolve();
  }

  findByHash(tokenHash: string): Promise<PasswordSetupToken | null> {
    const snap = [...this.store.values()].find(
      (s) => s.tokenHash === tokenHash,
    );
    return Promise.resolve(snap ? PasswordSetupToken.fromSnapshot(snap) : null);
  }

  markUsedForUser(userId: string, at: Date): Promise<void> {
    for (const [id, snap] of this.store) {
      if (snap.userId === userId && snap.usedAt === null) {
        this.store.set(id, { ...snap, usedAt: at.toISOString() });
      }
    }
    return Promise.resolve();
  }

  /** Test helper — total tokens stored. */
  countAll(): number {
    return this.store.size;
  }
}
