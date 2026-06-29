import { UserId } from './user-id';
import { Email } from './email';

export interface CreateUserProps {
  id: UserId;
  email: Email;
  /** null for social-only accounts that have no password */
  passwordHash: string | null;
  name: string;
  isAdmin: boolean;
  /** Optional contact phone; defaults to null (not all accounts have one). */
  phone?: string | null;
}

export interface UserSnapshot {
  id: string;
  email: string;
  /** null for social-only accounts */
  passwordHash: string | null;
  name: string;
  isAdmin: boolean;
  phone: string | null;
}

export class User {
  private constructor(
    public readonly id: UserId,
    public readonly email: Email,
    /** null for social-only accounts that have no password set */
    public readonly passwordHash: string | null,
    public readonly name: string,
    public readonly isAdmin: boolean,
    public readonly phone: string | null,
  ) {}

  static create(props: CreateUserProps): User {
    return new User(
      props.id,
      props.email,
      props.passwordHash,
      props.name,
      props.isAdmin,
      props.phone ?? null,
    );
  }

  static fromSnapshot(snap: UserSnapshot): User {
    return new User(
      UserId.fromString(snap.id),
      Email.fromString(snap.email),
      snap.passwordHash,
      snap.name,
      snap.isAdmin,
      snap.phone,
    );
  }

  toSnapshot(): UserSnapshot {
    return {
      id: this.id.value,
      email: this.email.value,
      passwordHash: this.passwordHash,
      name: this.name,
      isAdmin: this.isAdmin,
      phone: this.phone,
    };
  }
}
