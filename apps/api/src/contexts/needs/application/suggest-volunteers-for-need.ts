import { NeedRepository } from '../domain/ports/need.repository';
import { NeedNotFoundError } from './need-not-found.error';
import { NeedId } from '../domain/need-id';
import {
  VOLUNTEER_MATCHER_PORT,
  VolunteerMatcherPort,
  VolunteerMatchResult,
} from '../domain/ports/volunteer-matcher.port';
import { PersonnelSkill } from '../domain/need-enums';

export const SUGGEST_VOLUNTEERS_FOR_NEED = Symbol('SuggestVolunteersForNeed');

export interface SuggestVolunteersQuery {
  needId: string;
  limit?: number | undefined;
}

export type VolunteerSuggestion = VolunteerMatchResult;

/** Default skill used when the need has no requiredSkill — broad medical search. */
const DEFAULT_PERSONNEL_SKILL = PersonnelSkill.Medical;

export class SuggestVolunteersForNeed {
  constructor(
    private readonly needRepo: NeedRepository,
    private readonly matcher: VolunteerMatcherPort,
  ) {}

  async execute(query: SuggestVolunteersQuery): Promise<VolunteerSuggestion[]> {
    const need = await this.needRepo.findById(NeedId.fromString(query.needId));
    if (!need) throw new NeedNotFoundError(query.needId);

    const skill: string = need.requiredSkill ?? DEFAULT_PERSONNEL_SKILL;

    return this.matcher.findAvailableBySkill(
      need.emergencyId.value,
      skill,
      query.limit,
    );
  }
}

export { VOLUNTEER_MATCHER_PORT };
