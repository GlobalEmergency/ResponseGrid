export class ConsentRequiredError extends Error {
  constructor() {
    super('Consent must be given to create a missing person report');
    this.name = 'ConsentRequiredError';
  }
}

export class SightingsClosedError extends Error {
  constructor(status: string) {
    super(`Cannot add sightings to a report with status '${status}'`);
    this.name = 'SightingsClosedError';
  }
}

export class MissingPersonReportNotFoundError extends Error {
  constructor(id: string) {
    super(`MissingPersonReport '${id}' not found`);
    this.name = 'MissingPersonReportNotFoundError';
  }
}
