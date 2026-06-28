import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AuditQueryDto {
  @ApiPropertyOptional({ description: 'Filter by emergency ID' })
  @IsOptional()
  @IsUUID()
  emergencyId?: string;

  @ApiPropertyOptional({ description: 'Filter by actor user ID' })
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity type (e.g. resource, need)',
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Max results to return (default 100, max 500)',
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Transform(({ value }: { value: unknown }) =>
    Math.min(Number(value) || 100, 500),
  )
  limit?: number;

  @ApiPropertyOptional({
    description: 'Offset for pagination (default 0)',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class AuditChangeDto {
  @ApiProperty({ description: 'Name of the field that changed' })
  field!: string;

  @ApiPropertyOptional({
    description: 'Value before the change (any JSON type)',
    nullable: true,
  })
  before?: unknown;

  @ApiPropertyOptional({
    description: 'Value after the change (any JSON type)',
    nullable: true,
  })
  after?: unknown;
}

export class AuditEntryDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  actorUserId!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'Actor display name captured at write time',
  })
  actorName!: string | null;

  @ApiProperty()
  action!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  entityType!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  entityId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  emergencyId!: string | null;

  @ApiProperty()
  method!: string;

  @ApiProperty()
  path!: string;

  @ApiProperty()
  statusCode!: number;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'Mandatory reason for edit/discard actions',
  })
  reason!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: [AuditChangeDto],
    description: 'Before/after field changes for edit actions',
  })
  changes!: AuditChangeDto[] | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'State the entity transitioned to (e.g. rejected)',
  })
  targetStatus!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class AuditListResponseDto {
  @ApiProperty({ type: [AuditEntryDto] })
  entries!: AuditEntryDto[];

  @ApiProperty()
  total!: number;
}
