export interface ApiKeySnapshot {
  id: string;
  /** Non-secret lookup identifier (`rh_live_<first8>`). */
  prefix: string;
  /** Hash of the full key secret — the plaintext is never stored. */
  hashedSecret: string;
  /** The service-account principal this key authenticates as. */
  serviceAccountId: string;
  createdByUserId: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export class ApiKey {
  private constructor(
    public readonly id: string,
    public readonly prefix: string,
    public readonly hashedSecret: string,
    public readonly serviceAccountId: string,
    public readonly createdByUserId: string,
    public readonly expiresAt: Date | null,
    public readonly lastUsedAt: Date | null,
    public readonly revokedAt: Date | null,
    public readonly createdAt: Date,
  ) {}

  static issue(props: {
    id: string;
    prefix: string;
    hashedSecret: string;
    serviceAccountId: string;
    createdByUserId: string;
    expiresAt?: Date | null;
    createdAt?: Date;
  }): ApiKey {
    return new ApiKey(
      props.id,
      props.prefix,
      props.hashedSecret,
      props.serviceAccountId,
      props.createdByUserId,
      props.expiresAt ?? null,
      null,
      null,
      props.createdAt ?? new Date(),
    );
  }

  static fromSnapshot(s: ApiKeySnapshot): ApiKey {
    return new ApiKey(
      s.id,
      s.prefix,
      s.hashedSecret,
      s.serviceAccountId,
      s.createdByUserId,
      s.expiresAt === null ? null : new Date(s.expiresAt),
      s.lastUsedAt === null ? null : new Date(s.lastUsedAt),
      s.revokedAt === null ? null : new Date(s.revokedAt),
      new Date(s.createdAt),
    );
  }

  toSnapshot(): ApiKeySnapshot {
    return {
      id: this.id,
      prefix: this.prefix,
      hashedSecret: this.hashedSecret,
      serviceAccountId: this.serviceAccountId,
      createdByUserId: this.createdByUserId,
      expiresAt: this.expiresAt === null ? null : this.expiresAt.toISOString(),
      lastUsedAt:
        this.lastUsedAt === null ? null : this.lastUsedAt.toISOString(),
      revokedAt: this.revokedAt === null ? null : this.revokedAt.toISOString(),
      createdAt: this.createdAt.toISOString(),
    };
  }

  /** Not revoked and not past its expiry. */
  isActive(now: Date): boolean {
    if (this.revokedAt !== null) return false;
    return this.expiresAt === null || this.expiresAt.getTime() > now.getTime();
  }

  revoke(now: Date): ApiKey {
    return new ApiKey(
      this.id,
      this.prefix,
      this.hashedSecret,
      this.serviceAccountId,
      this.createdByUserId,
      this.expiresAt,
      this.lastUsedAt,
      now,
      this.createdAt,
    );
  }

  markUsed(now: Date): ApiKey {
    return new ApiKey(
      this.id,
      this.prefix,
      this.hashedSecret,
      this.serviceAccountId,
      this.createdByUserId,
      this.expiresAt,
      now,
      this.revokedAt,
      this.createdAt,
    );
  }
}
