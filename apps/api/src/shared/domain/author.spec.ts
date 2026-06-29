import { Author, InvalidAuthorError } from './author';

describe('Author (shared kernel value object)', () => {
  it('creates from a full set of fields and trims them', () => {
    const a = Author.create({
      name: '  María P. ',
      email: ' maria@example.com ',
      phone: ' +58 412 1234567 ',
      note: ' Vive en el 3er piso ',
      verified: false,
      source: ' terremotovenezuela.app ',
    });
    expect(a.toSnapshot()).toEqual({
      name: 'María P.',
      email: 'maria@example.com',
      phone: '+58 412 1234567',
      note: 'Vive en el 3er piso',
      verified: false,
      source: 'terremotovenezuela.app',
    });
  });

  it('defaults verified to false when omitted and is true only for an explicit true', () => {
    expect(Author.create({ name: 'A' }).verified).toBe(false);
    expect(Author.create({ name: 'A', verified: true }).verified).toBe(true);
    // anything that is not strictly `true` stays false (defensive)
    expect(Author.create({ name: 'A', verified: undefined }).verified).toBe(
      false,
    );
  });

  it('normalises empty / whitespace-only optional fields to null', () => {
    const a = Author.create({ phone: '+58123', name: '   ', email: '' });
    expect(a.name).toBeNull();
    expect(a.email).toBeNull();
    expect(a.phone).toBe('+58123');
  });

  it('accepts a note-only author (free-text contact)', () => {
    const a = Author.create({ note: 'Llamar al hospital, ext. 12' });
    expect(a.note).toBe('Llamar al hospital, ext. 12');
  });

  it('rejects an author with no identifying field', () => {
    expect(() => Author.create({ verified: true })).toThrow(InvalidAuthorError);
    expect(() => Author.create({ source: 'terremotovenezuela.app' })).toThrow(
      InvalidAuthorError,
    );
  });

  it('rejects a malformed email', () => {
    expect(() => Author.create({ email: 'not-an-email' })).toThrow(
      InvalidAuthorError,
    );
  });

  it('rejects fields that exceed their max length', () => {
    expect(() => Author.create({ name: 'x'.repeat(201) })).toThrow(
      InvalidAuthorError,
    );
    expect(() => Author.create({ name: 'A', note: 'x'.repeat(2001) })).toThrow(
      InvalidAuthorError,
    );
  });

  it('round-trips through a snapshot', () => {
    const snap = {
      name: 'POC Hospital',
      email: null,
      phone: '+58000',
      note: null,
      verified: false,
      source: 'terremotovenezuela.app',
    };
    expect(Author.fromSnapshot(snap).toSnapshot()).toEqual(snap);
  });
});
