/**
 * A machine principal. Service accounts are granted roles via the same
 * `grants` table as users (principal_type = 'service_account') and their API
 * keys authenticate into the same `can()` decision point. See docs/features/13
 * §8.
 */
export interface ServiceAccountSnapshot {
  id: string;
  name: string;
  /** Organization that owns this service account, if any. */
  ownerOrganizationId: string | null;
  createdByUserId: string;
  createdAt: string;
}

export class ServiceAccount {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly ownerOrganizationId: string | null,
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    name: string;
    ownerOrganizationId?: string | null;
    createdByUserId: string;
    createdAt?: Date;
  }): ServiceAccount {
    if (!props.name || props.name.trim() === '') {
      throw new Error('ServiceAccount name must be a non-empty string');
    }
    return new ServiceAccount(
      props.id,
      props.name.trim(),
      props.ownerOrganizationId ?? null,
      props.createdByUserId,
      props.createdAt ?? new Date(),
    );
  }

  static fromSnapshot(s: ServiceAccountSnapshot): ServiceAccount {
    return new ServiceAccount(
      s.id,
      s.name,
      s.ownerOrganizationId,
      s.createdByUserId,
      new Date(s.createdAt),
    );
  }

  toSnapshot(): ServiceAccountSnapshot {
    return {
      id: this.id,
      name: this.name,
      ownerOrganizationId: this.ownerOrganizationId,
      createdByUserId: this.createdByUserId,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
