/**
 * Value Object: PersonData
 *
 * Groups the fields describing the missing person.
 * documentId is normalized to trim + uppercase for cross-matching.
 */
import { Location, LocationProps } from '../../../shared/domain/location';

export interface PersonDataProps {
  firstName: string;
  lastName: string;
  documentId: string | null;
  approximateAge: number | null;
  lastKnownLocation: string;
  lastKnownCoords: LocationProps | null;
  description: string | null;
}

export class InvalidPersonDataError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'InvalidPersonDataError';
  }
}

export class PersonData {
  readonly firstName: string;
  readonly lastName: string;
  readonly documentId: string | null;
  readonly approximateAge: number | null;
  readonly lastKnownLocation: string;
  readonly lastKnownCoords: Location | null;
  readonly description: string | null;

  private constructor(props: {
    firstName: string;
    lastName: string;
    documentId: string | null;
    approximateAge: number | null;
    lastKnownLocation: string;
    lastKnownCoords: Location | null;
    description: string | null;
  }) {
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.documentId = props.documentId;
    this.approximateAge = props.approximateAge;
    this.lastKnownLocation = props.lastKnownLocation;
    this.lastKnownCoords = props.lastKnownCoords;
    this.description = props.description;
  }

  static create(props: PersonDataProps): PersonData {
    const firstName = props.firstName.trim();
    if (!firstName) {
      throw new InvalidPersonDataError('Person firstName must not be empty');
    }
    const lastName = props.lastName.trim();
    if (!lastName) {
      throw new InvalidPersonDataError('Person lastName must not be empty');
    }
    const lastKnownLocation = props.lastKnownLocation.trim();
    if (!lastKnownLocation) {
      throw new InvalidPersonDataError(
        'Person lastKnownLocation must not be empty',
      );
    }

    const documentId = props.documentId
      ? props.documentId.trim().toUpperCase()
      : null;

    const lastKnownCoords = props.lastKnownCoords
      ? Location.create(props.lastKnownCoords)
      : null;

    return new PersonData({
      firstName,
      lastName,
      documentId,
      approximateAge: props.approximateAge ?? null,
      lastKnownLocation,
      lastKnownCoords,
      description: props.description?.trim() || null,
    });
  }

  toPlain(): PersonDataProps {
    return {
      firstName: this.firstName,
      lastName: this.lastName,
      documentId: this.documentId,
      approximateAge: this.approximateAge,
      lastKnownLocation: this.lastKnownLocation,
      lastKnownCoords: this.lastKnownCoords
        ? this.lastKnownCoords.toPlain()
        : null,
      description: this.description,
    };
  }
}
