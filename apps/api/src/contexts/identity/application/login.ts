import { UserRepository } from '../domain/ports/user.repository';
import { PasswordHasher } from '../domain/ports/password-hasher';
import { TokenService } from '../domain/ports/token.service';
import { Email } from '../domain/email';
import { InvalidCredentialsError } from '../domain/invalid-credentials.error';

export interface LoginCommand {
  email: string;
  password: string;
}

export class Login {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(cmd: LoginCommand): Promise<{ accessToken: string }> {
    let email: Email;
    try {
      email = Email.fromString(cmd.email);
    } catch {
      throw new InvalidCredentialsError();
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new InvalidCredentialsError();

    // Social-only accounts have no password — disallow email/password login for them
    if (user.passwordHash === null) throw new InvalidCredentialsError();

    const valid = await this.hasher.compare(cmd.password, user.passwordHash);
    if (!valid) throw new InvalidCredentialsError();

    // Stamp last login for the admin users console (#176). Best-effort: a write
    // failure here must not deny an otherwise-valid login.
    await this.userRepo.recordLogin(user.id, new Date());

    const accessToken = this.tokenService.sign({
      sub: user.id.value,
      email: user.email.value,
      isAdmin: user.isAdmin,
    });

    return { accessToken };
  }
}
