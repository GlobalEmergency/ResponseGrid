/**
 * Shared 4xx JSON body shape for the per-context domain-exception filters
 * (#348). `code` is a stable, machine-readable identifier — added
 * incrementally to the domain errors the web already localizes
 * (`apps/web/src/lib/backend-error-messages.ts`) — so the web can match on it
 * instead of on `message` prose, which drifts silently when the English text
 * changes. Errors that don't (yet) expose a `.code` simply omit the field,
 * keeping this backward compatible with the previous `{ statusCode, message }`
 * shape.
 */
export interface DomainErrorResponseBody {
  statusCode: number;
  message: string;
  code?: string;
}

export function domainErrorResponseBody(
  statusCode: number,
  exception: Error,
): DomainErrorResponseBody {
  const code = (exception as { code?: unknown }).code;
  return {
    statusCode,
    message: exception.message,
    ...(typeof code === 'string' ? { code } : {}),
  };
}
