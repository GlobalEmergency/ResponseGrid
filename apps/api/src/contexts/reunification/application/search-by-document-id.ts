import { MissingPersonReportRepository } from '../domain/ports/missing-person-report.repository';
import { MissingPersonReportSnapshot } from '../domain/missing-person-report';

export interface SearchByDocumentIdQuery {
  emergencyId: string;
  documentId: string;
}

export class SearchByDocumentId {
  constructor(private readonly repo: MissingPersonReportRepository) {}

  async execute(
    query: SearchByDocumentIdQuery,
  ): Promise<MissingPersonReportSnapshot[]> {
    const normalized = query.documentId.trim().toUpperCase();
    const reports = await this.repo.findByDocumentId(
      query.emergencyId,
      normalized,
    );
    return reports.map((r) => r.toSnapshot());
  }
}
