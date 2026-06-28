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

/** Raised when an edit would leave the report with an empty note. */
export class ReportNoteRequiredError extends Error {
  constructor() {
    super('A report must keep a non-empty note');
    this.name = 'ReportNoteRequiredError';
  }
}

/** Raised when editing a report that is in a terminal status (closed). */
export class ReportNotEditableError extends Error {
  constructor() {
    super('A closed report can no longer be edited');
    this.name = 'ReportNotEditableError';
  }
}

/** Raised when discarding a report that is already closed. */
export class ReportAlreadyClosedError extends Error {
  constructor() {
    super('Report has already been closed');
    this.name = 'ReportAlreadyClosedError';
  }
}
