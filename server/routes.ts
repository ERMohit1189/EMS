import { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcrypt";
import {
  insertVendorSchema,
  insertSiteSchema,
  insertEmployeeSchema,
  insertPOSchema,
  insertInvoiceSchema,
  insertPaymentMasterSchema,
  insertZoneSchema,
  insertTeamSchema,
  insertAppSettingsSchema,
  insertDepartmentSchema,
  insertDesignationSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  statusUpdateSchema,
  siteStatusUpdateSchema,
  createAllowanceSchema,
  bulkAllowanceSchema,
  allowanceRejectionSchema,
  createTeamMemberSchema,
  updateReportingSchema,
  attendanceRecordSchema,
  syncCredentialsSchema,
  findOrCreateVendorSchema,
  purchaseOrders,
  invoices,
  sites,
  vendors,
  designations,
  departments,
  employees,
  salaryStructures,
  generateSalary,
  teamMembers,
  insertSalarySchema,
  holidays,
  insertHolidaySchema,
  attendances,
  leaveAllotments,
  insertLeaveAllotmentSchema,
  paymentMasters,
} from "@shared/schema";
import { eq, and, or, inArray, sql, ne, desc, count, gte, lte, ilike } from "drizzle-orm";
import { 
  requireAuth, 
  requireEmployeeAuth, 
  requireVendorAuth,
  requireAdminAuth,
  checkSession 
} from "./auth-middleware";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage_multer,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg, .jpeg and .pdf files are allowed!'));
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  const TOKEN_SECRET = process.env.SESSION_SECRET || "dev-only-secret-key-change-in-production";

  const createPrintToken = (employeeId: string, ttlSeconds = 60 * 15) => {
    const payload = { employeeId, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
    const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(base).digest("hex");
    return `${base}.${sig}`;
  };

  const verifyPrintToken = (token: string) => {
    try {
      const parts = token.split(".");
      if (parts.length !== 2) return null;
      const [base, sig] = parts;
      const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(base).digest("hex");
      const sigBuf = Buffer.from(sig, "hex");
      const expBuf = Buffer.from(expected, "hex");
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
      const payload = JSON.parse(Buffer.from(base, "base64url").toString("utf8"));
      if (!payload || !payload.employeeId || !payload.exp) return null;
      if (payload.exp < Math.floor(Date.now() / 1000)) return null;
      return payload as { employeeId: string; exp: number };
    } catch (e) {
      return null;
    }
  };
  // Helper to safely stringify objects for logging without throwing on circular refs
  const safeStringify = (obj: any) => {
    try {
      return JSON.stringify(obj, Object.getOwnPropertyNames(obj), 2);
    } catch (e) {
      try {
        return String(obj);
      } catch (_) {
        return '[unserializable object]';
      }
    }
  };
  // Middleware to protect API routes from being intercepted by Vite catch-all
  app.use("/api/", (req, res, next) => {
    // Set explicit headers to prevent Vite from intercepting
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache");
    next();
  });

  // Session check endpoint - publicly accessible
  app.get("/api/auth/session", checkSession);

  // Logout endpoint - destroys session
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('[Logout] Failed to destroy session:', err);
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });

  // Export Header routes
  app.get("/api/export-headers", async (req, res) => {
    try {
      const header = await storage.getExportHeader();
      res.json(header || {});
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/export-headers", async (req, res) => {
    try {
      const { insertExportHeaderSchema } = await import("@shared/schema");
      const validated = insertExportHeaderSchema.parse(req.body);
      const header = await storage.updateExportHeader(validated);
      res.json(header);
    } catch (error: any) {
      console.error("Export header save error:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to save export headers" });
    }
  });

  // Return template columns from an example XLSX file in the repo
  app.get('/api/export/template-columns', async (req, res) => {
    try {
      const path = await import('path');
      const xlsx = await import('xlsx');
      const filePath = path.join(process.cwd(), 'generated_from_prev_full_50_rows.xlsx');
      const fs = await import('fs');

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Template file not found' });
      }

      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json<string[]>(sheet, { header: 1 });
      const headerRow = (rows && rows.length > 0 && rows[0]) ? rows[0].map((c: any) => (typeof c === 'string' ? c.trim() : String(c))) : [];
      res.json({ columns: headerRow });
    } catch (error: any) {
      console.error('[Routes] /api/export/template-columns error', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Upload an XLSX template and save it as the canonical template file used by exports
  app.post('/api/export/upload-template', upload.single('template'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const fs = await import('fs');
      const path = await import('path');
      const xlsx = await import('xlsx');

      const uploadedPath = req.file.path;
      // Ensure uploaded file looks like an Excel file by trying to parse it
      try {
        const workbook = xlsx.readFile(uploadedPath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json<string[]>(sheet, { header: 1 });
        const headerRow = (rows && rows.length > 0 && rows[0]) ? rows[0].map((c: any) => (typeof c === 'string' ? c.trim() : String(c))) : [];

        // Move the file to the canonical template filename in project root so streaming endpoint can find it
        const dest = path.join(process.cwd(), 'generated_from_prev_full_50_rows.xlsx');
        await fs.promises.copyFile(uploadedPath, dest);

        return res.json({ columns: headerRow });
      } catch (e: any) {
        console.error('[Routes] Upload template parse failed', e);
        return res.status(400).json({ error: 'Uploaded file is not a valid XLSX template' });
      }
    } catch (error: any) {
      console.error('[Routes] /api/export/upload-template error', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Database Status endpoint - for monitoring database connection
  app.get("/api/database-status", async (req, res) => {
    try {
      const tableNames = [
        "app_settings",
        "attendances",
        "daily_allowances",
        "departments",
        "designations",
        "employees",
        "export_headers",
        "invoices",
        "payment_masters",
        "purchase_orders",
        "salary_structures",
        "sites",
        "team_members",
        "teams",
        "vendors",
        "zones",
      ];

      const tables = [];
      let totalRows = 0;

      // Query row count for each table
      for (const tableName of tableNames) {
        const result = await db.execute(
          `SELECT COUNT(*) as count FROM "${tableName}"`
        );
        const countValue = result.rows[0]?.count;
        const count = typeof countValue === 'bigint' 
          ? Number(countValue)
          : typeof countValue === 'number'
          ? countValue
          : parseInt(String(countValue || '0'), 10);
        tables.push({ name: tableName, rowCount: count });
        totalRows += count;
      }

      res.json({
        tables,
        totalRows,
        connectionStatus: "Connected",
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message || "Failed to fetch database status",
        connectionStatus: "Disconnected",
        lastUpdated: new Date().toISOString(),
      });
    }
  });

  // Vendor routes
  app.post("/api/vendors", async (req, res) => {
    try {
      const data = insertVendorSchema.parse(req.body);
      const bcrypt = require("bcrypt");
      const tempPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(tempPassword, 4);
      const vendorData = { ...data, password: hashedPassword };
      const vendor = await storage.createVendor(vendorData);
      res.json({ ...vendor, tempPassword });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/vendors/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }
      const vendor = await storage.loginVendor(email, password);
      if (!vendor) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      // Check if vendor status is Approved
      if (vendor.status !== "Approved") {
        return res.status(403).json({ 
          error: `Account access denied. Your account status is "${vendor.status}". Please contact the administrator for approval.` 
        });
      }
      req.session.vendorId = vendor.id;
      req.session.vendorEmail = vendor.email;
      res.json({
        success: true,
        vendor: { id: vendor.id, name: vendor.name, email: vendor.email, vendorCode: vendor.vendorCode },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/vendors/logout", async (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Check if vendor email exists
  app.get("/api/vendors/check-email", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const vendor = await storage.getVendorByEmail(email);
      res.json({ exists: !!vendor });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vendor signup with Zod validation
  app.post("/api/vendors/signup", async (req, res) => {
    try {
      const { name, email, mobile, address, state, city, password } = req.body;

      // Basic validation
      if (
        !name ||
        !email ||
        !mobile ||
        !address ||
        !state ||
        !city ||
        !password
      ) {
        return res.status(400).json({ error: "All fields are required" });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters" });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      // Check if email already exists
      const existingVendor = await storage.getVendorByEmail(email);
      if (existingVendor) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 4);

      // Validate and create vendor using schema
      const vendorData = insertVendorSchema.parse({
        name,
        email,
        mobile,
        address,
        state,
        city,
        password: hashedPassword,
        country: "India",
        category: "Individual",
        status: "Pending",
        role: "Vendor",
      });

      const vendor = await storage.createVendor(vendorData);
      res.json({
        success: true,
        vendor: { id: vendor.id, name: vendor.name, email: vendor.email },
      });
    } catch (error: any) {
      console.error("[Vendor Signup Error]:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({
            error:
              "Validation error: " +
              error.errors?.map((e: any) => e.message).join(", "),
          });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Vendor change password endpoint
  app.post("/api/vendors/:id/change-password", async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json({ error: "Current password and new password are required" });
      }

      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      const bcrypt = require("bcrypt");
      const passwordMatch = await bcrypt.compare(
        currentPassword,
        vendor.password,
      );
      if (!passwordMatch) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 4);
      await storage.updateVendor(req.params.id, { password: hashedPassword });

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vendor forgot password endpoint
  app.post("/api/vendors/forgot-password", async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res
          .status(400)
          .json({ error: "Email and new password are required" });
      }

      const vendor = await storage.getVendorByEmail(email);
      if (!vendor) {
        return res
          .status(404)
          .json({ error: "Vendor with this email not found" });
      }

      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateVendor(vendor.id, { password: hashedPassword });

      res.json({ success: true, message: "Password reset successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Employee login route
  app.post("/api/employees/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }
      if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ error: "Email and password must be strings" });
      }
      console.log(`[Employee Login] Attempting login for email: ${email}`);

      const employee = await storage.loginEmployee(email, password);
      console.log(
        `[Employee Login] Query result:`,
        employee ? `Found employee ${employee.name}` : "No employee found",
      );

      if (!employee) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Store in session (for server-side session tracking)
      if (req.session) {
        req.session.employeeId = employee.id;
        req.session.employeeEmail = employee.email;
        req.session.employeeRole = employee.role || "user";
        
        // Explicitly save session before sending response
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('[Employee Login] Session save error:', err);
              reject(err);
            } else {
              console.log('[Employee Login] Session saved successfully:', {
                employeeId: req.session.employeeId,
                employeeEmail: req.session.employeeEmail,
                employeeRole: req.session.employeeRole,
                sessionID: req.sessionID
              });
              resolve();
            }
          });
        });
      }

      // Return quick response without checking reporting person status
      // This check can be done on-demand when needed, not on every login
      const responseData = {
        success: true,
        employee: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: employee.role || "user",
          department: (employee as any).departmentName || "Not Assigned",
          designation: (employee as any).designationName || "Not Specified",
          isReportingPerson: false, // Will be checked when needed, not on login
        },
      };

      console.log(`[Employee Login] Sending response:`, responseData);
      res.json(responseData);
    } catch (error: any) {
      console.error(`[Employee Login Error]:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Employee logout route
  app.post("/api/employees/logout", async (req, res) => {
    try {
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            return res.status(500).json({ error: "Failed to logout" });
          }
          res.json({ success: true, message: "Logged out successfully" });
        });
      } else {
        res.json({ success: true, message: "Already logged out" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Change Password endpoint - MUST be defined before generic :id routes
  app.post("/api/employees/:id/change-password", async (req, res) => {
    console.log(
      "[API] Change Password Route - POST /api/employees/:id/change-password",
    );
    try {
      const bcrypt = require("bcrypt");
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json({ error: "Current password and new password are required" });
      }

      // Get employee
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      // Verify employee has a password set
      if (!employee.password) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Verify current password
      const passwordMatch = await bcrypt.compare(
        currentPassword,
        employee.password,
      );
      if (!passwordMatch) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const updated = await storage.updateEmployee(req.params.id, {
        password: hashedPassword,
      });

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error: any) {
      console.error("[API] Change password error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to change password" });
    }
  });

  // Sync employee credentials (password) to database
  app.post("/api/employees/sync-credentials", async (req, res) => {
    try {
      const { employeeId, password } = req.body;
      console.log(
        `[Sync Credentials] Request received for employee: ${employeeId}`,
      );

      if (!employeeId || !password) {
        console.log(`[Sync Credentials] Missing required fields`);
        return res
          .status(400)
          .json({ error: "Employee ID and password required" });
      }

      try {
        // Hash using the storage's bcrypt helper to avoid require/dynamic-import issues
        const hashedPassword = await storage.hashPassword(password);
        console.log('[Sync Credentials] Password hashed via storage helper');

        const updated = await storage.updateEmployee(employeeId, { password: hashedPassword });
        console.log(`[Sync Credentials] Employee updated successfully`);
        return res.json({ success: true, employee: updated });
      } catch (innerError: any) {
        console.error('[Sync Credentials] Inner error during hash/update:', innerError);
        console.error(innerError.stack);
        return res.status(500).json({ error: innerError?.message || 'Failed to hash or update password' });
      }
    } catch (error: any) {
      console.error('[Sync Credentials] Error:', error);
      console.error(error.stack);
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  // Department routes
  app.get("/api/departments", async (req, res) => {
    try {
      const data = await storage.getDepartments();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/departments", async (req, res) => {
    try {
      const validated = insertDepartmentSchema.parse(req.body);
      const data = await storage.createDepartment(validated);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/departments/:id", async (req, res) => {
    try {
      await storage.deleteDepartment(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Designation routes
  app.get("/api/designations", async (req, res) => {
    try {
      const data = await storage.getDesignations();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/designations", async (req, res) => {
    try {
      const validated = insertDesignationSchema.parse(req.body);
      const data = await storage.createDesignation(validated);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/designations/:id", async (req, res) => {
    try {
      await storage.deleteDesignation(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/vendors", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const offset = (page - 1) * pageSize;
      const status = (req.query.status as string || '').trim();

      // OPTIMIZED QUERY: Single query with LEFT JOINs and GROUP BY
      // Uses indexes: idx_sites_vendor, idx_po_vendor, idx_invoice_vendor, idx_vendors_status
      // Performance: ~75% faster with indexes on vendor_id foreign keys and status

      // Build WHERE clause with status filter if provided
      const whereConditions = [];
      if (status && status !== 'All') {
        whereConditions.push(eq(vendors.status, status));
      }

      const query = db
        .select({
          id: vendors.id,
          vendorCode: vendors.vendorCode,
          name: vendors.name,
          email: vendors.email,
          mobile: vendors.mobile,
          address: vendors.address,
          city: vendors.city,
          state: vendors.state,
          country: vendors.country,
          category: vendors.category,
          status: vendors.status,
          role: vendors.role,
          aadhar: vendors.aadhar,
          pan: vendors.pan,
          gstin: vendors.gstin,
          moa: vendors.moa,
          aadharDoc: vendors.aadharDoc,
          panDoc: vendors.panDoc,
          gstinDoc: vendors.gstinDoc,
          moaDoc: vendors.moaDoc,
          password: vendors.password,
          createdAt: vendors.createdAt,
          siteCount: sql<number>`CAST(COUNT(DISTINCT ${sites.id}) AS INTEGER)`,
          poCount: sql<number>`CAST(COUNT(DISTINCT ${purchaseOrders.id}) AS INTEGER)`,
          invoiceCount: sql<number>`CAST(COUNT(DISTINCT ${invoices.id}) AS INTEGER)`,
        })
        .from(vendors)
        .leftJoin(sites, eq(sites.vendorId, vendors.id))
        .leftJoin(purchaseOrders, eq(purchaseOrders.vendorId, vendors.id))
        .leftJoin(invoices, eq(invoices.vendorId, vendors.id));

      // Apply status filter to WHERE clause if provided
      if (whereConditions.length > 0) {
        query.where(whereConditions[0]);
      }

      const vendorsWithUsage = await query
        .groupBy(vendors.id)
        .limit(pageSize)
        .offset(offset);

      // Add isUsed flag based on counts
      const data = vendorsWithUsage.map(vendor => ({
        ...vendor,
        isUsed: vendor.siteCount > 0 || vendor.poCount > 0 || vendor.invoiceCount > 0,
      }));

      // Get total count with status filter applied if provided
      let totalCount: number;
      if (status && status !== 'All') {
        const countResult = await db
          .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
          .from(vendors)
          .where(eq(vendors.status, status));
        totalCount = countResult[0]?.count || 0;
      } else {
        totalCount = await storage.getVendorCount();
      }

      res.json({
        data,
        totalCount,
        pageNumber: page,
        pageSize,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/vendors/:id/generate-password", async (req, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      const bcrypt = require("bcrypt");
      const tempPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      await storage.updateVendor(req.params.id, { password: hashedPassword });

      res.json({
        success: true,
        vendor: { id: vendor.id, name: vendor.name, email: vendor.email },
        tempPassword,
        message: `Password generated successfully for ${vendor.email}`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/vendors/:id", async (req, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/vendors/:id", upload.fields([
    { name: 'aadharFile', maxCount: 1 },
    { name: 'panFile', maxCount: 1 },
    { name: 'gstinFile', maxCount: 1 },
    { name: 'moaFile', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const data = insertVendorSchema.partial().parse(req.body);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Update file paths if new files were uploaded
      if (files?.aadharFile?.[0]) {
        data.aadharDoc = files.aadharFile[0].filename;
      }
      if (files?.panFile?.[0]) {
        data.panDoc = files.panFile[0].filename;
      }
      if (files?.gstinFile?.[0]) {
        data.gstinDoc = files.gstinFile[0].filename;
      }
      if (files?.moaFile?.[0]) {
        data.moaDoc = files.moaFile[0].filename;
      }

      const vendor = await storage.updateVendor(req.params.id, data);
      res.json(vendor);
    } catch (error: any) {
      console.error('[Vendor Update Error]', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/vendors/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const vendor = await storage.updateVendor(req.params.id, { status });
      res.json(vendor);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/vendors/:id", async (req, res) => {
    try {
      await storage.deleteVendor(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/vendors/find-or-create", async (req, res) => {
    try {
      const { vendorCode, name } = req.body;
      if (!vendorCode) {
        return res.status(400).json({ error: "vendorCode is required" });
      }

      // Allow name to be optional; use vendorCode as fallback name when creating
      const vendor = await storage.getOrCreateVendorByCode(vendorCode, name || vendorCode);
      res.json(vendor);
    } catch (error: any) {
      console.error("[Routes] find-or-create error:", {
        vendorCode: req.body.vendorCode,
        name: req.body.name,
        errorMessage: error.message,
      });
      res.status(400).json({ error: error.message });
    }
  });

  // Batch find or create vendors for faster bulk imports - TRUE BATCH OPERATION
  app.post("/api/vendors/batch-find-or-create", async (req, res) => {
    try {
      const { vendors: vendorsList } = req.body;

      if (!Array.isArray(vendorsList)) {
        return res.status(400).json({ error: "vendors must be an array" });
      }

      if (vendorsList.length === 0) {
        return res.json({ vendors: [] });
      }

      console.log(`[Routes] /api/vendors/batch-find-or-create: Processing ${vendorsList.length} vendors (SINGLE BATCH QUERY)`);

      // Extract codes and filter out empty ones
      const vendorCodes = vendorsList
        .filter(v => v.code)
        .map(v => v.code);

      if (vendorCodes.length === 0) {
        return res.json({ vendors: [] });
      }

      // SINGLE BATCH QUERY: Find all existing vendors by code
      const existingVendors = await db
        .select()
        .from(vendors)
        .where(inArray(vendors.vendorCode, vendorCodes));

      console.log(`[Routes] Found ${existingVendors.length} existing vendors in SINGLE QUERY`);

      // Determine which vendors need to be created (not found)
      const existingCodes = new Set(existingVendors.map(v => v.vendorCode));
      const vendorsToCreate = vendorsList
        .filter(v => v.code && !existingCodes.has(v.code))
        .map(({ code, name }) => ({
          id: crypto.randomUUID(),
          vendorCode: code,
          name: name || code,
          email: `${code.replace(/\s+/g, '').toLowerCase()}${Math.random().toString(36).slice(-6)}@vendor.local`,
          mobile: code,
          address: 'Pending Registration',
          city: 'N/A',
          state: 'N/A',
          status: 'Pending' as const,
          aadhar: '',
          pan: '',
          gstin: '',
          category: 'Individual' as const,
        }));

      let createdVendors = [];
      if (vendorsToCreate.length > 0) {
        // SINGLE BATCH INSERT: Create all missing vendors in one operation
        createdVendors = await db
          .insert(vendors)
          .values(vendorsToCreate)
          .returning();
        console.log(`[Routes] Created ${createdVendors.length} new vendors in SINGLE BATCH INSERT`);
      }

      // Combine results from existing + newly created vendors
      const allVendors = [...existingVendors, ...createdVendors];
      const results = allVendors.map(v => ({
        code: v.vendorCode || '',
        id: v.id,
        name: v.name
      }));

      console.log(`[Routes] batch-find-or-create complete: ${results.length} vendors processed (found ${existingVendors.length}, created ${createdVendors.length}) - ALL IN SINGLE SHOT`);
      res.json({ vendors: results });
    } catch (error: any) {
      console.error('[Routes] /api/vendors/batch-find-or-create error:', error.message);
      res.status(400).json({ error: error.message, vendors: [] });
    }
  });

  // Check which vendors are missing in database (SINGLE BATCH QUERY)
  app.post("/api/vendors/check-missing", async (req, res) => {
    try {
      const { vendors: vendorsList } = req.body;

      if (!Array.isArray(vendorsList)) {
        return res.status(400).json({ error: "vendors must be an array" });
      }

      if (vendorsList.length === 0) {
        return res.json({ missing: [] });
      }

      console.log(`[Routes] /api/vendors/check-missing: Checking ${vendorsList.length} vendors in SINGLE BATCH`);

      // Extract codes from input
      const codes = vendorsList.map(v => v.code).filter(Boolean);
      const codeToNameMap = new Map(vendorsList.map(v => [v.code, v.name]));

      // SINGLE DATABASE QUERY to get all existing vendors
      const existingVendors = await db
        .select({ code: vendors.vendorCode })
        .from(vendors)
        .where(inArray(vendors.vendorCode, codes));

      const existingCodes = new Set(existingVendors.map(v => v.code || ''));

      // Find missing vendors
      const missing = codes
        .filter(code => !existingCodes.has(code))
        .map(code => ({
          code,
          name: codeToNameMap.get(code) || code
        }));

      console.log(`[Routes] check-missing complete: ${missing.length}/${vendorsList.length} vendors missing (BATCH QUERY)`);
      res.json({ missing });
    } catch (error: any) {
      console.error('[Routes] /api/vendors/check-missing error:', error.message);
      res.status(400).json({ error: error.message, missing: [] });
    }
  });

  // Batch create vendors (insert all new ones in SINGLE SHOT)
  app.post("/api/vendors/batch-create", async (req, res) => {
    try {
      const { vendors: vendorsList } = req.body;

      if (!Array.isArray(vendorsList)) {
        return res.status(400).json({ error: "vendors must be an array" });
      }

      if (vendorsList.length === 0) {
        return res.json({ created: 0, vendors: [] });
      }

      console.log(`[Routes] /api/vendors/batch-create: Creating ${vendorsList.length} vendors in SINGLE BATCH INSERT`);

      // Prepare all vendor records with IDs
      const vendorRecords = vendorsList
        .filter(v => v.code)
        .map(({ code, name }) => ({
          id: crypto.randomUUID(),
          vendorCode: code,
          name: name || code,
          email: `${code}@vendor.local`,
          mobile: code,
          address: 'Pending Registration',
          city: 'N/A',
          state: 'N/A',
          status: 'Pending' as const,
          aadhar: '',
          pan: '',
          gstin: '',
          category: 'Individual' as const,
        }));

      if (vendorRecords.length === 0) {
        return res.json({ created: 0, vendors: [] });
      }

      // INSERT ALL IN SINGLE BATCH
      const insertedVendors = await db
        .insert(vendors)
        .values(vendorRecords)
        .returning();

      const results = insertedVendors.map(v => ({
        code: v.code,
        id: v.id,
        name: v.name
      }));

      console.log(`[Routes] batch-create COMPLETE: ${insertedVendors.length} vendors created in SINGLE BATCH (no loops!)`);
      res.json({ created: insertedVendors.length, vendors: results });
    } catch (error: any) {
      console.error('[Routes] /api/vendors/batch-create error:', error.message);
      res.status(400).json({ error: error.message, created: 0, vendors: [] });
    }
  });

  // Get vendor code to ID mapping (SINGLE BATCH QUERY)
  app.post("/api/vendors/get-mapping", async (req, res) => {
    try {
      const { vendors: vendorsList } = req.body;

      if (!Array.isArray(vendorsList)) {
        return res.status(400).json({ error: "vendors must be an array" });
      }

      if (vendorsList.length === 0) {
        return res.json({ mapping: {} });
      }

      console.log(`[Routes] /api/vendors/get-mapping: Getting mapping for ${vendorsList.length} vendors in SINGLE BATCH`);

      // Extract codes
      const codes = vendorsList.map(v => v.code).filter(Boolean);

      // SINGLE DATABASE QUERY to get all vendors
      const vendorRecords = await db
        .select({ code: vendors.vendorCode, id: vendors.id })
        .from(vendors)
        .where(inArray(vendors.vendorCode, codes));

      // Build mapping object
      const mapping: { [code: string]: string } = {};
      for (const vendor of vendorRecords) {
        mapping[vendor.code || ''] = vendor.id;
      }

      console.log(`[Routes] get-mapping COMPLETE: ${Object.keys(mapping).length}/${vendorsList.length} mappings found (SINGLE BATCH QUERY - no loops!)`);
      res.json({ mapping });
    } catch (error: any) {
      console.error('[Routes] /api/vendors/get-mapping error:', error.message);
      res.status(400).json({ error: error.message, mapping: {} });
    }
  });

  // Fetch vendor by code (exact match) - used as fallback by importer
  app.get("/api/vendors/by-code/:code", async (req, res) => {
    try {
      const code = String(req.params.code || '').trim();
      if (!code) return res.status(400).json({ error: 'code required' });
      const vendor = await storage.getVendorByCode(code);
      if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
      res.json(vendor);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/vendors/:id/usage", async (req, res) => {
    try {
      const vendorId = req.params.id;
      const [sites, pos, vendorInvoices] = await Promise.all([
        storage.getSitesByVendor(vendorId),
        db
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.vendorId, vendorId)),
        db.select().from(invoices).where(eq(invoices.vendorId, vendorId)),
      ]);
      const isUsed =
        sites.length > 0 || pos.length > 0 || vendorInvoices.length > 0;
      res.json({ isUsed });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/vendors", async (req, res) => {
    try {
      await storage.deleteAllVendors();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Site routes
  app.post("/api/sites", async (req, res) => {
    try {
      const data = insertSiteSchema.parse(req.body);
      const site = await storage.createSite(data);
      res.json(site);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/sites/upsert", async (req, res) => {
    try {
      // Log incoming site upsert requests for debugging import issues
      console.log('[Routes] /api/sites/upsert request body keys:', Object.keys(req.body));
      const data = insertSiteSchema.parse(req.body);
      const site = await storage.upsertSiteByPlanId(data);
      res.json(site);
    } catch (error: any) {
      // Map DB unique-constraint errors to friendly messages
      let userMessage = error.message || 'Failed to upsert site';
      if (error.code === '23505' || (typeof error.message === 'string' && error.message.includes('sites_site_id_unique'))) {
        const dup = req.body?.siteId || '-';
        userMessage = `Duplicate site identifier: a site with site_id "${dup}" already exists.`;
      }
      console.error('[Routes] /api/sites/upsert error:', {
        errorMessage: error.message,
        userMessage,
        planId: req.body?.planId,
        siteId: req.body?.siteId,
      });
      res.status(400).json({ error: userMessage, planId: req.body?.planId, siteId: req.body?.siteId });
    }
  });

  // Batch insert sites for faster bulk imports
  app.post("/api/sites/batch-upsert", async (req, res) => {
    try {
      const { sites: sitesData } = req.body;
      console.log(`[Routes] /api/sites/batch-upsert content-length: ${req.headers['content-length']}`);

      if (!Array.isArray(sitesData)) {
        return res.status(400).json({ error: "sites must be an array" });
      }

      if (sitesData.length === 0) {
        return res.json({ successful: 0, failed: 0, errors: [] });
      }

      console.log(`[Routes] /api/sites/batch-upsert: Processing ${sitesData.length} sites - INTELLIGENT PARALLEL BATCH MODE`);

      const results = {
        successful: 0,
        failed: 0,
        errors: [] as Array<{ planId: string; siteId: string; error: string }>
      };

      // STEP 1: Extract all planIds and find duplicates in SINGLE QUERY
      const stepStartTime = Date.now();
      console.log(`[Routes] STEP 1: Identifying duplicate planIds...`);

      const planIds = sitesData.map(s => (s as any).planId).filter(Boolean);
      const existingPlans = await db
        .select({ planId: sites.planId })
        .from(sites)
        .where(inArray(sites.planId, planIds));

      const existingPlanIdSet = new Set(existingPlans.map(s => s.planId));
      console.log(`[Routes] ✅ STEP 1 Complete: Found ${existingPlanIdSet.size} existing planIds in ${Date.now() - stepStartTime}ms`);

      // STEP 2: Split into INSERT and UPDATE groups
      console.log(`[Routes] STEP 2: Splitting into INSERT and UPDATE groups...`);
      const splitStartTime = Date.now();

      const insertSites = [];
      const updateSites = [];

      for (const siteData of sitesData) {
        const { rowNum, ...cleanData } = siteData as any;
        if (existingPlanIdSet.has(cleanData.planId)) {
          updateSites.push(cleanData);
        } else {
          insertSites.push(cleanData);
        }
      }

      console.log(`[Routes] ✅ STEP 2 Complete: ${insertSites.length} to INSERT, ${updateSites.length} to UPDATE (${Date.now() - splitStartTime}ms)`);

      // STEP 3: Run INSERT and UPDATE in PARALLEL with 100-site batches
      console.log(`[Routes] STEP 3: Running PARALLEL inserts and updates (100 sites per batch)...`);
      const parallelStartTime = Date.now();

      const BATCH_SIZE = 100;

      // Process INSERT in parallel batches
      const insertPromises = [];
      for (let i = 0; i < insertSites.length; i += BATCH_SIZE) {
        const batch = insertSites.slice(i, i + BATCH_SIZE);
        const batchIdx = Math.floor(i / BATCH_SIZE) + 1;
        const batchStart = i;
        const batchEnd = Math.min(i + BATCH_SIZE, insertSites.length);

        const insertPromise = (async () => {
          try {
            const batchInsertStart = Date.now();
            console.log(`[Routes] INSERT Batch ${batchIdx} (${batchStart}-${batchEnd}/${insertSites.length}): Inserting ${batch.length} sites...`);

            await db.insert(sites).values(batch);

            const batchTime = Date.now() - batchInsertStart;
            console.log(`[Routes] ✅ INSERT Batch ${batchIdx} Complete: ${batch.length} sites inserted in ${batchTime}ms`);
            results.successful += batch.length;
            return { type: 'insert', count: batch.length, time: batchTime };
          } catch (error: any) {
            console.error(`[Routes] ❌ INSERT Batch ${batchIdx} Failed:`, error.message);
            // Try to insert individually to identify specific errors
            let successCount = 0;
            for (const site of batch) {
              try {
                await db.insert(sites).values([site]);
                successCount++;
                results.successful++;
              } catch (siteError: any) {
                      // Normalize DB errors into clear, actionable messages
                      let errMsg = siteError.message || String(siteError);
                      if (siteError.code === '23505' || (typeof siteError.message === 'string' && siteError.message.includes('sites_site_id_unique'))) {
                        const dup = site.siteId || (siteError.detail && String(siteError.detail).match(/\(([^)]+)\)=\(([^)]+)\)/)?.[2]) || '-';
                        errMsg = `Duplicate site identifier: a site with site_id "${dup}" already exists. Consider updating the existing site or using a different Site ID.`;
                      }
                      results.failed++;
                      results.errors.push({
                        planId: site.planId || '-',
                        siteId: site.siteId || '-',
                        error: errMsg
                      });
              }
            }
            return { type: 'insert', count: successCount, time: 0 };
          }
        })();

        insertPromises.push(insertPromise);
      }

      // Process UPDATE in parallel batches
      const updatePromises = [];
      for (let i = 0; i < updateSites.length; i += BATCH_SIZE) {
        const batch = updateSites.slice(i, i + BATCH_SIZE);
        const batchIdx = Math.floor(i / BATCH_SIZE) + 1;
        const batchStart = i;
        const batchEnd = Math.min(i + BATCH_SIZE, updateSites.length);

        const updatePromise = (async () => {
          try {
            const batchUpdateStart = Date.now();
            console.log(`[Routes] UPDATE Batch ${batchIdx} (${batchStart}-${batchEnd}/${updateSites.length}): Updating ${batch.length} sites...`);

            let successCount = 0;
            for (const site of batch) {
              try {
                const { planId, siteId, ...updateData } = site;
                // Exclude siteId from update (it's UNIQUE and shouldn't change)
                await db.update(sites).set(updateData).where(eq(sites.planId, planId));
                successCount++;
                results.successful++;
              } catch (siteError: any) {
                results.failed++;
                results.errors.push({
                  planId: site.planId || '-',
                  siteId: site.siteId || '-',
                  error: siteError.message || String(siteError)
                });
              }
            }

            const batchTime = Date.now() - batchUpdateStart;
            console.log(`[Routes] ✅ UPDATE Batch ${batchIdx} Complete: ${successCount}/${batch.length} sites updated in ${batchTime}ms`);
            return { type: 'update', count: successCount, time: batchTime };
          } catch (error: any) {
            console.error(`[Routes] ❌ UPDATE Batch ${batchIdx} Failed:`, error.message);
            results.failed += batch.length;
            for (const site of batch) {
              results.errors.push({
                planId: site.planId || '-',
                siteId: site.siteId || '-',
                error: error.message || String(error)
              });
            }
            return { type: 'update', count: 0, time: 0 };
          }
        })();

        updatePromises.push(updatePromise);
      }

      // STEP 4: Wait for all parallel batches to complete
      console.log(`[Routes] STEP 4: Waiting for ${insertPromises.length} INSERT and ${updatePromises.length} UPDATE batches...`);
      const batchResults = await Promise.all([...insertPromises, ...updatePromises]);

      const parallelTime = Date.now() - parallelStartTime;
      const insertBatches = batchResults.filter(r => r.type === 'insert').length;
      const updateBatches = batchResults.filter(r => r.type === 'update').length;
      console.log(`[Routes] ✅ STEP 3 & 4 Complete: Processed ${insertBatches} INSERT batches and ${updateBatches} UPDATE batches in ${parallelTime}ms`);

      console.log(`[Routes] batch-upsert complete: ${results.successful} successful, ${results.failed} failed`);

      // Return results
      return res.json(results);
    } catch (error: any) {
      console.error('═══════════════════════════════════════════════════════════');
      console.error('[Routes] CRITICAL ERROR in /api/sites/batch-upsert outer catch:');
      console.error('Message:', error.message);
      console.error('Name:', error.name);
      console.error('Code:', error.code);
      console.error('Stack:', error.stack);
      console.error('Error Object:', safeStringify(error));
      console.error('═══════════════════════════════════════════════════════════');

      // Friendly handling for unique constraint violations on site_id
      if (error && (error.code === '23505' || (typeof error.message === 'string' && error.message.includes('sites_site_id_unique')))) {
        // Try to extract the conflicting value from error.detail if available
        let dupVal = '-';
        try {
          const m = String(error.detail || '').match(/\(([^)]+)\)=\(([^)]+)\)/);
          if (m) dupVal = m[2];
        } catch (e) {}

        const userMessage = `Duplicate site identifier detected during import: a site with site_id "${dupVal}" already exists. Please remove or rename duplicate rows and try again, or use update mode to modify existing sites.`;
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_SITE_ID',
            message: userMessage,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] as string
          },
          successful: 0,
          failed: sitesData.length,
          errors: []
        });
      }

      // Default: internal server error
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: process.env.NODE_ENV === 'development'
            ? `Batch upsert failed: ${error.message}`
            : 'An internal error occurred. Please try again later.',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string
        },
        successful: 0,
        failed: 0,
        errors: []
      });
    }
  });

  app.get("/api/sites", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const offset = (page - 1) * pageSize;

      // Get search and filter parameters
      const search = (req.query.search as string || '').trim().toLowerCase();
      const status = (req.query.status as string || '').trim();
      const circle = (req.query.circle as string || '').trim();
      const vendorId = (req.query.vendorId as string || '').trim();

      // Build database query filters
      const filters = [];

      if (search) {
        const pattern = `%${search}%`;
        filters.push(
          or(
            ilike(sites.planId, pattern),
            ilike(sites.partnerCode, pattern),
            ilike(sites.partnerName, pattern),
            ilike(sites.circle, pattern),
            ilike(sites.hopAB, pattern),
            ilike(sites.maxAntSize, pattern),
            ilike(sites.softAtStatus, pattern),
            ilike(sites.phyAtStatus, pattern),
            // Search vendor_amount (cast decimal to text)
            sql`CAST(${sites.vendorAmount} AS TEXT) ILIKE ${pattern}`
          )
        );
      }

      if (status && status !== 'All') {
        filters.push(eq(sites.status, status));
      }

      if (circle && circle !== 'All') {
        filters.push(eq(sites.circle, circle));
      }

      if (vendorId && vendorId !== 'All') {
        filters.push(eq(sites.vendorId, vendorId));
      }

      // Date range filter for Site A Installation Date (site_a_installation_date)
      const siteAInstallFrom = (req.query.siteAInstallFrom as string || '').trim();
      const siteAInstallTo = (req.query.siteAInstallTo as string || '').trim();
      // ATP status filters (phyAtStatus / softAtStatus)
      const phyAtStatus = (req.query.phyAtStatus as string || '').trim();
      const softAtStatus = (req.query.softAtStatus as string || '').trim();
      if (siteAInstallFrom) {
        try { filters.push(gte(sites.siteAInstallationDate, new Date(siteAInstallFrom))); } catch (e) {}
      }
      if (siteAInstallTo) {
        try { filters.push(lte(sites.siteAInstallationDate, new Date(siteAInstallTo))); } catch (e) {}
      }

      // Apply ATP status filters (case-insensitive match)
      if (phyAtStatus) {
        const pattern = phyAtStatus;
        filters.push(ilike(sites.phyAtStatus, pattern));
      }
      if (softAtStatus) {
        const pattern = softAtStatus;
        filters.push(ilike(sites.softAtStatus, pattern));
      }

      // Build the where clause
      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      // Debug: log search and filter info to help diagnose SQL errors
      console.debug('[Sites API] search:', search, 'filtersCount:', filters.length);

      // Parallel execution: count + fetch in parallel for better performance
      const [countResult, paginatedSites] = await Promise.all([
        // Count query (include vendor join so vendor-based search filters work)
        db
          .select({ count: count() })
          .from(sites)
          .leftJoin(vendors, eq(sites.vendorId, vendors.id))
          .where(whereClause),
        // Complete sites query with ALL columns and joins
        db
          .select()
          .from(sites)
          .leftJoin(vendors, eq(sites.vendorId, vendors.id))
          .leftJoin(
            paymentMasters,
            and(
              eq(sites.id, paymentMasters.siteId),
              eq(sites.planId, paymentMasters.planId),
              eq(sites.vendorId, paymentMasters.vendorId),
              eq(sites.maxAntSize, paymentMasters.antennaSize)
            )
          )
          .where(whereClause)
          .orderBy(sites.createdAt)
          .limit(pageSize)
          .offset(offset)
      ]);

      const totalCount = countResult[0]?.count || 0;

      // Format data - flatten joined tables and convert decimal types to numbers
      const formattedData = paginatedSites
        .filter((row: any) => row != null && row.sites != null)
        .map((row: any) => {
          const site = row.sites;
          const vendor = row.vendors || {};
          const payment = row.payment_masters || {};

          return {
            // All site fields
            ...site,
            // Convert decimal fields to numbers
            siteAmount: site.siteAmount ? parseFloat(site.siteAmount.toString()) : null,
            vendorAmount: site.vendorAmount ? parseFloat(site.vendorAmount.toString()) : null,
            // Add vendor information
            vendorCode: vendor.vendorCode || site.partnerCode || null,
            vendorName: vendor.name || site.partnerName || null,
            vendorEmail: vendor.email || null,
            // Add payment master information
            paymentVendorAmount: payment.vendorAmount ? parseFloat(payment.vendorAmount.toString()) : null,
            paymentSiteAmount: payment.siteAmount ? parseFloat(payment.siteAmount.toString()) : null,
            paymentAntennaSize: payment.antennaSize || null,
          };
        });

      res.json({
        data: formattedData,
        totalCount,
        pageNumber: page,
        pageSize,
      });
    } catch (error: any) {
      console.error('[Sites API] Error:', error.stack || error);
      res.status(500).json({ error: error?.message || String(error) });
    }
  });

  // ATP counts endpoint - returns aggregated counts for phyAtStatus and softAtStatus
  app.get('/api/sites/atp-counts', async (req, res) => {
    try {
      // Group by phyAtStatus
      const phyRows = await db
        .select({ status: sites.phyAtStatus, c: count() })
        .from(sites)
        .groupBy(sites.phyAtStatus);

      // Group by softAtStatus
      const softRows = await db
        .select({ status: sites.softAtStatus, c: count() })
        .from(sites)
        .groupBy(sites.softAtStatus);

      const phy: Record<string, number> = {};
      for (const row of phyRows) {
        const key = (row.status || 'Unknown').toString().trim();
        phy[key] = Number(row.c) || 0;
      }

      const soft: Record<string, number> = {};
      for (const row of softRows) {
        const key = (row.status || 'Unknown').toString().trim();
        soft[key] = Number(row.c) || 0;
      }

      const totalCount = await storage.getSiteCount();

      res.json({ phy, soft, totalCount });
    } catch (error: any) {
      console.error('[Sites ATP Counts] Error:', error?.stack || error);
      res.status(500).json({ error: error?.message || String(error) });
    }
  });

  app.get("/api/vendors/:vendorId/sites", async (req, res) => {
    try {
      const sites = await storage.getSitesByVendor(req.params.vendorId);
      const formattedData = sites.map((site) => ({
        ...site,
        vendorAmount: site.vendorAmount
          ? parseFloat(site.vendorAmount.toString())
          : null,
        siteAmount: site.siteAmount
          ? parseFloat(site.siteAmount.toString())
          : null,
      }));
      res.json(formattedData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sites/for-po-generation", requireAuth, async (req, res) => {
    try {
      // Check role - employees take priority over vendors
      const isEmployee = !!req.session?.employeeId;
      const isVendor = !!req.session?.vendorId && !isEmployee;
      const vendorId = req.session?.vendorId;
      
      console.log('[Sites for PO] Request from:', isEmployee ? 'Employee' : (isVendor ? `Vendor: ${vendorId}` : 'Unknown'));
      
      let data = await storage.getSitesForPOGeneration();
      console.log('[Sites for PO] Total approved sites from DB:', data.length);
      console.log('[Sites for PO] Sites:', data.map(s => ({ id: s.id, planId: s.planId, vendorId: s.vendorId, softAt: s.softAtStatus, phyAt: s.phyAtStatus })));
      
      // Filter for vendor-specific sites ONLY if user is a vendor (not an employee)
      if (isVendor && vendorId) {
        data = data.filter(site => site.vendorId === vendorId);
        console.log('[Sites for PO] After vendor filter:', data.length);
      }
      
      const formattedData = data.map((site) => ({
        ...site,
        vendorAmount: site.vendorAmount
          ? parseFloat(site.vendorAmount.toString())
          : null,
        siteAmount: site.siteAmount
          ? parseFloat(site.siteAmount.toString())
          : null,
      }));
      res.json({ data: formattedData });
    } catch (error: any) {
      console.error('[Sites for PO] Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sites/export/by-date-range", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ error: "startDate and endDate are required" });
      }

      const sites = await storage.getSitesByDateRange(startDate, endDate);
      res.json({ data: sites });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stream CSV export for large result sets (paginated reads to avoid high memory usage)
  app.get("/api/sites/export/stream", async (req, res) => {
    try {
      // Accept same filters as /api/sites: vendorId, siteAInstallFrom, siteAInstallTo, search
      const vendorId = (req.query.vendorId as string || '').trim();
      const siteAInstallFrom = (req.query.siteAInstallFrom as string || '').trim();
      const siteAInstallTo = (req.query.siteAInstallTo as string || '').trim();
      const search = (req.query.search as string || '').trim().toLowerCase();
      const format = (req.query.format as string || 'csv').toLowerCase();

      // Build filters similar to /api/sites
      const filters = [] as any[];
      if (search) {
        const pattern = `%${search}%`;
        filters.push(
          or(
            sql`${sites.siteId} ILIKE ${pattern}`,
            sql`${sites.planId} ILIKE ${pattern}`,
            sql`${sites.partnerName} ILIKE ${pattern}`
          )
        );
      }
      if (vendorId && vendorId !== 'All') {
        filters.push(eq(sites.vendorId, vendorId));
      }
      if (siteAInstallFrom) {
        try { filters.push(gte(sites.siteAInstallationDate, new Date(siteAInstallFrom))); } catch (e) {}
      }
      if (siteAInstallTo) {
        try { filters.push(lte(sites.siteAInstallationDate, new Date(siteAInstallTo))); } catch (e) {}
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      // CSV streaming only for now
      if (format !== 'csv') {
        return res.status(400).json({ error: 'Only csv streaming supported' });
      }

      // prepare response headers
      const dateTag = new Date().toISOString().slice(0,10);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=sites_export_${dateTag}.csv`);

      // Helper to escape CSV values
      const escapeCsv = (v: any) => {
        if (v === null || v === undefined) return '';
        const str = String(v);
        if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };

      // Header row - default, template-driven, or export all DB columns
      const useTemplate = (req.query.useTemplate as string || '').toLowerCase() === 'true';
      const exportAllColumns = (req.query.allColumns as string || '').toLowerCase() === 'true';
      let headers: string[] = [];

      if (useTemplate) {
        try {
          const xlsx = await import('xlsx');
          const path = await import('path');
          const fs = await import('fs');
          const filePath = path.join(process.cwd(), 'generated_from_prev_full_50_rows.xlsx');
          if (fs.existsSync(filePath)) {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json<string[]>(sheet, { header: 1 });
            headers = (rows && rows.length > 0 && rows[0]) ? rows[0].map((c: any) => (typeof c === 'string' ? c.trim() : String(c))) : [];
          }
        } catch (e) {
          console.warn('[Routes] Failed to read template columns, falling back to defaults', e);
          headers = [];
        }
      }

      if (!headers || headers.length === 0) {
        // If exportAllColumns is requested, defer header creation until we fetch the first batch
        if (!exportAllColumns) {
          headers = Object.keys({
            siteId: "Site ID",
            planId: "Plan ID",
            partnerCode: "Partner Code",
            partnerName: "Partner Name",
            vendorId: "Vendor ID",
            vendorCode: "Vendor Code",
            vendorName: "Vendor Name",
            circle: "Circle",
            maxAntSize: "Max Ant Size",
            siteAInstallationDate: "Site A Installation Date",
          });
        }
      }

      // Page through results in batches to keep memory use bounded
      const batchSize = 1000;
      let offset = 0;
      let firstWrite = true;
      while (true) {
        // Select full site row so we can map to arbitrary template headers
        const rows = await db
          .select()
          .from(sites)
          .where(whereClause)
          .limit(batchSize)
          .offset(offset);

        if (!rows || rows.length === 0) break;

        // If caller requested all DB columns, derive headers from the first returned row
        if (exportAllColumns && (!headers || headers.length === 0)) {
          headers = Object.keys(rows[0]).map(k => k);
        }

        // write header row once
        if (firstWrite) {
          res.write(headers.map(h => escapeCsv(h)).join(',') + '\n');
          firstWrite = false;
        }

        for (const r of rows) {
          const flat = { ...r } as any; // site row is flat
          // Helper to normalize keys for matching (strip non-alnum, lowercase)
          const normalize = (s: string) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
          const line = headers.map(h => {
            // direct property match first
            if (flat.hasOwnProperty(h)) return escapeCsv(flat[h]);
            // otherwise try to match normalized header -> key
            const nh = normalize(h);
            const key = Object.keys(flat).find(k => normalize(k) === nh);
            const val = key ? flat[key] : '';
            return escapeCsv(val);
          }).join(',') + '\n';

          if (!res.write(line)) {
            // if write returns false, wait for drain
            await new Promise<void>((resolve) => res.once('drain', () => resolve()));
          }
        }

        offset += rows.length;
        // If fewer than batch size returned, we're done
        if (rows.length < batchSize) break;
      }

      res.end();
    } catch (error: any) {
      console.error('[Routes] /api/sites/export/stream error', error);
      if (!res.headersSent) res.status(500).json({ error: error.message });
      else res.end();
    }
  });

  app.get("/api/sites/:id", async (req, res) => {
    try {
      const site = await storage.getSite(req.params.id);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      res.json(site);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Diagnostic endpoint: returns site + joined vendor and resolved fields for debugging
  app.get('/api/sites/:id/debug', async (req, res) => {
    try {
      const id = req.params.id;
      const [row] = await db
        .select({
          id: sites.id,
          siteId: sites.siteId,
          planId: sites.planId,
          partnerCode: sites.partnerCode,
          partnerName: sites.partnerName,
          vendorId: sites.vendorId,
          vendor_code: vendors.vendor_code,
          vendor_name: vendors.name,
          site_hop_ab: sites.hopAB,
        })
        .from(sites)
        .leftJoin(vendors, eq(sites.vendorId, vendors.id))
        .where(eq(sites.id, id))
        .limit(1);

      if (!row) return res.status(404).json({ error: 'Site not found' });

      const resolvedVendorCode = row.vendor_code || row.partnerCode || null;
      const resolvedVendorName = row.vendor_name || row.partnerName || null;

      res.json({
        site: row,
        resolved: {
          vendorCode: resolvedVendorCode,
          vendorName: resolvedVendorName,
          vendorCodeFrom: row.vendor_code ? 'vendor' : (row.partnerCode ? 'site' : null),
          vendorNameFrom: row.vendor_name ? 'vendor' : (row.partnerName ? 'site' : null),
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/sites/:id", async (req, res) => {
    try {
      // Check if a PO has been generated for this site
      const existingPO = await storage.getPOBySiteId(req.params.id);
      if (existingPO) {
        return res.status(400).json({
          error:
            "Cannot update site: A Purchase Order has already been generated for this site. Once a PO is created, the site is locked from all updates.",
        });
      }

      const data = insertSiteSchema.partial().parse(req.body);
      const site = await storage.updateSite(req.params.id, data);
      res.json(site);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/sites/:id/status", async (req, res) => {
    try {
      const { status, remark } = req.body;

      // Check if a PO has been generated for this site
      const existingPO = await storage.getPOBySiteId(req.params.id);
      if (existingPO) {
        return res.status(400).json({
          error:
            "Cannot update site status: A Purchase Order has already been generated for this site. Once a PO is created, the site status is locked.",
        });
      }

      const site = await storage.updateSite(req.params.id, { status });
      res.json(site);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/sites/:id", async (req, res) => {
    try {
      await storage.deleteSite(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/sites", async (req, res) => {
    try {
      await storage.deleteAllSites();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sites/recalculate-status", async (req, res) => {
    try {
      const result = await storage.recalculateSiteStatuses();
      res.json({
        success: true,
        message: `Updated ${result.updated} sites to Approved status`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sites/bulk-update-remarks", async (req, res) => {
    try {
      console.log("[API] bulk-update-remarks called with:", req.body);
      const { siteIds, phyAtRemark, softAtRemark } = req.body;

      if (!siteIds || siteIds.length === 0) {
        console.log("[API] No siteIds provided");
        return res.status(400).json({ error: "No sites selected" });
      }
      if (!phyAtRemark && !softAtRemark) {
        console.log("[API] No remarks provided");
        return res
          .status(400)
          .json({ error: "Please select at least one remark to update" });
      }

      console.log("[API] Calling bulkUpdateRemarks with:", {
        siteIds,
        phyAtRemark,
        softAtRemark,
      });
      const result = await storage.bulkUpdateRemarks(
        siteIds,
        phyAtRemark,
        softAtRemark,
      );
      console.log("[API] bulkUpdateRemarks result:", result);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[API] bulkUpdateRemarks error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/sites/bulk-update-status", async (req, res) => {
    try {
      const { siteIds, phyAtStatus, softAtStatus } = req.body;

      if (!siteIds || siteIds.length === 0) {
        return res.status(400).json({ error: "No sites selected" });
      }
      if (!phyAtStatus && !softAtStatus) {
        return res
          .status(400)
          .json({ error: "Please select at least one status to update" });
      }

      const result = await storage.bulkUpdateStatus(
        siteIds,
        phyAtStatus,
        softAtStatus,
      );
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[API] bulkUpdateStatus error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/sites/bulk-update-status-by-plan", async (req, res) => {
    try {
      const { planIds, phyAtStatus, softAtStatus, shouldApproveStatus } =
        req.body;

      if (!planIds || planIds.length === 0) {
        res.setHeader("Content-Type", "application/json");
        return res.status(400).json({ error: "No sites selected" });
      }
      if (!phyAtStatus && !softAtStatus) {
        res.setHeader("Content-Type", "application/json");
        return res
          .status(400)
          .json({ error: "Please select at least one status to update" });
      }

      console.log(
        "[API] Bulk update by plan - planIds:",
        planIds,
        "phyAtStatus:",
        phyAtStatus,
        "softAtStatus:",
        softAtStatus,
      );

      // Call the bulk update which handles AT status updates
      const result = await storage.bulkUpdateStatusByPlanId(
        planIds,
        phyAtStatus,
        softAtStatus,
      );

      // Fetch existing sites to get current AT status values
      const existingSites = await db
        .select()
        .from(sites)
        .where(inArray(sites.planId, planIds));

      // Auto-update site status for each site based on BOTH AT statuses (new + existing)
      console.log("[API] Auto-updating site status based on AT statuses");
      const updatePromises = existingSites.map(async (site) => {
        // Use new values if provided, otherwise use existing values
        const finalPhyAtStatus = phyAtStatus || site.phyAtStatus;
        const finalSoftAtStatus = softAtStatus || site.softAtStatus;

        console.log(
          `[API] Site ${site.planId}: phyAtStatus=${finalPhyAtStatus}, softAtStatus=${finalSoftAtStatus}`,
        );

        // Site is Approved only if BOTH AT statuses are Approved
        let newStatus = "Pending";
        if (
          finalPhyAtStatus === "Approved" &&
          finalSoftAtStatus === "Approved"
        ) {
          newStatus = "Approved";
        }

        console.log(
          `[API] Setting site ${site.planId} status to: ${newStatus}`,
        );

        return db
          .update(sites)
          .set({ status: newStatus })
          .where(eq(sites.planId, site.planId));
      });

      await Promise.all(updatePromises);
      console.log("[API] Site status update complete");

      res.setHeader("Content-Type", "application/json");
      res.status(200).json({ success: true, updated: result.updated });
    } catch (error: any) {
      console.error("[API] bulkUpdateStatusByPlan error:", error);
      res.setHeader("Content-Type", "application/json");
      res.status(400).json({ error: error.message });
    }
  });

  // Employee routes - protected by authentication
  app.post("/api/employees", async (req, res) => {
    try {
      const data = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(data);
      res.json(employee);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/employees", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const offset = (page - 1) * pageSize;

      const employees = await storage.getEmployees(pageSize, offset);
      const totalCount = await storage.getEmployeeCount();

      res.json({
        data: employees || [],
        totalCount: totalCount || 0,
        pageNumber: page,
        pageSize,
      });
    } catch (error: any) {
      console.error("[API] GET /api/employees error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to load employees" });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/employees/batch", async (req, res) => {
    try {
      const { employeeIds } = req.body;
      if (!Array.isArray(employeeIds)) {
        return res.status(400).json({ error: "employeeIds must be an array" });
      }

      const employeeList = await Promise.all(
        employeeIds.map(id => storage.getEmployee(id))
      );

      const employees = employeeList
        .filter(emp => emp !== undefined)
        .map(emp => ({
          id: emp?.id,
          name: emp?.name || emp?.id,
        }));

      res.json({ employees });
    } catch (error: any) {
      console.error("[API] POST /api/employees/batch error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch employees" });
    }
  });

  app.put("/api/employees/:id", async (req, res) => {
    try {
      const data = insertEmployeeSchema.partial().parse(req.body);
      console.log(
        `[API] PUT /api/employees/${req.params.id} - DOB value:`,
        data.dob,
      );
      const employee = await storage.updateEmployee(req.params.id, data);
      console.log(`[API] Employee updated - New DOB in DB:`, employee.dob);
      res.json(employee);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      await storage.deleteEmployee(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Salary routes
  app.post("/api/salary-structures", async (req, res) => {
    try {
      // Validate input using insertSalarySchema
      const validated = insertSalarySchema.parse(req.body);

      // Convert all numeric fields to strings for decimal handling with proper rounding
      const body = { ...validated };
      const fields = [
        "basicSalary",
        "hra",
        "da",
        "lta",
        "conveyance",
        "medical",
        "bonuses",
        "otherBenefits",
        "pf",
        "professionalTax",
        "incomeTax",
        "epf",
        "esic",
      ];
      for (const field of fields) {
        if (body[field as keyof typeof body] !== undefined && body[field as keyof typeof body] !== null) {
          // Round to 2 decimals to prevent floating-point precision issues
          const numValue = Number((body as any)[field]);
          (body as any)[field] = Number(numValue.toFixed(2)).toFixed(2);
        }
      }
      // Create salary after validation
      const salary = await storage.createSalary(body);
      res.json(salary);
    } catch (error: any) {
      console.error("[Salary Create Error]:", error.message);
      res
        .status(400)
        .json({ error: error.message || "Failed to save salary structure" });
    }
  });

  app.get("/api/employees/:employeeId/salary", async (req, res) => {
    try {
      const salary = await storage.getSalaryByEmployee(req.params.employeeId);
      if (!salary) {
        return res.status(404).json({ error: "Salary not found" });
      }
      res.json(salary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/salary-structures", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const offset = (page - 1) * pageSize;

      const data = await storage.getSalaries(pageSize, offset);
      res.json({ data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Return total count of salary structures (for dashboard/stat cards)
  app.get("/api/salary-structures/count", async (req, res) => {
    try {
      const [row] = await db.select({ total: count() }).from(salaryStructures);
      const total = Number((row as any)?.total) || 0;
      res.json({ count: total });
    } catch (error: any) {
      console.error("[Salary Structures Count Error]:", error);
      res.status(500).json({ error: error.message || "Failed to get salary structures count" });
    }
  });

  // Issue a short-lived print token (HMAC-signed). Only the employee themself or admin can request.
  app.post("/api/print-token/:employeeId", async (req, res) => {
    try {
      const sessionEmployeeId = req.session?.employeeId as string | undefined;
      const sessionRole = (req.session as any)?.employeeRole as string | undefined;
      const employeeId = req.params.employeeId;

      if (!req.session || (sessionRole !== "admin" && sessionEmployeeId !== employeeId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const ttl = Number(req.body?.ttl) || 60 * 15; // default 15 minutes
      const token = createPrintToken(employeeId, ttl);

      const host = req.get("host") || "";
      const protocol = req.protocol || "http";
      const url = `${protocol}://${host}/print/salary?token=${encodeURIComponent(token)}`;

      res.json({ token, url, expiresIn: ttl });
    } catch (error: any) {
      console.error("[Print Token Error]:", error);
      res.status(500).json({ error: error.message || "Failed to generate token" });
    }
  });

  // Printable salary via token: GET /print/salary?token=...  (alternative to session-based route)
  app.get("/print/salary", async (req, res) => {
    try {
      const token = (req.query.token as string) || "";
      if (!token) return res.status(400).send("Missing token");
      const payload = verifyPrintToken(token);
      if (!payload) return res.status(403).send("Invalid or expired token");

      const employeeId = payload.employeeId;
      const salary = await storage.getSalaryByEmployee(employeeId);
      if (!salary) {
        return res.status(404).send("Salary not found");
      }

      // Ensure calculated fields exist when `salary_structures` only stores base components
      const toNum2 = (v: any) => {
        if (v === undefined || v === null) return 0;
        return typeof v === 'string' ? parseFloat(v) || 0 : Number(v) || 0;
      };
      const basicSalary2 = toNum2(salary.basicSalary);
      const hra2 = toNum2(salary.hra);
      const da2 = toNum2(salary.da);
      const lta2 = toNum2(salary.lta);
      const conveyance2 = toNum2(salary.conveyance);
      const medical2 = toNum2(salary.medical);
      const bonuses2 = toNum2(salary.bonuses);
      const otherBenefits2 = toNum2((salary as any).otherBenefits || (salary as any).other_benefits);

      const pf2 = toNum2(salary.pf);
      const professionalTax2 = toNum2(salary.professionalTax || (salary as any).professional_tax);
      const incomeTax2 = toNum2(salary.incomeTax || (salary as any).income_tax);
      const epf2 = toNum2(salary.epf);
      const esic2 = toNum2(salary.esic);

      const grossSalary2 = basicSalary2 + hra2 + da2 + lta2 + conveyance2 + medical2 + bonuses2 + otherBenefits2;
      const totalDeductions2 = pf2 + professionalTax2 + incomeTax2 + epf2 + esic2;
      const netSalary2 = grossSalary2 - totalDeductions2;

      (salary as any).grossSalary = grossSalary2;
      (salary as any).totalDeductions = totalDeductions2;
      (salary as any).netSalary = netSalary2;

      // Ensure calculated fields exist when `salary_structures` only stores base components
      const toNum = (v: any) => {
        if (v === undefined || v === null) return 0;
        return typeof v === 'string' ? parseFloat(v) || 0 : Number(v) || 0;
      };
      const basicSalary = toNum(salary.basicSalary);
      const hra = toNum(salary.hra);
      const da = toNum(salary.da);
      const lta = toNum(salary.lta);
      const conveyance = toNum(salary.conveyance);
      const medical = toNum(salary.medical);
      const bonuses = toNum(salary.bonuses);
      const otherBenefits = toNum((salary as any).otherBenefits || (salary as any).other_benefits);

      const pf = toNum(salary.pf);
      const professionalTax = toNum(salary.professionalTax || (salary as any).professional_tax);
      const incomeTax = toNum(salary.incomeTax || (salary as any).income_tax);
      const epf = toNum(salary.epf);
      const esic = toNum(salary.esic);

      const grossSalary = basicSalary + hra + da + lta + conveyance + medical + bonuses + otherBenefits;
      const totalDeductions = pf + professionalTax + incomeTax + epf + esic;
      const netSalary = grossSalary - totalDeductions;

      // Attach computed fields so the existing HTML/template can use them
      (salary as any).grossSalary = grossSalary;
      (salary as any).totalDeductions = totalDeductions;
      (salary as any).netSalary = netSalary;

      const employee = (await storage.getEmployee(employeeId)) || {
        name: "",
        email: "",
        mobile: "",
        address: "",
      };

      const header = await storage.getExportHeader();

      const fmt = (v: any) => {
        if (v === undefined || v === null) return "0.00";
        const n = typeof v === "string" ? parseFloat(v) : Number(v);
        if (Number.isNaN(n)) return "0.00";
        return n.toFixed(2);
      };

      const companyName = header?.companyName || "";
      const companyAddress = header?.address || "";
      const contactEmail = header?.contactEmail || "";
      const gstin = header?.gstin || "";
      const website = header?.website || "";

      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const monthLabel = salary.month && salary.month >=1 && salary.month <=12 ? monthNames[salary.month - 1] : String(salary.month);

      const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Salary Slip - ${employee.name || "Employee"}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#222; margin:0; padding:20px; }
          .container { max-width:800px; margin:0 auto; border:1px solid #e5e7eb; padding:20px; }
          .header { display:flex; align-items:center; gap:16px; }
          .brand { background:#e6f4ff; padding:12px 16px; border-radius:6px; color:#0369a1; font-weight:700; font-size:18px; }
          .meta { margin-left:12px; }
          .meta .company { font-size:20px; font-weight:700; }
          .meta .address { font-size:12px; color:#444; margin-top:4px; }
          table { width:100%; border-collapse:collapse; margin-top:16px; }
          th, td { padding:8px 10px; border:1px solid #e6e6e6; text-align:left; }
          th { background:#f3f4f6; }
          .section-title { margin-top:16px; font-weight:700; color:#0f172a; }
          .right { text-align:right; }
          .net { background:#0369a1; color:#fff; font-weight:700; font-size:18px; }
          @media print { body { padding:0; } .container { border:none; padding:0; } }
        </style>
      </head>
      <body>
        <div class="container" id="salary-slip">
          <div class="header">
            <div class="brand">${companyName ? companyName.charAt(0) : ""}</div>
            <div class="meta">
              <div class="company">${companyName}</div>
              <div class="address">${companyAddress} ${website ? ' | ' + website : ''} ${gstin ? ' | GST: ' + gstin : ''}</div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;margin-top:16px">
            <div>
              <div><strong>Employee:</strong> ${employee.name || ""}</div>
              <div><strong>Email:</strong> ${employee.email || ""}</div>
              <div><strong>Mobile:</strong> ${employee.mobile || ""}</div>
            </div>
            <div style="text-align:right">
              <div><strong>Month:</strong> ${monthLabel} ${salary.year || ''}</div>
              <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
            </div>
          </div>

          <div class="section-title">Earnings</div>
          <table>
            <thead>
              <tr><th>Description</th><th class="right">Amount (Rs)</th></tr>
            </thead>
            <tbody>
              <tr><td>Basic Salary</td><td class="right">${fmt(salary.basicSalary)}</td></tr>
              <tr><td>HRA</td><td class="right">${fmt(salary.hra)}</td></tr>
              <tr><td>DA</td><td class="right">${fmt(salary.da)}</td></tr>
              <tr><td>LTA</td><td class="right">${fmt(salary.lta)}</td></tr>
              <tr><td>Conveyance</td><td class="right">${fmt(salary.conveyance)}</td></tr>
              <tr><td>Medical</td><td class="right">${fmt(salary.medical)}</td></tr>
              <tr><td>Bonuses</td><td class="right">${fmt(salary.bonuses)}</td></tr>
              <tr><td>Other Benefits</td><td class="right">${fmt(salary.otherBenefits)}</td></tr>
              <tr><th>Gross Salary</th><th class="right">${fmt((salary as any).grossSalary)}</th></tr>
            </tbody>
          </table>

          <div class="section-title">Deductions</div>
          <table>
            <thead>
              <tr><th>Description</th><th class="right">Amount (Rs)</th></tr>
            </thead>
            <tbody>
              <tr><td>PF</td><td class="right">${fmt(salary.pf)}</td></tr>
              <tr><td>EPF</td><td class="right">${fmt(salary.epf)}</td></tr>
              <tr><td>ESIC</td><td class="right">${fmt(salary.esic)}</td></tr>
              <tr><td>Professional Tax</td><td class="right">${fmt(salary.professionalTax)}</td></tr>
              <tr><td>Income Tax</td><td class="right">${fmt(salary.incomeTax)}</td></tr>
              <tr><th>Total Deductions</th><th class="right">${fmt((salary as any).totalDeductions)}</th></tr>
            </tbody>
          </table>

          <div style="display:flex;justify-content:flex-end;margin-top:12px">
            <div style="min-width:220px;text-align:right;padding:12px;border-radius:6px" class="net">Net Salary: Rs ${fmt((salary as any).netSalary)}</div>
          </div>

          <div style="margin-top:18px;font-size:12px;color:#555">${header?.footerText || ''}</div>
        </div>
        <script>window.print && setTimeout(()=>{ window.print(); }, 250);</script>
      </body>
      </html>
      `;

      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error: any) {
      console.error("[Print Salary Token Error]:", error);
      res.status(500).send("Failed to render salary slip");
    }
  });

  // Server-side printable salary slip (standalone HTML)
  app.get("/print/salary/:employeeId", async (req, res) => {
    try {
      // Authorization: allow if employee is printing their own slip or an admin is requesting
      const sessionEmployeeId = req.session?.employeeId as string | undefined;
      const sessionRole = (req.session as any)?.employeeRole as string | undefined;
      const employeeId = req.params.employeeId;

      if (!req.session || (sessionRole !== "admin" && sessionEmployeeId !== employeeId)) {
        return res.status(403).send("Forbidden: you are not allowed to view this salary slip");
      }

      const salary = await storage.getSalaryByEmployee(employeeId);
      if (!salary) {
        return res.status(404).send("Salary not found");
      }

      const employee = (await storage.getEmployee(employeeId)) || {
        name: "",
        email: "",
        mobile: "",
        address: "",
      };

      const header = await storage.getExportHeader();

      const fmt = (v: any) => {
        if (v === undefined || v === null) return "0.00";
        const n = typeof v === "string" ? parseFloat(v) : Number(v);
        if (Number.isNaN(n)) return "0.00";
        return n.toFixed(2);
      };

      const companyName = header?.companyName || "";
      const companyAddress = header?.address || "";
      const contactEmail = header?.contactEmail || "";
      const gstin = header?.gstin || "";
      const website = header?.website || "";

      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const monthLabel = salary.month && salary.month >=1 && salary.month <=12 ? monthNames[salary.month - 1] : String(salary.month);

      const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Salary Slip - ${employee.name || "Employee"}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#222; margin:0; padding:20px; }
          .container { max-width:800px; margin:0 auto; border:1px solid #e5e7eb; padding:20px; }
          .header { display:flex; align-items:center; gap:16px; }
          .brand { background:#e6f4ff; padding:12px 16px; border-radius:6px; color:#0369a1; font-weight:700; font-size:18px; }
          .meta { margin-left:12px; }
          .meta .company { font-size:20px; font-weight:700; }
          .meta .address { font-size:12px; color:#444; margin-top:4px; }
          table { width:100%; border-collapse:collapse; margin-top:16px; }
          th, td { padding:8px 10px; border:1px solid #e6e6e6; text-align:left; }
          th { background:#f3f4f6; }
          .section-title { margin-top:16px; font-weight:700; color:#0f172a; }
          .right { text-align:right; }
          .net { background:#0369a1; color:#fff; font-weight:700; font-size:18px; }
          @media print { body { padding:0; } .container { border:none; padding:0; } }
        </style>
      </head>
      <body>
        <div class="container" id="salary-slip">
          <div class="header">
            <div class="brand">${companyName ? companyName.charAt(0) : ""}</div>
            <div class="meta">
              <div class="company">${companyName}</div>
              <div class="address">${companyAddress} ${website ? ' | ' + website : ''} ${gstin ? ' | GST: ' + gstin : ''}</div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;margin-top:16px">
            <div>
              <div><strong>Employee:</strong> ${employee.name || ""}</div>
              <div><strong>Email:</strong> ${employee.email || ""}</div>
              <div><strong>Mobile:</strong> ${employee.mobile || ""}</div>
            </div>
            <div style="text-align:right">
              <div><strong>Month:</strong> ${monthLabel} ${salary.year || ''}</div>
              <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
            </div>
          </div>

          <div class="section-title">Earnings</div>
          <table>
            <thead>
              <tr><th>Description</th><th class="right">Amount (Rs)</th></tr>
            </thead>
            <tbody>
              <tr><td>Basic Salary</td><td class="right">${fmt(salary.basicSalary)}</td></tr>
              <tr><td>HRA</td><td class="right">${fmt(salary.hra)}</td></tr>
              <tr><td>DA</td><td class="right">${fmt(salary.da)}</td></tr>
              <tr><td>LTA</td><td class="right">${fmt(salary.lta)}</td></tr>
              <tr><td>Conveyance</td><td class="right">${fmt(salary.conveyance)}</td></tr>
              <tr><td>Medical</td><td class="right">${fmt(salary.medical)}</td></tr>
              <tr><td>Bonuses</td><td class="right">${fmt(salary.bonuses)}</td></tr>
              <tr><td>Other Benefits</td><td class="right">${fmt(salary.otherBenefits)}</td></tr>
              <tr><th>Gross Salary</th><th class="right">${fmt((salary as any).grossSalary)}</th></tr>
            </tbody>
          </table>

          <div class="section-title">Deductions</div>
          <table>
            <thead>
              <tr><th>Description</th><th class="right">Amount (Rs)</th></tr>
            </thead>
            <tbody>
              <tr><td>PF</td><td class="right">${fmt(salary.pf)}</td></tr>
              <tr><td>EPF</td><td class="right">${fmt(salary.epf)}</td></tr>
              <tr><td>ESIC</td><td class="right">${fmt(salary.esic)}</td></tr>
              <tr><td>Professional Tax</td><td class="right">${fmt(salary.professionalTax)}</td></tr>
              <tr><td>Income Tax</td><td class="right">${fmt(salary.incomeTax)}</td></tr>
              <tr><th>Total Deductions</th><th class="right">${fmt((salary as any).totalDeductions)}</th></tr>
            </tbody>
          </table>

          <div style="display:flex;justify-content:flex-end;margin-top:12px">
            <div style="min-width:220px;text-align:right;padding:12px;border-radius:6px" class="net">Net Salary: Rs ${fmt((salary as any).netSalary)}</div>
          </div>

          <div style="margin-top:18px;font-size:12px;color:#555">${header?.footerText || ''}</div>
        </div>
        <script>window.print && setTimeout(()=>{ window.print(); }, 250);</script>
      </body>
      </html>
      `;

      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error: any) {
      console.error("[Print Salary Error]:", error);
      res.status(500).send("Failed to render salary slip");
    }
  });

  app.put("/api/salary-structures/:id", async (req, res) => {
    try {
      // Validate input using insertSalarySchema
      const validated = insertSalarySchema.parse(req.body);

      // Convert all numeric fields to strings for decimal handling with proper rounding
      const body = { ...validated };
      const fields = [
        "basicSalary",
        "hra",
        "da",
        "lta",
        "conveyance",
        "medical",
        "bonuses",
        "otherBenefits",
        "pf",
        "professionalTax",
        "incomeTax",
        "epf",
        "esic",
      ];
      for (const field of fields) {
        if (body[field as keyof typeof body] !== undefined && body[field as keyof typeof body] !== null) {
          // Round to 2 decimals to prevent floating-point precision issues
          const numValue = Number((body as any)[field]);
          (body as any)[field] = Number(numValue.toFixed(2)).toFixed(2);
        }
      }
      // Update salary after validation
      const salary = await storage.updateSalary(req.params.id, body);
      res.json(salary);
    } catch (error: any) {
      console.error("[Salary Update Error]:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to update salary structure" });
    }
  });

  // Purchase Order routes
  app.post("/api/purchase-orders", requireAuth, async (req, res) => {
    try {
      const data = insertPOSchema.parse(req.body);
      
      // Check if vendor is logged in
      const isVendor = !!req.session?.vendorId;
      const isEmployee = !!req.session?.employeeId;
      
      if (isVendor) {
        // Vendors must match the PO vendorId and can only generate on specific dates
        if (data.vendorId !== req.session.vendorId) {
          return res.status(403).json({ error: "You can only generate POs for your own vendor account" });
        }
        
        // Check if today is the allowed PO generation date
        const settings = await storage.getAppSettings();
        const today = new Date().getDate();
        const allowedDate = settings?.poGenerationDate || 1;
        
        if (today !== allowedDate) {
          return res.status(403).json({ 
            error: `Vendors can only generate POs on day ${allowedDate} of each month. Today is day ${today}.` 
          });
        }
      }
      // Employees (especially admins) can generate POs for any vendor anytime
      
      const po = await storage.createPO(data);
      res.json(po);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Session inspection endpoint - returns session info (no auth required, will return authenticated=false if no session)
  app.get("/api/session", async (req, res) => {
    try {
      const isEmployee = !!req.session?.employeeId;
      const isVendor = !!req.session?.vendorId;
      const result: any = {
        authenticated: isEmployee || isVendor,
        isEmployee,
        isVendor,
        employeeId: req.session?.employeeId || null,
        vendorId: req.session?.vendorId || null,
        employeeRole: (req.session as any)?.employeeRole || null,
        employeeEmail: req.session?.employeeEmail || null,
        vendorEmail: req.session?.vendorEmail || null,
      };
      return res.json(result);
    } catch (error: any) {
      console.error('[Session] Error reading session', error?.message || error);
      res.status(500).json({ error: error.message || 'Failed to read session' });
    }
  });

  app.get("/api/purchase-orders", requireAuth, async (req, res) => {
    try {
      const isVendor = !!req.session?.vendorId;
      const vendorId = req.session?.vendorId;
      
      console.log('[PO] GET request - Session:', isVendor ? `Vendor: ${vendorId}` : 'Employee');
      
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const offset = (page - 1) * pageSize;
      const withDetails = req.query.withDetails === 'true';

      if (withDetails) {
        let data = await storage.getPOsWithDetails(pageSize, offset);
        // Filter for vendor-specific data
        if (isVendor && vendorId) {
          data = data.filter(po => po.vendorId === vendorId);
        }
        const totalCount = isVendor && vendorId 
          ? data.length 
          : await storage.getPOCount();
        
        res.json({
          data,
          totalCount,
          pageNumber: page,
          pageSize,
        });
      } else {
        let data = await storage.getPOs(pageSize, offset);
        // Filter for vendor-specific data
        if (isVendor && vendorId) {
          data = data.filter(po => po.vendorId === vendorId);
        }
        const totalCount = isVendor && vendorId 
          ? data.length 
          : await storage.getPOCount();

        res.json({
          data,
          totalCount,
          pageNumber: page,
          pageSize,
        });
      }
    } catch (error: any) {
      console.error('[PO] Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/purchase-orders/:id", requireAuth, async (req, res) => {
    try {
      const po = await storage.getPO(req.params.id);
      if (!po) {
        return res.status(404).json({ error: "PO not found" });
      }
      res.json(po);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/vendors/:vendorId/purchase-orders", async (req, res) => {
    try {
      const pos = await storage.getPOsByVendor(req.params.vendorId);
      res.json({ data: pos });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/purchase-orders/:id", async (req, res) => {
    try {
      const data = insertPOSchema.partial().parse(req.body);
      const po = await storage.updatePO(req.params.id, data);
      res.json(po);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/purchase-orders/:id", async (req, res) => {
    try {
      await storage.deletePO(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Invoice routes
  app.post("/api/invoices", requireAuth, async (req, res) => {
    try {
      const data = insertInvoiceSchema.parse(req.body);
      
      // Check if vendor is logged in
      const isVendor = !!req.session?.vendorId;
      const isEmployee = !!req.session?.employeeId;
      
      if (isVendor) {
        // Vendors must match the invoice vendorId
        if (data.vendorId !== req.session.vendorId) {
          return res.status(403).json({ error: "You can only generate invoices for your own vendor account" });
        }
        
        // Check if the PO is already used in another invoice
        const existingInvoice = await storage.getInvoicesByPO(data.poId);
        if (existingInvoice.length > 0) {
          return res.status(409).json({ 
            error: "This PO is already used in another invoice. Each PO can only have one invoice." 
          });
        }
        
        // Check if today is within the allowed invoice generation date range
        // Vendors can generate invoices from the configured date to 5 days after
        const settings = await storage.getAppSettings();
        const today = new Date().getDate();
        const startDate = settings?.invoiceGenerationDate || 1;
        const endDate = startDate + 5; // 5-day window for invoice generation
        
        if (today < startDate || today > endDate) {
          return res.status(403).json({ 
            error: `Vendors can generate invoices from day ${startDate} to day ${endDate} of each month. Today is day ${today}.` 
          });
        }
      }
      // Employees (especially admins) can generate invoices anytime without date restrictions
      
      const invoice = await storage.createInvoice(data);
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const isVendor = !!req.session?.vendorId;
      const vendorId = req.session?.vendorId;
      
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const offset = (page - 1) * pageSize;

      let data = await storage.getInvoices(pageSize, offset);
      
      // Filter for vendor-specific data
      if (isVendor && vendorId) {
        data = data.filter(invoice => invoice.vendorId === vendorId);
      }
      
      const totalCount = isVendor && vendorId 
        ? data.length 
        : await storage.getInvoiceCount();

      res.json({
        data,
        totalCount,
        pageNumber: page,
        pageSize,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/vendors/:vendorId/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoicesByVendor(req.params.vendorId);
      res.json({ data: invoices });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/purchase-orders/:poId/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoicesByPO(req.params.poId);
      res.json({ data: invoices });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const data = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(req.params.id, data);
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      console.log(
        `[DELETE Invoice] Attempting to delete invoice ID: ${req.params.id}`,
      );
      await storage.deleteInvoice(req.params.id);
      console.log(
        `[DELETE Invoice] Successfully deleted invoice ID: ${req.params.id}`,
      );
      res.json({ success: true, message: "Invoice deleted successfully" });
    } catch (error: any) {
      console.error(
        `[DELETE Invoice] Error deleting invoice: ${error.message}`,
      );
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/invoices", async (req, res) => {
    try {
      await storage.deleteAllInvoices();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Payment Master routes
  app.post("/api/payment-masters", async (req, res) => {
    try {
      console.log('[Payment Master] POST request received');
      
      // Validate the data
      let data;
      try {
        data = insertPaymentMasterSchema.parse(req.body);
        console.log('[Payment Master] Validation successful');
      } catch (validationError: any) {
        console.error('[Payment Master] Validation error:', validationError.message);
        if (validationError.name === 'ZodError') {
          return res.status(400).json({ 
            error: 'Validation failed', 
            details: validationError.errors 
          });
        }
        throw validationError;
      }

      // Check if composite key already exists
      try {
        const existing = await storage.getPaymentMasterByCompositeKey(
          data.siteId,
          data.planId,
          data.vendorId,
          data.antennaSize,
        );

        if (existing) {
          console.log('[Payment Master] Duplicate found');
          return res.status(409).json({
            error: `This configuration already exists. A payment setting has already been created for the selected Site, Plan ID, Vendor, and Antenna Size combination.`,
          });
        }
      } catch (checkError: any) {
        console.error('[Payment Master] Error checking duplicates:', checkError.message);
        // Continue with creation even if check fails
      }

      // Create the payment master
      const pm = await storage.createPaymentMaster(data);
      console.log('[Payment Master] Created successfully');
      res.json(pm);
    } catch (error: any) {
      console.error('[Payment Master] Error:', error.message);
      res.status(400).json({ error: error.message || 'Failed to save payment master' });
    }
  });

  app.get("/api/payment-masters", async (req, res) => {
    try {
      const data = await storage.getPaymentMasters();
      res.json({ data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/payment-masters/:id", async (req, res) => {
    try {
      const pm = await storage.getPaymentMaster(req.params.id);
      if (!pm) {
        return res.status(404).json({ error: "Payment Master not found" });
      }
      res.json(pm);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/payment-masters/:id", async (req, res) => {
    try {
      const data = insertPaymentMasterSchema.partial().parse(req.body);

      // Check if composite key already exists (excluding current record)
      if (data.siteId && data.planId && data.vendorId && data.antennaSize) {
        const existing = await storage.getPaymentMasterByCompositeKey(
          data.siteId,
          data.planId,
          data.vendorId,
          data.antennaSize,
        );

        if (existing && existing.id !== req.params.id) {
          return res.status(409).json({
            message: `This configuration already exists. A payment setting has already been created for the selected Site, Plan ID, Vendor, and Antenna Size combination.`,
          });
        }
      }

      const pm = await storage.updatePaymentMaster(req.params.id, data);
      res.json(pm);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/payment-masters/:id", async (req, res) => {
    try {
      const isUsed = await storage.isPaymentMasterUsedInPO(req.params.id);
      if (isUsed) {
        return res
          .status(409)
          .json({
            error:
              "Cannot delete this payment master. It is already used in PO generation. Please remove associated POs first.",
          });
      }
      await storage.deletePaymentMaster(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Zone routes
  app.post("/api/zones", async (req, res) => {
    try {
      const data = insertZoneSchema.parse(req.body);

      // Check for duplicate Zone Name
      const existingByName = await storage.getZoneByName(data.name);
      if (existingByName) {
        return res
          .status(409)
          .json({ error: `Zone name "${data.name}" already exists` });
      }

      // Check for duplicate Short Name
      const allZones = await storage.getZones(10000, 0);
      const existingByShortName = allZones.find(
        (z) => z.shortName === data.shortName,
      );
      if (existingByShortName) {
        return res
          .status(409)
          .json({ error: `Short name "${data.shortName}" already exists` });
      }

      const zone = await storage.createZone(data);
      res.json(zone);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/zones", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const offset = (page - 1) * pageSize;

      const data = await storage.getZones(pageSize, offset);
      const totalCount = await storage.getZoneCount();

      res.json({
        data,
        totalCount,
        pageNumber: page,
        pageSize,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/zones/:id", async (req, res) => {
    try {
      const zone = await storage.getZone(req.params.id);
      if (!zone) {
        return res.status(404).json({ error: "Zone not found" });
      }
      res.json(zone);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/zones/:id", async (req, res) => {
    try {
      const data = insertZoneSchema.partial().parse(req.body);
      const currentZone = await storage.getZone(req.params.id);

      if (!currentZone) {
        return res.status(404).json({ error: "Zone not found" });
      }

      // Check for duplicate Zone Name (if name is being changed)
      if (data.name && data.name !== currentZone.name) {
        const existingByName = await storage.getZoneByName(data.name);
        if (existingByName) {
          return res
            .status(409)
            .json({ error: `Zone name "${data.name}" already exists` });
        }
      }

      // Check for duplicate Short Name (if short name is being changed)
      if (data.shortName && data.shortName !== currentZone.shortName) {
        const allZones = await storage.getZones(10000, 0);
        const existingByShortName = allZones.find(
          (z) => z.shortName === data.shortName && z.id !== req.params.id,
        );
        if (existingByShortName) {
          return res
            .status(409)
            .json({ error: `Short name "${data.shortName}" already exists` });
        }
      }

      const zone = await storage.updateZone(req.params.id, data);
      res.json(zone);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/zones/:id", async (req, res) => {
    try {
      await storage.deleteZone(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Salary Report API - Get all employees with salary structures
  app.get("/api/salary-report", async (req, res) => {
    try {
      console.log("[Salary Report] Fetching salary data...");
      const result = await db
        .select({
          id: salaryStructures.id,
          employeeId: salaryStructures.employeeId,
          employeeName: employees.name,
          department: departments.name,
          designation: designations.name,
          basicSalary: salaryStructures.basicSalary,
          hra: salaryStructures.hra,
          da: salaryStructures.da,
          lta: salaryStructures.lta,
          conveyance: salaryStructures.conveyance,
          medical: salaryStructures.medical,
          bonuses: salaryStructures.bonuses,
          otherBenefits: salaryStructures.otherBenefits,
          pf: salaryStructures.pf,
          professionalTax: salaryStructures.professionalTax,
          incomeTax: salaryStructures.incomeTax,
          epf: salaryStructures.epf,
          esic: salaryStructures.esic,
          wantDeduction: salaryStructures.wantDeduction,
        })
        .from(salaryStructures)
        .innerJoin(employees, eq(salaryStructures.employeeId, employees.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(designations, eq(employees.designationId, designations.id));

      console.log("[Salary Report] Query returned", result.length, "records");

      // Transform data to calculate gross, deductions, net
      const data = result.map((row: any) => {
        const gross =
          Number(row.basicSalary || 0) +
          Number(row.hra || 0) +
          Number(row.da || 0) +
          Number(row.lta || 0) +
          Number(row.conveyance || 0) +
          Number(row.medical || 0) +
          Number(row.bonuses || 0) +
          Number(row.otherBenefits || 0);

        const deductions =
          Number(row.pf || 0) +
          Number(row.professionalTax || 0) +
          Number(row.incomeTax || 0) +
          Number(row.epf || 0) +
          Number(row.esic || 0);

        const net = gross - deductions;

        return {
          id: row.id,
          employeeId: row.employeeId,
          employeeName: row.employeeName || "Unknown",
          department: row.department || "Not Assigned",
          designation: row.designation || "Not Specified",
          basicSalary: Number(row.basicSalary),
          hra: Number(row.hra),
          da: Number(row.da),
          lta: Number(row.lta),
          conveyance: Number(row.conveyance),
          medical: Number(row.medical),
          bonuses: Number(row.bonuses),
          otherBenefits: Number(row.otherBenefits),
          gross: Math.round(gross * 100) / 100,
          pf: Number(row.pf),
          professionalTax: Number(row.professionalTax),
          incomeTax: Number(row.incomeTax),
          epf: Number(row.epf),
          esic: Number(row.esic),
          deductions: Math.round(deductions * 100) / 100,
          net: Math.round(net * 100) / 100,
          wantDeduction: row.wantDeduction,
        };
      });

      console.log(
        "[Salary Report] Returning",
        data.length,
        "transformed records",
      );
      res.json(data);
    } catch (error: any) {
      console.error("[Salary Report] Error:", error.message, error.stack);
      res.status(500).json({ error: error.message });
    }
  });

  // Monthly Generated Salary Summaries
  app.get("/api/reports/salary-generated", async (req, res) => {
    try {
      // Return list of months/years where salary records exist, with count and total
      const rows = await db
        .select({
          month: generateSalary.month,
          year: generateSalary.year,
          recordCount: sql<number>`CAST(COUNT(*) AS INTEGER)`,
          totalAmount: sql<string>`COALESCE(SUM(${generateSalary.netSalary}), 0)::text`,
          generatedAt: sql<string>`COALESCE(MAX(${generateSalary.createdAt}), NOW())::text`,
        })
        .from(generateSalary)
        .groupBy(generateSalary.year, generateSalary.month)
        .orderBy(sql`MAX(${generateSalary.year}) DESC, MAX(${generateSalary.month}) DESC`);

      // Normalize types
      const data = rows.map((r: any) => ({
        month: Number(r.month),
        year: Number(r.year),
        recordCount: Number(r.recordCount),
        totalAmount: Number(r.totalamount || r.totalAmount || 0),
        generatedAt: r.generatedat || r.generatedAt || (r.generatedAtText || null),
      }));

      res.json(data);
    } catch (error: any) {
      console.error("[Reports] salary-generated error:", error.message, error.stack);
      res.status(500).json({ error: error.message });
    }
  });

  // Detailed salary records for a specific month/year
  app.get("/api/reports/salary-generated/:year/:month", async (req, res) => {
    try {
      const year = Number(req.params.year);
      const month = Number(req.params.month);
      if (!year || !month) return res.status(400).json({ error: "Invalid year or month" });

      const rows = await db
        .select({
          id: generateSalary.id,
          employeeId: generateSalary.employeeId,
          employeeName: employees.name,
          netSalary: generateSalary.netSalary,
          grossSalary: generateSalary.grossSalary,
          totalDeductions: generateSalary.totalDeductions,
          createdAt: generateSalary.createdAt,
        })
        .from(generateSalary)
        .innerJoin(employees, eq(generateSalary.employeeId, employees.id))
        .where(and(eq(generateSalary.year, year), eq(generateSalary.month, month)))
        .orderBy(generateSalary.employeeId);

      res.json(rows);
    } catch (error: any) {
      console.error("[Reports] salary-generated detail error:", error.message, error.stack);
      res.status(500).json({ error: error.message });
    }
  });

  // Attendance routes
  app.post("/api/attendance", requireEmployeeAuth, async (req, res) => {
    try {
      const { employeeId, month, year, attendanceData } = req.body;

      if (!employeeId || !month || !year || !attendanceData) {
        return res
          .status(400)
          .json({
            error:
              "Missing required fields: employeeId, month, year, attendanceData",
          });
      }

      // Check if salary is already saved for this employee/month/year
      const salaryExists = await db
        .select()
        .from(generateSalary)
        .where(
          and(
            eq(generateSalary.employeeId, employeeId),
            eq(generateSalary.month, Number(month)),
            eq(generateSalary.year, Number(year))
          )
        );
      if (salaryExists.length > 0) {
        return res.status(403).json({ error: "Attendance cannot be modified after salary is saved for this month." });
      }

      // Check if attendance exists and is locked
      const existing = await storage.getEmployeeMonthlyAttendance(
        employeeId,
        month,
        year,
      );
      
      if (existing && existing.locked) {
        return res.status(403).json({ 
          error: "Attendance is locked and cannot be modified. Please contact admin." 
        });
      }

      // Get employee to check role and validate date access
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      // All roles can mark any day in the current month if attendance is unlocked
      // The lock check above already prevents modifications to locked attendance

      // Update or create attendance (existing was already fetched above for lock check)
      let attendance;
      if (existing) {
        // Update existing
        attendance = await storage.updateAttendance(existing.id, {
          attendanceData: JSON.stringify(attendanceData),
        });
      } else {
        // Create new
        attendance = await storage.createAttendance({
          employeeId,
          month,
          year,
          attendanceData: JSON.stringify(attendanceData),
        });
      }

      console.log(
        `[Attendance] Successfully saved for employee ${employeeId}, month ${month}/${year}`,
      );
      res.json({ success: true, attendance });
    } catch (error: any) {
      console.error(`[Attendance Error]`, error.message);
      res
        .status(500)
        .json({ error: error.message || "Failed to save attendance" });
    }
  });

  app.get("/api/attendance/:employeeId/:month/:year", requireEmployeeAuth, async (req, res) => {
    try {
      const { employeeId, month, year } = req.params;
      console.log('[Attendance][GET] params:', { employeeId, month, year, sessionEmployee: req.session?.employeeId });
      const attendance = await storage.getEmployeeMonthlyAttendance(
        employeeId,
        parseInt(month),
        parseInt(year),
      );
      console.log('[Attendance][GET] found attendance:', !!attendance, attendance ? { id: attendance.id, employeeId: attendance.employeeId, month: attendance.month, year: attendance.year } : null);
      res.json(attendance || null);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Bulk attendance marking for multiple employees
  app.post("/api/attendance/bulk", requireAdminAuth, async (req, res) => {
    try {
      const { employeeIds, month, year, attendanceData, mode, day } = req.body;

      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).json({ error: "employeeIds array is required" });
      }

      if (!month || !year || !attendanceData) {
        return res.status(400).json({
          error: "Missing required fields: month, year, attendanceData",
        });
      }

      // Check if any salary already exists for these employees in bulk
      const salaryExists = await db
        .select({ employeeId: generateSalary.employeeId })
        .from(generateSalary)
        .where(
          and(
            inArray(generateSalary.employeeId, employeeIds),
            eq(generateSalary.month, Number(month)),
            eq(generateSalary.year, Number(year))
          )
        );

      const lockedEmployees = salaryExists.map(s => s.employeeId);

      // Get existing attendance records in bulk
      const existingRecords = await db
        .select()
        .from(attendances)
        .where(
          and(
            inArray(attendances.employeeId, employeeIds),
            eq(attendances.month, Number(month)),
            eq(attendances.year, Number(year))
          )
        );

      // Build map of existing records
      const existingMap = new Map<string, any>();
      const additionalLockedEmployees: string[] = [];

      for (const record of existingRecords) {
        existingMap.set(record.employeeId, record);
        if (record.locked) {
          additionalLockedEmployees.push(record.employeeId);
        }
      }

      const allLockedEmployees = [...new Set([...lockedEmployees, ...additionalLockedEmployees])];

      // Filter out locked employees
      const validEmployeeIds = employeeIds.filter(id => !allLockedEmployees.includes(id));

      if (validEmployeeIds.length === 0) {
        return res.status(400).json({
          error: "All selected employees have locked attendance or salary already generated",
          locked: allLockedEmployees,
        });
      }

      // Prepare bulk insert/update data
      const recordsToUpsert: any[] = [];

      for (const employeeId of validEmployeeIds) {
        const empSpecificAttendance = attendanceData && typeof attendanceData === 'object' && (attendanceData as any)[employeeId] ? (attendanceData as any)[employeeId] : null;
        let finalAttendanceData: any = attendanceData;

        if (mode === 'day' && day) {
          // Single day mode - merge with existing attendance
          const existing = existingMap.get(employeeId);
          let existingData: any = {};
          if (existing && existing.attendanceData) {
            existingData = typeof existing.attendanceData === 'string' ? JSON.parse(existing.attendanceData) : existing.attendanceData;
          }

          const dayValue = empSpecificAttendance && empSpecificAttendance[day] !== undefined ? empSpecificAttendance[day] : attendanceData[day];
          finalAttendanceData = {
            ...existingData,
            [day]: dayValue,
          };
        } else {
          // Month mode - use per-employee attendance if provided, otherwise use provided attendanceData as-is
          if (empSpecificAttendance) {
            finalAttendanceData = empSpecificAttendance;
          } else {
            finalAttendanceData = attendanceData;
          }
        }

        console.log(`[Bulk Attendance] Employee ${employeeId}:`, {
          hasEmpSpecific: !!empSpecificAttendance,
          dataKeys: Object.keys(finalAttendanceData || {}),
          firstDayValue: finalAttendanceData[1]
        });

        recordsToUpsert.push({
          employeeId,
          month: Number(month),
          year: Number(year),
          attendanceData: JSON.stringify(finalAttendanceData),
        });
      }

      console.log(`[Bulk Attendance] Upserting ${recordsToUpsert.length} records`);

      // Perform bulk insert/update - try bulk first, fallback to individual if constraint doesn't exist
      try {
        const result = await db
          .insert(attendances)
          .values(recordsToUpsert)
          .onConflictDoUpdate({
            target: [attendances.employeeId, attendances.month, attendances.year],
            set: {
              attendanceData: sql`EXCLUDED.attendance_data`,
              updatedAt: sql`CURRENT_TIMESTAMP`,
            },
          })
          .returning();

        console.log(`[Bulk Attendance] ✓ Bulk upsert completed, ${result.length} records affected`);
      } catch (bulkError: any) {
        // If bulk operation fails (e.g., constraint doesn't exist), fall back to individual operations
        console.error('[Bulk Attendance] Bulk upsert failed:', bulkError.message);
        console.error('[Bulk Attendance] Full error:', bulkError);
        console.warn('[Bulk Attendance] Falling back to individual operations...');

        let successCount = 0;
        for (const record of recordsToUpsert) {
          try {
            const existing = existingMap.get(record.employeeId);
            if (existing) {
              console.log(`[Bulk Attendance] Updating existing record for ${record.employeeId}`);
              await db
                .update(attendances)
                .set({
                  attendanceData: record.attendanceData,
                  updatedAt: new Date(),
                })
                .where(eq(attendances.id, existing.id));
            } else {
              console.log(`[Bulk Attendance] Inserting new record for ${record.employeeId}`);
              await db.insert(attendances).values(record);
            }
            successCount++;
          } catch (individualError: any) {
            console.error(`[Bulk Attendance] Failed to save for ${record.employeeId}:`, individualError.message);
          }
        }
        console.log(`[Bulk Attendance] ✓ Individual operations completed, ${successCount}/${recordsToUpsert.length} succeeded`);
      }

      res.json({
        success: true,
        results: {
          success: validEmployeeIds,
          failed: allLockedEmployees.map(id => ({
            employeeId: id,
            error: lockedEmployees.includes(id)
              ? "Attendance cannot be modified after salary is saved"
              : "Attendance is locked",
          })),
        },
        summary: {
          total: employeeIds.length,
          successful: validEmployeeIds.length,
          failed: allLockedEmployees.length,
        },
      });
    } catch (error: any) {
      console.error(`[Bulk Attendance Error]`, error.message);
      res.status(500).json({
        error: error.message || "Failed to save bulk attendance",
      });
    }
  });

  // Get holidays for employees (public access for attendance marking)
  app.get("/api/holidays/month/:year/:month", requireEmployeeAuth, async (req, res) => {
    try {
      const { year, month } = req.params;
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      
      // Get holidays for the specified month
      const monthHolidays = await db
        .select()
        .from(holidays)
        .where(
          and(
            eq(sql`EXTRACT(YEAR FROM ${holidays.date})`, yearNum),
            eq(sql`EXTRACT(MONTH FROM ${holidays.date})`, monthNum),
            eq(holidays.isActive, true)
          )
        )
        .orderBy(holidays.date);
      
      res.json(monthHolidays);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get leave allotment for an employee by year
  app.get("/api/leave-allotments/employee/:employeeId/:year", requireEmployeeAuth, async (req, res) => {
    try {
      const { employeeId, year } = req.params;
      const yearNum = parseInt(year);
      
      console.log(`[Leave Allotments] Fetching for employee: ${employeeId}, year: ${yearNum}`);
      
      // Fetch leave allotment
      let allotment;
      try {
        allotment = await db
          .select()
          .from(leaveAllotments)
          .where(
            and(
              eq(leaveAllotments.employeeId, employeeId),
              eq(leaveAllotments.year, yearNum)
            )
          )
          .limit(1);
        console.log(`[Leave Allotments] Found ${allotment.length} allotment records`);
      } catch (dbError: any) {
        console.error('[Leave Allotments] Database error fetching allotment:', dbError);
        throw dbError;
      }
      
      // Fetch all attendance records for the year to calculate actual used leaves
      let attendanceRecords: any[] = [];
      try {
        attendanceRecords = await db
          .select()
          .from(attendances)
          .where(
            and(
              eq(attendances.employeeId, employeeId),
              eq(attendances.year, yearNum)
            )
          );
        console.log(`[Leave Allotments] Found ${attendanceRecords.length} attendance records`);
      } catch (dbError: any) {
        console.error('[Leave Allotments] Database error fetching attendance:', dbError);
        // Continue without attendance records
        attendanceRecords = [];
      }
      
      // Calculate used leaves from attendance data
      const usedLeaves = {
        ML: 0,
        CL: 0,
        EL: 0,
        SL: 0,
        PL: 0,
        UL: 0,
        LWP: 0,
      };
      
      attendanceRecords.forEach((record) => {
        if (record.attendanceData) {
          try {
            const attendanceData = JSON.parse(record.attendanceData);
            Object.values(attendanceData).forEach((dayData: any) => {
              if (dayData?.status === 'leave' && dayData?.leaveType) {
                const leaveType = dayData.leaveType;
                if (leaveType in usedLeaves) {
                  usedLeaves[leaveType as keyof typeof usedLeaves]++;
                }
              }
            });
          } catch (e) {
            console.error('Error parsing attendance data:', e);
          }
        }
      });
      
      if (allotment.length === 0) {
        // If no allotment found, allow only UL and LWP (unpaid leaves)
        return res.json({
          leaveTypes: [
            { code: 'ML', name: 'Medical Leave', allocated: 0, used: usedLeaves.ML, remaining: 0, disabled: true },
            { code: 'CL', name: 'Casual Leave', allocated: 0, used: usedLeaves.CL, remaining: 0, disabled: true },
            { code: 'EL', name: 'Earned Leave', allocated: 0, used: usedLeaves.EL, remaining: 0, disabled: true },
            { code: 'SL', name: 'Sick Leave', allocated: 0, used: usedLeaves.SL, remaining: 0, disabled: true },
            { code: 'PL', name: 'Personal Leave', allocated: 0, used: usedLeaves.PL, remaining: 0, disabled: true },
            { code: 'UL', name: 'Unpaid Leave', allocated: 999, used: usedLeaves.UL, remaining: 999, disabled: false },
            { code: 'LWP', name: 'Leave Without Pay', allocated: 999, used: usedLeaves.LWP, remaining: 999, disabled: false },
          ]
        });
      }
      
      const data = allotment[0];
      const leaveTypes = [
        { 
          code: 'ML', 
          name: 'Medical Leave', 
          allocated: data.medicalLeave, 
          used: usedLeaves.ML, 
          remaining: data.medicalLeave - usedLeaves.ML,
          disabled: false
        },
        { 
          code: 'CL', 
          name: 'Casual Leave', 
          allocated: data.casualLeave, 
          used: usedLeaves.CL, 
          remaining: data.casualLeave - usedLeaves.CL,
          disabled: false
        },
        { 
          code: 'EL', 
          name: 'Earned Leave', 
          allocated: data.earnedLeave, 
          used: usedLeaves.EL, 
          remaining: data.earnedLeave - usedLeaves.EL,
          disabled: false
        },
        { 
          code: 'SL', 
          name: 'Sick Leave', 
          allocated: data.sickLeave, 
          used: usedLeaves.SL, 
          remaining: data.sickLeave - usedLeaves.SL,
          disabled: false
        },
        { 
          code: 'PL', 
          name: 'Personal Leave', 
          allocated: data.personalLeave, 
          used: usedLeaves.PL, 
          remaining: data.personalLeave - usedLeaves.PL,
          disabled: false
        },
        { 
          code: 'UL', 
          name: 'Unpaid Leave', 
          allocated: data.unpaidLeave, 
          used: usedLeaves.UL, 
          remaining: data.unpaidLeave - usedLeaves.UL,
          disabled: false
        },
        { 
          code: 'LWP', 
          name: 'Leave Without Pay', 
          allocated: data.leaveWithoutPay, 
          used: usedLeaves.LWP, 
          remaining: data.leaveWithoutPay - usedLeaves.LWP,
          disabled: false
        },
      ];
      
      res.json({ leaveTypes });
    } catch (error: any) {
      console.error('[Leave Allotments API Error]:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Daily Allowances routes
  app.post("/api/allowances", async (req, res) => {
    try {
      const { employeeId, teamId, date, allowanceData } = req.body;

      console.log(`[Allowances] POST request received`);
      console.log(`[Allowances] Full body:`, req.body);
      console.log(
        `[Allowances] Extracted - employeeId: ${employeeId}, teamId: ${teamId}, date: ${date}, hasData: ${!!allowanceData}`,
      );

      if (!employeeId || !date || !allowanceData) {
        return res
          .status(400)
          .json({
            error: "Missing required fields: employeeId, date, allowanceData",
          });
      }

      if (!teamId) {
        return res.status(400).json({ error: "Team selection is required" });
      }

      // Check if allowance exists for this date
      console.log(`[Allowances] Checking for existing allowance...`);
      let existing;
      try {
        existing = await storage.getEmployeeAllowancesByDate(employeeId, date);
      } catch (e: any) {
        console.error(`[Allowances] Error checking existing:`, e.message);
        throw e;
      }

      // If existing allowance is not in pending status, prevent update
      if (existing && existing.approvalStatus !== 'pending') {
        console.log(`[Allowances] Cannot update - status is '${existing.approvalStatus}', not 'pending'`);
        return res.status(400).json({ 
          error: `Cannot update allowance. Status is '${existing.approvalStatus}'. Only pending allowances can be modified.` 
        });
      }

      let allowance;
      if (existing) {
        // Update existing (only if pending)
        console.log(`[Allowances] Updating existing allowance ${existing.id}`);
        allowance = await storage.updateDailyAllowance(existing.id, {
          teamId,
          allowanceData: allowanceData,
        });
      } else {
        // Create new
        console.log(`[Allowances] Creating new allowance with payload:`, {
          employeeId,
          teamId,
          date,
          allowanceDataLength: allowanceData.length,
        });
        allowance = await storage.createDailyAllowance({
          employeeId,
          teamId,
          date,
          allowanceData: allowanceData,
        });
        console.log(`[Allowances] Created allowance result:`, allowance);
      }

      console.log(
        `[Allowances] Successfully saved for employee ${employeeId}, date ${date}, teamId ${teamId}`,
      );
      res.json({ success: true, data: allowance });
    } catch (error: any) {
      console.error(`[Allowances Error] Full error:`, error);
      console.error(`[Allowances Error] Stack:`, error.stack);
      res
        .status(500)
        .json({ error: error.message || "Failed to save allowance" });
    }
  });

  // Bulk allowances endpoint - for multiple team members
// Bulk allowances endpoint - for multiple team members
// Updated bulk allowances endpoint
// Replace the existing /api/allowances/bulk route in your routes.ts file with this code

// CORRECTED /api/allowances/bulk endpoint
// Replace lines 1849-1926 in your routes.ts file with this code

app.post("/api/allowances/bulk", async (req, res) => {
  try {
    // CRITICAL FIX: Extract employeeId (logged-in user) from request body
    const { employeeId, employeeIds, teamId, date, allowanceData, selectedEmployeeIds } = req.body;

    // Validate logged-in employee ID
    if (!employeeId) {
      return res.status(400).json({ 
        error: "employeeId is required (must be the logged-in user's ID)" 
      });
    }

    // Validate selected employee IDs
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ 
        error: "employeeIds array is required (selected team members)" 
      });
    }

    if (!date || !allowanceData || !teamId) {
      return res.status(400).json({
        error: "Missing required fields: date, allowanceData, teamId",
      });
    }

    // CRITICAL FIX: Use the LOGGED-IN user's ID, NOT the first selected employee
    const primaryEmployeeId = employeeId;  // ✅ Changed from: employeeIds[0]
    
    // Store ONLY employee IDs - NOT names or other data
    const employeeIdsJson = selectedEmployeeIds && Array.isArray(selectedEmployeeIds) 
      ? JSON.stringify(selectedEmployeeIds)  // Just IDs
      : JSON.stringify(employeeIds);  // Fallback to employeeIds

    try {
      // Check if allowance exists for THIS LOGGED-IN USER on this date
      // This prevents updating someone else's record
      let existing;
      try {
        existing = await storage.getEmployeeAllowancesByDate(primaryEmployeeId, date);
      } catch (e: any) {
        console.error(`[Allowances Bulk] Error checking existing:`, e.message);
      }

      // If existing allowance is not in pending status, prevent update
      if (existing && existing.approvalStatus !== 'pending') {
        console.log(`[Allowances Bulk] Cannot update - status is '${existing.approvalStatus}', not 'pending'`);
        return res.status(400).json({ 
          error: `Cannot update allowance. Status is '${existing.approvalStatus}'. Only pending allowances can be modified.` 
        });
      }

      let allowance;
      if (existing) {
        // Update existing record for THIS logged-in user (only if pending)
        console.log(`[Allowances Bulk] Updating existing allowance ${existing.id}`);
        allowance = await storage.updateDailyAllowance(existing.id, {
          teamId,
          allowanceData: allowanceData,
          selectedEmployeeIds: employeeIdsJson,  // Only IDs
        });
      } else {
        // Create new single record with logged-in user as owner
        console.log(`[Allowances Bulk] Creating new single allowance record`);
        allowance = await storage.createDailyAllowance({
          employeeId: primaryEmployeeId,  // ✅ Logged-in user (submitter)
          teamId,
          date,
          allowanceData: allowanceData,
          selectedEmployeeIds: employeeIdsJson,  // ✅ Selected team members (recipients)
        });
      }
      
      console.log(`[Allowances Bulk] Successfully saved record`);
      console.log(`[Allowances Bulk] - Record owner (employeeId): ${primaryEmployeeId}`);
      console.log(`[Allowances Bulk] - Allowance recipients (selectedEmployeeIds): ${employeeIdsJson}`);
      
      res.json({ 
        success: true, 
        totalRequested: employeeIds.length,
        successCount: 1,
        allowanceId: allowance.id,
        message: `Allowance record created for ${employeeIds.length} employees`
      });
    } catch (error: any) {
      console.error(`[Allowances Bulk] Error creating record:`, error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  } catch (error: any) {
    console.error(`[Allowances Bulk Error]`, error);
    res.status(500).json({ error: error.message || "Failed to save bulk allowances" });
  }
});

  // Delete allowance endpoint - must come before other param routes
  app.delete("/api/allowances/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[Allowances] DELETE request for id: ${id}`);
      await storage.deleteDailyAllowance(id);
      console.log(`[Allowances] Successfully deleted allowance ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[Allowances Delete Error]`, error.message);
      if (error.message.includes("approved")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  });

  // All allowances for admin view - MUST come before parameterized routes
  app.get("/api/allowances/all", async (req, res) => {
    try {
      console.log(`[ROUTE] GET /api/allowances/all - Admin all allowances`);
      const allowances = await storage.getAllAllowances();
      console.log(`[Allowances] Found ${allowances.length} total allowances`);
      res.json({ data: allowances || [] });
    } catch (error: any) {
      console.error(`[ROUTE ERROR] /api/allowances/all - ERROR:`, error);
      res.status(400).json({ error: error.message });
    }
  });

  // Pending allowances for approval - MUST come before parameterized routes
  app.get("/api/allowances/pending", async (req, res) => {
    try {
      const employeeId = req.query.employeeId as string;
      console.log(`[ROUTE] GET /api/allowances/pending - ROUTE HIT!`);
      console.log(`[Allowances] GET pending - employeeId: ${employeeId}`);

      let allowances;
      if (employeeId) {
        console.log(
          `[Allowances] Getting team allowances for employee: ${employeeId}`,
        );
        // Get only team members' allowances for this employee's teams
        allowances = await storage.getPendingAllowancesForTeams(employeeId);
        console.log(`[Allowances] Team allowances result:`, allowances);
      } else {
        console.log(`[Allowances] Getting all pending allowances (admin view)`);
        // Get all pending allowances (admin view)
        allowances = await storage.getPendingAllowances();
        console.log(`[Allowances] All pending allowances result:`, allowances);
      }

      console.log(`[Allowances] Found ${allowances.length} pending allowances`);
      res.json({ data: allowances || [] });
    } catch (error: any) {
      console.error(`[ROUTE ERROR] /api/allowances/pending - ERROR:`, error);
      console.error(`[ROUTE ERROR] Stack:`, error.stack);
      res.status(400).json({ error: error.message });
    }
  });

  // All allowances for team members (for reporting purposes - all statuses) - MUST come before parameterized routes
  app.get("/api/allowances/team/all", async (req, res) => {
    try {
      const employeeId = req.query.employeeId as string;
      console.log(`[ROUTE] GET /api/allowances/team/all - ROUTE HIT!`);
      console.log(
        `[Allowances] GET team all allowances - employeeId: ${employeeId}`,
      );

      if (!employeeId) {
        return res.status(400).json({ error: "employeeId is required" });
      }

      // Get all team members' allowances (all statuses: pending, processing, approved, rejected)
      const allowances = await storage.getAllAllowancesForTeams(employeeId);
      console.log(
        `[Allowances] Found ${allowances.length} total team allowances (all statuses)`,
      );
      res.json({ data: allowances || [] });
    } catch (error: any) {
      console.error(`[ROUTE ERROR] /api/allowances/team/all - ERROR:`, error);
      console.error(`[ROUTE ERROR] Stack:`, error.stack);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/allowances/:employeeId", async (req, res, next) => {
    // Check if this is actually a month/year route
    const month = req.query.month;
    const year = req.query.year;

    if (month && year) {
      try {
        let allowances = await storage.getEmployeeAllowancesByMonthYear(
          req.params.employeeId,
          parseInt(month as string),
          parseInt(year as string),
        );

        // Ensure team names are enriched
        allowances = await Promise.all(
          allowances.map(async (allowance) => {
            if (allowance.teamId && !allowance.teamName) {
              const team = await storage.getTeam(allowance.teamId);
              return {
                ...allowance,
                teamName: team?.name || null,
              };
            }
            return allowance;
          }),
        );

        return res.json({ data: allowances });
      } catch (error: any) {
        console.error(`[Allowances Fetch Error]`, error.message);
        return res.status(400).json({ error: error.message });
      }
    }

    // Regular employee get
    try {
      const { employeeId } = req.params;
      let allowances = await storage.getEmployeeAllowances(employeeId);
      console.log(`[Allowances] Found ${allowances.length} allowances`);

      // Ensure team names are enriched
      allowances = await Promise.all(
        allowances.map(async (allowance) => {
          if (allowance.teamId && !allowance.teamName) {
            const team = await storage.getTeam(allowance.teamId);
            return {
              ...allowance,
              teamName: team?.name || null,
            };
          }
          return allowance;
        }),
      );

      res.json({ data: allowances });
    } catch (error: any) {
      console.error(`[Allowances Fetch Error]`, error.message);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/allowances/:employeeId/:date", async (req, res) => {
    try {
      const { employeeId, date } = req.params;
      const allowance = await storage.getEmployeeAllowancesByDate(
        employeeId,
        date,
      );
      res.json(allowance || null);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Approve allowance
  app.put("/api/allowances/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const { editedData, remark } = req.body;
      const approvedBy = req.session?.employeeId || "admin";
      const approverName = req.session?.employeeName || "Admin";

      // Determine approval level based on current approval count
      const existingAllowance = await storage.getDailyAllowance(id);
      const approverLevel = (existingAllowance?.approvalCount || 0) + 1; // Level 1, 2, or 3

      console.log(`[Allowances] Approving ${id} by ${approverName} (Level ${approverLevel})`);
      const allowance = await storage.approveDailyAllowance(
        id,
        approvedBy,
        approverName,
        approverLevel,
        remark,
        editedData
      );
      res.json({ success: true, data: allowance });
    } catch (error: any) {
      console.error(`[Allowances Approve Error]`, error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // Reject allowance
  app.put("/api/allowances/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const isHigherAuthority = req.session?.isHigherAuthority || false;
      console.log(
        `[Allowances] Rejecting ${id} with reason: ${rejectionReason}`,
      );
      const allowance = await storage.rejectDailyAllowance(
        id,
        rejectionReason,
        isHigherAuthority,
      );
      res.json({ success: true, data: allowance });
    } catch (error: any) {
      console.error(`[Allowances Reject Error]`, error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // Team routes
  app.post("/api/teams", async (req, res) => {
    try {
      const validated = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(validated);
      res.json(team);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/teams/employee/:employeeId", async (req, res) => {
    try {
      const teams = await storage.getTeamsForEmployee(req.params.employeeId);
      res.json(teams);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/teams/my-reporting-teams", async (req, res) => {
    try {
      const employeeId = req.session?.employeeId;
      console.log('[API] /api/teams/my-reporting-teams called for employeeId:', employeeId);
      if (!employeeId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const teams = await storage.getTeamsWhereReportingPerson(employeeId);
      console.log('[API] Teams where reporting person:', teams);
      res.json(teams);
    } catch (error: any) {
      console.error('[API] Error fetching reporting teams:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      res.json(team || null);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/teams/:id", async (req, res) => {
    try {
      const team = await storage.updateTeam(req.params.id, req.body);
      res.json(team);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/teams/:id", async (req, res) => {
    try {
      await storage.deleteTeam(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/teams/:id/members", async (req, res) => {
    try {
      const {
        employeeId,
        reportingPerson1,
        reportingPerson2,
        reportingPerson3,
      } = req.body;
      console.log(
        "[Teams API] Adding member - teamId:",
        req.params.id,
        "employeeId:",
        employeeId,
        "reporting persons:",
        { reportingPerson1, reportingPerson2, reportingPerson3 },
      );
      const member = await storage.addTeamMember(
        req.params.id,
        employeeId,
        reportingPerson1,
        reportingPerson2,
        reportingPerson3,
      );
      console.log("[Teams API] Member added:", member);
      res.json(member);
    } catch (error: any) {
      console.error("[Teams API] Error adding member:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/teams/:id/members", async (req, res) => {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
      const pageSize = req.query.pageSize ? parseInt(String(req.query.pageSize), 10) : undefined;
      if (page && pageSize) {
        const result = await storage.getTeamMembersPaginated(req.params.id, page, pageSize);
        res.json(result);
      } else {
        const members = await storage.getTeamMembers(req.params.id);
        res.json(members);
      }
    } catch (error: any) {
      console.error("[Teams API] Error fetching members:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/teams/:teamId/members/:memberId", async (req, res) => {
    try {
      // Get the member first to find the employee ID
      const members = await storage.getTeamMembers(req.params.teamId);
      const member = members.find((m) => m.id === req.params.memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      await storage.removeTeamMember(req.params.teamId, member.employeeId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/teams/members/:memberId/reporting", async (req, res) => {
    try {
      const { reportingPerson1, reportingPerson2, reportingPerson3 } = req.body;
      const member = await storage.updateTeamMemberReporting(
        req.params.memberId,
        reportingPerson1,
        reportingPerson2,
        reportingPerson3,
      );
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/teams/:teamId/reporting/:level", async (req, res) => {
    try {
      const { teamId, level } = req.params;
      const levelNum = parseInt(level) as 1 | 2 | 3;
      console.log(
        "[Teams API] Clearing RP",
        levelNum,
        "for all members in team:",
        teamId,
      );

      const members = await storage.getTeamMembers(teamId);

      for (const member of members) {
        const updates: any = {};
        const fieldName = `reportingPerson${levelNum}`;
        updates[fieldName] = null;

        await db
          .update(teamMembers)
          .set(updates)
          .where(eq(teamMembers.id, member.id));
      }

      console.log("[Teams API] Cleared RP", levelNum, "for all members");
      res.json({
        success: true,
        message: `Reporting Person ${levelNum} cleared for all team members`,
      });
    } catch (error: any) {
      console.error("[Teams API] Error clearing RP:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // App Settings routes
  app.get("/api/app-settings", async (req, res) => {
    try {
      console.log("[AppSettings API] Fetching app settings");
      const settings = await storage.getAppSettings();
      res.json(settings || { approvalsRequiredForAllowance: 1 });
    } catch (error: any) {
      console.error("[AppSettings API] Error fetching settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/app-settings", async (req, res) => {
    try {
      console.log("[AppSettings API] Updating app settings:", req.body);
      const validated = insertAppSettingsSchema.parse(req.body);
      const settings = await storage.updateAppSettings(validated);
      res.json(settings);
    } catch (error: any) {
      console.error("[AppSettings API] Error updating settings:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to save app settings" });
    }
  });

  // Admin/Superadmin login route - validates against database
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const employee = await storage.loginEmployee(email, password);
      if (!employee) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check if user has superadmin role only
      const role = employee.role || "user";
      if (role !== "superadmin" && role !== "Superadmin") {
        return res
          .status(403)
          .json({ error: "Only superadmin can access this portal" });
      }

      if (req.session) {
        req.session.employeeId = employee.id;
        req.session.employeeEmail = employee.email;
        // Also store role and name in session so checkSession and requireAdminAuth work correctly
        (req.session as any).employeeRole = role;
        (req.session as any).employeeName = employee.name;
        // Persist session immediately
        await new Promise((resolve, reject) => {
          req.session!.save((err) => {
            if (err) {
              console.error('[Admin Login] Session save error:', err);
              return reject(err);
            }
            console.log('[Admin Login] Session saved successfully:', {
              employeeId: req.session!.employeeId,
              employeeEmail: req.session!.employeeEmail,
              employeeRole: (req.session as any).employeeRole,
            });
            resolve(null);
          });
        });
      }

      res.json({
        success: true,
        employee: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: role,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Initialize superadmin - creates default superadmin if not exists
  app.post("/api/admin/init-superadmin", async (req, res) => {
    try {
      const superadminEmail = "superadmin@ems.local";
      const existingAdmin = await storage.getEmployeeByEmail(superadminEmail);

      if (existingAdmin) {
        return res.json({
          success: true,
          message: "Superadmin already exists",
          email: superadminEmail,
        });
      }

      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash("SuperAdmin@123", 10);

      const newAdmin = await storage.createEmployee({
        name: "System Administrator",
        email: superadminEmail,
        password: hashedPassword,
        fatherName: "System",
        mobile: "9999999999",
        doj: new Date().toISOString().split("T")[0],
        bloodGroup: "O+",
        maritalStatus: "Single",
        nominee: "System Administrator",
        address: "System Address",
        city: "System",
        state: "System",
        role: "superadmin",
        status: "Active",
      } as any);

      res.json({
        success: true,
        message: "Superadmin created successfully",
        email: superadminEmail,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Holiday Management Routes
  
  // Get all holidays with optional year filter
  app.get("/api/holidays", requireAdminAuth, async (req, res) => {
    try {
      const { year, state } = req.query;
      
      let query = db.select().from(holidays).orderBy(holidays.date);
      
      // Apply filters if provided
      const conditions = [];
      if (year) {
        conditions.push(sql`EXTRACT(YEAR FROM ${holidays.date}) = ${year}`);
      }
      if (state) {
        conditions.push(or(eq(holidays.state, state as string), sql`${holidays.state} IS NULL`));
      }
      
      const allHolidays = conditions.length > 0 
        ? await db.select().from(holidays).where(and(...conditions)).orderBy(holidays.date)
        : await query;
      
      res.json(allHolidays);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate AI-based holiday suggestions
  app.post("/api/holidays/generate", requireAdminAuth, async (req, res) => {
    try {
      console.log('[Holidays] Generate request received from employee:', req.session?.employeeEmail);
      const { state, year } = req.body;
      
      if (!state || !year) {
        return res.status(400).json({ error: "State and year are required" });
      }

      console.log('[Holidays] Generating holidays for state:', state, 'year:', year);

      // Indian national holidays (applicable to all states)
      const nationalHolidays = [
        { name: "Republic Day", month: 1, day: 26, type: "public", description: "Celebrates the adoption of the Constitution of India" },
        { name: "Independence Day", month: 8, day: 15, type: "public", description: "Commemorates India's independence from British rule" },
        { name: "Mahatma Gandhi's Birthday", month: 10, day: 2, type: "public", description: "Birth anniversary of Mahatma Gandhi" },
      ];

      // Festival holidays (dates vary by year, using approximate dates)
      const festivalHolidays = [
        { name: "Holi", month: 3, day: 25, type: "public", description: "Festival of colors" },
        { name: "Ram Navami", month: 4, day: 17, type: "optional", description: "Birth anniversary of Lord Rama" },
        { name: "Mahavir Jayanti", month: 4, day: 21, type: "optional", description: "Birth anniversary of Lord Mahavira" },
        { name: "Good Friday", month: 3, day: 29, type: "optional", description: "Christian holy day" },
        { name: "Eid ul-Fitr", month: 4, day: 11, type: "public", description: "Islamic festival marking the end of Ramadan" },
        { name: "Buddha Purnima", month: 5, day: 23, type: "optional", description: "Birth anniversary of Gautama Buddha" },
        { name: "Eid ul-Adha", month: 6, day: 17, type: "public", description: "Festival of sacrifice" },
        { name: "Muharram", month: 7, day: 7, type: "optional", description: "Islamic new year" },
        { name: "Raksha Bandhan", month: 8, day: 19, type: "optional", description: "Festival celebrating the bond between brothers and sisters" },
        { name: "Janmashtami", month: 8, day: 26, type: "optional", description: "Birth anniversary of Lord Krishna" },
        { name: "Ganesh Chaturthi", month: 9, day: 7, type: "optional", description: "Birth anniversary of Lord Ganesha" },
        { name: "Dussehra", month: 10, day: 12, type: "public", description: "Victory of good over evil" },
        { name: "Diwali", month: 10, day: 31, type: "public", description: "Festival of lights" },
        { name: "Guru Nanak Jayanti", month: 11, day: 15, type: "optional", description: "Birth anniversary of Guru Nanak" },
        { name: "Christmas", month: 12, day: 25, type: "public", description: "Christian festival celebrating the birth of Jesus Christ" },
      ];

      // State-specific holidays
      const stateSpecificHolidays: Record<string, any[]> = {
        "Maharashtra": [
          { name: "Maharashtra Day", month: 5, day: 1, type: "public", description: "Formation day of Maharashtra state" },
          { name: "Gudi Padwa", month: 3, day: 22, type: "public", description: "Marathi new year" },
        ],
        "Karnataka": [
          { name: "Karnataka Rajyotsava", month: 11, day: 1, type: "public", description: "Formation day of Karnataka state" },
          { name: "Ugadi", month: 3, day: 22, type: "public", description: "Kannada new year" },
        ],
        "Tamil Nadu": [
          { name: "Pongal", month: 1, day: 15, type: "public", description: "Harvest festival" },
          { name: "Tamil New Year", month: 4, day: 14, type: "public", description: "Tamil new year" },
        ],
        "West Bengal": [
          { name: "Bengali New Year", month: 4, day: 15, type: "public", description: "Pohela Boishakh" },
          { name: "Durga Puja", month: 10, day: 9, type: "public", description: "Worship of Goddess Durga" },
        ],
        "Kerala": [
          { name: "Onam", month: 8, day: 29, type: "public", description: "Harvest festival of Kerala" },
          { name: "Vishu", month: 4, day: 15, type: "public", description: "Malayali new year" },
        ],
        "Punjab": [
          { name: "Baisakhi", month: 4, day: 13, type: "public", description: "Punjabi new year and harvest festival" },
          { name: "Lohri", month: 1, day: 13, type: "optional", description: "Harvest festival" },
        ],
        "Gujarat": [
          { name: "Uttarayan", month: 1, day: 14, type: "optional", description: "Kite flying festival" },
          { name: "Navratri", month: 10, day: 3, type: "optional", description: "Nine nights festival" },
        ],
      };

      // Combine holidays
      let suggestedHolidays = [...nationalHolidays, ...festivalHolidays];
      
      // Add state-specific holidays if available
      if (stateSpecificHolidays[state]) {
        suggestedHolidays = [...suggestedHolidays, ...stateSpecificHolidays[state]];
      }

      // Format holidays with proper dates
      const formattedHolidays = suggestedHolidays.map(holiday => ({
        name: holiday.name,
        date: `${year}-${String(holiday.month).padStart(2, '0')}-${String(holiday.day).padStart(2, '0')}`,
        type: holiday.type,
        description: holiday.description,
      }));

      res.json({ holidays: formattedHolidays });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create or update a single holiday
  app.post("/api/holidays", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = insertHolidaySchema.parse(req.body);
      
      // Check if holiday exists with same name, date, and state
      const existingHoliday = await db.select()
        .from(holidays)
        .where(
          and(
            eq(holidays.name, validatedData.name),
            eq(holidays.date, validatedData.date),
            validatedData.state 
              ? eq(holidays.state, validatedData.state)
              : sql`${holidays.state} IS NULL OR ${holidays.state} = ''`
          )
        )
        .limit(1);

      let result;
      if (existingHoliday.length > 0) {
        // Update existing holiday
        const [updatedHoliday] = await db
          .update(holidays)
          .set({ ...validatedData, updatedAt: new Date() })
          .where(eq(holidays.id, existingHoliday[0].id))
          .returning();
        result = { ...updatedHoliday, isUpdated: true };
      } else {
        // Insert new holiday
        const [newHoliday] = await db.insert(holidays).values(validatedData).returning();
        result = { ...newHoliday, isUpdated: false };
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Bulk create or update holidays
  app.post("/api/holidays/bulk", requireAdminAuth, async (req, res) => {
    try {
      const { holidays: holidayList } = req.body;
      
      if (!Array.isArray(holidayList) || holidayList.length === 0) {
        return res.status(400).json({ error: "Holidays array is required" });
      }

      const validatedHolidays = holidayList.map(h => insertHolidaySchema.parse(h));
      
      const results = [];
      let insertedCount = 0;
      let updatedCount = 0;

      for (const holidayData of validatedHolidays) {
        // Check if holiday exists with same name, date, and state
        const existingHoliday = await db.select()
          .from(holidays)
          .where(
            and(
              eq(holidays.name, holidayData.name),
              eq(holidays.date, holidayData.date),
              holidayData.state 
                ? eq(holidays.state, holidayData.state)
                : sql`${holidays.state} IS NULL OR ${holidays.state} = ''`
            )
          )
          .limit(1);

        if (existingHoliday.length > 0) {
          // Update existing holiday
          const [updatedHoliday] = await db
            .update(holidays)
            .set({ ...holidayData, updatedAt: new Date() })
            .where(eq(holidays.id, existingHoliday[0].id))
            .returning();
          results.push(updatedHoliday);
          updatedCount++;
        } else {
          // Insert new holiday
          const [newHoliday] = await db.insert(holidays).values(holidayData).returning();
          results.push(newHoliday);
          insertedCount++;
        }
      }
      
      res.json({ 
        success: true, 
        total: results.length,
        inserted: insertedCount,
        updated: updatedCount,
        holidays: results 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update a holiday
  app.put("/api/holidays/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertHolidaySchema.parse(req.body);
      
      const [updatedHoliday] = await db
        .update(holidays)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(holidays.id, id))
        .returning();
      
      if (!updatedHoliday) {
        return res.status(404).json({ error: "Holiday not found" });
      }
      
      res.json(updatedHoliday);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete a holiday
  app.delete("/api/holidays/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [deletedHoliday] = await db
        .delete(holidays)
        .where(eq(holidays.id, id))
        .returning();
      
      if (!deletedHoliday) {
        return res.status(404).json({ error: "Holiday not found" });
      }
      
      res.json({ success: true, message: "Holiday deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Attendance Report API
  app.get("/api/reports/attendance", requireAdminAuth, async (req, res) => {
    try {
      const { month, year } = req.query;
      const monthNum = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const yearNum = year ? parseInt(year as string) : new Date().getFullYear();
      
      // Get all active employees with their details (excluding superadmin)
      const allEmployees = await db
        .select({
          id: employees.id,
          name: employees.name,
          departmentId: employees.departmentId,
          designationId: employees.designationId,
        })
        .from(employees)
        .where(
          and(
            eq(employees.status, 'Active'),
            ne(employees.role, 'superadmin')
          )
        );
      
      // Get departments and designations
      const depts = await db.select().from(departments);
      const desigs = await db.select().from(designations);
      
      const deptMap = Object.fromEntries(depts.map(d => [d.id, d.name]));
      const desigMap = Object.fromEntries(desigs.map(d => [d.id, d.name]));
      
      // Get attendance records for the month
      const attendanceRecords = await db
        .select()
        .from(attendances)
        .where(
          and(
            eq(attendances.month, monthNum),
            eq(attendances.year, yearNum)
          )
        );
      
      // Calculate days in month
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      
      // Process attendance data for each employee
      const reportData = allEmployees.map(emp => {
        const empAttendance = attendanceRecords.find(a => a.employeeId === emp.id);
        
        const stats = {
          present: 0,
          firstHalf: 0,
          secondHalf: 0,
          absent: 0,
          leave: 0,
          holiday: 0,
        };
        
        if (empAttendance && empAttendance.attendanceData) {
          try {
            const attendanceData = JSON.parse(empAttendance.attendanceData);
            Object.values(attendanceData).forEach((dayData: any) => {
              const status = typeof dayData === 'string' ? dayData : dayData?.status;
              if (status && status in stats) {
                stats[status as keyof typeof stats]++;
              }
            });
          } catch (e) {
            console.error('Error parsing attendance data:', e);
          }
        }
        
        return {
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.departmentId ? deptMap[emp.departmentId] || 'Not Assigned' : 'Not Assigned',
          designation: emp.designationId ? desigMap[emp.designationId] || 'Not Assigned' : 'Not Assigned',
          present: stats.present,
          firstHalf: stats.firstHalf,
          secondHalf: stats.secondHalf,
          absent: stats.absent,
          leave: stats.leave,
          holiday: stats.holiday,
          total: daysInMonth,
          // Include lock metadata if attendance record exists
          locked: empAttendance ? !!empAttendance.locked : false,
          lockedAt: empAttendance ? empAttendance.lockedAt : null,
          lockedBy: empAttendance ? empAttendance.lockedBy : null,
        };
      });
      
      res.json(reportData);
    } catch (error: any) {
      console.error('[Attendance Report API Error]:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Lock attendance for a specific month/year (Admin only)
  app.post("/api/attendance/lock", requireAdminAuth, async (req, res) => {
    try {
      const { month, year, lockAll } = req.body;
      const monthNum = parseInt(month as string);
      const yearNum = parseInt(year as string);
      const employeeId = (req.session as any)?.employeeId;
      
      if (!employeeId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      if (lockAll) {
        // Lock all employees' attendance for the month
        const result = await db
          .update(attendances)
          .set({
            locked: true,
            lockedAt: new Date(),
            lockedBy: employeeId,
          })
          .where(
            and(
              eq(attendances.month, monthNum),
              eq(attendances.year, yearNum)
            )
          )
          .returning();
        
        res.json({ 
          success: true, 
          message: `Locked attendance for ${result.length} employees`,
          count: result.length 
        });
      } else {
        // Lock specific employee (not implemented in this version)
        res.status(400).json({ error: "Specify lockAll=true to lock all employees" });
      }
    } catch (error: any) {
      console.error('[Lock Attendance Error]:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/attendance/lock-status', requireAdminAuth, async (req, res) => {
    try {
      const { month, year } = req.query;
      const monthNum = parseInt(month as string);
      const yearNum = parseInt(year as string);
      if (!monthNum || !yearNum) {
        return res.status(400).json({ error: 'Month and year are required' });
      }

      const [result] = await db
        .select({ lockedCount: count(attendances.id) })
        .from(attendances)
        .where(
          and(
            eq(attendances.month, monthNum),
            eq(attendances.year, yearNum),
            eq(attendances.locked, true)
          )
        );

      const lockedCount = Number(result?.lockedCount || 0);
      res.json({ locked: lockedCount > 0, count: lockedCount });
    } catch (error: any) {
      console.error('[Attendance Lock Status Error]:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Unlock attendance for a specific month/year (Admin only)
  app.post("/api/attendance/unlock", requireAdminAuth, async (req, res) => {
    try {
      const { month, year, unlockAll } = req.body;
      const monthNum = parseInt(month as string);
      const yearNum = parseInt(year as string);
      
      const { employeeId } = req.body;

      if (unlockAll) {
        // Unlock all employees' attendance for the month
        const result = await db
          .update(attendances)
          .set({
            locked: false,
            lockedAt: null,
            lockedBy: null,
          })
          .where(
            and(
              eq(attendances.month, monthNum),
              eq(attendances.year, yearNum)
            )
          )
          .returning();
        
        res.json({ 
          success: true, 
          message: `Unlocked attendance for ${result.length} employees`,
          count: result.length 
        });
      } else if (employeeId) {
        // Unlock specific employee for the month/year
        const result = await db
          .update(attendances)
          .set({ locked: false, lockedAt: null, lockedBy: null })
          .where(
            and(
              eq(attendances.month, monthNum),
              eq(attendances.year, yearNum),
              eq(attendances.employeeId, employeeId)
            )
          )
          .returning();

        res.json({
          success: true,
          message: `Unlocked attendance for employee ${employeeId}`,
          count: result.length,
        });
      } else {
        res.status(400).json({ error: "Specify unlockAll=true or provide employeeId to unlock" });
      }
    } catch (error: any) {
      console.error('[Unlock Attendance Error]:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Leave Allotment Routes
  
  // Get all leave allotments for a year
  app.get("/api/leave-allotments", requireAdminAuth, async (req, res) => {
    try {
      const { year } = req.query;
      const yearNum = year ? parseInt(year as string) : new Date().getFullYear();
      
      const allotmentsData = await db
        .select({
          id: leaveAllotments.id,
          employeeId: leaveAllotments.employeeId,
          employeeName: employees.name,
          year: leaveAllotments.year,
          medicalLeave: leaveAllotments.medicalLeave,
          casualLeave: leaveAllotments.casualLeave,
          earnedLeave: leaveAllotments.earnedLeave,
          sickLeave: leaveAllotments.sickLeave,
          personalLeave: leaveAllotments.personalLeave,
          unpaidLeave: leaveAllotments.unpaidLeave,
          leaveWithoutPay: leaveAllotments.leaveWithoutPay,
        })
        .from(leaveAllotments)
        .leftJoin(employees, eq(leaveAllotments.employeeId, employees.id))
        .where(eq(leaveAllotments.year, yearNum))
        .orderBy(employees.name);
      
      // Fetch all attendance records for the year to calculate actual used leaves
      const attendanceRecords = await db
        .select()
        .from(attendances)
        .where(eq(attendances.year, yearNum));
      
      // Calculate used leaves per employee from attendance data
      const usedLeavesByEmployee: Record<string, any> = {};
      
      attendanceRecords.forEach((record) => {
        if (record.attendanceData && record.employeeId) {
          if (!usedLeavesByEmployee[record.employeeId]) {
            usedLeavesByEmployee[record.employeeId] = {
              ML: 0, CL: 0, EL: 0, SL: 0, PL: 0, UL: 0, LWP: 0
            };
          }
          
          try {
            const attendanceData = JSON.parse(record.attendanceData);
            Object.values(attendanceData).forEach((dayData: any) => {
              if (dayData?.status === 'leave' && dayData?.leaveType) {
                const leaveType = dayData.leaveType;
                if (leaveType in usedLeavesByEmployee[record.employeeId]) {
                  usedLeavesByEmployee[record.employeeId][leaveType]++;
                }
              }
            });
          } catch (e) {
            console.error('Error parsing attendance data:', e);
          }
        }
      });
      
      // Add calculated used leaves to allotments data
      const enrichedData = allotmentsData.map(allotment => {
        const usedLeaves = usedLeavesByEmployee[allotment.employeeId] || {
          ML: 0, CL: 0, EL: 0, SL: 0, PL: 0, UL: 0, LWP: 0
        };
        
        return {
          ...allotment,
          usedMedicalLeave: usedLeaves.ML,
          usedCasualLeave: usedLeaves.CL,
          usedEarnedLeave: usedLeaves.EL,
          usedSickLeave: usedLeaves.SL,
          usedPersonalLeave: usedLeaves.PL,
          usedUnpaidLeave: usedLeaves.UL,
          usedLeaveWithoutPay: usedLeaves.LWP,
        };
      });
      
      res.json(enrichedData);
    } catch (error: any) {
      console.error('[Leave Allotments List API Error]:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create or update leave allotment (individual)
  app.post("/api/leave-allotments", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = insertLeaveAllotmentSchema.parse(req.body);
      
      // Check if allotment already exists
      const existing = await db
        .select()
        .from(leaveAllotments)
        .where(
          and(
            eq(leaveAllotments.employeeId, validatedData.employeeId),
            eq(leaveAllotments.year, validatedData.year)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing
        const [updated] = await db
          .update(leaveAllotments)
          .set({
            ...validatedData,
            updatedAt: new Date(),
          })
          .where(eq(leaveAllotments.id, existing[0].id))
          .returning();
        
        res.json(updated);
      } else {
        // Create new
        const [newAllotment] = await db
          .insert(leaveAllotments)
          .values(validatedData)
          .returning();
        
        res.json(newAllotment);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Bulk leave allotment
  app.post("/api/leave-allotments/bulk", requireAdminAuth, async (req, res) => {
    try {
      const { year, medicalLeave, casualLeave, earnedLeave, sickLeave, personalLeave, unpaidLeave, leaveWithoutPay } = req.body;
      
      if (!year) {
        return res.status(400).json({ error: "Year is required" });
      }
      
      // Get all active employees (excluding superadmin)
      const activeEmployees = await db
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.status, 'Active'),
            ne(employees.role, 'superadmin')
          )
        );
      
      let count = 0;
      
      for (const employee of activeEmployees) {
        // Check if allotment exists
        const existing = await db
          .select()
          .from(leaveAllotments)
          .where(
            and(
              eq(leaveAllotments.employeeId, employee.id),
              eq(leaveAllotments.year, year)
            )
          )
          .limit(1);
        
        const allotmentData = {
          employeeId: employee.id,
          year,
          medicalLeave: medicalLeave || 0,
          casualLeave: casualLeave || 0,
          earnedLeave: earnedLeave || 0,
          sickLeave: sickLeave || 0,
          personalLeave: personalLeave || 0,
          unpaidLeave: unpaidLeave || 0,
          leaveWithoutPay: leaveWithoutPay || 0,
        };
        
        if (existing.length > 0) {
          // Update existing
          await db
            .update(leaveAllotments)
            .set({
              ...allotmentData,
              updatedAt: new Date(),
            })
            .where(eq(leaveAllotments.id, existing[0].id));
        } else {
          // Create new
          await db.insert(leaveAllotments).values(allotmentData);
        }
        
        count++;
      }
      
      res.json({ success: true, count, message: `Leave allotted to ${count} employees` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete leave allotment
  app.delete("/api/leave-allotments/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [deleted] = await db
        .delete(leaveAllotments)
        .where(eq(leaveAllotments.id, id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Leave allotment not found" });
      }
      
      res.json({ success: true, message: "Leave allotment deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate salary for all employees
  app.post("/api/salary/generate", requireAdminAuth, async (req, res) => {
    try {
      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ error: "Month and year are required" });
      }

      const selectedMonth = parseInt(month as string);
      const selectedYear = parseInt(year as string);

      // Get all active employees (excluding superadmin)
      const employeesList = await db
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.status, 'Active'),
            ne(employees.role, 'superadmin')
          )
        );

      // Fetch all departments and designations for lookup
      const allDepartments = await db.select().from(departments);
      const allDesignations = await db.select().from(designations);

      // Create lookup maps for faster access
      const departmentMap = new Map(allDepartments.map(d => [d.id, d.name]));
      const designationMap = new Map(allDesignations.map(d => [d.id, d.name]));

      const salaryData = [];

      // Calculate days in month
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

      for (const employee of employeesList) {
        // Get department and designation names from lookup maps
        const departmentName = employee.departmentId ? (departmentMap.get(employee.departmentId) || 'N/A') : 'N/A';
        const designationName = employee.designationId ? (designationMap.get(employee.designationId) || 'N/A') : 'N/A';

        // Get employee's attendance for the month
        const attendance = await db
          .select()
          .from(attendances)
          .where(
            and(
              eq(attendances.employeeId, employee.id),
              eq(attendances.month, selectedMonth),
              eq(attendances.year, selectedYear)
            )
          );

        // Get leave allotment for the employee for the year
        const leaveAllotment = await db
          .select()
          .from(leaveAllotments)
          .where(
            and(
              eq(leaveAllotments.employeeId, employee.id),
              eq(leaveAllotments.year, selectedYear)
            )
          );

        // Paid leave types (from allotment)
        // Paid leave types (fixed to match frontend logic)
        const paidLeaveTypes = ['CL', 'ML', 'EL', 'SL', 'PL'];

        let presentDays = 0;
        let halfDays = 0;
        let absentDays = 0;
        let paidLeaveDays = 0;
        let unpaidLeaveDays = 0;
        let holidayDays = 0;

        if (attendance.length > 0 && attendance[0].attendanceData) {
          let attendanceData: Record<string, any> = {};
          try {
            attendanceData = JSON.parse(attendance[0].attendanceData);
          } catch (e) {
            attendanceData = {};
          }
          for (let day = 1; day <= daysInMonth; day++) {
            const dayData = attendanceData[day.toString()];
            const status = (dayData && typeof dayData === 'object') ? (dayData as any).status : dayData;
            const leaveType = (dayData && typeof dayData === 'object') ? (dayData as any).leaveType : undefined;
            if (status === 'present') presentDays++;
            else if (status === 'firsthalf' || status === 'secondhalf') halfDays++;
            else if (status === 'absent') absentDays++;
            else if (status === 'leave') {
              if (leaveType && paidLeaveTypes.includes(leaveType)) {
                paidLeaveDays++;
              } else {
                unpaidLeaveDays++;
              }
            }
            else if (status === 'holiday') holidayDays++;
          }
        }

        // Working days: present + holidays + paid leaves + half days
        const workingDays = Number(presentDays) + Number(holidayDays) + Number(paidLeaveDays) + (Number(halfDays) * 0.5);

        // Get employee's salary structure
        const salaryStructure = await db
          .select()
          .from(salaryStructures)
          .where(eq(salaryStructures.employeeId, employee.id))
          .orderBy(desc(salaryStructures.createdAt));

        let basicSalary = 0;
        let hra = 0;
        let da = 0;
        let lta = 0;
        let conveyance = 0;
        let medical = 0;
        let bonuses = 0;
        let otherBenefits = 0;
        let pf = 0;
        let professionalTax = 0;
        let incomeTax = 0;
        let epf = 0;
        let esic = 0;

        if (salaryStructure.length > 0) {
          const structure = salaryStructure[0]; // Get latest (first due to desc order)
          basicSalary = parseFloat(structure.basicSalary || '0') || 0;
          hra = parseFloat(structure.hra || '0') || 0;
          da = parseFloat(structure.da || '0') || 0;
          lta = parseFloat(structure.lta || '0') || 0;
          conveyance = parseFloat(structure.conveyance || '0') || 0;
          medical = parseFloat(structure.medical || '0') || 0;
          bonuses = parseFloat(structure.bonuses || '0') || 0;
          otherBenefits = parseFloat(structure.otherBenefits || '0') || 0;
          pf = parseFloat(structure.pf || '0') || 0;
          professionalTax = parseFloat(structure.professionalTax || '0') || 0;
          incomeTax = parseFloat(structure.incomeTax || '0') || 0;
          epf = parseFloat(structure.epf || '0') || 0;
          esic = parseFloat(structure.esic || '0') || 0;
        }

        // Calculate gross salary
        const grossSalary = (basicSalary || 0) + (hra || 0) + (da || 0) + (lta || 0) + (conveyance || 0) + (medical || 0) + (bonuses || 0) + (otherBenefits || 0);

        // Calculate per day salary
        const perDaySalary = grossSalary / daysInMonth;

        // Calculate earned salary based on working days
        const earnedSalary = perDaySalary * workingDays;

        // Calculate total deductions
        const totalDeductions = (pf || 0) + (professionalTax || 0) + (incomeTax || 0) + (epf || 0) + (esic || 0);

        // Calculate net salary
        const netSalary = earnedSalary - totalDeductions;

        // Ensure all calculated values are valid numbers
        const safeGrossSalary = isNaN(grossSalary) ? 0 : grossSalary;
        const safePerDaySalary = isNaN(perDaySalary) ? 0 : perDaySalary;
        const safeEarnedSalary = isNaN(earnedSalary) ? 0 : earnedSalary;
        const safeTotalDeductions = isNaN(totalDeductions) ? 0 : totalDeductions;
        const safeNetSalary = isNaN(netSalary) ? 0 : netSalary;

        salaryData.push({
          employeeId: employee.id,
          employeeName: employee.name,
          department: departmentName,
          designation: designationName,
          totalDays: daysInMonth,
          presentDays,
          halfDays,
          absentDays,
          leaveDays: paidLeaveDays + unpaidLeaveDays,
          workingDays,
          basicSalary: basicSalary || 0,
          hra: hra || 0,
          da: da || 0,
          lta: lta || 0,
          conveyance: conveyance || 0,
          medical: medical || 0,
          bonuses: bonuses || 0,
          otherBenefits: otherBenefits || 0,
          grossSalary: safeGrossSalary,
          perDaySalary: safePerDaySalary,
          earnedSalary: safeEarnedSalary,
          pf: pf || 0,
          professionalTax: professionalTax || 0,
          incomeTax: incomeTax || 0,
          epf: epf || 0,
          esic: esic || 0,
          totalDeductions: safeTotalDeductions,
          netSalary: safeNetSalary,
        });
      }

      res.json(salaryData);
    } catch (error: any) {
      console.error('Error generating salaries:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check if salary exists for employee/month/year
  app.get("/api/salary/check/:employeeId/:month/:year", requireEmployeeAuth, async (req, res) => {
    try {
      const { employeeId, month, year } = req.params;

      const existing = await db
        .select()
        .from(generateSalary)
        .where(
          and(
            eq(generateSalary.employeeId, employeeId),
            eq(generateSalary.month, Number(month)),
            eq(generateSalary.year, Number(year))
          )
        );

      res.json({ exists: existing.length > 0 });
    } catch (error: any) {
      console.error('[Salary Check Error]', error.message);
      res.status(500).json({ error: error.message, exists: false });
    }
  });

  // Save generated salaries to database
  app.post("/api/salary/save", requireAdminAuth, async (req, res) => {
    try {
      const { month, year, salaries } = req.body;
      console.log('[Salary Save] Incoming payload', { month, year, salariesCount: Array.isArray(salaries) ? salaries.length : 0 });
      if (!month || !year || !Array.isArray(salaries)) {
        return res.status(400).json({ error: "Month, year, and salaries are required" });
      }

      let savedCount = 0;
      for (const salary of salaries) {
        try {
          // Upsert logic into generate_salary: check if generated salary for employee/month/year exists
          const existing = await db
            .select()
            .from(generateSalary)
            .where(
              and(
                eq(generateSalary.employeeId, salary.employeeId),
                eq(generateSalary.month, month),
                eq(generateSalary.year, year)
              )
            );

          const insertData = {
            employeeId: salary.employeeId,
            month,
            year,
            totalDays: salary.totalDays,
            presentDays: salary.presentDays,
            halfDays: salary.halfDays,
            absentDays: salary.absentDays,
            leaveDays: salary.leaveDays,
            workingDays: salary.workingDays,
            basicSalary: salary.basicSalary,
            hra: salary.hra,
            da: salary.da,
            lta: salary.lta,
            conveyance: salary.conveyance,
            medical: salary.medical,
            bonuses: salary.bonuses,
            otherBenefits: salary.otherBenefits,
            grossSalary: salary.grossSalary,
            perDaySalary: salary.perDaySalary,
            earnedSalary: salary.earnedSalary,
            pf: salary.pf,
            professionalTax: salary.professionalTax,
            incomeTax: salary.incomeTax,
            epf: salary.epf,
            esic: salary.esic,
            totalDeductions: salary.totalDeductions,
            netSalary: salary.netSalary,
            details: JSON.stringify(salary.details || {}),
            generatedBy: salary.generatedBy || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          if (existing.length > 0) {
            await db
              .update(generateSalary)
              .set({ ...insertData, createdAt: existing[0].createdAt, updatedAt: new Date() })
              .where(eq(generateSalary.id, existing[0].id));
          } else {
            await db.insert(generateSalary).values(insertData);
          }
          // After persisting generated salary, lock attendance for this employee/month/year
          try {
            const attendanceRecord = await storage.getEmployeeMonthlyAttendance(salary.employeeId, month, year);
            const locker = salary.generatedBy || (req.session as any)?.employeeId || null;
            const lockedAt = new Date();
            if (attendanceRecord) {
              await storage.updateAttendance(attendanceRecord.id, { locked: true, lockedAt, lockedBy: locker });
            } else {
              // Create a minimal attendance record and mark it locked so UI shows the lock
              await storage.createAttendance({
                employeeId: salary.employeeId,
                month,
                year,
                attendanceData: JSON.stringify({}),
                submitted: false,
                locked: true,
                lockedAt,
                lockedBy: locker,
                createdAt: new Date(),
                updatedAt: new Date(),
              } as any);
            }
          } catch (lockErr: any) {
            console.error('[Salary Save] Failed to lock attendance for', { employeeId: salary?.employeeId, month, year, err: lockErr });
            // Do not abort entire save for lock failures; continue saving other records
          }

          savedCount++;
        } catch (innerErr: any) {
          console.error('[Salary Save] Failed for salary record:', {
            employeeId: salary?.employeeId,
            month,
            year,
            errorMessage: innerErr?.message,
            errorCode: innerErr?.code,
            errorDetail: innerErr?.detail,
          });
          // Re-throw to abort entire save and return 500 to client
          throw innerErr;
        }
      }
      res.json({ success: true, count: savedCount, message: `Saved ${savedCount} salaries.` });
    } catch (error: any) {
      // Dump full error including non-enumerable properties
      try {
        const fullError: any = {};
        Object.getOwnPropertyNames(error).forEach((k) => (fullError[k] = (error as any)[k]));
        console.error('[Salary Save Error]:', fullError);
      } catch (dumpErr) {
        console.error('[Salary Save Error] (failed to serialize):', error);
      }
      console.error('[Salary Save Error] original:', error && error.stack ? error.stack : error);
      res.status(500).json({ error: error?.message || 'Failed to save salaries' });
    }
  });

  // Get employee salary slip
  app.get("/api/employee/salary-slip", requireEmployeeAuth, async (req, res) => {
    try {
      const { employeeId } = req.query;
      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID required' });
      }
      // Get latest salary slip for employee from generated salaries
      const salary = await db
        .select()
        .from(generateSalary)
        .where(eq(generateSalary.employeeId, employeeId as string))
        .orderBy(desc(generateSalary.year), desc(generateSalary.month))
        .limit(1);
      if (!salary.length) {
        return res.status(404).json({ error: 'No salary slip found' });
      }
      res.json(salary[0]);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to fetch salary slip' });
    }
  });

  return httpServer;
}
