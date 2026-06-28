import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OrganizationType,
  OrganizationRole,
} from '../../domain/organization-enums';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Red Cross Spain' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: OrganizationType, example: OrganizationType.Ngo })
  @IsEnum(OrganizationType)
  type!: OrganizationType;

  @ApiPropertyOptional({ example: 'ES-12345678' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'contact@org.example' })
  @IsOptional()
  @IsString()
  contactEmail?: string;
}

export class CreateOrganizationResponseDto {
  @ApiProperty({ description: 'New organization UUID' })
  id!: string;
}

export class OrganizationViewDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: OrganizationType })
  type!: string;

  @ApiProperty()
  verificationLevel!: string;
}

export class AddMemberDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail()
  email!: string;
}

export class OrganizationMemberDto {
  @ApiProperty({ description: 'User UUID' })
  userId!: string;

  @ApiProperty({ example: 'member@example.com' })
  email!: string;

  @ApiProperty({ example: 'Jane Doe' })
  name!: string;

  @ApiProperty({ enum: OrganizationRole, example: OrganizationRole.Member })
  role!: OrganizationRole;
}

const ACCREDITATION_STATUSES = ['global', 'emergency', 'none'] as const;

export class OrganizationAdminListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: OrganizationType })
  type!: string;

  @ApiProperty({ nullable: true, example: 'ES-12345678' })
  taxId!: string | null;

  @ApiProperty({ nullable: true, example: 'contact@org.example' })
  contactEmail!: string | null;

  @ApiProperty({ example: 'unverified' })
  verificationLevel!: string;

  @ApiProperty({ example: 3 })
  memberCount!: number;

  @ApiProperty({ enum: ACCREDITATION_STATUSES, example: 'none' })
  accreditationStatus!: 'global' | 'emergency' | 'none';
}

class OrganizationServiceAccountDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ description: 'ISO 8601 timestamp' })
  createdAt!: string;

  @ApiProperty({ example: 2 })
  keyCount!: number;

  @ApiProperty({ example: 1 })
  activeKeyCount!: number;
}

class OrganizationAccreditationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    description: '"global" or an object with the emergency UUID',
    example: 'global',
  })
  scope!: 'global' | { emergencyId: string };

  @ApiProperty({ format: 'uuid' })
  grantedByUserId!: string;

  @ApiProperty({ description: 'ISO 8601 timestamp' })
  grantedAt!: string;

  @ApiProperty({ nullable: true })
  evidence!: string | null;
}

export class OrganizationAdminDetailDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: OrganizationType })
  type!: string;

  @ApiProperty({ nullable: true })
  taxId!: string | null;

  @ApiProperty({ nullable: true })
  contactEmail!: string | null;

  @ApiProperty({ example: 'unverified' })
  verificationLevel!: string;

  @ApiProperty({ description: 'ISO 8601 timestamp' })
  createdAt!: string;

  @ApiProperty({ enum: ACCREDITATION_STATUSES, example: 'none' })
  accreditationStatus!: 'global' | 'emergency' | 'none';

  @ApiProperty({ type: [OrganizationMemberDto] })
  members!: OrganizationMemberDto[];

  @ApiProperty({ type: [OrganizationServiceAccountDto] })
  serviceAccounts!: OrganizationServiceAccountDto[];

  @ApiProperty({ type: [OrganizationAccreditationDto] })
  accreditations!: OrganizationAccreditationDto[];

  @ApiProperty({
    type: [String],
    description: 'UUIDs of emergencies the organization participates in',
  })
  emergencyIds!: string[];
}
