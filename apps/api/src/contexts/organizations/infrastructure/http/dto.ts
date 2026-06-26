import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationType, OrganizationRole } from '../../domain/organization-enums';

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
