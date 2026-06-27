/**
 * VolunteerMatcherPort — outbound port in the needs context for querying
 * available volunteers by skill within an emergency.
 *
 * The implementation lives in the volunteers infrastructure layer, keeping
 * the needs domain ignorant of the volunteers bounded context internals.
 */

export const VOLUNTEER_MATCHER_PORT = Symbol('VolunteerMatcherPort');

export interface VolunteerMatchResult {
  volunteerId: string;
  userId: string;
  name: string;
  /** All skills the volunteer has (as plain strings to avoid enum coupling). */
  skills: string[];
  hasVehicle: boolean;
  availability: string;
}

export interface VolunteerMatcherPort {
  findAvailableBySkill(
    emergencyId: string,
    skill: string,
    limit?: number,
  ): Promise<VolunteerMatchResult[]>;
}
