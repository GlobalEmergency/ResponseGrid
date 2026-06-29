import { formatContainerCode } from './container-code';
import { ContainerType } from './container-enums';
import { ContainerValidationError } from './container-errors';

describe('formatContainerCode', () => {
  it('formats a per-type prefix with a 4-digit zero-padded sequence', () => {
    expect(formatContainerCode(ContainerType.Pallet, 1)).toBe('PAL-0001');
    expect(formatContainerCode(ContainerType.Box, 42)).toBe('CAJ-0042');
    expect(formatContainerCode(ContainerType.Lote, 7)).toBe('LOT-0007');
  });

  it('does not truncate sequences beyond 4 digits', () => {
    expect(formatContainerCode(ContainerType.Pallet, 12345)).toBe('PAL-12345');
  });

  it('rejects a non-positive or non-integer sequence', () => {
    expect(() => formatContainerCode(ContainerType.Pallet, 0)).toThrow(
      ContainerValidationError,
    );
    expect(() => formatContainerCode(ContainerType.Pallet, -1)).toThrow(
      ContainerValidationError,
    );
    expect(() => formatContainerCode(ContainerType.Pallet, 1.5)).toThrow(
      ContainerValidationError,
    );
  });
});
