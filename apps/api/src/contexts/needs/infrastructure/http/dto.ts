import {
  ArrayMinSize,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NeedCategory,
  Priority,
  PersonnelSkill,
} from '../../domain/need-enums';

export class NeedItemDto {
  @ApiProperty({
    example: 'Water bottles',
    description: 'Name of the item needed',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 100,
    description: 'Quantity needed (positive integer)',
  })
  @IsInt()
  @IsPositive()
  quantity!: number;

  @ApiPropertyOptional({
    example: 'liters',
    description: 'Unit of measurement (optional)',
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ enum: NeedCategory, example: NeedCategory.Water })
  @IsEnum(NeedCategory)
  category!: NeedCategory;
}

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
    type: [NeedItemDto],
    description: 'List of items needed (minimum 1)',
    minItems: 1,
  })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NeedItemDto)
  items!: NeedItemDto[];

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

export class AssignNeedManagerDto {
  @ApiProperty({
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID of the organization that will manage this need',
  })
  @IsUUID()
  organizationId!: string;
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
