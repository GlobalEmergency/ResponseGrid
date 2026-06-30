/**
 * Shared Kernel — Author value object.
 *
 * `Author` carries the self-reported contact data of the REAL person who
 * originated a write (a need, an offer, a resource) when a trusted integration
 * creates the record *on behalf of* that person through a service-account API
 * key — the delegation / "actor claim" pattern (issue #235). It lets a citizen
 * publish during an emergency without registering, while preserving attribution
 * so coordinators can reach the requester.
 *
 * It is used identically by the needs, offers and resources bounded contexts,
 * so it lives in the shared kernel next to {@link Location} — pure domain, no
 * framework, no I/O.
 *
 * PRIVACY (humanitarian context, issue #235 §Privacidad):
 * - The contact data is RESTRICTED: it must never appear in public feeds/maps,
 *   only on coordinator/admin-gated reads. The public view mappers simply do
 *   not include it.
 * - It is SELF-REPORTED and UNVERIFIED. The integrator captures it anonymously
 *   (e.g. Cloudflare Turnstile, no OTP), so `verified` is `false` unless the
 *   source proves it verified the identity.
 */

export interface AuthorProps {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
  verified?: boolean;
  source?: string | null;
}

export interface AuthorSnapshot {
  name: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  verified: boolean;
  source: string | null;
}

export class InvalidAuthorError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'InvalidAuthorError';
  }
}

/** Max lengths — defensive caps so a free-text field can't bloat a row. */
const MAX = {
  name: 200,
  email: 320, // RFC 5321 max email length
  phone: 64,
  note: 2000,
  source: 200,
} as const;

// Deliberately permissive: the integrator gathers this from an anonymous public
// form, so we accept almost anything that looks like an address rather than
// rejecting valid-but-unusual citizen emails.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class Author {
  private constructor(
    public readonly name: string | null,
    public readonly email: string | null,
    public readonly phone: string | null,
    public readonly note: string | null,
    public readonly verified: boolean,
    public readonly source: string | null,
  ) {}

  static create(props: AuthorProps): Author {
    const name = clean(props.name);
    const email = clean(props.email);
    const phone = clean(props.phone);
    const note = clean(props.note);
    const source = clean(props.source);

    // At least one identifying / contact field must be present — an "author"
    // with only `verified`/`source` carries no attribution and must not unlock
    // a delegated write (issue #235: api-key + grant + author → permitido).
    if (name === null && email === null && phone === null && note === null) {
      throw new InvalidAuthorError(
        'author must include at least one of name, email, phone or note',
      );
    }

    if (name !== null && name.length > MAX.name) {
      throw new InvalidAuthorError(
        `author.name exceeds ${MAX.name} characters`,
      );
    }
    if (email !== null) {
      if (email.length > MAX.email) {
        throw new InvalidAuthorError(
          `author.email exceeds ${MAX.email} characters`,
        );
      }
      if (!EMAIL_RE.test(email)) {
        throw new InvalidAuthorError('author.email is not a valid email');
      }
    }
    if (phone !== null && phone.length > MAX.phone) {
      throw new InvalidAuthorError(
        `author.phone exceeds ${MAX.phone} characters`,
      );
    }
    if (note !== null && note.length > MAX.note) {
      throw new InvalidAuthorError(
        `author.note exceeds ${MAX.note} characters`,
      );
    }
    if (source !== null && source.length > MAX.source) {
      throw new InvalidAuthorError(
        `author.source exceeds ${MAX.source} characters`,
      );
    }

    return new Author(
      name,
      email,
      phone,
      note,
      props.verified === true,
      source,
    );
  }

  static fromSnapshot(s: AuthorSnapshot): Author {
    return new Author(s.name, s.email, s.phone, s.note, s.verified, s.source);
  }

  toSnapshot(): AuthorSnapshot {
    return {
      name: this.name,
      email: this.email,
      phone: this.phone,
      note: this.note,
      verified: this.verified,
      source: this.source,
    };
  }
}
