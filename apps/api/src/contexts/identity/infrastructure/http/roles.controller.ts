import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { ROLE_CATALOG } from '../../domain/authorization/role-catalog';
import { JwtAuthGuard } from './jwt-auth.guard';

class RoleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  defaultScopeType!: string;

  @ApiProperty({ type: [String] })
  permissions!: string[];
}

/**
 * The fixed role catalog (decision D2). Any authenticated user may read it — it
 * is the reference that maps a `roleId` to its description and permission
 * bundle, used by the permissions UI (role pickers, "what can I do" views).
 */
@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
  @Get()
  @ApiOperation({ summary: 'List the fixed role catalog' })
  @ApiOkResponse({ type: [RoleDto] })
  list(): RoleDto[] {
    return Object.values(ROLE_CATALOG).map((r) => ({
      id: r.id,
      description: r.description,
      defaultScopeType: r.defaultScopeType,
      permissions: [...r.permissions],
    }));
  }
}
