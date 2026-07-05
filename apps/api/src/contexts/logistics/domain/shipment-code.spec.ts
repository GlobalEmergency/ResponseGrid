import { formatShipmentCode } from './shipment-code';
import { InvalidShipmentRouteError } from './shipment-errors';

describe('formatShipmentCode', () => {
  it('formats the EXP prefix with a 4-digit zero-padded sequence', () => {
    expect(formatShipmentCode(1)).toBe('EXP-0001');
    expect(formatShipmentCode(42)).toBe('EXP-0042');
  });

  it('does not truncate sequences beyond 4 digits', () => {
    expect(formatShipmentCode(12345)).toBe('EXP-12345');
  });

  it('rejects a non-positive or non-integer sequence', () => {
    expect(() => formatShipmentCode(0)).toThrow(InvalidShipmentRouteError);
    expect(() => formatShipmentCode(-1)).toThrow(InvalidShipmentRouteError);
    expect(() => formatShipmentCode(1.5)).toThrow(InvalidShipmentRouteError);
  });
});
