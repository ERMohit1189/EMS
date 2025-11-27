import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertVendorSchema,
  insertSiteSchema,
  insertEmployeeSchema,
  insertSalarySchema,
  insertPOSchema,
  insertInvoiceSchema,
  insertPaymentMasterSchema,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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
      await storage.deleteInvoice(req.params.id);
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
          error: `Payment configuration already exists for this Site, Plan, Vendor, and Antenna Size combination` 
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
            error: `Payment configuration already exists for this Site, Plan, Vendor, and Antenna Size combination` 
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
      await storage.deletePaymentMaster(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
