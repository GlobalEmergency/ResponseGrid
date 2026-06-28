import { UserRepository } from '../domain/ports/user.repository';
import { Email } from '../domain/email';
import {
  AccessControl,
  AuthorizationContext,
} from '../domain/authorization/access-control';
import { ancestorChain } from '../domain/authorization/scope-ref';
import { NotAuthorizedToReadError } from '../domain/authorization/errors';

export interface FindUserByEmailCommand {
  actor: AuthorizationContext;
  email: string;
}

export interface FoundUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Resolves an email to a principal id so the access console can grant roles by
 * email instead of by raw UUID. A thin admin directory lookup: requires
 * `role:grant` or `user:read` at the platform scope. Returns `null` when the
 * email is malformed or unknown (callers map that to 404).
 */
export class FindUserByEmail {
  constructor(
    private readonly users: UserRepository,
    private readonly access: AccessControl,
  ) {}

  async execute(cmd: FindUserByEmailCommand): Promise<FoundUser | null> {
    const perms = await this.access.effectivePermissions(
      cmd.actor,
      ancestorChain({ type: 'platform' }),
    );
    if (!perms.has('role:grant') && !perms.has('user:read')) {
      throw new NotAuthorizedToReadError('users');
    }

    let email: Email;
    try {
      email = Email.fromString(cmd.email);
    } catch {
      return null;
    }

    const user = await this.users.findByEmail(email);
    if (!user) return null;
    return { id: user.id.value, email: user.email.value, name: user.name };
  }
}
