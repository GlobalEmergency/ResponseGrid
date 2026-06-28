export { Priority } from '../../../shared/domain/priority';
// NeedCategory is the Category taxonomy owned by the supplies context — kept
// under its local name so the needs context keeps reading `NeedCategory`, but
// there is a single definition (supplies/domain/category) reused everywhere.
export { Category as NeedCategory } from '../../supplies/domain/category';

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
