/**
 * F05: domain tests for personnel-need optional fields on the Need aggregate.
 */
import { Need } from './need';
import { NeedId } from './need-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { SupplyLine } from '../../supplies/domain/supply-line';
import { Category, Priority, PersonnelSkill } from './need-enums';
import { Location } from '../../../shared/domain/location';

const needId = NeedId.fromString('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const emergencyId = EmergencyId.fromString(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
);
const location = Location.create({
  address: '123 Main St',
  latitude: 10.48,
  longitude: -66.9,
});
const item = SupplyLine.create({
  name: 'Medical Personnel',
  quantity: 2,
  unit: null,
  category: Category.MedicalPersonnel,
});

function makeNeed(
  overrides: Partial<Parameters<typeof Need.create>[0]> = {},
): Need {
  return Need.create({
    id: needId,
    emergencyId,
    title: 'Need medical staff',
    description: null,
    location,
    priority: Priority.High,
    requesterUserId: 'user-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    requesterOrganizationId: null,
    items: [item],
    ...overrides,
  });
}

describe('Need — F05 personnel fields', () => {
  it('stores requiredSkill, skillSpecialty, requestedCount when provided', () => {
    const need = makeNeed({
      requiredSkill: PersonnelSkill.Medical,
      skillSpecialty: 'Urgencias pediátricas',
      requestedCount: 3,
    });
    expect(need.requiredSkill).toBe(PersonnelSkill.Medical);
    expect(need.skillSpecialty).toBe('Urgencias pediátricas');
    expect(need.requestedCount).toBe(3);
  });

  it('defaults all personnel fields to null when not provided', () => {
    const need = makeNeed();
    expect(need.requiredSkill).toBeNull();
    expect(need.skillSpecialty).toBeNull();
    expect(need.requestedCount).toBeNull();
  });

  it('throws when requestedCount is 0', () => {
    expect(() => makeNeed({ requestedCount: 0 })).toThrow(
      'requestedCount must be >= 1',
    );
  });

  it('throws when requestedCount is negative', () => {
    expect(() => makeNeed({ requestedCount: -1 })).toThrow(
      'requestedCount must be >= 1',
    );
  });

  it('accepts requestedCount of 1', () => {
    const need = makeNeed({ requestedCount: 1 });
    expect(need.requestedCount).toBe(1);
  });

  it('round-trips through snapshot correctly', () => {
    const need = makeNeed({
      requiredSkill: PersonnelSkill.Logistics,
      skillSpecialty: 'Specialist',
      requestedCount: 5,
    });
    const restored = Need.fromSnapshot(need.toSnapshot());
    expect(restored.requiredSkill).toBe(PersonnelSkill.Logistics);
    expect(restored.skillSpecialty).toBe('Specialist');
    expect(restored.requestedCount).toBe(5);
  });

  it('round-trips with null fields through snapshot', () => {
    const need = makeNeed();
    const restored = Need.fromSnapshot(need.toSnapshot());
    expect(restored.requiredSkill).toBeNull();
    expect(restored.skillSpecialty).toBeNull();
    expect(restored.requestedCount).toBeNull();
  });
});
