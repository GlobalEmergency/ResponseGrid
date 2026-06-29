import { UserRepository } from '../domain/ports/user.repository';
import { UserId } from '../domain/user-id';
import { User } from '../domain/user';

export interface UpdateProfileCommand {
  userId: string;
  phone?: string | null | undefined;
  name?: string | undefined;
}

export interface UpdateProfileResult {
  id: string;
  email: string;
  name: string;
  phone: string | null;
}

export class UpdateProfile {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(cmd: UpdateProfileCommand): Promise<UpdateProfileResult> {
    const user = await this.userRepo.findById(UserId.fromString(cmd.userId));
    if (!user) throw new Error('User not found');

    const snap = user.toSnapshot();
    const updated = User.fromSnapshot({
      ...snap,
      name: cmd.name ?? snap.name,
      phone: cmd.phone !== undefined ? cmd.phone : snap.phone,
    });

    await this.userRepo.save(updated);

    return {
      id: updated.id.value,
      email: updated.email.value,
      name: updated.name,
      phone: updated.phone,
    };
  }
}
