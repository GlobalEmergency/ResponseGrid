import { GroupUserDirectory } from '../domain/ports/user-directory';

export class InMemoryGroupUserDirectory implements GroupUserDirectory {
  private readonly byEmail = new Map<string, string>();

  set(email: string, userId: string): void {
    this.byEmail.set(email.toLowerCase(), userId);
  }

  findIdByEmail(email: string): Promise<string | null> {
    return Promise.resolve(this.byEmail.get(email.toLowerCase()) ?? null);
  }
}
