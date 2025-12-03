/**
 * Centralized logging and error handling utility
 * Provides structured logging with severity levels and context
 */

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL",
}

interface LogContext {
  source?: string;
  userId?: string;
  endpoint?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";

  private formatTime(): string {
    return new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  private formatLog(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = this.formatTime();
    const source = context?.source || "app";
    const contextStr = context?.requestId ? ` [${context.requestId}]` : "";
    const metadataStr =
      context?.metadata && Object.keys(context.metadata).length > 0
        ? ` ${JSON.stringify(context.metadata)}`
        : "";

    return `${timestamp} [${level}] [${source}]${contextStr} ${message}${metadataStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment && level === LogLevel.DEBUG) {
      return false;
    }
    return true;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatLog(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatLog(LogLevel.WARN, message, context));
    }
  }

  error(message: string, error?: Error | any, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorMessage = error?.message || String(error);
      const stack = error?.stack ? `\n${error.stack}` : "";
      console.error(
        this.formatLog(LogLevel.ERROR, `${message}: ${errorMessage}`, context) +
          stack
      );
    }
  }

  fatal(message: string, error?: Error | any, context?: LogContext): void {
    if (this.shouldLog(LogLevel.FATAL)) {
      const errorMessage = error?.message || String(error);
      const stack = error?.stack ? `\n${error.stack}` : "";
      console.error(
        this.formatLog(LogLevel.FATAL, `${message}: ${errorMessage}`, context) +
          stack
      );
    }
  }
}

/**
 * Create a logger instance with optional default context
 */
export function createLogger(defaultContext?: LogContext): Logger {
  return new Logger();
}

// Export singleton instance
export const logger = new Logger();

/**
 * Error class for API errors with status codes
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Validation error class
 */
export class ValidationError extends ApiError {
  constructor(message: string, public details?: Record<string, any>) {
    super(400, message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = "Unauthorized") {
    super(401, message, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = "Forbidden") {
    super(403, message, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends ApiError {
  constructor(message: string = "Resource not found") {
    super(404, message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends ApiError {
  constructor(message: string = "Resource conflict") {
    super(409, message, "CONFLICT");
    this.name = "ConflictError";
  }
}

/**
 * Internal server error class
 */
export class InternalServerError extends ApiError {
  constructor(message: string = "Internal server error") {
    super(500, message, "INTERNAL_SERVER_ERROR");
    this.name = "InternalServerError";
  }
}

/**
 * Error handler wrapper for async route handlers
 */
export function asyncHandler(
  fn: (req: any, res: any, next: any) => Promise<void>
) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error("Async handler error", error, {
        source: "asyncHandler",
        endpoint: req.path,
        metadata: { method: req.method },
      });
      next(error);
    });
  };
}
