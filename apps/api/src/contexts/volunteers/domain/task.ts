/**
 * Task aggregate — volunteer assignment and check-in/out lifecycle.
 *
 * DESIGN DECISION: This aggregate does NOT mutate the Volunteer aggregate.
 * The roster status of a volunteer (Available / Assigned / Inactive) is managed
 * independently by coordinators via UpdateVolunteerStatus. Keeping the aggregates
 * decoupled avoids cross-aggregate transactions and aligns with the rule that each
 * aggregate is the consistency boundary for its own invariants only.
 */

import { TaskId } from './task-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Location } from '../../../shared/domain/location';
import { VolunteerSkill } from './volunteer-enums';
import {
  TaskAlreadyAssignedError,
  TaskNotAssignedError,
  TaskClosedError,
  TaskCheckInError,
  TaskCheckOutError,
} from './task-errors';

export enum TaskStatus {
  Open = 'open',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum AssignmentStatus {
  Assigned = 'assigned',
  CheckedIn = 'checked_in',
  CheckedOut = 'checked_out',
}

export interface TaskAssignmentSnapshot {
  volunteerId: string;
  assignedAt: Date;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  status: AssignmentStatus;
}

export interface TaskSnapshot {
  id: string;
  emergencyId: string;
  title: string;
  description: string;
  locationAddress: string | null;
  locationLatitude: number | null;
  locationLongitude: number | null;
  requiredSkill: VolunteerSkill | null;
  status: TaskStatus;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  assignments: TaskAssignmentSnapshot[];
  /** F05: link back to the need that originated this task (optional) */
  linkedNeedId?: string | null;
}

export interface CreateTaskProps {
  id: TaskId;
  emergencyId: EmergencyId;
  title: string;
  description: string;
  location: Location | null;
  requiredSkill: VolunteerSkill | null;
  createdByUserId: string;
  /** F05: link back to originating need */
  linkedNeedId?: string | null;
}

/** Child entity within the Task aggregate. */
export class TaskAssignment {
  private _status: AssignmentStatus;
  private _checkedInAt: Date | null;
  private _checkedOutAt: Date | null;

  private constructor(
    public readonly volunteerId: string,
    public readonly assignedAt: Date,
    checkedInAt: Date | null,
    checkedOutAt: Date | null,
    status: AssignmentStatus,
  ) {
    this._status = status;
    this._checkedInAt = checkedInAt;
    this._checkedOutAt = checkedOutAt;
  }

  get status(): AssignmentStatus {
    return this._status;
  }

  get checkedInAt(): Date | null {
    return this._checkedInAt;
  }

  get checkedOutAt(): Date | null {
    return this._checkedOutAt;
  }

  static create(volunteerId: string): TaskAssignment {
    return new TaskAssignment(
      volunteerId,
      new Date(),
      null,
      null,
      AssignmentStatus.Assigned,
    );
  }

  static fromSnapshot(s: TaskAssignmentSnapshot): TaskAssignment {
    return new TaskAssignment(
      s.volunteerId,
      s.assignedAt,
      s.checkedInAt,
      s.checkedOutAt,
      s.status,
    );
  }

  checkIn(): void {
    if (this._status !== AssignmentStatus.Assigned) {
      throw new TaskCheckInError(
        `Cannot check in: assignment is in status '${this._status}'`,
      );
    }
    this._status = AssignmentStatus.CheckedIn;
    this._checkedInAt = new Date();
  }

  checkOut(): void {
    if (this._status !== AssignmentStatus.CheckedIn) {
      throw new TaskCheckOutError(
        `Cannot check out: assignment is in status '${this._status}'`,
      );
    }
    this._status = AssignmentStatus.CheckedOut;
    this._checkedOutAt = new Date();
  }

  toSnapshot(): TaskAssignmentSnapshot {
    return {
      volunteerId: this.volunteerId,
      assignedAt: this.assignedAt,
      checkedInAt: this._checkedInAt,
      checkedOutAt: this._checkedOutAt,
      status: this._status,
    };
  }
}

export class Task {
  private _status: TaskStatus;
  private _updatedAt: Date;
  private _assignments: TaskAssignment[];

