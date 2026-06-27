import { and, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { Db } from '../../../../shared/db';
import { tasksTable, taskAssignmentsTable } from './task-schema';
import {
  TaskRepository,
  TaskFilters,
} from '../../domain/ports/task.repository';
import {
  Task,
  TaskSnapshot,
  TaskAssignmentSnapshot,
  TaskStatus,
  AssignmentStatus,
} from '../../domain/task';
import { TaskId } from '../../domain/task-id';
import { VolunteerSkill } from '../../domain/volunteer-enums';

type TaskRow = typeof tasksTable.$inferSelect;
type AssignmentRow = typeof taskAssignmentsTable.$inferSelect;

function rowToAssignmentSnapshot(row: AssignmentRow): TaskAssignmentSnapshot {
  return {
    volunteerId: row.volunteerId,
    assignedAt: row.assignedAt,
    checkedInAt: row.checkedInAt ?? null,
    checkedOutAt: row.checkedOutAt ?? null,
    status: row.status as AssignmentStatus,
  };
}

function rowsToSnapshot(
  taskRow: TaskRow,
  assignmentRows: AssignmentRow[],
): TaskSnapshot {
  return {
    id: taskRow.id,
    emergencyId: taskRow.emergencyId,
    title: taskRow.title,
    description: taskRow.description,
    locationAddress: taskRow.locationAddress ?? null,
    locationLatitude: taskRow.locationLatitude ?? null,
    locationLongitude: taskRow.locationLongitude ?? null,
    requiredSkill: (taskRow.requiredSkill as VolunteerSkill) ?? null,
    status: taskRow.status as TaskStatus,
    createdByUserId: taskRow.createdByUserId,
    createdAt: taskRow.createdAt,
    updatedAt: taskRow.updatedAt,
    assignments: assignmentRows.map(rowToAssignmentSnapshot),
  };
}

async function loadAssignmentsByTaskIds(
  db: Db,
  taskIds: string[],
): Promise<Map<string, AssignmentRow[]>> {
  if (taskIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(taskAssignmentsTable)
    .where(inArray(taskAssignmentsTable.taskId, taskIds));

  const map = new Map<string, AssignmentRow[]>();
  for (const row of rows) {
    const existing = map.get(row.taskId) ?? [];
    existing.push(row);
    map.set(row.taskId, existing);
  }
  return map;
}

export class DrizzleTaskRepository implements TaskRepository {
  constructor(private readonly db: Db) {}

  async save(task: Task): Promise<void> {
    const s = task.toSnapshot();

    await this.db.transaction(async (tx) => {
      await tx
        .insert(tasksTable)
        .values({
          id: s.id,
          emergencyId: s.emergencyId,
          title: s.title,
          description: s.description,
          locationAddress: s.locationAddress,
          locationLatitude: s.locationLatitude,
          locationLongitude: s.locationLongitude,
          requiredSkill: s.requiredSkill,
          status: s.status,
          createdByUserId: s.createdByUserId,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })
        .onConflictDoUpdate({
          target: tasksTable.id,
          set: {
            title: s.title,
            description: s.description,
            locationAddress: s.locationAddress,
            locationLatitude: s.locationLatitude,
            locationLongitude: s.locationLongitude,
            requiredSkill: s.requiredSkill,
            status: s.status,
            updatedAt: s.updatedAt,
          },
        });

      // Replace all assignments for this task (delete + re-insert for simplicity)
      await tx
        .delete(taskAssignmentsTable)
        .where(eq(taskAssignmentsTable.taskId, s.id));

      if (s.assignments.length > 0) {
        await tx.insert(taskAssignmentsTable).values(
          s.assignments.map((a) => ({
            id: randomUUID(),
            taskId: s.id,
            volunteerId: a.volunteerId,
            assignedAt: a.assignedAt,
            checkedInAt: a.checkedInAt ?? null,
            checkedOutAt: a.checkedOutAt ?? null,
            status: a.status,
          })),
        );
      }
    });
  }

  async findById(id: TaskId): Promise<Task | null> {
    const taskRows = await this.db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, id.value))
      .limit(1);

    if (!taskRows[0]) return null;

    const assignmentMap = await loadAssignmentsByTaskIds(this.db, [id.value]);
    return Task.fromSnapshot(
      rowsToSnapshot(taskRows[0], assignmentMap.get(id.value) ?? []),
    );
  }

  async findByEmergency(
    emergencyId: string,
    filters?: TaskFilters,
  ): Promise<Task[]> {
    const conditions = [eq(tasksTable.emergencyId, emergencyId)];
    if (filters?.status !== undefined) {
      conditions.push(eq(tasksTable.status, filters.status));
    }

    const taskRows = await this.db
      .select()
      .from(tasksTable)
      .where(and(...conditions));

    if (taskRows.length === 0) return [];

    const taskIds = taskRows.map((r) => r.id);
    const assignmentMap = await loadAssignmentsByTaskIds(this.db, taskIds);

    return taskRows.map((tr) =>
      Task.fromSnapshot(rowsToSnapshot(tr, assignmentMap.get(tr.id) ?? [])),
    );
  }

  async findByVolunteer(
    volunteerId: string,
    emergencyId: string,
  ): Promise<Task[]> {
    // Find taskIds where the volunteer has an assignment
    const assignmentRows = await this.db
      .select({ taskId: taskAssignmentsTable.taskId })
      .from(taskAssignmentsTable)
      .where(eq(taskAssignmentsTable.volunteerId, volunteerId));

    const taskIds = assignmentRows.map((a) => a.taskId);
    if (taskIds.length === 0) return [];

    const taskRows = await this.db
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.emergencyId, emergencyId),
          inArray(tasksTable.id, taskIds),
        ),
      );

    if (taskRows.length === 0) return [];

    const matchingTaskIds = taskRows.map((r) => r.id);
    const assignmentMap = await loadAssignmentsByTaskIds(
      this.db,
      matchingTaskIds,
    );

    return taskRows.map((tr) =>
      Task.fromSnapshot(rowsToSnapshot(tr, assignmentMap.get(tr.id) ?? [])),
    );
  }
}
