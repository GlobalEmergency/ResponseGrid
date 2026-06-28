import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { AuthenticatedUser } from './jwt-auth.guard';

class IntrospectedGrantDto {
  @ApiProperty()
  roleId!: string;

  @ApiProperty()
  scopeType!: string;

  @ApiProperty({ nullable: true })
  scopeId!: string | null;
}

class ServiceAccountIdentityDto {
  @ApiProperty({ format: 'uuid' })
  principalId!: string;

  @ApiProperty({ enum: ['service_account'] })
  principalType!: string;

  @ApiProperty({ type: [IntrospectedGrantDto] })
  grants!: IntrospectedGrantDto[];
}

/**
 * Introspection endpoint for *machine* principals. A service account presents
 * its key via `X-API-Key` and gets back its own identity and effective grants.
 *
 * This is the proof-of-authentication path for an API key: the ApiKeyAuthGuard
 * populates `request.user` in the very same shape JwtAuthGuard produces for a
 * human, so downstream a key authorizes exactly like a user would. It lives in
 * its own controller because NestJS *stacks* class- and method-level guards —
 * it cannot share ApiKeysController's class-level JwtAuthGuard. See
 * docs/features/13 §8.
 */
@ApiTags('service-accounts')
@ApiSecurity('api-key')
@UseGuards(ApiKeyAuthGuard)
@Controller('service-accounts')
export class ServiceAccountIntrospectionController {
  @Get('me')
  @ApiOperation({
    summary:
      'Introspect the calling service account (authenticated by X-API-Key)',
  })
  @ApiOkResponse({ type: ServiceAccountIdentityDto })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, invalid or revoked API key',
  })
  me(
    @Req() req: Request & { user?: AuthenticatedUser },
  ): ServiceAccountIdentityDto {
    const user = req.user!;
    return {
      principalId: user.id,
      principalType: 'service_account',
      grants: user.grants.map((g) => ({
        roleId: g.roleId,
        scopeType: g.scope.type,
        scopeId: 'id' in g.scope ? g.scope.id : null,
      })),
    };
  }
}
