import { Membership } from '../membership';
import { UserId } from '../user-id';
import { Role } from '../role';

export const MEMBERSHIP_REPOSITORY = Symbol('MembershipRepository');

export interface MembershipRepository {
  findByUser(userId: UserId): Promise<Membership[]>;
  save(membership: Membership): Promise<void>;
  hasRole(userId: UserId, emergencyId: string, role: Role): Promise<boolean>;
}
