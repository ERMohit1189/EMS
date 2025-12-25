import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // In development, disable caching for static assets
  // In production, use long cache for hashed files
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    // Development: no caching, always fresh
    app.use(express.static(distPath, {
      maxAge: 0,
      etag: false,
      lastModified: false,
      setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }));
  } else {
    // Production: long cache for hashed assets
    app.use(express.static(distPath, { maxAge: '1y', immutable: true }));
  }

  // For all other routes, serve index.html for navigation requests (GET/HEAD) only
  // This prevents POST/PUT/DELETE API requests from accidentally receiving index.html
  app.use("*", (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // Let other middleware (like API 404) handle non-GET methods
      return next();
    }

    // If the request looks like an asset (has an extension) or is a dev-only source path,
    // don't return index.html (which would be HTML) — return 404 so the client sees a proper error
    // instead of receiving HTML for a module import which causes a MIME type error.
    const ext = path.extname(req.path || '');
    const isDevSource = req.path?.startsWith('/src/') || req.path?.startsWith('/@vite/') || req.path?.includes('/node_modules/');
    if (ext || isDevSource) {
      return res.status(404).end('Not found');
    }

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
