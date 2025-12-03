import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import session from "express-session";
import createPgSessionStore from "connect-pg-simple";
import pkg from "pg";

const { Pool } = pkg;
const app = express();
const httpServer = createServer(app);

declare module "express-session" {
  interface SessionData {
    employeeId?: string;
    employeeEmail?: string;
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

// Initialize PostgreSQL session store
const pgSessionStore = createPgSessionStore(session);
const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const sessionStore = new pgSessionStore({
  pool: sessionPool,
  tableName: "session",
  createTableIfMissing: true,
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Validate required environment variables
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET environment variable is required in production",
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
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    },
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

// Add session debugging middleware - DISABLED for performance
// app.use((req, res, next) => {
//   console.log(`[Session Debug] ${req.method} ${req.path} - Has session:`, !!req.session);
//   next();
// });

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // CRITICAL: Protect ALL unmatched API routes - return JSON 404 instead of HTML
  app.use("/api/", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res
      .status(404)
      .json({ error: `API endpoint not found: ${req.method} ${req.path}` });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  // Use localhost for local development (works on Windows/Mac/Linux)
  // Use 0.0.0.0 only when deployed on Replit
  const host = process.env.REPLIT_DEV_DOMAIN ? "0.0.0.0" : "localhost";

  httpServer.listen(
    {
      port,
      host,
      reusePort: process.env.REPLIT_DEV_DOMAIN ? true : false, // reusePort not supported on Windows
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
