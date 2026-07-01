import type { components } from '@reliefhub/api-client';

export type VolunteerSkill = components['schemas']['VolunteerViewDto']['skills'][number];

export const VALID_SKILLS: VolunteerSkill[] = [
  'driving',
  'medical',
  'logistics',
  'cooking',
  'languages',
  'admin',
  'general',
];
