import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import {
  insertVendorSchema,
  insertSiteSchema,
  insertEmployeeSchema,
  insertPOSchema,
  insertInvoiceSchema,
  insertPaymentMasterSchema,
  insertZoneSchema,
  purchaseOrders,
  invoices,
  sites,
  designations,
  departments,
  employees,
  salaryStructures,
} from "@shared/schema";
import { eq, and, or, inArray } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Middleware to protect API routes from being intercepted by Vite catch-all
  app.use("/api/", (req, res, next) => {
    // Set explicit headers to prevent Vite from intercepting
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache");
    next();
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
      console.error('Export header save error:', error);
      res.status(400).json({ error: error.message || 'Failed to save export headers' });
    }
  });

  // Vendor routes
  app.post("/api/vendors", async (req, res) => {
    try {
      const data = insertVendorSchema.parse(req.body);
      const bcrypt = require('bcrypt');
      const tempPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
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
      req.session.vendorId = vendor.id;
      req.session.vendorEmail = vendor.email;
      res.json({ success: true, vendor: { id: vendor.id, name: vendor.name, email: vendor.email } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/vendors/logout", async (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Employee login route
  app.post("/api/employees/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }
      console.log(`[Employee Login] Attempting login for email: ${email}`);
      
      const employee = await storage.loginEmployee(email, password);
      console.log(`[Employee Login] Query result:`, employee ? `Found employee ${employee.name}` : "No employee found");
      
      if (!employee) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      // Store in session (for server-side session tracking)
      if (req.session) {
        req.session.employeeId = employee.id;
        req.session.employeeEmail = employee.email;
      }
      
      console.log(`[Employee Login] Employee object:`, {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        designationId: (employee as any).designationId,
        designationName: (employee as any).designationName,
        departmentId: (employee as any).departmentId,
        departmentName: (employee as any).departmentName
      });
      
      const responseData = { 
        success: true, 
        employee: { 
          id: employee.id, 
          name: employee.name, 
          email: employee.email,
          department: (employee as any).departmentName || "Not Assigned",
          designation: (employee as any).designationName || "Not Specified"
        } 
      };
      
      console.log(`[Employee Login] Sending response:`, responseData);
      res.json(responseData);
    } catch (error: any) {
      console.error(`[Employee Login Error]:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Change Password endpoint - MUST be defined before generic :id routes
  app.post("/api/employees/:id/change-password", async (req, res) => {
    console.log("[API] Change Password Route - POST /api/employees/:id/change-password");
    try {
      const bcrypt = require('bcrypt');
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
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
      const passwordMatch = await bcrypt.compare(currentPassword, employee.password);
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
      res.status(500).json({ error: error.message || "Failed to change password" });
    }
  });

  // Sync employee credentials (password) to database
  app.post("/api/employees/sync-credentials", async (req, res) => {
    try {
      const { employeeId, password } = req.body;
      console.log(`[Sync Credentials] Request received for employee: ${employeeId}`);
      
      if (!employeeId || !password) {
        console.log(`[Sync Credentials] Missing required fields`);
        return res.status(400).json({ error: "Employee ID and password required" });
      }

      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log(`[Sync Credentials] Password hashed, updating employee ${employeeId}`);
      
      const updated = await storage.updateEmployee(employeeId, { password: hashedPassword });
      console.log(`[Sync Credentials] Employee updated successfully`);
      res.json({ success: true, employee: updated });
    } catch (error: any) {
      console.error(`[Sync Credentials] Error:`, error.message);
      res.status(500).json({ error: error.message });
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
      const { name } = req.body;
      const data = await storage.createDepartment({ name });
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
      const { name } = req.body;
      const data = await storage.createDesignation({ name });
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

      const data = await storage.getVendors(pageSize, offset);
      const totalCount = await storage.getVendorCount();

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

      const bcrypt = require('bcrypt');
      const tempPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      await storage.updateVendor(req.params.id, { password: hashedPassword });
      
      res.json({
        success: true,
        vendor: { id: vendor.id, name: vendor.name, email: vendor.email },
        tempPassword,
        message: `Password generated successfully for ${vendor.email}`
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

  app.put("/api/vendors/:id", async (req, res) => {
    try {
      const data = insertVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateVendor(req.params.id, data);
      res.json(vendor);
    } catch (error: any) {
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
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Vendor name is required" });
      }
      const vendor = await storage.getOrCreateVendorByName(name);
      res.json(vendor);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/vendors/:id/usage", async (req, res) => {
    try {
      const vendorId = req.params.id;
      const [sites, pos, vendorInvoices] = await Promise.all([
        storage.getSitesByVendor(vendorId),
        db.select().from(purchaseOrders).where(eq(purchaseOrders.vendorId, vendorId)),
        db.select().from(invoices).where(eq(invoices.vendorId, vendorId)),
      ]);
      const isUsed = sites.length > 0 || pos.length > 0 || vendorInvoices.length > 0;
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
      const data = insertSiteSchema.parse(req.body);
      const site = await storage.upsertSiteByPlanId(data);
      res.json(site);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/sites", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const offset = (page - 1) * pageSize;

      const data = await storage.getSites(pageSize, offset);
      const totalCount = await storage.getSiteCount();
      
      const formattedData = data.map(site => ({
        ...site,
        vendorAmount: site.vendorAmount ? parseFloat(site.vendorAmount.toString()) : null,
        siteAmount: site.siteAmount ? parseFloat(site.siteAmount.toString()) : null,
      }));

      res.json({
        data: formattedData,
        totalCount,
        pageNumber: page,
        pageSize,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sites/for-po-generation", async (req, res) => {
    try {
      const data = await storage.getSitesForPOGeneration();
      const formattedData = data.map(site => ({
        ...site,
        vendorAmount: site.vendorAmount ? parseFloat(site.vendorAmount.toString()) : null,
        siteAmount: site.siteAmount ? parseFloat(site.siteAmount.toString()) : null,
      }));
      res.json({ data: formattedData });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sites/export/by-date-range", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      
      const sites = await storage.getSitesByDateRange(startDate, endDate);
      res.json({ data: sites });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  app.put("/api/sites/:id", async (req, res) => {
    try {
      // Check if a PO has been generated for this site
      const existingPO = await storage.getPOBySiteId(req.params.id);
      if (existingPO) {
        return res.status(400).json({ 
          error: "Cannot update site: A Purchase Order has already been generated for this site. Once a PO is created, the site is locked from all updates." 
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
          error: "Cannot update site status: A Purchase Order has already been generated for this site. Once a PO is created, the site status is locked." 
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
      res.json({ success: true, message: `Updated ${result.updated} sites to Approved status` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sites/bulk-update-remarks", async (req, res) => {
    try {
      console.log('[API] bulk-update-remarks called with:', req.body);
      const { siteIds, phyAtRemark, softAtRemark } = req.body;
      
      if (!siteIds || siteIds.length === 0) {
        console.log('[API] No siteIds provided');
        return res.status(400).json({ error: "No sites selected" });
      }
      if (!phyAtRemark && !softAtRemark) {
        console.log('[API] No remarks provided');
        return res.status(400).json({ error: "Please select at least one remark to update" });
      }
      
      console.log('[API] Calling bulkUpdateRemarks with:', { siteIds, phyAtRemark, softAtRemark });
      const result = await storage.bulkUpdateRemarks(siteIds, phyAtRemark, softAtRemark);
      console.log('[API] bulkUpdateRemarks result:', result);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('[API] bulkUpdateRemarks error:', error);
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
        return res.status(400).json({ error: "Please select at least one status to update" });
      }
      
      const result = await storage.bulkUpdateStatus(siteIds, phyAtStatus, softAtStatus);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('[API] bulkUpdateStatus error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/sites/bulk-update-status-by-plan", async (req, res) => {
    try {
      const { planIds, phyAtStatus, softAtStatus, shouldApproveStatus } = req.body;
      
      if (!planIds || planIds.length === 0) {
        res.setHeader("Content-Type", "application/json");
        return res.status(400).json({ error: "No sites selected" });
      }
      if (!phyAtStatus && !softAtStatus) {
        res.setHeader("Content-Type", "application/json");
        return res.status(400).json({ error: "Please select at least one status to update" });
      }
      
      console.log('[API] Bulk update by plan - planIds:', planIds, 'phyAtStatus:', phyAtStatus, 'softAtStatus:', softAtStatus);
      
      // Call the bulk update which handles AT status updates
      const result = await storage.bulkUpdateStatusByPlanId(planIds, phyAtStatus, softAtStatus);
      
      // Fetch existing sites to get current AT status values
      const existingSites = await db.select().from(sites).where(inArray(sites.planId, planIds));
      
      // Auto-update site status for each site based on BOTH AT statuses (new + existing)
      console.log('[API] Auto-updating site status based on AT statuses');
      const updatePromises = existingSites.map(async (site) => {
        // Use new values if provided, otherwise use existing values
        const finalPhyAtStatus = phyAtStatus || site.phyAtStatus;
        const finalSoftAtStatus = softAtStatus || site.softAtStatus;
        
        console.log(`[API] Site ${site.planId}: phyAtStatus=${finalPhyAtStatus}, softAtStatus=${finalSoftAtStatus}`);
        
        // Site is Approved only if BOTH AT statuses are Approved
        let newStatus = 'Pending';
        if (finalPhyAtStatus === 'Approved' && finalSoftAtStatus === 'Approved') {
          newStatus = 'Approved';
        }
        
        console.log(`[API] Setting site ${site.planId} status to: ${newStatus}`);
        
        return db.update(sites)
          .set({ status: newStatus })
          .where(eq(sites.planId, site.planId));
      });
      
      await Promise.all(updatePromises);
      console.log('[API] Site status update complete');
      
      res.setHeader("Content-Type", "application/json");
      res.status(200).json({ success: true, updated: result.updated });
    } catch (error: any) {
      console.error('[API] bulkUpdateStatusByPlan error:', error);
      res.setHeader("Content-Type", "application/json");
      res.status(400).json({ error: error.message });
    }
  });

  // Employee routes
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
      res.status(500).json({ error: error.message || "Failed to load employees" });
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

  app.put("/api/employees/:id", async (req, res) => {
    try {
      const data = insertEmployeeSchema.partial().parse(req.body);
      console.log(`[API] PUT /api/employees/${req.params.id} - DOB value:`, data.dob);
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
      // Convert all numeric fields to strings for decimal handling
      const body = { ...req.body };
      const fields = ['basicSalary', 'hra', 'da', 'lta', 'conveyance', 'medical', 
                     'bonuses', 'otherBenefits', 'pf', 'professionalTax', 'incomeTax', 'epf', 'esic'];
      for (const field of fields) {
        if (body[field] !== undefined && body[field] !== null) {
          body[field] = String(body[field]);
        }
      }
      // Direct pass to storage without Zod validation
      const salary = await storage.createSalary(body);
      res.json(salary);
    } catch (error: any) {
      console.error('[Salary Create Error]:', error.message);
      res.status(400).json({ error: error.message || 'Failed to save salary structure' });
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

  app.put("/api/salary-structures/:id", async (req, res) => {
    try {
      // Convert all numeric fields to strings for decimal handling
      const body = req.body;
      const fields = ['basicSalary', 'hra', 'da', 'lta', 'conveyance', 'medical', 
                     'bonuses', 'otherBenefits', 'pf', 'professionalTax', 'incomeTax', 'epf', 'esic'];
      for (const field of fields) {
        if (body[field] !== undefined && body[field] !== null) {
          body[field] = String(body[field]);
        }
      }
      // For updates, just validate as plain object without schema restrictions
      const salary = await storage.updateSalary(req.params.id, body);
      res.json(salary);
    } catch (error: any) {
      console.error('[Salary Update Error]:', error);
      res.status(400).json({ error: error.message || 'Failed to update salary structure' });
    }
  });

  // Purchase Order routes
  app.post("/api/purchase-orders", async (req, res) => {
    try {
      const data = insertPOSchema.parse(req.body);
      const po = await storage.createPO(data);
      res.json(po);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/purchase-orders", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const offset = (page - 1) * pageSize;

      const data = await storage.getPOs(pageSize, offset);
      const totalCount = await storage.getPOCount();

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

  app.get("/api/purchase-orders/:id", async (req, res) => {
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
  app.post("/api/invoices", async (req, res) => {
    try {
      const data = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(data);
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/invoices", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const offset = (page - 1) * pageSize;

      const data = await storage.getInvoices(pageSize, offset);
      const totalCount = await storage.getInvoiceCount();

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

  app.get("/api/invoices/:id", async (req, res) => {
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
      console.log(`[DELETE Invoice] Attempting to delete invoice ID: ${req.params.id}`);
      await storage.deleteInvoice(req.params.id);
      console.log(`[DELETE Invoice] Successfully deleted invoice ID: ${req.params.id}`);
      res.json({ success: true, message: "Invoice deleted successfully" });
    } catch (error: any) {
      console.error(`[DELETE Invoice] Error deleting invoice: ${error.message}`);
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
      const data = insertPaymentMasterSchema.parse(req.body);
      
      // Check if composite key already exists
      const existing = await storage.getPaymentMasterByCompositeKey(
        data.siteId,
        data.planId,
        data.vendorId,
        data.antennaSize
      );
      
      if (existing) {
        return res.status(409).json({ 
          message: `This configuration already exists. A payment setting has already been created for the selected Site, Plan ID, Vendor, and Antenna Size combination.` 
        });
      }
      
      const pm = await storage.createPaymentMaster(data);
      res.json(pm);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
          data.antennaSize
        );
        
        if (existing && existing.id !== req.params.id) {
          return res.status(409).json({ 
            message: `This configuration already exists. A payment setting has already been created for the selected Site, Plan ID, Vendor, and Antenna Size combination.` 
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
        return res.status(409).json({ error: "Cannot delete this payment master. It is already used in PO generation. Please remove associated POs first." });
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
        return res.status(409).json({ error: `Zone name "${data.name}" already exists` });
      }
      
      // Check for duplicate Short Name
      const allZones = await storage.getZones(10000, 0);
      const existingByShortName = allZones.find(z => z.shortName === data.shortName);
      if (existingByShortName) {
        return res.status(409).json({ error: `Short name "${data.shortName}" already exists` });
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
          return res.status(409).json({ error: `Zone name "${data.name}" already exists` });
        }
      }
      
      // Check for duplicate Short Name (if short name is being changed)
      if (data.shortName && data.shortName !== currentZone.shortName) {
        const allZones = await storage.getZones(10000, 0);
        const existingByShortName = allZones.find(z => z.shortName === data.shortName && z.id !== req.params.id);
        if (existingByShortName) {
          return res.status(409).json({ error: `Short name "${data.shortName}" already exists` });
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
          Number(row.salaryStructures.basicSalary || 0) +
          Number(row.salaryStructures.hra || 0) +
          Number(row.salaryStructures.da || 0) +
          Number(row.salaryStructures.lta || 0) +
          Number(row.salaryStructures.conveyance || 0) +
          Number(row.salaryStructures.medical || 0) +
          Number(row.salaryStructures.bonuses || 0) +
          Number(row.salaryStructures.otherBenefits || 0);
        
        const deductions =
          Number(row.salaryStructures.pf || 0) +
          Number(row.salaryStructures.professionalTax || 0) +
          Number(row.salaryStructures.incomeTax || 0) +
          Number(row.salaryStructures.epf || 0) +
          Number(row.salaryStructures.esic || 0);
        
        const net = gross - deductions;

        return {
          id: row.salaryStructures.id,
          employeeId: row.salaryStructures.employeeId,
          employeeName: row.employees.name || "Unknown",
          department: row.departments?.name || "Not Assigned",
          designation: row.designations?.name || "Not Specified",
          basicSalary: Number(row.salaryStructures.basicSalary),
          hra: Number(row.salaryStructures.hra),
          da: Number(row.salaryStructures.da),
          lta: Number(row.salaryStructures.lta),
          conveyance: Number(row.salaryStructures.conveyance),
          medical: Number(row.salaryStructures.medical),
          bonuses: Number(row.salaryStructures.bonuses),
          otherBenefits: Number(row.salaryStructures.otherBenefits),
          gross: Math.round(gross * 100) / 100,
          pf: Number(row.salaryStructures.pf),
          professionalTax: Number(row.salaryStructures.professionalTax),
          incomeTax: Number(row.salaryStructures.incomeTax),
          epf: Number(row.salaryStructures.epf),
          esic: Number(row.salaryStructures.esic),
          deductions: Math.round(deductions * 100) / 100,
          net: Math.round(net * 100) / 100,
          wantDeduction: row.salaryStructures.wantDeduction,
        };
      });

      console.log("[Salary Report] Returning", data.length, "transformed records");
      res.json(data);
    } catch (error: any) {
      console.error("[Salary Report] Error:", error.message, error.stack);
      res.status(500).json({ error: error.message });
    }
  });

  // Attendance routes
  app.post("/api/attendance", async (req, res) => {
    try {
      const { employeeId, month, year, attendanceData } = req.body;
      
      if (!employeeId || !month || !year || !attendanceData) {
        return res.status(400).json({ error: "Missing required fields: employeeId, month, year, attendanceData" });
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

      // If user role, only allow updating current day (today only)
      if (employee.role === 'user') {
        // Check if trying to mark dates outside current month
        const isCurrentMonth = month === currentMonth && year === currentYear;
        if (!isCurrentMonth) {
          console.error(`[Attendance] User ${employeeId} tried to update month ${month}/${year}, current is ${currentMonth}/${currentYear}`);
          return res.status(403).json({ error: `Can only update current month (${currentMonth}/${currentYear})` });
        }

        // Check if trying to mark anything other than today
        for (const [day, value] of Object.entries(attendanceData)) {
          const dayNum = parseInt(day);
          // Only allow marking today (currentDay), all other dates must be null
          if (dayNum !== currentDay && value !== null) {
            console.error(`[Attendance] User ${employeeId} tried to mark day ${dayNum} (today is ${currentDay}), value: ${value}`);
            return res.status(403).json({ error: `Can only mark current date. Today is ${currentDay}` });
          }
        }
      }
      // Admin role can mark any day
      
      // Check if attendance exists for this month
      const existing = await storage.getEmployeeMonthlyAttendance(employeeId, month, year);
      
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
      
      console.log(`[Attendance] Successfully saved for employee ${employeeId}, month ${month}/${year}`);
      res.json({ success: true, attendance });
    } catch (error: any) {
      console.error(`[Attendance Error]`, error.message);
      res.status(500).json({ error: error.message || "Failed to save attendance" });
    }
  });

  app.get("/api/attendance/:employeeId/:month/:year", async (req, res) => {
    try {
      const { employeeId, month, year } = req.params;
      const attendance = await storage.getEmployeeMonthlyAttendance(
        employeeId,
        parseInt(month),
        parseInt(year)
      );
      res.json(attendance || null);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Daily Allowances routes
  app.post("/api/allowances", async (req, res) => {
    try {
      const { employeeId, date, allowanceData } = req.body;
      
      console.log(`[Allowances] POST request - employeeId: ${employeeId}, date: ${date}, hasData: ${!!allowanceData}`);
      
      if (!employeeId || !date || !allowanceData) {
        return res.status(400).json({ error: "Missing required fields: employeeId, date, allowanceData" });
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
      
      let allowance;
      if (existing) {
        // Update existing
        console.log(`[Allowances] Updating existing allowance ${existing.id}`);
        allowance = await storage.updateDailyAllowance(existing.id, {
          allowanceData: allowanceData,
        });
      } else {
        // Create new
        console.log(`[Allowances] Creating new allowance`);
        allowance = await storage.createDailyAllowance({
          employeeId,
          date,
          allowanceData: allowanceData,
        });
      }
      
      console.log(`[Allowances] Successfully saved for employee ${employeeId}, date ${date}`);
      res.json({ success: true, data: allowance });
    } catch (error: any) {
      console.error(`[Allowances Error] Full error:`, error);
      console.error(`[Allowances Error] Stack:`, error.stack);
      res.status(500).json({ error: error.message || "Failed to save allowance" });
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
      if (error.message.includes('approved')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  });

  app.get("/api/allowances/:employeeId/:date", async (req, res) => {
    try {
      const { employeeId, date } = req.params;
      const allowance = await storage.getEmployeeAllowancesByDate(employeeId, date);
      res.json(allowance || null);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/allowances/:employeeId", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const allowances = await storage.getEmployeeAllowances(employeeId);
      res.json({ data: allowances });
    } catch (error: any) {
      console.error(`[Allowances Fetch Error]`, error.message);
      res.status(400).json({ error: error.message });
    }
  });

  return httpServer;
}
