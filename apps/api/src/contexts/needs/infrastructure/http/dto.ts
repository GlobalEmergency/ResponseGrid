import {
  ArrayMinSize,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
  ValidateNested,
  IsInt,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, PersonnelSkill } from '../../domain/need-enums';
import { SupplyLineDto } from '../../../supplies/infrastructure/http/supply-line.dto';

export class NeedLocationDto {
  @ApiProperty({ example: '123 Main Street, Caracas, Venezuela' })
  @IsString()
  @MinLength(2)
  address!: string;

  @ApiProperty({ example: 10.4806, description: 'Latitude (-90 to 90)' })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -66.9036, description: 'Longitude (-180 to 180)' })
  @IsLongitude()
  longitude!: number;
}

export class CreateNeedDto {
  @ApiProperty({ example: 'Alimentos para 50 familias', minLength: 2 })
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional({ example: 'Descripción detallada de la necesidad' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: NeedLocationDto })
  @ValidateNested()
  @Type(() => NeedLocationDto)
  location!: NeedLocationDto;

  @ApiProperty({ enum: Priority, example: Priority.High })
  @IsEnum(Priority)
  priority!: Priority;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Organization on whose behalf the request is made (optional)',
  })
  @IsOptional()
  @IsUUID()
  requesterOrganizationId?: string;

  @ApiProperty({
    type: [SupplyLineDto],
    description: 'List of items needed (minimum 1)',
    minItems: 1,
  })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SupplyLineDto)
  items!: SupplyLineDto[];

  /**
   * F05: Optional personnel-need fields.
   * Relevant when any item has category = medical_personnel.
   */
  @ApiPropertyOptional({
    enum: PersonnelSkill,
    example: PersonnelSkill.Medical,
    description: 'Required volunteer skill for personnel needs',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsEnum(PersonnelSkill)
  requiredSkill?: PersonnelSkill;

  @ApiPropertyOptional({
    example: 'Médico urgencias pediátricas',
    description:
      'Free-text specialty detail (coordinator-only, not exposed publicly)',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  skillSpecialty?: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'How many personnel are needed (>= 1)',
    nullable: true,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  requestedCount?: number;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description:
      'Link this need to a resource / final recipient (#60). Optional.',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsUUID()
  resourceId?: string;
}

export class NearbyNeedsQueryDto {
  @ApiProperty({ example: 10.4806, description: 'Latitude between -90 and 90' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({
    example: -66.9036,
    description: 'Longitude between -180 and 180',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiProperty({
    example: 5000,
    description: 'Search radius in meters (max 100000)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100000)
  radius!: number;

  @ApiPropertyOptional({
    example: 50,
    description: 'Max results (default 50, max 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class InBoundsNeedsQueryDto {
  @ApiProperty({
    example: 10.3,
    description: 'South latitude bound (-90 to 90)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  minLat!: number;

  @ApiProperty({
    example: -67.2,
    description: 'West longitude bound (-180 to 180)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  minLng!: number;

  @ApiProperty({
    example: 10.7,
    description: 'North latitude bound (-90 to 90)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  maxLat!: number;

  @ApiProperty({
    example: -66.6,
    description: 'East longitude bound (-180 to 180)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  maxLng!: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Max results (default 500, max 1000)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}

export class AssignNeedManagerDto {
  @ApiProperty({
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID of the organization that will manage this need',
  })
  @IsUUID()
  organizationId!: string;
}

export class DiscardNeedDto {
  @ApiProperty({
    description: 'Motivo del descarte (obligatorio, para trazabilidad)',
    minLength: 3,
    maxLength: 1000,
    example: 'Petición duplicada; ya validada en otra entrada',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class EditNeedDto {
  @ApiProperty({
    description: 'Motivo de la edición (obligatorio, para trazabilidad)',
    minLength: 3,
    maxLength: 1000,
    example: 'Se corrige la prioridad y se completa la descripción',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Nuevo título (omitir para no cambiarlo)',
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @ApiPropertyOptional({
    description:
      'Nueva descripción. Cadena vacía la borra. Omitir para no cambiarla.',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: Priority, description: 'Nueva prioridad' })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}

export class CreateTaskFromNeedDto {
  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'IDs of volunteers to assign to the task (optional)',
  })
  @IsOptional()
  @IsUUID(undefined, { each: true })
  volunteerIds?: string[];

  @ApiPropertyOptional({
    example: '2025-12-31',
    description: 'ISO date string for task due date (optional, informational)',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  dueDate?: string;
}
