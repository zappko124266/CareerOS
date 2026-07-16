import "server-only";

/**
 * Base class for expected, user-facing application errors. Server Actions
 * and Route Handlers should catch `AppError` specifically and surface
 * `.message` directly (it's written to be safe to show a user); anything
 * else that's thrown is an unexpected bug — log it in full and return a
 * generic message instead of leaking internals.
 */
export class AppError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.code = code;
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(
    message = "The requested resource could not be found.",
    options?: { cause?: unknown },
  ) {
    super("NOT_FOUND", message, options);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = "You don't have access to this resource.",
    options?: { cause?: unknown },
  ) {
    super("FORBIDDEN", message, options);
    this.name = "ForbiddenError";
  }
}

export class ParsingError extends AppError {
  constructor(
    message = "We couldn't process that file. Try a different one.",
    options?: { cause?: unknown },
  ) {
    super("PARSING_FAILED", message, options);
    this.name = "ParsingError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("VALIDATION_FAILED", message, options);
    this.name = "ValidationError";
  }
}
