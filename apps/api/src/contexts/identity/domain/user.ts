import { UserId } from './user-id';
import { Email } from './email';

export interface CreateUserProps {
  id: UserId;
  email: Email;
  passwordHash: string;
  name: string;
  isAdmin: boolean;
}

export interface UserSnapshot {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  isAdmin: boolean;
}

export class User {
  private constructor(
    public readonly id: UserId,
    public readonly email: Email,
    public readonly passwordHash: string,
    public readonly name: string,
    public readonly isAdmin: boolean,
  ) {}

  static create(props: CreateUserProps): User {
    return new User(props.id, props.email, props.passwordHash, props.name, props.isAdmin);
  }

  static fromSnapshot(snap: UserSnapshot): User {
    return new User(
      UserId.fromString(snap.id),
      Email.fromString(snap.email),
      snap.passwordHash,
      snap.name,
      snap.isAdmin,
    );
  }

  toSnapshot(): UserSnapshot {
    return {
      id: this.id.value,
      email: this.email.value,
      passwordHash: this.passwordHash,
      name: this.name,
      isAdmin: this.isAdmin,
    };
  }
}
