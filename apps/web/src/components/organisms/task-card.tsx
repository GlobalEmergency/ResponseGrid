'use client';

import { useActionState, useState } from 'react';
import type { components } from '@reliefhub/api-client';
import {
  assignVolunteer,
  unassignVolunteer,
  completeTask,
  cancelTask,
} from '@/app/e/[slug]/coordinacion/voluntarios/actions';
import type { ActionResult } from '@/app/e/[slug]/coordinacion/voluntarios/actions';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

type TaskViewDto = components['schemas']['TaskViewDto'];
type TaskStatus = TaskViewDto['status'];
type AssignmentStatus = components['schemas']['TaskAssignmentViewDto']['status'];
type VolunteerViewDto = components['schemas']['VolunteerViewDto'];

const TASK_STATUS_BADGE_CLASSES: Record<TaskStatus, string> = {
  open: 'inline-flex items-center rounded-full border border-info-line bg-info-soft px-2.5 py-0.5 text-xs font-semibold text-info',
  in_progress: 'inline-flex items-center rounded-full border border-warning bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning',
  completed: 'inline-flex items-center rounded-full border border-success bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success',
  cancelled: 'inline-flex items-center rounded-full border border-line bg-surface-alt px-2.5 py-0.5 text-xs font-semibold text-muted',
};

const ASSIGNMENT_STATUS_BADGE_CLASSES: Record<AssignmentStatus, string> = {
  assigned: 'inline-flex items-center rounded-full border border-info-line bg-info-soft px-2 py-0.5 text-xs font-medium text-info',
  checked_in: 'inline-flex items-center rounded-full border border-success bg-success-soft px-2 py-0.5 text-xs font-medium text-success',
  checked_out: 'inline-flex items-center rounded-full border border-line bg-surface-alt px-2 py-0.5 text-xs font-medium text-muted',
};

const INITIAL_STATE: ActionResult = { status: 'idle' };

interface TaskCardProps {
  task: TaskViewDto;
  /** Available volunteers for the assign select (those with status=available). */
  availableVolunteers: VolunteerViewDto[];
  slug: string;
}

