import { ContainerType } from './container-enums';
import { ContainerValidationError } from './container-errors';

/**
 * Human-readable prefix per container type. The full code (e.g. `PAL-0001`) is
 * the legible label / QR payload printed on the physical unit — the "Código
 * Único" validated in the field (see #140). Spanish-leaning to match the
 * working language: PAL (palet), CAJ (caja), LOT (lote).
 */
const CODE_PREFIX: Record<ContainerType, string> = {
  [ContainerType.Pallet]: 'PAL',
  [ContainerType.Box]: 'CAJ',
  [ContainerType.Lote]: 'LOT',
};

/**
 * Builds the trackable code from a per-(emergency, type) sequence number,
 * zero-padded to 4 digits (`PAL-0001`, `CAJ-0042`). Pure: the sequence itself
 * is allocated by the repository (infrastructure); this only formats it so the
 * format stays a single, testable domain rule.
 */
export function formatContainerCode(
  type: ContainerType,
  sequence: number,
): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new ContainerValidationError(
      'Container code sequence must be a positive integer',
    );
  }
  return `${CODE_PREFIX[type]}-${String(sequence).padStart(4, '0')}`;
}
