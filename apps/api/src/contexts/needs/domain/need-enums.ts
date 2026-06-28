export { Priority } from '../../../shared/domain/priority';
// Re-export the shared Category taxonomy (owned by the supplies context) as the
// needs enum barrel, mirroring how Priority is re-exported from the shared kernel.
export { Category } from '../../supplies/domain/category';

/**
 * PersonnelSkill mirrors VolunteerSkill values WITHOUT importing from the
 * volunteers context, keeping hexagonal boundaries intact.
 * Values must stay in sync with volunteers/domain/volunteer-enums.ts.
 */
export enum PersonnelSkill {
  Driving = 'driving',
  Medical = 'medical',
  Logistics = 'logistics',
  Cooking = 'cooking',
  Languages = 'languages',
  Admin = 'admin',
  General = 'general',
}

export enum NeedStatus {
  Pending = 'pending',
  Validated = 'validated',
  Rejected = 'rejected',
  Fulfilled = 'fulfilled',
}
