export interface PasswordSetupTokenSnapshot {
  id: string;
  userId: string;
  /** SHA-256 of the secret; the plaintext is never stored. */
  tokenHash: string;
  expiresAt: string;
  /** When the token was consumed; null while still outstanding. */
  usedAt: string | null;
  createdAt: string;
}

/**
 * A single-use, expiring invitation to set the password of a passwordless
 * account (#204). Issued when an anonymous donor pre-registers (#168) and again
 * on an explicit resend. Only the hash of the secret is held; validity is the
 * conjunction of "not yet used" and "not past expiry".
 */
export class PasswordSetupToken {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tokenHash: string,
    public readonly expiresAt: Date,
    public readonly usedAt: Date | null,
    public readonly createdAt: Date,
  ) {}

  static issue(props: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt?: Date;
  }): PasswordSetupToken {
    return new PasswordSetupToken(
      props.id,
      props.userId,
      props.tokenHash,
      props.expiresAt,
      null,
      props.createdAt ?? new Date(),
    );
  }

  static fromSnapshot(s: PasswordSetupTokenSnapshot): PasswordSetupToken {
    return new PasswordSetupToken(
      s.id,
      s.userId,
      s.tokenHash,
      new Date(s.expiresAt),
      s.usedAt === null ? null : new Date(s.usedAt),
      new Date(s.createdAt),
    );
  }

  toSnapshot(): PasswordSetupTokenSnapshot {
    return {
      id: this.id,
      userId: this.userId,
      tokenHash: this.tokenHash,
      expiresAt: this.expiresAt.toISOString(),
      usedAt: this.usedAt === null ? null : this.usedAt.toISOString(),
      createdAt: this.createdAt.toISOString(),
    };
  }

  /** Usable exactly once, before it expires. */
  isUsable(now: Date): boolean {
    return this.usedAt === null && this.expiresAt.getTime() > now.getTime();
  }

  markUsed(now: Date): PasswordSetupToken {
    return new PasswordSetupToken(
      this.id,
      this.userId,
      this.tokenHash,
      this.expiresAt,
      now,
      this.createdAt,
    );
  }
}
