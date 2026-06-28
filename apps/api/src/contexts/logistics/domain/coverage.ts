import { InvalidCoverageError } from './transport-capacity-errors';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * A corridor: a directed A→B route the provider can serve. Endpoints are
 * pragmatic and all optional — either a known collection point (resource id) or
 * raw coordinates, on each end. A corridor with no endpoint at all is
 * meaningless, so at least one hint is required.
 */
export interface CorridorCoverageProps {
  kind: 'corridor';
  originResourceId: string | null;
  destinationResourceId: string | null;
  originLat: number | null;
  originLng: number | null;
  destinationLat: number | null;
  destinationLng: number | null;
}

/** An area the provider can serve (free-text, e.g. "Estado Vargas"). */
export interface AreaCoverageProps {
  kind: 'area';
  area: string;
}

export type CoverageProps = CorridorCoverageProps | AreaCoverageProps;

function assertOptionalUuid(value: string | null, field: string): void {
  if (value !== null && !UUID_RE.test(value)) {
    throw new InvalidCoverageError(`Coverage ${field} must be a UUID: ${value}`);
  }
}

function assertOptionalLat(value: number | null, field: string): void {
  if (value !== null && (value < -90 || value > 90)) {
    throw new InvalidCoverageError(
      `Coverage ${field} must be between -90 and 90, got ${value}`,
    );
  }
}

function assertOptionalLng(value: number | null, field: string): void {
  if (value !== null && (value < -180 || value > 180)) {
    throw new InvalidCoverageError(
      `Coverage ${field} must be between -180 and 180, got ${value}`,
    );
  }
}

/**
 * Discriminated value object describing where a transport capacity can operate:
 * either a directed corridor (A→B) or a named area. Kept deliberately pragmatic
 * — endpoints are optional hints (resource id and/or coordinates), not a strict
 * routing graph.
 */
export class Coverage {
  private constructor(private readonly props: CoverageProps) {}

  static corridor(
    props: Omit<CorridorCoverageProps, 'kind'>,
  ): Coverage {
    const originResourceId = props.originResourceId ?? null;
    const destinationResourceId = props.destinationResourceId ?? null;
    const originLat = props.originLat ?? null;
    const originLng = props.originLng ?? null;
    const destinationLat = props.destinationLat ?? null;
    const destinationLng = props.destinationLng ?? null;

    const hasOrigin =
      originResourceId !== null || (originLat !== null && originLng !== null);
    const hasDestination =
      destinationResourceId !== null ||
      (destinationLat !== null && destinationLng !== null);
    if (!hasOrigin && !hasDestination) {
      throw new InvalidCoverageError(
        'Corridor coverage requires at least an origin or a destination hint',
      );
    }

    assertOptionalUuid(originResourceId, 'originResourceId');
    assertOptionalUuid(destinationResourceId, 'destinationResourceId');
    assertOptionalLat(originLat, 'originLat');
    assertOptionalLng(originLng, 'originLng');
    assertOptionalLat(destinationLat, 'destinationLat');
    assertOptionalLng(destinationLng, 'destinationLng');

    return new Coverage({
      kind: 'corridor',
      originResourceId,
      destinationResourceId,
      originLat,
      originLng,
      destinationLat,
      destinationLng,
    });
  }

  static area(area: string): Coverage {
    if (!area || area.trim().length === 0) {
      throw new InvalidCoverageError('Area coverage must not be empty');
    }
    return new Coverage({ kind: 'area', area: area.trim() });
  }

  static fromPlain(props: CoverageProps): Coverage {
    if (props.kind === 'area') {
      return Coverage.area(props.area);
    }
    return Coverage.corridor({
      originResourceId: props.originResourceId,
      destinationResourceId: props.destinationResourceId,
      originLat: props.originLat,
      originLng: props.originLng,
      destinationLat: props.destinationLat,
      destinationLng: props.destinationLng,
    });
  }

  get kind(): 'corridor' | 'area' {
    return this.props.kind;
  }

  toPlain(): CoverageProps {
    return this.props.kind === 'area'
      ? { kind: 'area', area: this.props.area }
      : { ...this.props };
  }
}
