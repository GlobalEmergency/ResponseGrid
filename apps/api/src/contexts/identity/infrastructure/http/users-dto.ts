import { ApiProperty } from '@nestjs/swagger';

/** Minimal directory projection used to resolve an email to a principal id. */
export class UserLookupDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;
}

/** Row of the admin global users list. PII — admin-only (`user:read`). */
export class UserAdminListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isAdmin!: boolean;

  @ApiProperty({ description: 'ISO 8601 registration date' })
  createdAt!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'ISO 8601 last login, or null if never logged in',
  })
  lastLoginAt!: string | null;

  @ApiProperty({
    type: [String],
    description: 'Distinct roles the user holds across every scope',
  })
  roles!: string[];

  @ApiProperty({ description: 'Number of active grants held' })
  grantCount!: number;
}

/** A grant held by a user, with a resolved scope display name. */
export class UserGrantDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  roleId!: string;

  @ApiProperty()
  scopeType!: string;

  @ApiProperty({ type: String, nullable: true })
  scopeId!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Display name of the scope (org/emergency/group), when resolvable',
  })
  scopeName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  grantedByPrincipalId!: string | null;

  @ApiProperty()
  grantedAt!: string;

  @ApiProperty({ type: String, nullable: true })
  expiresAt!: string | null;
}

/** An organization the user belongs to, with their role there. */
export class UserOrganizationDto {
  @ApiProperty({ format: 'uuid' })
  organizationId!: string;

  @ApiProperty()
  organizationName!: string;

  @ApiProperty()
  role!: string;
}

/** A recent action by the user, from the audit trail. */
export class UserActivityDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty({ type: String, nullable: true })
  entityType!: string | null;

  @ApiProperty({ type: String, nullable: true })
  entityId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  emergencyId!: string | null;

  @ApiProperty()
  method!: string;

  @ApiProperty()
  path!: string;

  @ApiProperty()
  statusCode!: number;

  @ApiProperty({ description: 'ISO 8601 timestamp' })
  createdAt!: string;
}

/** Full admin detail of a single user. PII — admin-only (`user:read`). */
export class UserAdminDetailDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isAdmin!: boolean;

  @ApiProperty({ description: 'ISO 8601 registration date' })
  createdAt!: string;

  @ApiProperty({ type: String, nullable: true })
  lastLoginAt!: string | null;

  @ApiProperty({ type: [UserGrantDto] })
  grants!: UserGrantDto[];

  @ApiProperty({ type: [UserOrganizationDto] })
  organizations!: UserOrganizationDto[];

  @ApiProperty({ type: [UserActivityDto] })
  activity!: UserActivityDto[];
}
