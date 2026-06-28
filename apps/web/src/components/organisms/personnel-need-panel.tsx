'use client';

import { useState, useTransition } from 'react';
import type { components } from '@reliefhub/api-client';
import { SkillTag } from '@/components/atoms/skill-tag';
import { ErrorMessage } from '@/components/atoms/error-message';
import { VolunteerSuggestionCard } from '@/components/molecules/volunteer-suggestion-card';
import { createTaskFromNeed } from '@/app/e/[slug]/coordinacion/personnel-actions';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

type NeedViewDto = components['schemas']['NeedViewDto'];
type VolunteerSuggestionDto = components['schemas']['VolunteerSuggestionDto'];

interface PersonnelNeedPanelProps {
  need: NeedViewDto;
  suggestions: VolunteerSuggestionDto[];
  slug: string;
}

export function PersonnelNeedPanel({
  need,
  suggestions,
  slug,
}: PersonnelNeedPanelProps) {
  const tc = getMessages(useLocale()).coord;

  const SKILL_LABELS: Record<string, string> = {
    driving: tc.skill_driving,
    medical: tc.skill_medical,
    logistics: tc.skill_logistics,
    cooking: tc.skill_cooking,
    languages: tc.skill_languages,
    admin: tc.skill_admin,
    general: tc.skill_general,
  };

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successTaskId, setSuccessTaskId] = useState<string | null>(null);

  function toggleVolunteer(volunteerId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(volunteerId)) {
        next.delete(volunteerId);
      } else {
        next.add(volunteerId);
      }
      return next;
    });
  }

  function handleCreateTask() {
    setError(null);
    startTransition(async () => {
      const result = await createTaskFromNeed(
        need.id,
        slug,
        Array.from(selectedIds),
      );
      if (result.status === 'error') {
        setError(result.message);
      } else if (result.status === 'success') {
        setSuccessTaskId(result.taskId);
        setSelectedIds(new Set());
      }
    });
  }

  const skillLabel =
    need.requiredSkill != null
      ? (SKILL_LABELS[need.requiredSkill] ?? need.requiredSkill)
      : null;

  if (successTaskId !== null) {
    return (
      <div className="rounded-lg border-2 border-green-400 bg-green-50 p-4 flex flex-col gap-2">
        <p className="text-sm font-semibold text-green-800">
          {tc.personnel_success_title}
        </p>
        <p className="text-xs text-green-700">
          {selectedIds.size === 0
            ? tc.personnel_success_body_unassigned
            : tc.personnel_success_body_assigned}{' '}
          {tc.personnel_success_hint}
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label={tc.personnel_panel_label.replace('{title}', need.title)}
      className="flex flex-col gap-4 rounded-lg border-2 border-blue-300 bg-blue-50 p-4"
    >
      {/* Need summary */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
          {tc.personnel_need_heading}
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          {skillLabel !== null && <SkillTag skill={need.requiredSkill ?? ''} />}
          {need.requestedCount != null && (
            <span className="text-sm text-ink-soft">
              {(need.requestedCount === 1
                ? tc.personnel_people_count_one
                : tc.personnel_people_count_other
              ).replace('{count}', String(need.requestedCount))}
            </span>
          )}
        </div>
      </div>

      {/* Volunteer suggestions */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-ink">
          {tc.personnel_suggestions_heading}
        </p>

        {suggestions.length === 0 ? (
          <p className="text-sm text-muted">
            {tc.personnel_suggestions_empty}
          </p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label={tc.personnel_suggestions_list_label}>
            {suggestions.map((v) => (
              <li key={v.volunteerId}>
                <VolunteerSuggestionCard
                  volunteer={v}
                  selected={selectedIds.has(v.volunteerId)}
                  onToggle={toggleVolunteer}
                  tc={tc}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Error */}
      {error !== null && <ErrorMessage message={error} />}

      {/* Create task button */}
      <button
        type="button"
        onClick={handleCreateTask}
        disabled={isPending}
        className="w-full rounded-lg border-2 border-navy bg-navy px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending
          ? tc.personnel_creating
          : selectedIds.size > 0
            ? tc.personnel_create_and_assign.replace('{count}', String(selectedIds.size))
            : tc.personnel_create_unassigned}
      </button>
    </section>
  );
}
