import { ContainerId } from './container-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  ContainerHolderType,
  ContainerStatus,
  ContainerType,
} from './container-enums';
import {
  ContainerCycleError,
  ContainerSealedError,
  ContainerValidationError,
} from './container-errors';
import { SupplyLine, SupplyLineSnapshot } from './supply-line';

/**
 * Where the container is held right now. Polymorphic reference (no FK), like a
 * shipment's carrier: the `type` discriminates the target table. Null holder =
 * held by neither a resource nor a shipment.
 */
export interface ContainerHolder {
  type: ContainerHolderType;
  id: string;
}

export interface CreateContainerProps {
  id: ContainerId;
  code: string;
  type: ContainerType;
  emergencyId: EmergencyId;
  lines?: SupplyLine[];
  grossWeightKg?: number | null;
  grossVolumeM3?: number | null;
  holder?: ContainerHolder | null;
}

export interface ContainerSnapshot {
  id: string;
  code: string;
  type: ContainerType;
  emergencyId: string;
  parentContainerId: string | null;
  lines: SupplyLineSnapshot[];
  grossWeightKg: number | null;
  grossVolumeM3: number | null;
  holderType: ContainerHolderType | null;
  holderId: string | null;
  status: ContainerStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Aggregate root for a trackable packaging unit (palet/caja/lote) — the
 * "empaquetado rastreable" of #140. It groups {@link SupplyLine}s directly and
 * composes with other containers **by reference** (`parentContainerId`): a box
 * inside a pallet just points at the pallet; moving = repointing the parent;
 * children are queried by parent. The tree is kept acyclic and single-emergency
 * (the cross-aggregate checks live in the Nest use case, which can walk the
 * tree; the aggregate guards the local invariants — no self-parent, lines only
 * mutable while open).
 *
 * Weight/volume are *declared* per container (not yet derived from a catalogue);
 * the aggregated total (own + Σ children) is assembled by the GetContainer read
 * model, since children are separate aggregates.
 */
export class Container {
  private constructor(
    public readonly id: ContainerId,
    public readonly code: string,
    public readonly type: ContainerType,
    public readonly emergencyId: EmergencyId,
    private _parentContainerId: ContainerId | null,
    private _lines: SupplyLine[],
    public readonly grossWeightKg: number | null,
    public readonly grossVolumeM3: number | null,
    private _holder: ContainerHolder | null,
    private _status: ContainerStatus,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateContainerProps): Container {
    const code = props.code.trim();
    if (code.length === 0) {
      throw new ContainerValidationError('Container code must not be empty');
    }
    Container.assertOptionalAmount(props.grossWeightKg, 'grossWeightKg');
    Container.assertOptionalAmount(props.grossVolumeM3, 'grossVolumeM3');
    const holder = props.holder ?? null;
    if (holder !== null) Container.assertHolder(holder);
    const now = new Date();
    return new Container(
      props.id,
      code,
      props.type,
      props.emergencyId,
      null,
      [...(props.lines ?? [])],
      props.grossWeightKg ?? null,
      props.grossVolumeM3 ?? null,
      holder,
      ContainerStatus.Open,
      now,
      now,
    );
  }

  static fromSnapshot(s: ContainerSnapshot): Container {
    return new Container(
      ContainerId.fromString(s.id),
      s.code,
      s.type,
      EmergencyId.fromString(s.emergencyId),
      s.parentContainerId ? ContainerId.fromString(s.parentContainerId) : null,
      s.lines.map((l) => SupplyLine.fromSnapshot(l)),
      s.grossWeightKg,
      s.grossVolumeM3,
      s.holderType !== null && s.holderId !== null
        ? { type: s.holderType, id: s.holderId }
        : null,
      s.status,
      s.createdAt,
      s.updatedAt,
    );
  }

  private static assertOptionalAmount(
    value: number | null | undefined,
    field: string,
  ): void {
    if (value === undefined || value === null) return;
    if (!Number.isFinite(value) || value <= 0) {
      throw new ContainerValidationError(
        `${field} must be a positive number when provided`,
      );
    }
  }

  private static assertHolder(holder: ContainerHolder): void {
    if (!holder.id || holder.id.trim().length === 0) {
      throw new ContainerValidationError(
        'Container holder id must not be empty',
      );
    }
  }

  get parentContainerId(): ContainerId | null {
    return this._parentContainerId;
  }

  get lines(): readonly SupplyLine[] {
    return this._lines;
  }

  get holder(): ContainerHolder | null {
    return this._holder;
  }

  get status(): ContainerStatus {
    return this._status;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /** Adds a loose supply line. Forbidden once sealed (content is immutable). */
  addLine(line: SupplyLine): void {
    this.assertOpen('add a line to');
    this._lines.push(line);
    this.touch();
  }

  /** Removes the line at `index`. Forbidden once sealed. */
  removeLineAt(index: number): void {
    this.assertOpen('remove a line from');
    if (!Number.isInteger(index) || index < 0 || index >= this._lines.length) {
      throw new ContainerValidationError(`Line index ${index} is out of range`);
    }
    this._lines.splice(index, 1);
    this.touch();
  }

  /**
   * Repoints (or clears) the parent. This is nest/unnest; the cross-aggregate
   * cycle and same-emergency checks belong to the Nest use case (it can walk
   * the tree). Here we only guard the local invariant: no self-parent. Allowed
   * while sealed — sealing freezes the content, not the position.
   */
  setParent(parentContainerId: ContainerId | null): void {
    if (parentContainerId !== null && parentContainerId.equals(this.id)) {
      throw new ContainerCycleError('A container cannot be its own parent');
    }
    this._parentContainerId = parentContainerId;
    this.touch();
  }

  /**
   * Moves the container to a holder (resource ↔ shipment) or detaches it
   * (null). Allowed while sealed — a sealed box still travels. Composition is
   * untouched: children follow their parent by reference.
   */
  moveToHolder(holder: ContainerHolder | null): void {
    if (holder !== null) Container.assertHolder(holder);
    this._holder = holder;
    this.touch();
  }

  /** open → sealed. Idempotent re-sealing is a conflict, not a no-op. */
  seal(): void {
    if (this._status === ContainerStatus.Sealed) {
      throw new ContainerSealedError('Container is already sealed');
    }
    this._status = ContainerStatus.Sealed;
    this.touch();
  }

  private assertOpen(action: string): void {
    if (this._status === ContainerStatus.Sealed) {
      throw new ContainerSealedError(
        `Cannot ${action} a sealed container (lines are immutable)`,
      );
    }
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  toSnapshot(): ContainerSnapshot {
    return {
      id: this.id.value,
      code: this.code,
      type: this.type,
      emergencyId: this.emergencyId.value,
      parentContainerId: this._parentContainerId?.value ?? null,
      lines: this._lines.map((l) => l.toSnapshot()),
      grossWeightKg: this.grossWeightKg,
      grossVolumeM3: this.grossVolumeM3,
      holderType: this._holder?.type ?? null,
      holderId: this._holder?.id ?? null,
      status: this._status,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
