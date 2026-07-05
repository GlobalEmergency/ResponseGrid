import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { LoginByPhone } from '../../application/login-by-phone';
import { RegisterByPhone } from '../../application/register-by-phone';
import {
  LoginByPhoneDto,
  RegisterByPhoneDto,
  TrustedAuthResponseDto,
} from './dto';
import { IdentityExceptionFilter } from './identity-exception.filter';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { ServiceAccountPermissionGuard } from './service-account-permission.guard';
import { RequirePermission } from './require-permission.decorator';
import type { AuthenticatedUser } from './jwt-auth.guard';
import { setAuditContext } from '../../../audit/infrastructure/http/audit-context';

type AuthedRequest = ExpressRequest & { user: AuthenticatedUser };

// 20 requests / 60 s. Keyed per API-key prefix (not IP) by
// ApiKeyAwareThrottlerGuard, since all of a bot's traffic shares one server.
const TRUSTED_THROTTLE = { 'trusted-auth': { ttl: 60_000, limit: 20 } };

/**
 * Trusted-channel authentication for messaging bots (Telegram/WhatsApp) that
 * already verify the user's phone in the client (#315). Service-account only:
 * `ApiKeyAuthGuard` forces `X-API-Key` (so `isServiceAccount` is true and the
 * permission is actually enforced), and `auth:trusted_phone_login` — a
 * platform-scoped grant on the bot's Service Account — is required. The emitted
 * JWT follows the normal rules: it never confers more than the target user's own
 * permissions, so a leaked bot key means "log in as a user who shared their
 * phone", not "act with any privilege".
 */
@ApiTags('auth')
@Controller('auth/trusted')
@UseFilters(IdentityExceptionFilter)
@UseGuards(ApiKeyAuthGuard, ServiceAccountPermissionGuard)
@ApiSecurity('api-key')
export class TrustedAuthController {
  constructor(
    private readonly loginByPhone: LoginByPhone,
    private readonly registerByPhone: RegisterByPhone,
  ) {}

  @Post('login-by-phone')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('auth:trusted_phone_login')
  @Throttle(TRUSTED_THROTTLE)
  @ApiOperation({
    summary:
      'Emitir un JWT de usuario a partir de su teléfono verificado (bot de confianza)',
  })
  @ApiOkResponse({
    description: 'Login correcto',
    type: TrustedAuthResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe usuario con ese teléfono' })
  @ApiForbiddenResponse({
    description:
      'La Service Account no tiene el permiso auth:trusted_phone_login',
  })
  @ApiUnauthorizedResponse({ description: 'Falta o es inválida la API key' })
  @ApiTooManyRequestsResponse({ description: 'Límite de peticiones excedido' })
  async loginByPhoneRoute(
    @Body() dto: LoginByPhoneDto,
    @Request() req: AuthedRequest,
  ): Promise<TrustedAuthResponseDto> {
    const result = await this.loginByPhone.execute({ phone: dto.phone });
    setAuditContext(req, {
      reason:
        `trusted-channel login-by-phone via service_account ${req.user.id}` +
        (result.ambiguous ? ' [ambiguous phone match]' : ''),
    });
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('register-by-phone')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('auth:trusted_phone_login')
  @Throttle(TRUSTED_THROTTLE)
  @ApiOperation({
    summary:
      'Alta passwordless de un usuario por teléfono verificado (bot de confianza)',
  })
  @ApiCreatedResponse({
    description: 'Usuario creado (auto-login)',
    type: TrustedAuthResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Falta la aceptación de términos/privacidad o un campo inválido',
  })
  @ApiConflictResponse({ description: 'Ya existe una cuenta con ese email' })
  @ApiForbiddenResponse({
    description:
      'La Service Account no tiene el permiso auth:trusted_phone_login',
  })
  @ApiUnauthorizedResponse({ description: 'Falta o es inválida la API key' })
  @ApiTooManyRequestsResponse({ description: 'Límite de peticiones excedido' })
  async registerByPhoneRoute(
    @Body() dto: RegisterByPhoneDto,
    @Request() req: AuthedRequest,
  ): Promise<TrustedAuthResponseDto> {
    const result = await this.registerByPhone.execute({
      phone: dto.phone,
      name: dto.name,
      email: dto.email,
      acceptedTerms: dto.acceptedTerms,
      acceptedPrivacy: dto.acceptedPrivacy,
      serviceAccountId: req.user.id,
    });
    setAuditContext(req, {
      reason: `trusted-channel register-by-phone via service_account ${req.user.id}`,
    });
    return { accessToken: result.accessToken, user: result.user };
  }
}
