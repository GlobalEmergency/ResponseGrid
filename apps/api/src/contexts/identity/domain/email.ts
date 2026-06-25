const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(public readonly value: string) {}

  static fromString(s: string): Email {
    const normalized = s.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) throw new Error(`Invalid email: ${s}`);
    return new Email(normalized);
  }

  equals(o: Email): boolean {
    return this.value === o.value;
  }
}
