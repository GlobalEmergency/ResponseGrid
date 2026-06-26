/**
 * Shared Kernel — Location value object.
 *
 * This file is a DELIBERATE shared kernel: Location (address + lat/lon with
 * range validation) is used identically in the needs and resources bounded
 * contexts. Centralising it here removes the duplication while keeping the
 * module pure domain (no framework, no I/O). Bounded contexts consume this
 * kernel but do NOT share aggregates or business rules through it.
 */

export interface LocationProps {
  address: string;
  latitude: number;
  longitude: number;
}

export class InvalidLocationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'InvalidLocationError';
  }
}

export class Location {
  readonly address: string;
  readonly latitude: number;
  readonly longitude: number;

  private constructor(props: LocationProps) {
    this.address = props.address;
    this.latitude = props.latitude;
    this.longitude = props.longitude;
  }

  static create(props: LocationProps): Location {
    if (props.latitude < -90 || props.latitude > 90) {
      throw new InvalidLocationError(
        `Latitude must be between -90 and 90, got ${props.latitude}`,
      );
    }
    if (props.longitude < -180 || props.longitude > 180) {
      throw new InvalidLocationError(
        `Longitude must be between -180 and 180, got ${props.longitude}`,
      );
    }
    if (!props.address || props.address.trim().length === 0) {
      throw new InvalidLocationError('Location address must not be empty');
    }
    return new Location({
      address: props.address.trim(),
      latitude: props.latitude,
      longitude: props.longitude,
    });
  }

  toPlain(): LocationProps {
    return {
      address: this.address,
      latitude: this.latitude,
      longitude: this.longitude,
    };
  }
}
