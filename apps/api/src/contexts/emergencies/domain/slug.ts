import { InvalidSlugError } from './invalid-slug.error';

export class Slug {
  private static readonly RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  private constructor(public readonly value: string) {}

  static fromString(s: string): Slug {
    if (!Slug.RE.test(s)) throw new InvalidSlugError(s);
    return new Slug(s);
  }

  static fromName(name: string): Slug {
    const normalized = name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return Slug.fromString(normalized);
  }

  equals(o: Slug): boolean {
    return this.value === o.value;
  }
}
