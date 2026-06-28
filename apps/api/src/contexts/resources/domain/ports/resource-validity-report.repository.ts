import { ResourceValidityReport } from '../resource-validity-report';

export const RESOURCE_VALIDITY_REPORT_REPOSITORY = Symbol(
  'ResourceValidityReportRepository',
);

export interface ResourceValidityReportRepository {
  /** Insert a new report or update an existing one (by id). */
  save(report: ResourceValidityReport): Promise<void>;
  /**
   * The reporter's still-open report for this resource, if any. Used to upsert
   * (one open report per user) instead of adding a duplicate vote.
   */
  findOpenByResourceAndReporter(
    resourceId: string,
    reporterUserId: string,
  ): Promise<ResourceValidityReport | null>;
  /** All open reports for a resource (to resolve them when a coordinator acts). */
  findOpenByResource(resourceId: string): Promise<ResourceValidityReport[]>;
  /** Every report for a resource (open + resolved), for the coordinator detail. */
  findByResource(resourceId: string): Promise<ResourceValidityReport[]>;
  /**
   * Number of open reports for a resource. With one open report per user
   * (unique partial index), this equals the count of distinct reporters.
   */
  countOpenByResource(resourceId: string): Promise<number>;
}
