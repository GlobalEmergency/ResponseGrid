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

export class ReportNotPublishableError extends Error {
  constructor(reportId: string, reason: string) {
    super(`Report "${reportId}" cannot be published: ${reason}`);
    this.name = 'ReportNotPublishableError';
  }
}

export class ReportNotInReviewedStatusError extends Error {
  constructor(reportId: string, currentStatus: string) {
    super(
      `Report "${reportId}" must be in "reviewed" status to be published, but is "${currentStatus}"`,
    );
    this.name = 'ReportNotInReviewedStatusError';
  }
}

export class ReportStructuralDetailRequiredError extends Error {
  constructor(type: string) {
    super(
      `Structural detail fields are only valid for structural report types, got "${type}"`,
    );
    this.name = 'ReportStructuralDetailRequiredError';
  }
}
