import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { AuditEntry } from '../../domain/audit-entry';
import { deriveAuditFields } from '../../domain/derive-audit-fields';
import {
  AUDIT_REPOSITORY,
  type AuditRepository,
} from '../../domain/ports/audit.repository';
import type { AuditMutationContext } from './audit-context';

/** HTTP methods that trigger audit entries (mutations only). */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Route paths that should never be audited (either read-only by nature or
 * high-noise endpoints that add no forensic value).
 *
 * Matching is done against the path from `req.path` (actual URL, not template).
 * We use prefix checks so /files/some-key matches the /files exclusion.
 */
const EXCLUDED_PREFIXES: ReadonlyArray<string> = ['/files/', '/audit'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    @Inject(AUDIT_REPOSITORY) private readonly auditRepo: AuditRepository,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<
      Request & {
        user?: AuthenticatedUser;
        auditContext?: AuditMutationContext;
      }
    >();
    const res = http.getResponse<Response>();

    const method = req.method.toUpperCase();

    // Only audit mutating requests
    if (!MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    // Skip excluded paths
    const reqPath = req.path;
    if (EXCLUDED_PREFIXES.some((prefix) => reqPath.startsWith(prefix))) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          // Only record successful mutations (status < 400)
          const statusCode = res.statusCode;
          if (statusCode >= 400) return;

          // Route template (e.g. /resources/:resourceId/verify); falls back to
          // the actual path when no route is attached (e.g. 404 passthrough,
          // which is already filtered out by the status check above).
          const routeTemplate: string =
            (req.route as { path?: string } | undefined)?.path ?? reqPath;

          const params = (req.params ?? {}) as Record<string, string>;

          const { action, entityType, entityId, emergencyId } =
            deriveAuditFields(method, routeTemplate, params);

          // Controllers handling validation actions enrich the request with the
          // reason, the before/after diff and the resulting state. The explicit
          // emergencyId wins because entity-scoped routes carry no :emergencyId.
          const enrich = req.auditContext;

          const entry = AuditEntry.create({
            id: randomUUID(),
            actorUserId: req.user?.id ?? null,
            actorName: enrich?.actorName ?? req.user?.name ?? null,
            action,
            entityType,
            entityId,
            emergencyId: enrich?.emergencyId ?? emergencyId,
            method,
            path: routeTemplate,
            statusCode,
            reason: enrich?.reason ?? null,
            changes: enrich?.changes ?? null,
            targetStatus: enrich?.targetStatus ?? null,
          });

          // Fire-and-forget: audit persistence MUST NOT affect the response.
          this.auditRepo.save(entry).catch((err: unknown) => {
            this.logger.error('Failed to persist audit entry', err);
          });
        },
        error: () => {
          // Error responses (status >= 400) are not audited.
        },
      }),
    );
  }
}
