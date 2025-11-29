import { db } from "./db";
import {
  vendors,
  sites,
  employees,
  departments,
  designations,
  salaryStructures,
  purchaseOrders,
  invoices,
  paymentMasters,
  zones,
  exportHeaders,
  attendances,
  dailyAllowances,
  teams,
  teamMembers,
  type InsertVendor,
  type InsertSite,
  type InsertEmployee,
  type InsertSalary,
  type InsertPO,
  type InsertInvoice,
  type InsertPaymentMaster,
  type InsertZone,
  type InsertExportHeader,
  type InsertAttendance,
  type InsertDailyAllowance,
  type InsertTeam,
  type InsertTeamMember,
  type Vendor,
  type Site,
  type Employee,
  type SalaryStructure,
  type PurchaseOrder,
  type Invoice,
  type PaymentMaster,
  type Zone,
  type ExportHeader,
  type Attendance,
  type DailyAllowance,
  type Team,
  type TeamMember,
} from "@shared/schema";
import { eq, count, and, gte, lte, inArray, getTableColumns, ne, sql } from "drizzle-orm";
import { type InferSelectModel } from "drizzle-orm";

export interface IStorage {
  // Vendor operations
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  getVendor(id: string): Promise<Vendor | undefined>;
  getVendorByName(name: string): Promise<Vendor | undefined>;
  getVendorByEmail(email: string): Promise<Vendor | undefined>;
  getOrCreateVendorByName(name: string): Promise<Vendor>;
  getVendors(limit: number, offset: number): Promise<Vendor[]>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor>;
  deleteVendor(id: string): Promise<void>;
  deleteAllVendors(): Promise<void>;
  getVendorCount(): Promise<number>;
  loginVendor(email: string, password: string): Promise<Vendor | null>;

  // Site operations
  createSite(site: InsertSite): Promise<Site>;
  getSite(id: string): Promise<Site | undefined>;
  getSiteByPlanId(planId: string): Promise<Site | undefined>;
  getSites(limit: number, offset: number): Promise<Site[]>;
  getSitesByVendor(vendorId: string): Promise<Site[]>;
  getSitesForPOGeneration(): Promise<Site[]>;
  getSitesByDateRange(startDate: string, endDate: string): Promise<Site[]>;
  updateSite(id: string, site: Partial<InsertSite>): Promise<Site>;
  upsertSiteByPlanId(site: InsertSite): Promise<Site>;
  bulkUpdateRemarks(siteIds: string[], phyAtRemark?: string, softAtRemark?: string): Promise<{ updated: number }>;
  bulkUpdateStatus(siteIds: string[], phyAtStatus?: string, softAtStatus?: string): Promise<{ updated: number }>;
  bulkUpdateStatusByPlanId(planIds: string[], phyAtStatus?: string, softAtStatus?: string): Promise<{ updated: number }>;
  deleteSite(id: string): Promise<void>;
  deleteAllSites(): Promise<void>;
  getSiteCount(): Promise<number>;

  // Employee operations
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByEmail(email: string): Promise<Employee | undefined>;
  getEmployees(limit: number, offset: number): Promise<Employee[]>;
  updateEmployee(
    id: string,
    employee: Partial<InsertEmployee>
  ): Promise<Employee>;
  deleteEmployee(id: string): Promise<void>;
  getEmployeeCount(): Promise<number>;
  loginEmployee(email: string, password: string): Promise<Employee | null>;

  // Salary operations
  createSalary(salary: InsertSalary): Promise<SalaryStructure>;
  getSalaryByEmployee(employeeId: string): Promise<SalaryStructure | undefined>;
  getSalaries(limit: number, offset: number): Promise<SalaryStructure[]>;
  updateSalary(
    id: string,
    salary: Partial<InsertSalary>
  ): Promise<SalaryStructure>;

  // Purchase Order operations
  createPO(po: InsertPO): Promise<PurchaseOrder>;
  getPO(id: string): Promise<PurchaseOrder | undefined>;
  getPOs(limit: number, offset: number): Promise<PurchaseOrder[]>;
  getPOsByVendor(vendorId: string): Promise<PurchaseOrder[]>;
  getPOBySiteId(siteId: string): Promise<PurchaseOrder | undefined>;
  updatePO(id: string, po: Partial<InsertPO>): Promise<PurchaseOrder>;
  deletePO(id: string): Promise<void>;
  getPOCount(): Promise<number>;

