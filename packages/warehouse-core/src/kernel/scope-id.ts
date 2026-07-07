import { randomUUID } from 'node:crypto';

/**
 * ScopeId — el identificador **opaco de tenencia/partición** del núcleo de
 * almacén. El paquete no sabe qué representa: en el WMS standalone es la
 * Organización (Protección Civil) dueña del almacén; en ResponseGrid es la
 * emergencia/centro. Cada host mapea su propio id a un `ScopeId` en la frontera.
 *
 * A diferencia de un `EmergencyId`, es deliberadamente **genérico**: acepta
 * cualquier string no vacío (un owner id no tiene por qué ser un UUID), de modo
 * que el mismo núcleo sirve a cualquier sector. `create()` genera un UUID como
 * comodidad, pero `fromString` no exige ese formato.
 */
export class ScopeIdValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'ScopeIdValidationError';
  }
}

export class ScopeId {
  private constructor(public readonly value: string) {}

  static create(): ScopeId {
    return new ScopeId(randomUUID());
  }

  static fromString(s: string): ScopeId {
    const trimmed = typeof s === 'string' ? s.trim() : '';
    if (trimmed === '') {
      throw new ScopeIdValidationError('ScopeId must be a non-empty string');
    }
    return new ScopeId(trimmed);
  }

  equals(other: ScopeId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
