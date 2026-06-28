import { Emergency } from '../domain/emergency';

export interface EmergencyView {
  id: string;
  name: string;
  slug: string;
  country: string;
  status: string;
  announcement: string | null;
  dontBringList: string[];
  recommendedList: string[];
  updatedAt: string;
}

export function toEmergencyView(e: Emergency): EmergencyView {
  return {
    id: e.id.value,
    name: e.name,
    slug: e.slug.value,
    country: e.country,
    status: e.status,
    announcement: e.announcement,
    dontBringList: e.dontBringList,
    recommendedList: e.recommendedList,
    updatedAt: e.updatedAt.toISOString(),
  };
}
