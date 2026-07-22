import { LoadTemplateId } from './load-template-id.js';
import { LoadTemplateStatus } from './inventory-enums.js';
import {
  DuplicateTemplateLineError,
  LoadTemplateValidationError,
} from './inventory-errors.js';
import { ScopeId } from '../kernel/index.js';

/** Una línea de la dotación tipo: cuánto de un insumo pide el kit. */
export interface LoadTemplateLineProps {
  supplyId: string;
  quantity: number;
  unit: string;
  /** Dotación fija del vehículo (generador, radio) vs carga de misión. */
  permanent?: boolean;
  notes?: string | null;
}

export interface LoadTemplateLineSnapshot {
  supplyId: string;
  quantity: number;
  unit: string;
  permanent: boolean;
  notes: string | null;
}

export interface CreateLoadTemplateProps {
  id: LoadTemplateId;
  scopeId: ScopeId;
  code: string;
  name: string;
  lines?: LoadTemplateLineProps[];
}

export interface LoadTemplateSnapshot {
  id: string;
  scopeId: string;
  code: string;
  name: string;
  status: LoadTemplateStatus;
  lines: LoadTemplateLineSnapshot[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dotación tipo de una misión o vehículo (kit PSA, incendio forestal, ambulancia
 * A1…): un agregado raíz cuyas líneas hijas describen qué insumos y cuánto debe
 * llevar. Se compara contra el manifiesto real con `gapAnalysis` para producir el
 * checklist operativo ("el camión PSA está al 92%"). Inmutable: los mutadores
 * devuelven una instancia nueva. Las líneas son únicas por `supplyId`.
 */
export class LoadTemplate {
  private constructor(
    public readonly id: LoadTemplateId,
    public readonly scopeId: ScopeId,
    public readonly code: string,
    public readonly name: string,
    public readonly status: LoadTemplateStatus,
    public readonly lines: readonly LoadTemplateLineSnapshot[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: CreateLoadTemplateProps): LoadTemplate {
    const code = props.code.trim();
    const name = props.name.trim();
    if (code === '' || name === '') {
      throw new LoadTemplateValidationError(
        'LoadTemplate requiere code y name no vacíos',
      );
    }
    const lines = normalizeLines(props.lines ?? []);
    const now = new Date();
    return new LoadTemplate(
      props.id,
      props.scopeId,
      code,
      name,
      LoadTemplateStatus.Active,
      lines,
      now,
      now,
    );
  }

  static fromSnapshot(s: LoadTemplateSnapshot): LoadTemplate {
    return new LoadTemplate(
      LoadTemplateId.fromString(s.id),
      ScopeId.fromString(s.scopeId),
      s.code,
      s.name,
      s.status,
      s.lines.map((l) => ({ ...l })),
      s.createdAt,
      s.updatedAt,
    );
  }

  toSnapshot(): LoadTemplateSnapshot {
    return {
      id: this.id.value,
      scopeId: this.scopeId.value,
      code: this.code,
      name: this.name,
      status: this.status,
      lines: this.lines.map((l) => ({ ...l })),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /** Archiva la plantilla (idempotente). Bumpa `updatedAt`. */
  archive(): LoadTemplate {
    if (this.status === LoadTemplateStatus.Archived) return this;
    return new LoadTemplate(
      this.id,
      this.scopeId,
      this.code,
      this.name,
      LoadTemplateStatus.Archived,
      this.lines,
      this.createdAt,
      new Date(),
    );
  }
}

/** Valida cantidad/unidad, aplica defaults (permanent=false, notes=null) y veta supplyId duplicado. */
function normalizeLines(
  raw: readonly LoadTemplateLineProps[],
): LoadTemplateLineSnapshot[] {
  const seen = new Set<string>();
  return raw.map((l) => {
    if (!Number.isFinite(l.quantity) || l.quantity <= 0) {
      throw new LoadTemplateValidationError(
        `La línea de ${l.supplyId} requiere quantity > 0`,
      );
    }
    const unit = l.unit.trim();
    if (unit === '') {
      throw new LoadTemplateValidationError(
        `La línea de ${l.supplyId} requiere unit`,
      );
    }
    if (seen.has(l.supplyId)) {
      throw new DuplicateTemplateLineError(
        `supplyId duplicado en la plantilla: ${l.supplyId}`,
      );
    }
    seen.add(l.supplyId);
    return {
      supplyId: l.supplyId,
      quantity: l.quantity,
      unit,
      permanent: l.permanent ?? false,
      notes: l.notes ?? null,
    };
  });
}