  // Invoice operations
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoices(limit: number, offset: number): Promise<Invoice[]>;
  getInvoicesByVendor(vendorId: string): Promise<Invoice[]>;
  getInvoicesByPO(poId: string): Promise<Invoice[]>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;
  deleteAllInvoices(): Promise<void>;
  getInvoiceCount(): Promise<number>;

  // Payment Master operations
  createPaymentMaster(pm: InsertPaymentMaster): Promise<PaymentMaster>;
  getPaymentMaster(id: string): Promise<PaymentMaster | undefined>;
  getPaymentMasterByAntennaSize(antennaSize: string): Promise<PaymentMaster | undefined>;
  getPaymentMasters(): Promise<PaymentMaster[]>;
  getPaymentMasterByCompositeKey(siteId: string, planId: string, vendorId: string, antennaSize: string): Promise<PaymentMaster | undefined>;
  updatePaymentMaster(id: string, pm: Partial<InsertPaymentMaster>): Promise<PaymentMaster>;
  deletePaymentMaster(id: string): Promise<void>;
  isPaymentMasterUsedInPO(paymentMasterId: string): Promise<boolean>;

  // Department operations
  createDepartment(dept: { name: string }): Promise<any>;
  getDepartments(): Promise<any[]>;
  deleteDepartment(id: string): Promise<void>;

  // Designation operations
  createDesignation(desig: { name: string }): Promise<any>;
  getDesignations(): Promise<any[]>;
  deleteDesignation(id: string): Promise<void>;

  // Zone operations
  createZone(zone: InsertZone): Promise<Zone>;
  getZone(id: string): Promise<Zone | undefined>;
  getZones(limit: number, offset: number): Promise<Zone[]>;
  getZoneByName(name: string): Promise<Zone | undefined>;
  updateZone(id: string, zone: Partial<InsertZone>): Promise<Zone>;
  deleteZone(id: string): Promise<void>;
  getZoneCount(): Promise<number>;

  // Export Header operations
  getExportHeader(): Promise<ExportHeader | undefined>;
  updateExportHeader(header: InsertExportHeader): Promise<ExportHeader>;

  // Attendance operations
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getAttendance(id: string): Promise<Attendance | undefined>;
  getEmployeeMonthlyAttendance(employeeId: string, month: number, year: number): Promise<Attendance | undefined>;
  updateAttendance(id: string, attendance: Partial<InsertAttendance>): Promise<Attendance>;
  deleteAttendance(id: string): Promise<void>;

  // Daily Allowances operations
  createDailyAllowance(allowance: InsertDailyAllowance): Promise<DailyAllowance>;
  getDailyAllowance(id: string): Promise<DailyAllowance | undefined>;
  getEmployeeAllowancesByDate(employeeId: string, date: string): Promise<DailyAllowance | undefined>;
  getEmployeeAllowances(employeeId: string, limit?: number): Promise<DailyAllowance[]>;
  updateDailyAllowance(id: string, allowance: Partial<InsertDailyAllowance>): Promise<DailyAllowance>;
  deleteDailyAllowance(id: string): Promise<void>;

  // Team operations
  createTeam(team: InsertTeam): Promise<Team>;
  getTeam(id: string): Promise<Team | undefined>;
  getTeams(): Promise<Team[]>;
  updateTeam(id: string, team: Partial<InsertTeam>): Promise<Team>;
  deleteTeam(id: string): Promise<void>;
  addTeamMember(teamId: string, employeeId: string): Promise<TeamMember>;
  removeTeamMember(teamId: string, employeeId: string): Promise<void>;
  getTeamMembers(teamId: string): Promise<any[]>;
}

