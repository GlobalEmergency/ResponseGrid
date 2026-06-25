import { UserId } from './user-id';
import { Role } from './role';

export interface MembershipSnapshot {
  id: string;
  userId: string;
  emergencyId: string;
  role: Role;
}

export class Membership {
  constructor(
    public readonly id: string,
    public readonly userId: UserId,
    public readonly emergencyId: string,
    public readonly role: Role,
  ) {}

  static create(props: { id: string; userId: UserId; emergencyId: string; role: Role }): Membership {
    return new Membership(props.id, props.userId, props.emergencyId, props.role);
  }

  static fromSnapshot(snap: MembershipSnapshot): Membership {
    return new Membership(
      snap.id,
      UserId.fromString(snap.userId),
      snap.emergencyId,
      snap.role as Role,
    );
  }

  toSnapshot(): MembershipSnapshot {
    return {
      id: this.id,
      userId: this.userId.value,
      emergencyId: this.emergencyId,
      role: this.role,
    };
  }
}