export function TaskCard({ task, availableVolunteers, slug }: TaskCardProps) {
  const [selectedVolunteerId, setSelectedVolunteerId] = useState('');
  const tc = getMessages(useLocale()).coord;

  const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
    open: tc.task_status_open,
    in_progress: tc.task_status_in_progress,
    completed: tc.task_status_completed,
    cancelled: tc.task_status_cancelled,
  };

  const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
    assigned: tc.assignment_status_assigned,
    checked_in: tc.assignment_status_checked_in,
    checked_out: tc.assignment_status_checked_out,
  };

  const SKILL_LABELS: Record<NonNullable<TaskViewDto['requiredSkill']>, string> = {
    driving: tc.skill_driving,
    medical: tc.skill_medical,
    logistics: tc.skill_logistics,
    cooking: tc.skill_cooking,
    languages: tc.skill_languages,
    admin: tc.skill_admin,
    general: tc.skill_general,
  };

  const [assignState, assignFormAction, assignPending] = useActionState<ActionResult, FormData>(
    async (_prev, _formData) => {
      if (selectedVolunteerId === '') {
        return { status: 'error', message: tc.task_select_volunteer_error };
      }
      return assignVolunteer(task.id, selectedVolunteerId, slug);
    },
    INITIAL_STATE,
  );

  const [completeState, completeFormAction, completePending] = useActionState<ActionResult, FormData>(
    async (_prev, _formData) => completeTask(task.id, slug),
    INITIAL_STATE,
  );

  const [cancelState, cancelFormAction, cancelPending] = useActionState<ActionResult, FormData>(
    async (_prev, _formData) => cancelTask(task.id, slug),
    INITIAL_STATE,
  );

  const errorMessage =
    (assignState.status === 'error' ? assignState.message : undefined) ??
    (completeState.status === 'error' ? completeState.message : undefined) ??
    (cancelState.status === 'error' ? cancelState.message : undefined);

  const isTerminal = task.status === 'completed' || task.status === 'cancelled';

  // Volunteers already assigned to this task (by id)
  const assignedIds = new Set(task.assignments.map((a) => a.volunteerId));
  // Volunteers not yet assigned
  const unassignedAvailable = availableVolunteers.filter((v) => !assignedIds.has(v.id));

  return (
    <article
      aria-label={tc.task_card_label.replace('{title}', task.title)}
      className="flex flex-col gap-4 rounded-lg border-2 border-navy bg-white p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <h3 className="text-base font-bold text-ink leading-tight break-words">{task.title}</h3>
          <p className="text-sm text-muted leading-snug">{task.description}</p>
        </div>
        <span className={TASK_STATUS_BADGE_CLASSES[task.status]}>
          {TASK_STATUS_LABELS[task.status]}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-3 text-xs text-muted">
        {task.requiredSkill != null && (
          <span>
            <span className="font-medium">{tc.task_required_skill_label}:</span>{' '}
            <Badge variant="role-member">{SKILL_LABELS[task.requiredSkill]}</Badge>
          </span>
        )}
        {task.location != null && (
          <span className="truncate max-w-[220px]">
            <span className="font-medium">{tc.task_location_label}:</span>{' '}
            {task.location.address}
          </span>
        )}
      </div>

      {/* Assignments */}
      {task.assignments.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
            {tc.task_assigned_volunteers}
          </p>
          <ul className="flex flex-col gap-1.5" aria-label={tc.task_assignments_list_label}>
            {task.assignments.map((assignment) => (
              <li
                key={assignment.volunteerId}
                className="flex items-center justify-between gap-2 flex-wrap rounded-md border border-line bg-surface px-3 py-1.5"
              >
                <span className="text-sm font-medium text-ink">
                  {typeof assignment.volunteerName === 'string' && assignment.volunteerName !== ''
                    ? assignment.volunteerName
                    : assignment.volunteerId}
                </span>
                <div className="flex items-center gap-2">
                  <span className={ASSIGNMENT_STATUS_BADGE_CLASSES[assignment.status]}>
                    {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                  </span>
                  {!isTerminal && (
                    <UnassignButton
                      taskId={task.id}
                      volunteerId={assignment.volunteerId}
                      slug={slug}
                      tc={tc}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error */}
      {errorMessage !== undefined && <ErrorMessage message={errorMessage} />}

      {/* Actions — only for non-terminal tasks */}
      {!isTerminal && (
        <div className="flex flex-col gap-3">
          {/* Assign volunteer */}
          {unassignedAvailable.length > 0 && (
            <form action={assignFormAction} className="flex flex-col gap-2">
              <select
                id={`assign-volunteer-${task.id}`}
                name="volunteerId"
                value={selectedVolunteerId}
                onChange={(e) => setSelectedVolunteerId(e.target.value)}
                className="w-full rounded-lg border-2 border-line bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none"
                aria-label={tc.task_assign_select_label}
              >
                <option value="" disabled>
                  {tc.task_assign_placeholder}
                </option>
                {unassignedAvailable.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.municipality})
                  </option>
                ))}
              </select>
              <Button
                type="submit"
                disabled={assignPending || selectedVolunteerId === ''}
                fullWidth
                size="md"
              >
                {assignPending ? tc.task_assigning : tc.task_assign}
              </Button>
            </form>
          )}

          {/* Complete / Cancel */}
          <div className="flex gap-2 flex-wrap">
            <form action={completeFormAction} className="flex-1">
              <Button
                type="submit"
                disabled={completePending || cancelPending}
                fullWidth
                size="md"
              >
                {completePending ? tc.task_completing : tc.task_complete}
              </Button>
            </form>
            <form action={cancelFormAction} className="flex-1">
              <Button
                type="submit"
                disabled={cancelPending || completePending}
                fullWidth
                size="md"
                variant="danger-outline"
              >
                {cancelPending ? tc.cancelling : tc.task_cancel}
              </Button>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}

// ---------- sub-component ----------

interface UnassignButtonProps {
  taskId: string;
  volunteerId: string;
  slug: string;
  tc: ReturnType<typeof getMessages>['coord'];
}

const UNASSIGN_INITIAL: ActionResult = { status: 'idle' };

function UnassignButton({ taskId, volunteerId, slug, tc }: UnassignButtonProps) {
  const [, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, _formData) => unassignVolunteer(taskId, volunteerId, slug),
    UNASSIGN_INITIAL,
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-danger bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger transition-colors hover:bg-danger-soft/90 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={tc.task_unassign_label}
      >
        {pending ? '…' : tc.task_unassign}
      </button>
    </form>
  );
}
