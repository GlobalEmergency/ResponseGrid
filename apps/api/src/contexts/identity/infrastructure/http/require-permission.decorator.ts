import { SetMetadata } from '@nestjs/common';
import { Permission } from '../../domain/authorization/permission';

export const REQUIRED_PERMISSION = 'required_permission';

/**
 * Declares the permission required to invoke a route handler. Enforced by
 * {@link PermissionGuard}, which resolves the request's scope chain and asks
 * the AccessControl PDP whether the principal's grants confer it.
 *
 * Replaces the bespoke Require*CoordinatorGuard family with a single
 * permission check (docs/features/13 §9).
 *
 * @example
 *   @RequirePermission('resource:verify')
 *   @Patch('emergencies/:emergencyId/resources/:resourceId/verify')
 */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(REQUIRED_PERMISSION, permission);
