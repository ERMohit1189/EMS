import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import session from "express-session";
import createPgSessionStore from "connect-pg-simple";
import MemoryStore from "memorystore";
import pkg from "pg";
import path from "path";
import { logger } from "./logger";
import {
  errorHandler,
  notFoundHandler,
  requestIdMiddleware,
} from "./error-handler";
import aiRoute from "./ai-route.ts";
const { Pool } = pkg;
const app = express();
const httpServer = createServer(app);

declare module "express-session" {
  interface SessionData {
    employeeId?: string;
    employeeEmail?: string;
    employeeRole?: string;
    vendorId?: string;
    vendorEmail?: string;
    isHigherAuthority?: boolean;
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// PERFORMANCE: Use in-memory session store for development (much faster)
// Use PostgreSQL session store for production (persistent across restarts)
let sessionStore: any;

if (process.env.NODE_ENV === "development") {
  // Development: Use fast in-memory store (no database queries)
  const MemStore = MemoryStore(session);
  sessionStore = new MemStore({ checkPeriod: 86400000 }); // 24 hour cleanup
  console.log("[Sessions] Using in-memory session store (FAST - development mode)");
} else {
  // Production: Use PostgreSQL store (persistent, but slower)
  const pgSessionStore = createPgSessionStore(session);
  const sessionPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  sessionStore = new pgSessionStore({
    pool: sessionPool,
    tableName: "session",
    createTableIfMissing: true,
    errorLog: console.error.bind(console),
  });
  console.log("[Sessions] Using PostgreSQL session store (persistent)");
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
    // Increase body size limit for larger batch requests from client (e.g., many site records)
    limit: process.env.EXPRESS_JSON_LIMIT || '50mb',
  }),
);

app.use(express.urlencoded({ extended: false, limit: process.env.EXPRESS_JSON_LIMIT || '500mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Request ID middleware - adds unique ID for request tracking
app.use(requestIdMiddleware);

// Validate required environment variables
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET environment variable is required in production. " +
      "Set it in your environment (e.g. `SESSION_SECRET=...`) or via your hosting provider. " +
      "For local testing you can set `NODE_ENV=development` or add a `SESSION_SECRET` to your local `.env` file.",
  );
}

// Session middleware - MUST come before routes
app.use(
  session({
    store: sessionStore,
    secret:
      process.env.SESSION_SECRET ||
      "dev-only-secret-key-change-in-production",
    resave: false,
    // IMPORTANT: saveUninitialized must be true for in-memory store to persist sessions
    saveUninitialized: true,
    cookie: {
      secure: false, // Set to false for development even in production mode for testing
      httpOnly: true,
      // Set maxAge to 24 hours for in-memory store reliability
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
    proxy: true, // Trust proxy headers
  }),
);

// CORS middleware - Secure origin-based CORS configuration
const getAllowedOrigins = () => {
  const allowedOrigins = [
    "http://localhost:5000",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5000",
    "http://127.0.0.1:3000",
  ];

  // In production, allow REPLIT_DEV_DOMAIN if set
  if (process.env.REPLIT_DEV_DOMAIN) {
    allowedOrigins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }

  // Allow additional origins from environment variable
  if (process.env.ALLOWED_ORIGINS) {
    allowedOrigins.push(
      ...process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()),
    );
  }

  return allowedOrigins;
};

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  // Check if the request origin is in the allowed list
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  } else if (!origin && process.env.NODE_ENV === "development") {
    // Allow no-origin requests in development
    res.header("Access-Control-Allow-Origin", "*");
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );
  res.header("Access-Control-Max-Age", "3600");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Payload-too-large error handling (body parser errors)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Express body-parser (and underlying busboy) set the type for large payloads
  if (err && (err.type === 'entity.too.large' || err.status === 413 || err.name === 'PayloadTooLargeError')) {
    console.warn('[Server] Payload too large:', {
      path: req.path,
      method: req.method,
      contentLength: req.headers['content-length'],
      requestId: req.headers['x-request-id'],
    });
    return res.status(413).json({
      success: false,
      error: {
        code: 'REQUEST_ENTITY_TOO_LARGE',
        message: 'Request payload too large. Try smaller batch size or increase server limit.',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  }
  next(err);
});

// Add session debugging middleware - DISABLED for performance
// app.use((req, res, next) => {
//   console.log(`[Session Debug] ${req.method} ${req.path} - Has session:`, !!req.session);
//   next();
// });

// Re-export logger for backward compatibility
export { logger } from "./logger";

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const logMessage = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      const logLevel =
        res.statusCode >= 400
          ? "warn"
          : res.statusCode >= 200 && res.statusCode < 300
            ? "info"
            : "debug";

      logger[logLevel as "info" | "warn" | "debug"](logMessage, {
        source: "http",
        endpoint: path,
        requestId: (req.headers["x-request-id"] as string) || undefined,
        metadata: {
          method: req.method,
          statusCode: res.statusCode,
          duration,
        },
      });
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // 404 handler for unmatched API routes (only for API)
  app.use("/api/", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `API endpoint not found: ${req.method} ${req.path}`,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Global error handler - MUST be last middleware
  app.use(errorHandler);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  // Use 127.0.0.1 for local development (explicit IPv4 binding)
  // Use 0.0.0.0 only when deployed on Replit
  const host = process.env.REPLIT_DEV_DOMAIN ? "0.0.0.0" : "127.0.0.1";

  httpServer.listen(
    {
      port,
      host,
      reusePort: process.env.REPLIT_DEV_DOMAIN ? true : false, // reusePort not supported on Windows
    },
    () => {
      logger.info(`serving on port ${port}`, { source: "server" });
    },
  );
})();
