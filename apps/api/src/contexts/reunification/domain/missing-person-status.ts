export enum MissingPersonStatus {
  Open = 'open',
  UnderReview = 'under_review',
  Matched = 'matched',
  Closed = 'closed',
}

const VALID_TRANSITIONS: Record<MissingPersonStatus, MissingPersonStatus[]> = {
  [MissingPersonStatus.Open]: [
    MissingPersonStatus.UnderReview,
    MissingPersonStatus.Closed,
  ],
  [MissingPersonStatus.UnderReview]: [
    MissingPersonStatus.Matched,
    MissingPersonStatus.Closed,
  ],
  [MissingPersonStatus.Matched]: [MissingPersonStatus.Closed],
  [MissingPersonStatus.Closed]: [],
};

export class InvalidStatusTransitionError extends Error {
  constructor(from: MissingPersonStatus, to: MissingPersonStatus) {
    super(`Invalid status transition: ${from} → ${to}`);
    this.name = 'InvalidStatusTransitionError';
  }
}

export function assertValidTransition(
  from: MissingPersonStatus,
  to: MissingPersonStatus,
): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new InvalidStatusTransitionError(from, to);
  }
}
