import "server-only";

type LogContext = Record<string, unknown>;

function write(
  level: "debug" | "info" | "warn" | "error",
  event: string,
  context?: LogContext,
) {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...context,
  };

  const line = JSON.stringify(payload);

  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

/**
 * Structured JSON logger. Writes to stdout/stderr rather than a library
 * like pino — Vercel Functions already capture and index stdout/stderr as
 * structured logs, and this avoids pino's worker-thread transports, which
 * don't reliably work across Next.js's mixed Node/Edge runtimes.
 *
 * `context` should be small and serializable (ids, status, error message) —
 * never secrets or full request/response bodies.
 */
export const logger = {
  debug: (event: string, context?: LogContext) =>
    write("debug", event, context),
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) =>
    write("error", event, context),
};
