import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmergencyDto {
  @ApiProperty({ example: 'Emergencia sísmica — Venezuela', minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    example: 'venezuela',
    required: false,
    description:
      'URL-safe slug (lowercase letters, digits, hyphens). Auto-generated from name if omitted.',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must contain only lowercase letters, digits, and hyphens (e.g. my-emergency)',
  })
  slug?: string;

  @ApiProperty({
    example: 'VE',
    minLength: 2,
    description: 'ISO 3166-1 alpha-2 country code',
  })
  @IsString()
  @MinLength(2)
  country!: string;
}

export class CreateEmergencyResponseDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111' })
  id!: string;

  @ApiProperty({ example: 'venezuela' })
  slug!: string;
}

export class EmergencyViewDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111' })
  id!: string;

  @ApiProperty({ example: 'Emergencia sísmica — Venezuela' })
  name!: string;

  @ApiProperty({ example: 'venezuela' })
  slug!: string;

  @ApiProperty({ example: 'VE' })
  country!: string;

  @ApiProperty({ example: 'active', enum: ['active', 'paused', 'closed'] })
  status!: string;

  @ApiProperty({
    example: 'El puente de acceso norte está cortado.',
    nullable: true,
    type: String,
  })
  announcement!: string | null;

  @ApiProperty({
    example: ['mascotas', 'joyas', 'vehículos grandes'],
    type: [String],
    description: 'Items volunteers should NOT bring to the emergency',
  })
  dontBringList!: string[];

  @ApiProperty({ example: '2026-06-25T10:00:00.000Z' })
  updatedAt!: string;
}

export class MyEmergencyViewDto extends EmergencyViewDto {
  @ApiProperty({
    example: ['emergency_verifier', 'emergency_coordinator'],
    type: [String],
    description: 'Role ids the principal holds at this emergency scope',
  })
  roleIds!: string[];
}

export class PublishAnnouncementDto {
  @ApiProperty({
    example: 'Se suspenden las operaciones de rescate hasta nuevo aviso.',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}

export class CreateEmergencyFromTemplateDto {
  @ApiProperty({ example: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })
  @IsUUID()
  templateId!: string;

  @ApiProperty({ example: 'Terremoto Valencia 2026', minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    example: 'terremoto-valencia-2026',
    description: 'URL-safe slug (lowercase letters, digits, hyphens)',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must contain only lowercase letters, digits, and hyphens (e.g. my-emergency)',
  })
  slug!: string;

  @ApiProperty({ example: 'ES', minLength: 2 })
  @IsString()
  @MinLength(2)
  country!: string;
}
