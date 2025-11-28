import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import {
  insertVendorSchema,
  insertSiteSchema,
  insertEmployeeSchema,
  insertSalarySchema,
  insertPOSchema,
  insertInvoiceSchema,
  insertPaymentMasterSchema,
  insertZoneSchema,
  purchaseOrders,
  invoices,
  sites,
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
      const header = await storage.updateExportHeader(req.body);
      res.json(header);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Vendor routes
  app.post("/api/vendors", async (req, res) => {
    try {
      const data = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(data);
      res.json(vendor);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
      const [sites, pos, invoices] = await Promise.all([
        storage.getSitesByVendor(vendorId),
        db.select().from(purchaseOrders).where(eq(purchaseOrders.vendorId, vendorId)),
        db.select().from(invoices).where(eq(invoices.vendorId, vendorId)),
      ]);
      const isUsed = sites.length > 0 || pos.length > 0 || invoices.length > 0;
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

      const data = await storage.getEmployees(pageSize, offset);
      const totalCount = await storage.getEmployeeCount();

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
      const employee = await storage.updateEmployee(req.params.id, data);
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
      const data = insertSalarySchema.parse(req.body);
      const salary = await storage.createSalary(data);
      res.json(salary);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
      const data = insertSalarySchema.partial().parse(req.body);
      const salary = await storage.updateSalary(req.params.id, data);
      res.json(salary);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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

  return httpServer;
}
