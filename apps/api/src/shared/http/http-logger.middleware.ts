import type { NextFunction, Request, Response } from 'express';
import tracer from 'dd-trace';

/** Binary/high-noise prefixes we don't emit an access line for. */
const SKIP_PREFIXES = ['/files/', '/docs'];

/**
 * Express middleware that emits ONE structured JSON line per HTTP request, once
 * the response is flushed (so status, size and duration are final — this also
 * captures 404s and errors handled by the exception filters).
 *
 * Field names follow Datadog's **standard/reserved attributes** so the data
 * lands on the out-of-the-box facets and pipelines with NO custom facet setup:
 *   - `status`               → Status remapper (severity)
 *   - `http.method` / `http.status_code` / `http.url` / `http.useragent` /
 *     `http.referer`         → standard HTTP facets
 *   - `network.client.ip`    → standard; also triggers Datadog's GeoIP
 *                              (country/city facets) automatically
 *   - `network.bytes_written`→ standard
 *   - `duration` (nanoseconds)→ standard measure
 *   - `dd.trace_id` / `dd.span_id` → log↔APM trace correlation
 *
 * Written straight to stdout (not via Nest's Logger) because the ConsoleLogger
 * json mode nests the payload under `message.*`, which would break the standard
 * attribute mapping. The Datadog agent collects the container's stdout.
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
  if (SKIP_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    next();
    return;
  }

  const start = process.hrtime.bigint();
  // Captured here, inside the active request scope; the 'finish' callback may
  // run after the scope has cleared.
  const span = tracer.scope().active();

  res.on('finish', () => {
    const { statusCode } = res;
    const status =
      statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const contentLength = res.get('content-length');

    // JSON.stringify drops undefined fields, so optional attributes simply
    // don't appear when absent.
    const entry = {
      status,
      message: `${req.method} ${req.originalUrl} ${statusCode}`,
      http: {
        method: req.method,
        status_code: statusCode,
        url: req.originalUrl,
        useragent: req.get('user-agent'),
        referer: req.get('referer'),
      },
      network: {
        client: { ip: req.ip },
        bytes_written: contentLength ? Number(contentLength) : undefined,
      },
      duration: Number(process.hrtime.bigint() - start),
      ...(span
        ? {
            dd: {
              trace_id: span.context().toTraceId(),
              span_id: span.context().toSpanId(),
            },
          }
        : {}),
    };

    process.stdout.write(`${JSON.stringify(entry)}\n`);
  });

  next();
}
