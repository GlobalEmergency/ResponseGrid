import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
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
import { GrantExceptionFilter } from './grant-exception.filter';
import { JwtAuthGuard, AuthenticatedUser } from './jwt-auth.guard';
import { UserLookupDto } from './users-dto';

/**
 * Thin admin directory lookup so the access console can grant roles by email
 * rather than raw UUID. Authorization lives in the use case (docs/features/13
 * §5): `role:grant` or `user:read` at the platform scope.
 */
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseFilters(GrantExceptionFilter)
@Controller('users')
export class UsersController {
  constructor(private readonly findUserByEmail: FindUserByEmail) {}

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
}
