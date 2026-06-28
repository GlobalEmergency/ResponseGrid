export class ReportAlreadyReviewedError extends Error {
  constructor(reportId: string) {
    super(`Report "${reportId}" has already been reviewed`);
    this.name = 'ReportAlreadyReviewedError';
  }
}

export class ReportNotFoundError extends Error {
  constructor(reportId: string) {
    super(`Report "${reportId}" not found`);
    this.name = 'ReportNotFoundError';
  }
}
