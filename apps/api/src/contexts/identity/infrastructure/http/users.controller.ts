import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { FindUserByEmail } from '../../application/find-user-by-email';
import { ListUsersAdmin } from '../../application/list-users-admin';
import { GetUserAdminDetail } from '../../application/get-user-admin-detail';
import { GrantExceptionFilter } from './grant-exception.filter';
import { UserAdminExceptionFilter } from './user-admin-exception.filter';
import { JwtAuthGuard, AuthenticatedUser } from './jwt-auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermission } from './require-permission.decorator';
import {
  UserLookupDto,
  UserAdminListItemDto,
  UserAdminDetailDto,
} from './users-dto';

/**
 * Admin users console + thin directory lookup. The lookup resolves an email to a
 * principal id (so the access console can grant roles by email rather than raw
 * UUID); its authorization lives in the use case. The admin list + detail expose
 * PII (emails, names) and are therefore gated by `user:read` at the platform
 * scope — held only by `platform_admin` (role-catalog.ts) since the default
 * scope chain for these routes is `[platform]`. Mirrors the organizations admin
 * endpoints (#175).
 */
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseFilters(GrantExceptionFilter, UserAdminExceptionFilter)
@Controller('users')
export class UsersController {
  constructor(
    private readonly findUserByEmail: FindUserByEmail,
    private readonly listUsersAdmin: ListUsersAdmin,
    private readonly getUserAdminDetail: GetUserAdminDetail,
  ) {}

  // NOTE: static routes (`lookup`) and the collection route are declared BEFORE
  // `:id` so they are not captured by the param route.

  @Get('lookup')
  @ApiOperation({ summary: 'Resolve an email to a principal id (admin only)' })
  @ApiQuery({ name: 'email', required: true })
  @ApiOkResponse({ type: UserLookupDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not authorized to look up users' })
  @ApiNotFoundResponse({ description: 'No user with that email' })
  async lookup(
    @Query('email') email: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<UserLookupDto> {
    if (!email || email.trim() === '') {
      throw new BadRequestException('email query parameter is required');
    }
    const user = req.user!;
    const found = await this.findUserByEmail.execute({
      actor: { principalId: user.id, grants: user.grants },
      email,
    });
    if (!found) {
      throw new NotFoundException('No user with that email');
    }
    return found;
  }

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission('user:read')
  @ApiOperation({
    summary:
      'Admin global list of ALL users, enriched with a roles summary and ' +
      'grant count (user:read — platform admin only, PII)',
  })
  @ApiOkResponse({ type: [UserAdminListItemDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing user:read permission' })
  async listAdmin(): Promise<UserAdminListItemDto[]> {
    return this.listUsersAdmin.execute();
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('user:read')
  @ApiOperation({
    summary:
      'Admin detail of one user: grants by scope (with resolved names), ' +
      'organizations and recent activity (user:read — platform admin only, PII)',
  })
  @ApiOkResponse({ type: UserAdminDetailDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing user:read permission' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserAdminDetailDto> {
    return this.getUserAdminDetail.execute({ userId: id });
  }
}
