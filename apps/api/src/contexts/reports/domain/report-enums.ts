export { Priority as ReportPriority } from '../../../shared/domain/priority';

export enum ReportType {
  Incident = 'incident',
  Stock = 'stock',
  Status = 'status',
  Other = 'other',
  StructuralDamage = 'structural_damage',
  TrappedPersons = 'trapped_persons',
}

export enum ReportStatus {
  Open = 'open',
  Reviewed = 'reviewed',
  Published = 'published',
  Closed = 'closed',
}

export enum DamageLevel {
  Collapsed = 'collapsed',
  Severe = 'severe',
  Moderate = 'moderate',
}

export const STRUCTURAL_TYPES: ReadonlySet<ReportType> = new Set([
  ReportType.StructuralDamage,
  ReportType.TrappedPersons,
]);

export interface StructuralDetail {
  damageLevel: DamageLevel;
  trappedPersonsEstimate: number | null;
  accessibleForRescue: boolean | null;
  buildingType: string | null;
}
