import { WarehouseId } from './warehouse-id.js';
import { ZoneId } from './zone-id.js';
import { WarehouseStatus, ZoneKind, ZoneStatus } from './inventory-enums.js';
import {
  DuplicateZoneCodeError,
  WarehouseArchivedError,
  WarehouseValidationError,
} from './inventory-errors.js';
import { ScopeId } from '../kernel/index.js';

/** Optional geographic point of the warehouse building (WGS84). */
export interface WarehouseGeo {
  lat: number | null;
  lng: number | null;
}

export interface AddZoneProps {
  id: ZoneId;
  code: string;
  name: string;
  kind: ZoneKind;
}

export interface CreateWarehouseProps {
  id: WarehouseId;
  scopeId: ScopeId;
  code: string;
  name: string;
  address?: string | null;
  geo?: WarehouseGeo | null;
  zones?: AddZoneProps[];
}

export interface ZoneSnapshot {
  id: string;
  code: string;
  name: string;
  kind: ZoneKind;
  status: ZoneStatus;
}

export interface WarehouseSnapshot {
  id: string;
  scopeId: string;
  code: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  status: WarehouseStatus;
  zones: ZoneSnapshot[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A logical area inside a warehouse (recepción, almacenaje, expedición…). An
 * *entity* of the {@link Warehouse} aggregate: it has its own stable id and
 * lifecycle but is only reached through its warehouse, which guards the
 * cross-zone invariant (unique code). Bins and, later, stock reference a zone
 * by {@link ZoneId}.
 */
export class Zone {
  private constructor(
    public readonly id: ZoneId,
    private _code: string,
    private _name: string,
    private _kind: ZoneKind,
    private _status: ZoneStatus,
  ) {}

  static create(props: AddZoneProps): Zone {
    const code = normalizeCode(props.code, 'Zone code');
    const name = normalizeName(props.name, 'Zone name');
    return new Zone(props.id, code, name, props.kind, ZoneStatus.Active);
  }

  static fromSnapshot(s: ZoneSnapshot): Zone {
    return new Zone(ZoneId.fromString(s.id), s.code, s.name, s.kind, s.status);
  }

  get code(): string {
    return this._code;
  }
  get name(): string {
    return this._name;
  }
  get kind(): ZoneKind {
    return this._kind;
  }
  get status(): ZoneStatus {
    return this._status;
  }
  get isArchived(): boolean {
    return this._status === ZoneStatus.Archived;
  }

  rename(name: string): void {
    this.assertActive();
    this._name = normalizeName(name, 'Zone name');
  }

  archive(): void {
    this._status = ZoneStatus.Archived;
  }

  toSnapshot(): ZoneSnapshot {
    return {
      id: this.id.value,
      code: this._code,
      name: this._name,
      kind: this._kind,
      status: this._status,
    };
  }

  private assertActive(): void {
    if (this.isArchived) {
      throw new WarehouseArchivedError(
        `Zone ${this.id.value} is archived and cannot be modified`,
      );
    }
  }
}

/**
 * Aggregate root for a warehouse (almacén) — the physical building an
 * organización operates, partitioned by an opaque {@link ScopeId} (a Prote/
 * organización in the standalone WMS, a centro/emergencia in ResponseGrid).
 *
 * It owns its {@link Zone} entities: zones are few, always loaded with their
 * warehouse, and the root guards their only cross-entity invariant — a zone
 * code is unique within its warehouse. Bins (numerous, high-write, holding
 * stock) are a *separate* aggregate that references this one by id, keeping
 * this root small.
 *
 * The material a warehouse holds is NOT modelled here: stock lives in the
 * StockItem/StockMovement aggregates (added next), which reference a bin →
 * zone → warehouse by id. This root is the location backbone.
 */
export class Warehouse {
  private constructor(
    public readonly id: WarehouseId,
    public readonly scopeId: ScopeId,
    private _code: string,
    private _name: string,
    private _address: string | null,
    private _geo: WarehouseGeo,
    private _status: WarehouseStatus,
    private _zones: Zone[],
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateWarehouseProps): Warehouse {
    const code = normalizeCode(props.code, 'Warehouse code');
    const name = normalizeName(props.name, 'Warehouse name');
    const address = normalizeAddress(props.address ?? null);
    const geo = normalizeGeo(props.geo ?? null);

    const zones = (props.zones ?? []).map((z) => Zone.create(z));
    assertUniqueZoneCodes(zones);

    const now = new Date();
    return new Warehouse(
      props.id,
      props.scopeId,
      code,
      name,
      address,
      geo,
      WarehouseStatus.Active,
      zones,
      now,
      now,
    );
  }

  static fromSnapshot(s: WarehouseSnapshot): Warehouse {
    return new Warehouse(
      WarehouseId.fromString(s.id),
      ScopeId.fromString(s.scopeId),
      s.code,
      s.name,
      s.address,
      { lat: s.lat, lng: s.lng },
      s.status,
      s.zones.map((z) => Zone.fromSnapshot(z)),
      s.createdAt,
      s.updatedAt,
    );
  }

  get code(): string {
    return this._code;
  }
  get name(): string {
    return this._name;
  }
  get address(): string | null {
    return this._address;
  }
  get geo(): WarehouseGeo {
    return { ...this._geo };
  }
  get status(): WarehouseStatus {
    return this._status;
  }
  get isArchived(): boolean {
    return this._status === WarehouseStatus.Archived;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  /** The warehouse's zones (defensive copy — mutate through the root). */
  get zones(): Zone[] {
    return [...this._zones];
  }

  rename(name: string): void {
    this.assertActive();
    this._name = normalizeName(name, 'Warehouse name');
    this.touch();
  }

  relocate(address: string | null, geo: WarehouseGeo | null): void {
    this.assertActive();
    this._address = normalizeAddress(address);
    this._geo = normalizeGeo(geo);
    this.touch();
  }

  addZone(props: AddZoneProps): Zone {
    this.assertActive();
    const zone = Zone.create(props);
    if (this.activeZoneCodeExists(zone.code)) {
      throw new DuplicateZoneCodeError(
        `Zone code "${zone.code}" already exists in warehouse ${this.id.value}`,
      );
    }
    this._zones.push(zone);
    this.touch();
    return zone;
  }

  renameZone(zoneId: ZoneId, name: string): void {
    this.assertActive();
    this.requireZone(zoneId).rename(name);
    this.touch();
  }

  archiveZone(zoneId: ZoneId): void {
    this.assertActive();
    this.requireZone(zoneId).archive();
    this.touch();
  }

  /** Retires the whole warehouse. Idempotent; archived layout is read-only. */
  archive(): void {
    if (this.isArchived) return;
    this._status = WarehouseStatus.Archived;
    this.touch();
  }

  toSnapshot(): WarehouseSnapshot {
    return {
      id: this.id.value,
      scopeId: this.scopeId.value,
      code: this._code,
      name: this._name,
      address: this._address,
      lat: this._geo.lat,
      lng: this._geo.lng,
      status: this._status,
      zones: this._zones.map((z) => z.toSnapshot()),
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }

  private requireZone(zoneId: ZoneId): Zone {
    const zone = this._zones.find((z) => z.id.equals(zoneId));
    if (!zone) {
      throw new WarehouseValidationError(
        `Zone ${zoneId.value} not found in warehouse ${this.id.value}`,
      );
    }
    return zone;
  }

  private activeZoneCodeExists(code: string): boolean {
    return this._zones.some((z) => !z.isArchived && z.code === code);
  }

  private assertActive(): void {
    if (this.isArchived) {
      throw new WarehouseArchivedError(
        `Warehouse ${this.id.value} is archived and cannot be modified`,
      );
    }
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}

function normalizeCode(value: string, label: string): string {
  const code = typeof value === 'string' ? value.trim() : '';
  if (code.length === 0) {
    throw new WarehouseValidationError(`${label} must not be empty`);
  }
  if (code.length > 32) {
    throw new WarehouseValidationError(
      `${label} must be at most 32 characters`,
    );
  }
  return code;
}

function normalizeName(value: string, label: string): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name.length === 0) {
    throw new WarehouseValidationError(`${label} must not be empty`);
  }
  return name;
}

function normalizeAddress(value: string | null): string | null {
  if (value === null) return null;
  const address = value.trim();
  return address.length === 0 ? null : address;
}

function normalizeGeo(geo: WarehouseGeo | null): WarehouseGeo {
  if (geo === null) return { lat: null, lng: null };
  const { lat, lng } = geo;
  if ((lat === null) !== (lng === null)) {
    throw new WarehouseValidationError(
      'Warehouse coordinates require both lat and lng, or neither',
    );
  }
  if (lat !== null && (lat < -90 || lat > 90)) {
    throw new WarehouseValidationError(
      'Warehouse lat must be within [-90, 90]',
    );
  }
  if (lng !== null && (lng < -180 || lng > 180)) {
    throw new WarehouseValidationError(
      'Warehouse lng must be within [-180, 180]',
    );
  }
  return { lat, lng };
}

function assertUniqueZoneCodes(zones: Zone[]): void {
  const seen = new Set<string>();
  for (const zone of zones) {
    if (seen.has(zone.code)) {
      throw new DuplicateZoneCodeError(
        `Duplicate zone code "${zone.code}" in warehouse creation`,
      );
    }
    seen.add(zone.code);
  }
}