  private constructor(
    public readonly id: TaskId,
    public readonly emergencyId: EmergencyId,
    public readonly title: string,
    public readonly description: string,
    public readonly location: Location | null,
    public readonly requiredSkill: VolunteerSkill | null,
    status: TaskStatus,
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
    updatedAt: Date,
    assignments: TaskAssignment[],
    /** F05: link back to the need that originated this task */
    public readonly linkedNeedId: string | null,
  ) {
    this._status = status;
    this._updatedAt = updatedAt;
    this._assignments = assignments;
  }

  get status(): TaskStatus {
    return this._status;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get assignments(): TaskAssignment[] {
    return [...this._assignments];
  }

  static create(props: CreateTaskProps): Task {
    const now = new Date();
    return new Task(
      props.id,
      props.emergencyId,
      props.title,
      props.description,
      props.location,
      props.requiredSkill,
      TaskStatus.Open,
      props.createdByUserId,
      now,
      now,
      [],
      props.linkedNeedId ?? null,
    );
  }

  static fromSnapshot(s: TaskSnapshot): Task {
    const location =
      s.locationAddress !== null &&
      s.locationLatitude !== null &&
      s.locationLongitude !== null
        ? Location.create({
            address: s.locationAddress,
            latitude: s.locationLatitude,
            longitude: s.locationLongitude,
          })
        : null;
    return new Task(
      TaskId.fromString(s.id),
      EmergencyId.fromString(s.emergencyId),
      s.title,
      s.description,
      location,
      s.requiredSkill,
      s.status,
      s.createdByUserId,
      s.createdAt,
      s.updatedAt,
      s.assignments.map((a) => TaskAssignment.fromSnapshot(a)),
      s.linkedNeedId ?? null,
    );
  }

  private assertOpen(): void {
    if (
      this._status === TaskStatus.Completed ||
      this._status === TaskStatus.Cancelled
    ) {
      throw new TaskClosedError(this._status);
    }
  }

  assign(volunteerId: string): void {
    this.assertOpen();
    const exists = this._assignments.find((a) => a.volunteerId === volunteerId);
    if (exists) {
      throw new TaskAlreadyAssignedError(volunteerId);
    }
    this._assignments.push(TaskAssignment.create(volunteerId));
    this._updatedAt = new Date();
  }

  unassign(volunteerId: string): void {
    this.assertOpen();
    const idx = this._assignments.findIndex(
      (a) => a.volunteerId === volunteerId,
    );
    if (idx === -1) {
      throw new TaskNotAssignedError(volunteerId);
    }
    this._assignments.splice(idx, 1);
    this._updatedAt = new Date();
  }

  checkIn(volunteerId: string): void {
    this.assertOpen();
    const assignment = this._assignments.find(
      (a) => a.volunteerId === volunteerId,
    );
    if (!assignment) {
      throw new TaskNotAssignedError(volunteerId);
    }
    assignment.checkIn();
    // Once at least one volunteer checks in, the task moves to in_progress
    if (this._status === TaskStatus.Open) {
      this._status = TaskStatus.InProgress;
    }
    this._updatedAt = new Date();
  }

  checkOut(volunteerId: string): void {
    const assignment = this._assignments.find(
      (a) => a.volunteerId === volunteerId,
    );
    if (!assignment) {
      throw new TaskNotAssignedError(volunteerId);
    }
    assignment.checkOut();
    this._updatedAt = new Date();
  }

  complete(): void {
    if (this._status === TaskStatus.Cancelled) {
      throw new TaskClosedError(this._status);
    }
    this._status = TaskStatus.Completed;
    this._updatedAt = new Date();
  }

  cancel(): void {
    if (this._status === TaskStatus.Completed) {
      throw new TaskClosedError(this._status);
    }
    this._status = TaskStatus.Cancelled;
    this._updatedAt = new Date();
  }

  toSnapshot(): TaskSnapshot {
    return {
      id: this.id.value,
      emergencyId: this.emergencyId.value,
      title: this.title,
      description: this.description,
      locationAddress: this.location?.address ?? null,
      locationLatitude: this.location?.latitude ?? null,
      locationLongitude: this.location?.longitude ?? null,
      requiredSkill: this.requiredSkill,
      status: this._status,
      createdByUserId: this.createdByUserId,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
      assignments: this._assignments.map((a) => a.toSnapshot()),
      linkedNeedId: this.linkedNeedId,
    };
  }
}
