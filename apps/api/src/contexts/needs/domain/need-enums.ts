export { Priority } from '../../../shared/domain/priority';

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

export enum NeedCategory {
  Hygiene = 'hygiene',
  Water = 'water',
  Food = 'food',
  Medical = 'medical',
  Shelter = 'shelter',
  Tools = 'tools',
  Other = 'other',
  // Health vertical (F04)
  Medicines = 'medicines',
  MedicalEquipment = 'medical_equipment',
  MedicalSupplies = 'medical_supplies',
  MedicalPersonnel = 'medical_personnel',
}

export enum NeedStatus {
  Pending = 'pending',
  Validated = 'validated',
  Rejected = 'rejected',
  Fulfilled = 'fulfilled',
}
