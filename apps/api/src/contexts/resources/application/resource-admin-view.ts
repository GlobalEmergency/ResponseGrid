import { Resource } from '../domain/resource';
import {
  ResourceView,
  ResourceDetailView,
  toResourceView,
  toResourceDetailView,
} from './resource-view';

/**
 * Admin list/detail view: the existing {@link ResourceView} plus the owning
 * emergency (id + resolved name). The public/coordination views deliberately
 * omit the emergency because they are always scoped to one; the platform-admin
 * console is cross-emergency, so it needs to show and filter by it. Reuses the
 * shared resource view rather than inventing a parallel shape (DRY).
 */
export interface ResourceAdminView extends ResourceView {
  emergencyId: string;
  /** Resolved emergency name, or null when it could not be looked up. */
  emergencyName: string | null;
}

/**
 * Admin detail: the admin list view plus the aggregated declared inventory
 * (distinct categories) carried by {@link ResourceDetailView}. The full
 * SupplyLine detail stays behind coordination tooling; the admin ficha mirrors
 * the public/coordination detail shape, only without the visibility gate.
 */
export interface ResourceAdminDetailView
  extends ResourceAdminView, Pick<ResourceDetailView, 'inventoryCategories'> {}

export function toResourceAdminView(
  r: Resource,
  emergencyName: string | null,
): ResourceAdminView {
  return {
    ...toResourceView(r),
    emergencyId: r.emergencyId.value,
    emergencyName,
  };
}

export function toResourceAdminDetailView(
  r: Resource,
  emergencyName: string | null,
): ResourceAdminDetailView {
  return {
    ...toResourceDetailView(r),
    emergencyId: r.emergencyId.value,
    emergencyName,
  };
}