export class DrizzleStorage implements IStorage {
  // Vendor operations
  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [result] = await db.insert(vendors).values(vendor).returning();
    return result;
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [result] = await db.select().from(vendors).where(eq(vendors.id, id));
    return result;
  }

  async getVendorByName(name: string): Promise<Vendor | undefined> {
    const result = await db.select().from(vendors).where(eq(vendors.name, name));
    return result[0];
  }

  async getVendorByEmail(email: string): Promise<Vendor | undefined> {
    const result = await db.select().from(vendors).where(eq(vendors.email, email));
    return result[0];
  }

  async getOrCreateVendorByName(name: string): Promise<Vendor> {
    // Check if vendor with this name already exists
    const existing = await this.getVendorByName(name);
    if (existing) {
      return existing;
    }

    // Create a new vendor with minimal required fields
    const newVendor: InsertVendor = {
      name,
      email: `${name.replace(/\s+/g, '')}@vendor.local`,
      mobile: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      aadhar: `TEMP${Date.now()}`,
      pan: `TEMP${Date.now()}`,
    };
    return await this.createVendor(newVendor);
  }

  async getVendors(limit: number, offset: number): Promise<Vendor[]> {
    return await db.select().from(vendors).limit(limit).offset(offset);
  }

  async updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor> {
    const [result] = await db
      .update(vendors)
      .set(vendor)
      .where(eq(vendors.id, id))
      .returning();
    return result;
  }

  async deleteVendor(id: string): Promise<void> {
    await db.delete(vendors).where(eq(vendors.id, id));
  }

  async deleteAllVendors(): Promise<void> {
    await db.delete(vendors);
  }

  async getVendorCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(vendors);
    return Number(result[0]?.count) || 0;
  }

  async loginVendor(email: string, password: string): Promise<Vendor | null> {
    const vendor = await this.getVendorByEmail(email);
    if (!vendor || !vendor.password) return null;
    
    const bcrypt = require('bcrypt');
    const passwordMatch = await bcrypt.compare(password, vendor.password);
    return passwordMatch ? vendor : null;
  }

  // Employee operations
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    // Convert empty DOB string to null
    const employeeData = { ...employee, dob: employee.dob && employee.dob.trim() ? employee.dob : null };
    const [result] = await db
      .insert(employees)
      .values(employeeData)
      .returning();
    return result;
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [result] = await db.select().from(employees).where(eq(employees.id, id));
    return result;
  }

  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    const [result] = await db.select().from(employees).where(eq(employees.email, email));
    return result;
  }

  async getEmployees(limit: number, offset: number): Promise<any[]> {
    const results = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        password: employees.password,
        dob: employees.dob,
        fatherName: employees.fatherName,
        mobile: employees.mobile,
        alternateNo: employees.alternateNo,
        address: employees.address,
        city: employees.city,
        state: employees.state,
        country: employees.country,
        departmentId: employees.departmentId,
        designationId: employees.designationId,
        role: employees.role,
        doj: employees.doj,
        aadhar: employees.aadhar,
        pan: employees.pan,
        bloodGroup: employees.bloodGroup,
        maritalStatus: employees.maritalStatus,
        nominee: employees.nominee,
        ppeKit: employees.ppeKit,
        kitNo: employees.kitNo,
        status: employees.status,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        designation: designations.name,
        department: departments.name,
      })
      .from(employees)
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(ne(employees.role, 'superadmin'))
      .limit(limit)
      .offset(offset);
    
    return results.map(result => {
      const emp = result as any;
      emp.designation = emp.designation || '';
      emp.department = emp.department || '';
      return emp;
    });
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee> {
    // Convert empty DOB string to null
    const employeeData = { ...employee, dob: employee.dob !== undefined ? (employee.dob && employee.dob.trim() ? employee.dob : null) : employee.dob };
    const [result] = await db
      .update(employees)
      .set(employeeData)
      .where(eq(employees.id, id))
      .returning();
    return result;
  }

  async deleteEmployee(id: string): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  async getEmployeeCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(employees).where(ne(employees.role, 'superadmin'));
    return Number(result[0]?.count) || 0;
  }

  async loginEmployee(email: string, password: string): Promise<Employee | null> {
    console.log(`[Storage] loginEmployee called with email: ${email}`);
    
    const employee = await this.getEmployeeByEmail(email);
    console.log(`[Storage] Employee lookup result:`, employee ? `Found: ${employee.name}` : "Not found");
    
    if (!employee || !employee.password) {
      console.log(`[Storage] Employee not found or no password set`);
      return null;
    }
    
    const bcrypt = require('bcrypt');
    console.log(`[Storage] Comparing passwords...`);
    
    try {
      const passwordMatch = await bcrypt.compare(password, employee.password);
      console.log(`[Storage] Password match result: ${passwordMatch}`);
      
      if (passwordMatch) {
        console.log(`[Storage] Login successful for ${email}`);
        
        // Get department name if department_id exists
        if (employee.departmentId) {
          try {
            const deptResult = await db.select({ name: departments.name }).from(departments).where(eq(departments.id, employee.departmentId));
            if (deptResult.length > 0) {
              (employee as any).departmentName = deptResult[0].name;
              console.log(`[Storage] Department fetched: ${deptResult[0].name}`);
            }
          } catch (error) {
            console.error(`[Storage] Failed to fetch department:`, error);
          }
        }
        
        // Get designation name if designation_id exists
        if (employee.designationId) {
          try {
            const desigResult = await db.select({ name: designations.name }).from(designations).where(eq(designations.id, employee.designationId));
            if (desigResult.length > 0) {
              (employee as any).designationName = desigResult[0].name;
              console.log(`[Storage] Designation fetched: ${desigResult[0].name}`);
            }
          } catch (error) {
            console.error(`[Storage] Failed to fetch designation:`, error);
          }
        }
        
        return employee;
      } else {
        console.log(`[Storage] Password mismatch for ${email}`);
        return null;
      }
    } catch (error) {
      console.error(`[Storage] Password comparison error:`, error);
      return null;
    }
  }

  // Department operations
  async createDepartment(dept: { name: string }): Promise<any> {
    const [result] = await db.insert(departments).values(dept).returning();
    return result;
  }

  async getDepartments(): Promise<any[]> {
    return await db.select().from(departments);
  }

  async deleteDepartment(id: string): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }

  // Designation operations
  async createDesignation(desig: { name: string }): Promise<any> {
    const [result] = await db.insert(designations).values(desig).returning();
    return result;
  }

  async getDesignations(): Promise<any[]> {
    return await db.select().from(designations);
  }

  async deleteDesignation(id: string): Promise<void> {
    await db.delete(designations).where(eq(designations.id, id));
  }

  // Note: Employee operations moved above (see loginEmployee and related methods)

  // Site operations
  async createSite(site: InsertSite): Promise<Site> {
    const [result] = await db.insert(sites).values(site).returning();
    return result;
  }

  async getSite(id: string): Promise<Site | undefined> {
    const [result] = await db.select().from(sites).where(eq(sites.id, id));
    return result;
  }

  async getSiteByPlanId(planId: string): Promise<Site | undefined> {
    const [result] = await db.select().from(sites).where(eq(sites.planId, planId));
    return result;
  }

  async getSites(limit: number, offset: number): Promise<Site[]> {
    const result = await db
      .select({
        ...getTableColumns(sites),
        vendorAmount: paymentMasters.vendorAmount,
        siteAmount: paymentMasters.siteAmount,
      })
      .from(sites)
      .leftJoin(
        paymentMasters,
        and(
          eq(sites.id, paymentMasters.siteId),
          eq(sites.planId, paymentMasters.planId),
          eq(sites.vendorId, paymentMasters.vendorId),
          eq(sites.maxAntSize, paymentMasters.antennaSize)
        )
      )
      .limit(limit)
      .offset(offset);
    
    return result as Site[];
  }

  async getSitesByVendor(vendorId: string): Promise<Site[]> {
    return await db.select().from(sites).where(eq(sites.vendorId, vendorId));
  }

  async getSitesForPOGeneration(): Promise<Site[]> {
    const result = await db
      .select({
        ...getTableColumns(sites),
        vendorAmount: paymentMasters.vendorAmount,
        siteAmount: paymentMasters.siteAmount,
      })
      .from(sites)
      .leftJoin(
        paymentMasters,
        and(
          eq(sites.id, paymentMasters.siteId),
          eq(sites.planId, paymentMasters.planId),
          eq(sites.vendorId, paymentMasters.vendorId),
          eq(sites.maxAntSize, paymentMasters.antennaSize)
        )
      )
      .where(
        and(
          eq(sites.softAtStatus, "Approved"),
          eq(sites.phyAtStatus, "Approved")
        )
      );
    
    return result as Site[];
  }

  // Helper function to auto-update site status based on AT status
  private autoUpdateSiteStatus(site: Partial<InsertSite>): Partial<InsertSite> {
    if (site.softAtStatus === "Approved" && site.phyAtStatus === "Approved") {
      return { ...site, status: "Approved" };
    }
    // If either status is not Approved, set status to Pending
    if (site.softAtStatus !== "Approved" || site.phyAtStatus !== "Approved") {
      return { ...site, status: "Pending" };
    }
    return site;
  }

  async updateSite(id: string, site: Partial<InsertSite>): Promise<Site> {
    const updateData = this.autoUpdateSiteStatus(site);
    const [result] = await db
      .update(sites)
      .set(updateData)
      .where(eq(sites.id, id))
      .returning();
    return result;
  }

  async bulkUpdateRemarks(siteIds: string[], phyAtStatus?: string, softAtStatus?: string): Promise<{ updated: number }> {
    const updateData: Partial<InsertSite> = {};
    if (phyAtStatus) updateData.phyAtStatus = phyAtStatus;
    if (softAtStatus) updateData.softAtStatus = softAtStatus;

    if (Object.keys(updateData).length === 0) {
      return { updated: 0 };
    }

    // Auto-update status: Approved if both are Approved, Pending if either is not Approved
    if (phyAtStatus === "Approved" && softAtStatus === "Approved") {
      updateData.status = "Approved";
    } else if (phyAtStatus !== "Approved" || softAtStatus !== "Approved") {
      updateData.status = "Pending";
    }

    const result = await db
      .update(sites)
      .set(updateData)
      .where(inArray(sites.id, siteIds));
    
    return { updated: siteIds.length };
  }

  async bulkUpdateStatus(siteIds: string[], phyAtStatus?: string, softAtStatus?: string): Promise<{ updated: number }> {
    const updateData: Partial<InsertSite> = {};
    if (phyAtStatus) updateData.phyAtStatus = phyAtStatus;
    if (softAtStatus) updateData.softAtStatus = softAtStatus;

    if (Object.keys(updateData).length === 0) {
      return { updated: 0 };
    }

    try {
      await db
        .update(sites)
        .set(updateData)
        .where(inArray(sites.id, siteIds));
      
      return { updated: siteIds.length };
    } catch (err) {
      console.error('[Storage] Error in bulkUpdateStatus:', err);
      throw err;
    }
  }

  async bulkUpdateStatusByPlanId(planIds: string[], phyAtStatus?: string, softAtStatus?: string): Promise<{ updated: number }> {
    const updateData: Partial<InsertSite> = {};
    if (phyAtStatus) updateData.phyAtStatus = phyAtStatus;
    if (softAtStatus) updateData.softAtStatus = softAtStatus;

    if (Object.keys(updateData).length === 0) {
      return { updated: 0 };
    }

    try {
      await db
        .update(sites)
        .set(updateData)
        .where(inArray(sites.planId, planIds));
      
      return { updated: planIds.length };
    } catch (err) {
      console.error('[Storage] Error in bulkUpdateStatusByPlanId:', err);
      throw err;
    }
  }

  async upsertSiteByPlanId(site: InsertSite): Promise<Site> {
    // Check if site with this planId already exists
    const existingSite = await this.getSiteByPlanId(site.planId);
    
    if (existingSite) {
      // Update existing site (exclude planId from update)
      const { planId, ...updateData } = site;
      const finalUpdateData = this.autoUpdateSiteStatus(updateData);
      const [result] = await db
        .update(sites)
        .set(finalUpdateData)
        .where(eq(sites.planId, site.planId))
        .returning();
      return result;
    } else {
      // Insert new site with auto-updated status
      const finalSite = this.autoUpdateSiteStatus(site);
      const [result] = await db.insert(sites).values(finalSite).returning();
      return result;
    }
  }

  async deleteSite(id: string): Promise<void> {
    await db.delete(sites).where(eq(sites.id, id));
  }

  async getSiteCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(sites);
    return Number(result[0]?.count) || 0;
  }

  async deleteAllSites(): Promise<void> {
    await db.delete(sites);
  }

  // Recalculate site status for existing sites based on AT status
  async recalculateSiteStatuses(): Promise<{ updated: number }> {
    const allSites = await db.select().from(sites);
    let updatedCount = 0;

    for (const site of allSites) {
      if (site.softAtStatus === "Approved" && site.phyAtStatus === "Approved" && site.status !== "Approved") {
        await db
          .update(sites)
          .set({ status: "Approved" })
          .where(eq(sites.id, site.id));
        updatedCount++;
      }
    }

    return { updated: updatedCount };
  }

  async getSitesByDateRange(startDate: string, endDate: string): Promise<Site[]> {
    const result = await db
      .select()
      .from(sites)
      .where(
        and(
          gte(sites.createdAt, new Date(startDate)),
          lte(sites.createdAt, new Date(endDate))
        )
      );
    
    return result as Site[];
  }

  // Salary operations
  async createSalary(salary: InsertSalary): Promise<SalaryStructure> {
    const [result] = await db
      .insert(salaryStructures)
      .values(salary)
      .returning();
    return result;
  }

  async getSalaryByEmployee(
    employeeId: string
  ): Promise<SalaryStructure | undefined> {
    const [result] = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.employeeId, employeeId));
    return result;
  }

  async getSalaries(limit: number, offset: number): Promise<SalaryStructure[]> {
    return await db
      .select()
      .from(salaryStructures)
      .limit(limit)
      .offset(offset);
  }

  async updateSalary(
    id: string,
    salary: Partial<InsertSalary>
  ): Promise<SalaryStructure> {
    const [result] = await db
      .update(salaryStructures)
      .set(salary)
      .where(eq(salaryStructures.id, id))
      .returning();
    return result;
  }

  // Purchase Order operations
  async createPO(po: InsertPO): Promise<PurchaseOrder> {
    const [result] = await db.insert(purchaseOrders).values(po).returning();
    return result;
  }

  async getPO(id: string): Promise<PurchaseOrder | undefined> {
    const [result] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));
    return result;
  }

  async getPOs(limit: number, offset: number): Promise<PurchaseOrder[]> {
    return await db
      .select()
      .from(purchaseOrders)
      .limit(limit)
      .offset(offset);
  }

  async getPOsByVendor(vendorId: string): Promise<PurchaseOrder[]> {
    return await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.vendorId, vendorId));
  }

  async getPOBySiteId(siteId: string): Promise<PurchaseOrder | undefined> {
    const [result] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.siteId, siteId));
    return result;
  }

  async updatePO(id: string, po: Partial<InsertPO>): Promise<PurchaseOrder> {
    const [result] = await db
      .update(purchaseOrders)
      .set(po)
      .where(eq(purchaseOrders.id, id))
      .returning();
    return result;
  }

  async deletePO(id: string): Promise<void> {
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  }

  async getPOCount(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(purchaseOrders);
    return Number(result[0]?.count) || 0;
  }

  // Invoice operations
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [result] = await db.insert(invoices).values(invoice).returning();
    return result;
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [result] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id));
    return result;
  }

  async getInvoices(limit: number, offset: number): Promise<Invoice[]> {
    return await db.select().from(invoices).limit(limit).offset(offset);
  }

  async getInvoicesByVendor(vendorId: string): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.vendorId, vendorId));
  }

  async getInvoicesByPO(poId: string): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.poId, poId));
  }

  async updateInvoice(
    id: string,
    invoice: Partial<InsertInvoice>
  ): Promise<Invoice> {
    const [result] = await db
      .update(invoices)
      .set(invoice)
      .where(eq(invoices.id, id))
      .returning();
    return result;
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async deleteAllInvoices(): Promise<void> {
    await db.delete(invoices);
  }

  async getInvoiceCount(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(invoices);
    return Number(result[0]?.count) || 0;
  }

  // Payment Master operations
  async createPaymentMaster(pm: InsertPaymentMaster): Promise<PaymentMaster> {
    const [result] = await db.insert(paymentMasters).values(pm).returning();
    return result;
  }

  async getPaymentMaster(id: string): Promise<PaymentMaster | undefined> {
    const [result] = await db
      .select()
      .from(paymentMasters)
      .where(eq(paymentMasters.id, id));
    return result;
  }

  async getPaymentMasterByAntennaSize(antennaSize: string): Promise<PaymentMaster | undefined> {
    const [result] = await db
      .select()
      .from(paymentMasters)
      .where(eq(paymentMasters.antennaSize, antennaSize));
    return result;
  }

  async getPaymentMasters(): Promise<PaymentMaster[]> {
    return await db.select().from(paymentMasters);
  }

  async getPaymentMasterByCompositeKey(siteId: string, planId: string, vendorId: string, antennaSize: string): Promise<PaymentMaster | undefined> {
    const [result] = await db
      .select()
      .from(paymentMasters)
      .where(
        and(
          eq(paymentMasters.siteId, siteId),
          eq(paymentMasters.planId, planId),
          eq(paymentMasters.vendorId, vendorId),
          eq(paymentMasters.antennaSize, antennaSize)
        )
      );
    return result;
  }

  async updatePaymentMaster(id: string, pm: Partial<InsertPaymentMaster>): Promise<PaymentMaster> {
    const [result] = await db
      .update(paymentMasters)
      .set(pm)
      .where(eq(paymentMasters.id, id))
      .returning();
    return result;
  }

  async deletePaymentMaster(id: string): Promise<void> {
    await db.delete(paymentMasters).where(eq(paymentMasters.id, id));
  }

  async isPaymentMasterUsedInPO(paymentMasterId: string): Promise<boolean> {
    const pm = await this.getPaymentMaster(paymentMasterId);
    if (!pm) return false;

    const pos = await db.select().from(purchaseOrders).where(
      and(
        eq(purchaseOrders.vendorId, pm.vendorId),
        eq(purchaseOrders.siteId, pm.siteId)
      )
    );
    return pos.length > 0;
  }

  // Zone operations
  async createZone(zone: InsertZone): Promise<Zone> {
    const [result] = await db.insert(zones).values(zone).returning();
    return result;
  }

  async getZone(id: string): Promise<Zone | undefined> {
    const [result] = await db.select().from(zones).where(eq(zones.id, id));
    return result;
  }

  async getZones(limit: number, offset: number): Promise<Zone[]> {
    return await db.select().from(zones).limit(limit).offset(offset);
  }

  async getZoneByName(name: string): Promise<Zone | undefined> {
    const result = await db.select().from(zones).where(eq(zones.name, name));
    return result[0];
  }

  async updateZone(id: string, zone: Partial<InsertZone>): Promise<Zone> {
    const [result] = await db
      .update(zones)
      .set(zone)
      .where(eq(zones.id, id))
      .returning();
    return result;
  }

  async deleteZone(id: string): Promise<void> {
    await db.delete(zones).where(eq(zones.id, id));
  }

  async getZoneCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(zones);
    return Number(result[0]?.count) || 0;
  }

  // Export Header operations
  async getExportHeader(): Promise<ExportHeader | undefined> {
    const result = await db.select().from(exportHeaders).limit(1);
    return result[0];
  }

  async updateExportHeader(header: InsertExportHeader): Promise<ExportHeader> {
    const existing = await this.getExportHeader();
    
    if (existing) {
      const [result] = await db
        .update(exportHeaders)
        .set(header)
        .where(eq(exportHeaders.id, existing.id))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(exportHeaders).values(header).returning();
      return result;
    }
  }

  // Attendance operations
  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const [result] = await db.insert(attendances).values(attendance).returning();
    return result;
  }

  async getAttendance(id: string): Promise<Attendance | undefined> {
    const [result] = await db.select().from(attendances).where(eq(attendances.id, id));
    return result;
  }

  async getEmployeeMonthlyAttendance(employeeId: string, month: number, year: number): Promise<Attendance | undefined> {
    const [result] = await db.select().from(attendances).where(
      and(
        eq(attendances.employeeId, employeeId),
        eq(attendances.month, month),
        eq(attendances.year, year)
      )
    );
    return result;
  }

  async updateAttendance(id: string, attendance: Partial<InsertAttendance>): Promise<Attendance> {
    const [result] = await db.update(attendances).set(attendance).where(eq(attendances.id, id)).returning();
    return result;
  }

  async deleteAttendance(id: string): Promise<void> {
    await db.delete(attendances).where(eq(attendances.id, id));
  }

  // Daily Allowances operations
  async createDailyAllowance(allowance: InsertDailyAllowance): Promise<DailyAllowance> {
    const [result] = await db.insert(dailyAllowances).values(allowance).returning();
    return result;
  }

  async getDailyAllowance(id: string): Promise<DailyAllowance | undefined> {
    const [result] = await db.select().from(dailyAllowances).where(eq(dailyAllowances.id, id));
    return result;
  }

  async getEmployeeAllowancesByDate(employeeId: string, date: string): Promise<DailyAllowance | undefined> {
    const [result] = await db.select().from(dailyAllowances).where(
      and(
        eq(dailyAllowances.employeeId, employeeId),
        eq(dailyAllowances.date, date)
      )
    );
    return result;
  }

  async getEmployeeAllowances(employeeId: string, limit: number = 30): Promise<DailyAllowance[]> {
    return await db.select().from(dailyAllowances)
      .where(eq(dailyAllowances.employeeId, employeeId))
      .orderBy(dailyAllowances.date)
      .limit(limit);
  }

  async getEmployeeAllowancesByMonthYear(employeeId: string, month: number, year: number): Promise<DailyAllowance[]> {
    // Fetch all allowances for the employee and filter in application
    const allAllowances = await db.select().from(dailyAllowances)
      .where(eq(dailyAllowances.employeeId, employeeId))
      .orderBy(dailyAllowances.date);
    
    // Filter by month and year in JavaScript
    const filtered = allAllowances.filter(allowance => {
      const allowanceDate = new Date(allowance.date);
      const allowanceMonth = allowanceDate.getMonth() + 1; // getMonth() returns 0-11
      const allowanceYear = allowanceDate.getFullYear();
      return allowanceMonth === month && allowanceYear === year;
    });
    
    return filtered;
  }

  async updateDailyAllowance(id: string, allowance: Partial<InsertDailyAllowance>): Promise<DailyAllowance> {
    // Check if allowance is approved - cannot update if approved
    const existing = await this.getDailyAllowance(id);
    if (existing && existing.approvalStatus === 'approved') {
      throw new Error('Cannot update an approved allowance');
    }
    const [result] = await db.update(dailyAllowances).set(allowance).where(eq(dailyAllowances.id, id)).returning();
    return result;
  }

  async deleteDailyAllowance(id: string): Promise<void> {
    // Check if allowance is approved - cannot delete if approved
    const existing = await this.getDailyAllowance(id);
    if (existing && existing.approvalStatus === 'approved') {
      throw new Error('Cannot delete an approved allowance');
    }
    await db.delete(dailyAllowances).where(eq(dailyAllowances.id, id));
  }

  async approveDailyAllowance(id: string, approvedBy: string): Promise<DailyAllowance> {
    const [result] = await db.update(dailyAllowances).set({
      approvalStatus: 'approved',
      approvedBy,
      approvedAt: new Date(),
    }).where(eq(dailyAllowances.id, id)).returning();
    return result;
  }

  async rejectDailyAllowance(id: string): Promise<DailyAllowance> {
    const [result] = await db.update(dailyAllowances).set({
      approvalStatus: 'rejected',
    }).where(eq(dailyAllowances.id, id)).returning();
    return result;
  }

  // Team operations
  async createTeam(team: InsertTeam): Promise<Team> {
    const [result] = await db.insert(teams).values(team).returning();
    return result;
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [result] = await db.select().from(teams).where(eq(teams.id, id));
    return result;
  }

  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(teams.name);
  }

  async updateTeam(id: string, team: Partial<InsertTeam>): Promise<Team> {
    const [result] = await db.update(teams).set(team).where(eq(teams.id, id)).returning();
    return result;
  }

  async deleteTeam(id: string): Promise<void> {
    await db.delete(teams).where(eq(teams.id, id));
  }

  async addTeamMember(teamId: string, employeeId: string): Promise<TeamMember> {
    const [result] = await db.insert(teamMembers).values({ teamId, employeeId }).returning();
    return result;
  }

  async removeTeamMember(teamId: string, employeeId: string): Promise<void> {
    await db.delete(teamMembers).where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.employeeId, employeeId)
    ));
  }

  async getTeamMembers(teamId: string): Promise<any[]> {
    return await db.select({
      id: teamMembers.id,
      employeeId: teamMembers.employeeId,
      name: employees.name,
      email: employees.email,
      designation: employees.designation,
    }).from(teamMembers)
      .innerJoin(employees, eq(teamMembers.employeeId, employees.id))
      .where(eq(teamMembers.teamId, teamId));
  }
}

export const storage = new DrizzleStorage();
