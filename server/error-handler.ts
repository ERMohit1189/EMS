/**
 * Global error handling middleware for Express
 * Catches errors from routes and formats responses consistently
 */

import { Request, Response, NextFunction } from "express";
import { logger, ApiError } from "./logger";
import { ZodError } from "zod";

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Format validation errors from Zod
 */
function formatZodError(error: ZodError): Record<string, string[]> {
  return error.errors.reduce(
    (acc, err) => {
      const path = err.path.join(".");
      if (!acc[path]) {
        acc[path] = [];
      }
      acc[path].push(err.message);
      return acc;
    },
    {} as Record<string, string[]>
  );
}

/**
 * Global error handler middleware
 * Should be used as the last middleware in Express app
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers["x-request-id"] as string || `req-${Date.now()}`;

  // Log the error
  logger.error("Unhandled error", error, {
    source: "errorHandler",
    endpoint: req.path,
    requestId,
    metadata: {
      method: req.method,
      statusCode: error.statusCode || error.status || 500,
      errorType: error.name,
    },
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = formatZodError(error);
    const response: ErrorResponse = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: validationErrors,
        timestamp: new Date().toISOString(),
        requestId,
      },
    };
    res.status(400).json(response);
    return;
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code || "API_ERROR",
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId,
      },
    };
    res.status(error.statusCode).json(response);
    return;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Check for common database errors
    const isDatabaseError = error.message?.includes("database") ||
      error.message?.includes("pool") ||
      error.message?.includes("constraint");

    if (isDatabaseError) {
      const response: ErrorResponse = {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "A database error occurred. Please try again later.",
          timestamp: new Date().toISOString(),
          requestId,
        },
      };
      res.status(500).json(response);
      return;
    }

    // Generic error
    const response: ErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "An internal error occurred. Please try again later.",
        timestamp: new Date().toISOString(),
        requestId,
      },
    };
    res.status(500).json(response);
    return;
  }

  // Handle unknown errors
  const response: ErrorResponse = {
    success: false,
    error: {
      code: "UNKNOWN_ERROR",
      message: "An unknown error occurred. Please try again later.",
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
  res.status(500).json(response);
}

/**
 * 404 handler middleware
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route not found: ${req.method} ${req.path}`,
      timestamp: new Date().toISOString(),
    },
  };
  res.status(404).json(response);
}

/**
 * Request ID middleware
 * Generates a unique ID for each request for tracking
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId =
    (req.headers["x-request-id"] as string) ||
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-ID", requestId);

  next();
}
