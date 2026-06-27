import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Terremoto básico', minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    example: 'Template para emergencias sísmicas de nivel moderado',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    example: ['mascotas', 'joyas', 'vehículos grandes'],
    type: [String],
    description: 'Items that volunteers should NOT bring',
  })
  @IsArray()
  @IsString({ each: true })
  dontBringList!: string[];

  @ApiProperty({
    example: 'No se aceptan mascotas en el centro de acopio.',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  defaultAnnouncement?: string;
}

export class CreateTemplateResponseDto {
  @ApiProperty({ example: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })
  id!: string;
}

export class TemplateViewDto {
  @ApiProperty({ example: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })
  id!: string;

  @ApiProperty({ example: 'Terremoto básico' })
  name!: string;

  @ApiProperty({ example: 'Template para emergencias sísmicas' })
  description!: string;

  @ApiProperty({ example: ['mascotas', 'joyas'], type: [String] })
  dontBringList!: string[];

  @ApiProperty({
    example: 'No se aceptan mascotas.',
    nullable: true,
  })
  defaultAnnouncement!: string | null;

  @ApiProperty({ example: '2026-06-27T10:00:00.000Z' })
  createdAt!: string;
}
