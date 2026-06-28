export { Priority as ReportPriority } from '../../../shared/domain/priority';

export enum ReportType {
  Incident = 'incident',
  Stock = 'stock',
  Status = 'status',
  Other = 'other',
}

export enum ReportStatus {
  Open = 'open',
  Reviewed = 'reviewed',
  Closed = 'closed',
}
