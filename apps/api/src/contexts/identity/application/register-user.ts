import { UserRepository } from '../domain/ports/user.repository';
import { PasswordHasher } from '../domain/ports/password-hasher';
import { TokenService } from '../domain/ports/token.service';
import { Email } from '../domain/email';
import { UserId } from '../domain/user-id';
import { User } from '../domain/user';
import { EmailAlreadyRegisteredError } from '../domain/email-already-registered.error';

export interface RegisterUserCommand {
  email: string;
  password: string;
  name: string;
  phone?: string | undefined;
}

export class RegisterUser {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(cmd: RegisterUserCommand): Promise<{ accessToken: string }> {
    const email = Email.fromString(cmd.email);

    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new EmailAlreadyRegisteredError();

    const passwordHash = await this.hasher.hash(cmd.password);
    const id = UserId.create();
    const user = User.create({
      id,
      email,
      passwordHash,
      name: cmd.name,
      isAdmin: false,
      phone: cmd.phone ?? null,
    });
    await this.userRepo.save(user);

    const accessToken = this.tokenService.sign({
      sub: id.value,
      email: email.value,
      isAdmin: false,
    });

    return { accessToken };
  }
}
