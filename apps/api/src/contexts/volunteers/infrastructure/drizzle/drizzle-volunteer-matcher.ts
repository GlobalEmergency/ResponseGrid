/**
 * DrizzleVolunteerMatcher — implementation of the VolunteerMatcherPort
 * defined in the needs context.
 *
 * Lives in volunteers infrastructure; wired into the NeedsModule via DI.
 * Queries volunteers by emergencyId + status=available, then filters
 * in-memory on the skills array (same pattern as DrizzleVolunteerRepository).
 */

import { eq, and } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { volunteersTable } from './schema';
import {
  VolunteerMatcherPort,
  VolunteerMatchResult,
} from '../../../needs/domain/ports/volunteer-matcher.port';
import { VolunteerStatus } from '../../domain/volunteer-enums';

const DEFAULT_LIMIT = 20;

export class DrizzleVolunteerMatcher implements VolunteerMatcherPort {
  constructor(private readonly db: Db) {}

  async findAvailableBySkill(
    emergencyId: string,
    skill: string,
    limit?: number,
  ): Promise<VolunteerMatchResult[]> {
    const rows = await this.db
      .select()
      .from(volunteersTable)
      .where(
        and(
          eq(volunteersTable.emergencyId, emergencyId),
          eq(volunteersTable.status, VolunteerStatus.Available),
        ),
      );

    const effectiveLimit = limit ?? DEFAULT_LIMIT;

    return rows
      .filter((r) => r.skills.includes(skill))
      .slice(0, effectiveLimit)
      .map((r): VolunteerMatchResult => ({
        volunteerId: r.id,
        userId: r.userId,
        name: r.name,
        skills: r.skills,
        hasVehicle: r.vehicle !== 'none',
        availability: r.availability,
      }));
  }
}
