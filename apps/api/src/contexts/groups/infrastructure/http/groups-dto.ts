import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ description: 'Group/cuadrilla name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: ['public', 'private'] })
  @IsIn(['public', 'private'])
  visibility!: 'public' | 'private';

  @ApiProperty({
    enum: ['organization', 'emergency'],
    description: 'Whether the group hangs off an organization or an emergency',
  })
  @IsIn(['organization', 'emergency'])
  ownerKind!: 'organization' | 'emergency';

  @ApiProperty({
    format: 'uuid',
    description: 'Id of the owning org/emergency',
  })
  @IsUUID()
  ownerId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Parent group (nesting)',
  })
  @IsOptional()
  @IsUUID()
  parentGroupId?: string;
}

export class AddMemberByEmailDto {
  @ApiProperty({ description: 'Email of the user to add (must already exist)' })
  @IsEmail()
  email!: string;
}

export class AssignManagerDto {
  @ApiProperty({ format: 'uuid', description: 'Member to appoint as manager' })
  @IsUUID()
  userId!: string;
}
