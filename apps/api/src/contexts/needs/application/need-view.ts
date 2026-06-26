import { Need } from '../domain/need';
import { LocationProps } from '../../../shared/domain/location';
import { NeedItemSnapshot } from '../domain/need-item';

export interface NeedView {
  id: string;
  emergencyId: string;
  title: string;
  description: string | null;
  location: LocationProps;
  priority: string;
  requesterOrganizationId: string | null;
  managingOrganizationId: string | null;
  items: NeedItemSnapshot[];
  status: string;
  createdAt: string;
}

export function toNeedView(n: Need): NeedView {
  return {
    id: n.id.value,
    emergencyId: n.emergencyId.value,
    title: n.title,
    description: n.description,
    location: n.location.toPlain(),
    priority: n.priority,
    requesterOrganizationId: n.requesterOrganizationId,
    managingOrganizationId: n.managingOrganizationId,
    items: n.items.map((i) => i.toSnapshot()),
    status: n.status,
    createdAt: n.createdAt.toISOString(),
  };
}
