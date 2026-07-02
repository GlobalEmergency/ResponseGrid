import * as bcrypt from 'bcryptjs';
import { PasswordHasher } from '../domain/ports/password-hasher';

// Work factor for bcrypt. 12 aligns with current OWASP guidance (>=10-12) and
// stays fast enough at login time. Existing cost-10 hashes keep verifying (the
// cost is embedded in each hash), so this only affects newly created passwords.
const SALT_ROUNDS = 12;

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
