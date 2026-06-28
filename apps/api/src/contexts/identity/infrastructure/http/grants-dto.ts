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

export class GrantRoleDto {
  @ApiProperty({ format: 'uuid', description: 'Principal receiving the role' })
  @IsUUID()
  principalId!: string;

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
