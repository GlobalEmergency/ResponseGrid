export { Priority } from '../../../shared/domain/priority';

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
