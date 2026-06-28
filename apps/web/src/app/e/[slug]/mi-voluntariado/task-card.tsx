'use client';

import { useActionState } from 'react';
import type { components } from '@reliefhub/api-client';
import { checkInTask, checkOutTask } from './actions';
import type { CheckActionResult } from './actions';
import { Button } from '@/components/atoms/button';
import { Badge } from '@/components/atoms/badge';
import { ErrorMessage } from '@/components/atoms/error-message';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

type MyTask = components['schemas']['MyTaskViewDto'];

const INITIAL_STATE: CheckActionResult = { status: 'idle' };

interface TaskCardProps {
  task: MyTask;
  volunteerId: string;
  slug: string;
}

export function TaskCard({ task, volunteerId, slug }: TaskCardProps) {
  const ta = getMessages(useLocale()).account;

  const SKILL_LABELS: Record<string, string> = {
    driving: ta.skill_driving,
    medical: ta.skill_medical,
    logistics: ta.skill_logistics,
    cooking: ta.skill_cooking,
    languages: ta.skill_languages,
    admin: ta.skill_admin,
    general: ta.skill_general,
  };

  const TASK_STATUS_LABELS: Record<string, string> = {
    open: ta.task_status_open,
    in_progress: ta.task_status_in_progress,
    completed: ta.task_status_completed,
    cancelled: ta.task_status_cancelled,
  };

  const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
    assigned: ta.assignment_status_assigned,
    checked_in: ta.assignment_status_checked_in,
    checked_out: ta.assignment_status_checked_out,
  };

  const [checkInState, checkInAction, checkInPending] = useActionState<CheckActionResult, FormData>(
    async (_prev, _formData) => checkInTask(task.id, volunteerId, slug),
    INITIAL_STATE,
  );

  const [checkOutState, checkOutAction, checkOutPending] = useActionState<CheckActionResult, FormData>(
    async (_prev, _formData) => checkOutTask(task.id, volunteerId, slug),
    INITIAL_STATE,
  );

  const myStatus = task.myAssignmentStatus;
  const isPending = checkInPending || checkOutPending;

  const errorMessage =
    checkInState.status === 'error'
      ? checkInState.message
      : checkOutState.status === 'error'
        ? checkOutState.message
        : null;

  return (
    <article
      aria-label={ta.task_card_aria.replace('{name}', task.title)}
      className="flex flex-col gap-4 rounded-lg border-2 border-navy bg-white p-5"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-ink leading-tight flex-1">
            {task.title}
          </h3>
          <AssignmentBadge
            status={myStatus}
            label={ASSIGNMENT_STATUS_LABELS[myStatus] ?? myStatus}
            ariaLabel={ta.assignment_status_aria}
          />
        </div>
        {task.description !== '' && (
          <p className="text-sm text-muted">{task.description}</p>
        )}
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          {ta.task_status_label}{' '}
          <span className="font-semibold text-ink-soft">
            {TASK_STATUS_LABELS[task.status] ?? task.status}
          </span>
        </span>
        {task.requiredSkill != null && (
          <span>
            {ta.required_skill_label}{' '}
            <span className="font-semibold text-ink-soft">
              {SKILL_LABELS[task.requiredSkill] ?? task.requiredSkill}
            </span>
          </span>
        )}
        {task.location != null && (
          <span>
            {ta.location_label}{' '}
            <span className="font-semibold text-ink-soft">{task.location.address}</span>
          </span>
        )}
      </div>

      {/* Errors */}
      {errorMessage !== null && (
        <ErrorMessage message={errorMessage} />
      )}

      {/* Success feedback */}
      {(checkInState.status === 'success' || checkOutState.status === 'success') && (
        <p role="alert" aria-live="polite" className="text-xs text-success font-medium">
          {ta.updated_success}
        </p>
      )}

      {/* Check-in / Check-out buttons */}
      {myStatus === 'assigned' && (
        <form action={checkInAction}>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isPending}
            fullWidth
          >
            {checkInPending ? ta.processing : ta.check_in_cta}
          </Button>
        </form>
      )}

      {myStatus === 'checked_in' && (
        <form action={checkOutAction}>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={isPending}
            fullWidth
          >
            {checkOutPending ? ta.processing : ta.check_out_cta}
          </Button>
        </form>
      )}

      {myStatus === 'checked_out' && (
        <p className="text-sm font-semibold text-success rounded-lg border border-success bg-success-soft px-4 py-2">
          {ta.task_completed_thanks}
        </p>
      )}
    </article>
  );
}

function AssignmentBadge({
  status,
  label,
  ariaLabel,
}: {
  status: string;
  label: string;
  ariaLabel: string;
}) {
  const aria = ariaLabel.replace('{status}', label);

  if (status === 'assigned') {
    return (
      <Badge variant="unverified" aria-label={aria}>
        {label}
      </Badge>
    );
  }

  if (status === 'checked_in') {
    return (
      <span
        aria-label={aria}
        className="inline-flex items-center rounded-full border border-success bg-success-soft px-3 py-1 text-sm font-semibold text-success flex-shrink-0"
      >
        {label}
      </span>
    );
  }

  if (status === 'checked_out') {
    return (
      <span
        aria-label={aria}
        className="inline-flex items-center rounded-full border border-line bg-surface-alt px-3 py-1 text-sm font-semibold text-muted flex-shrink-0"
      >
        {label}
      </span>
    );
  }

  return null;
}
