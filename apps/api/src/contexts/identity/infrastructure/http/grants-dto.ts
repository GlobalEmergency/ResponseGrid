import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const SCOPE_TYPES = [
  'platform',
  'organization',
  'emergency',
  'group',
  'entity',
] as const;

export type ScopeTypeDto = (typeof SCOPE_TYPES)[number];

export const PRINCIPAL_TYPES = ['user', 'service_account'] as const;

export type PrincipalTypeDto = (typeof PRINCIPAL_TYPES)[number];

export class GrantRoleDto {
  @ApiProperty({ format: 'uuid', description: 'Principal receiving the role' })
  @IsUUID()
  principalId!: string;

  @ApiPropertyOptional({
    enum: PRINCIPAL_TYPES,
    description:
      'Kind of principal receiving the role (defaults to user). Set to service_account when granting to a machine principal so it resolves and labels correctly.',
  })
  @IsOptional()
  @IsIn(PRINCIPAL_TYPES)
  principalType?: PrincipalTypeDto;

  @ApiProperty({
    description: 'Role id from the fixed catalog (e.g. emergency_coordinator)',
  })
  @IsString()
  @IsNotEmpty()
  roleId!: string;

  @ApiProperty({ enum: SCOPE_TYPES, description: 'Scope the role applies to' })
  @IsIn(SCOPE_TYPES)
  scopeType!: ScopeTypeDto;

  @ApiPropertyOptional({
    description: 'Scope id (required for every scope except platform)',
  })
  @IsOptional()
  @IsString()
  scopeId?: string;

  @ApiPropertyOptional({
    description: 'Entity type (required for entity scope)',
  })
  @IsOptional()
  @IsString()
  scopeEntityType?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 expiry — for temporary / break-glass grants',
  })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}
