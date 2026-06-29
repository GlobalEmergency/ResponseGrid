import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import tracer from 'dd-trace';

/** Binary/high-noise prefixes we don't emit an access line for. */
const SKIP_PREFIXES = ['/files/', '/docs'];

const logger = new Logger('HTTP');

/**
 * Express middleware that emits ONE structured log line per HTTP request, once
 * the response is flushed (so status, size and duration are final — this also
 * captures 404s and errors handled by the exception filters).
 *
 * Captures the request metadata needed to slice traffic in Datadog: method,
 * path, status, latency, client IP, user-agent and referer. The active
 * dd-trace span ids are injected as `dd.trace_id`/`dd.span_id` so each log
 * line links to its APM trace (the native ConsoleLogger isn't covered by
 * DD_LOGS_INJECTION, so we inject them by hand).
 *
 * Deliberately omits request/response bodies and auth headers (passwords/PII).
 * `req.ip` is the real client only because `trust proxy` is set in main.ts
 * (a single Caddy hop). // ponytail: access log only — full body capture would
 * need redaction; add per-route opt-in if ever needed.
 */
export function httpLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const path = req.path;
  if (SKIP_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    next();
    return;
  }

  const start = process.hrtime.bigint();
  // Captured here, inside the active request scope; the 'finish' callback may
  // run after the scope has cleared.
  const span = tracer.scope().active();

  res.on('finish', () => {
    const elapsedNs = Number(process.hrtime.bigint() - start);
    const payload = {
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs: Math.round(elapsedNs / 1e4) / 100,
      ip: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
      referer: req.get('referer') ?? null,
      contentLength: res.get('content-length') ?? null,
      ...(span
        ? {
            'dd.trace_id': span.context().toTraceId(),
            'dd.span_id': span.context().toSpanId(),
          }
        : {}),
    };

    if (res.statusCode >= 500) logger.error(payload);
    else if (res.statusCode >= 400) logger.warn(payload);
    else logger.log(payload);
  });

  next();
}
