import bcrypt from 'bcrypt';
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
  appSettings,
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
  type InsertAppSettings,
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
  type AppSettings,
} from "@shared/schema";
import { eq, count, and, gte, lte, inArray, getTableColumns, ne, sql, or } from "drizzle-orm";
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
  getEmployeeAllowancesByMonthYear(employeeId: string, month: number, year: number): Promise<any[]>;
  getPendingAllowances(): Promise<any[]>;
  getPendingAllowancesForTeams(employeeId: string): Promise<any[]>;
  getAllAllowances(): Promise<any[]>;
  getAllAllowancesForTeams(employeeId: string): Promise<any[]>;
  updateDailyAllowance(id: string, allowance: Partial<InsertDailyAllowance>): Promise<DailyAllowance>;
  deleteDailyAllowance(id: string): Promise<void>;
  approveDailyAllowance(id: string, approvedBy: string): Promise<DailyAllowance>;
  rejectDailyAllowance(id: string, rejectionReason: string, isHigherAuthority?: boolean): Promise<DailyAllowance>;

  // Team operations
  createTeam(team: InsertTeam): Promise<Team>;
  getTeam(id: string): Promise<Team | undefined>;
  getTeams(): Promise<Team[]>;
  getTeamsForEmployee(employeeId: string): Promise<Team[]>;
  updateTeam(id: string, team: Partial<InsertTeam>): Promise<Team>;
  deleteTeam(id: string): Promise<void>;
  addTeamMember(teamId: string, employeeId: string): Promise<TeamMember>;
  removeTeamMember(teamId: string, employeeId: string): Promise<void>;
  getTeamMembers(teamId: string): Promise<any[]>;
  isEmployeeReportingPerson(employeeId: string): Promise<boolean>;
  updateTeamMemberReporting(memberId: string, reportingPerson1?: string, reportingPerson2?: string, reportingPerson3?: string): Promise<any>;

  // App Settings operations
  getAppSettings(): Promise<AppSettings | undefined>;
  updateAppSettings(settings: InsertAppSettings): Promise<AppSettings>;
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
    console.log('[Storage] createDailyAllowance - input:', allowance);
    const insertData = {
      employeeId: allowance.employeeId,
      teamId: allowance.teamId || null,
      date: allowance.date,
      allowanceData: allowance.allowanceData,
    };
    console.log('[Storage] createDailyAllowance - will insert:', insertData);
    const [result] = await db.insert(dailyAllowances).values(insertData).returning();
    console.log('[Storage] createDailyAllowance - result:', result);
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

  async getEmployeeAllowances(employeeId: string, limit: number = 30): Promise<any[]> {
    const result = await db.select().from(dailyAllowances)
      .where(eq(dailyAllowances.employeeId, employeeId))
      .orderBy(dailyAllowances.date)
      .limit(limit);
    
    // Enrich with team names
    const enriched = await Promise.all(result.map(async (allowance) => {
      let teamName = null;
      if (allowance.teamId) {
        const team = await this.getTeam(allowance.teamId);
        teamName = team?.name || null;
      }
      return {
        ...allowance,
        teamName,
      };
    }));
    
    return enriched;
  }

  async getEmployeeAllowancesByMonthYear(employeeId: string, month: number, year: number): Promise<any[]> {
    // Fetch all allowances for the employee
    const allAllowances = await db.select().from(dailyAllowances)
      .where(eq(dailyAllowances.employeeId, employeeId))
      .orderBy(dailyAllowances.date);
    
    console.log('[Storage] Raw allowances count:', allAllowances.length);
    
    // Enrich with team names
    const enriched = await Promise.all(allAllowances.map(async (allowance) => {
      let teamName = null;
      if (allowance.teamId) {
        const team = await this.getTeam(allowance.teamId);
        teamName = team?.name || null;
      }
      return {
        ...allowance,
        teamName,
      };
    }));
    
    // Filter by month and year in JavaScript
    const filtered = enriched.filter(allowance => {
      const allowanceDate = new Date(allowance.date);
      const allowanceMonth = allowanceDate.getMonth() + 1;
      const allowanceYear = allowanceDate.getFullYear();
      return allowanceMonth === month && allowanceYear === year;
    });
    
    console.log('[Storage] Enriched allowances with team names:', filtered.length);
    return filtered;
  }

  async updateDailyAllowance(id: string, allowance: Partial<InsertDailyAllowance>): Promise<DailyAllowance> {
    // Check if allowance is approved - cannot update if approved
    const existing = await this.getDailyAllowance(id);
    if (existing && existing.approvalStatus === 'approved') {
      throw new Error('Cannot update an approved allowance');
    }
    console.log('[Storage] updateDailyAllowance - input:', allowance);
    const updateData = {
      ...(allowance.employeeId && { employeeId: allowance.employeeId }),
      ...(allowance.teamId !== undefined && { teamId: allowance.teamId || null }),
      ...(allowance.date && { date: allowance.date }),
      ...(allowance.allowanceData && { allowanceData: allowance.allowanceData }),
    };
    console.log('[Storage] updateDailyAllowance - will update with:', updateData);
    const [result] = await db.update(dailyAllowances).set(updateData).where(eq(dailyAllowances.id, id)).returning();
    console.log('[Storage] updateDailyAllowance - result:', result);
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
    console.log(`[Storage] approveDailyAllowance - allowanceId: ${id}, approvedBy: ${approvedBy}`);
    
    // Get current allowance
    const existing = await this.getDailyAllowance(id);
    if (!existing) throw new Error('Allowance not found');
    
    // Cannot approve if already rejected by higher authority
    if (existing.rejectionReason) {
      throw new Error('Cannot approve a rejected allowance. Status is locked.');
    }
    
    // Cannot approve if already approved
    if (existing.approvalStatus === 'approved') {
      throw new Error('Allowance already approved');
    }
    
    // Increment approval count
    const newApprovalCount = (existing.approvalCount || 0) + 1;
    console.log(`[Storage] Approval count: ${existing.approvalCount} -> ${newApprovalCount}`);
    
    // Determine new status: 2+ approvals = approved, 1 approval = processing
    const newStatus = newApprovalCount >= 2 ? 'approved' : 'processing';
    console.log(`[Storage] New status: ${existing.approvalStatus} -> ${newStatus}`);
    
    // Store approvers as JSON array - safely parse existing approvedBy
    let currentApprovers: string[] = [];
    if (existing.approvedBy) {
      try {
        // Try to parse as JSON array
        currentApprovers = Array.isArray(JSON.parse(existing.approvedBy)) 
          ? JSON.parse(existing.approvedBy)
          : [existing.approvedBy];
      } catch (e) {
        // If parsing fails, treat it as a single string value
        currentApprovers = [existing.approvedBy];
      }
    }
    
    if (!currentApprovers.includes(approvedBy)) {
      currentApprovers.push(approvedBy);
    }
    
    const [result] = await db.update(dailyAllowances).set({
      approvalStatus: newStatus,
      approvalCount: newApprovalCount,
      approvedBy: JSON.stringify(currentApprovers),
      approvedAt: new Date(),
    }).where(eq(dailyAllowances.id, id)).returning();
    
    console.log(`[Storage] Approval updated. New status: ${result.approvalStatus}, Total approvals: ${result.approvalCount}`);
    return result;
  }

  async rejectDailyAllowance(id: string, rejectionReason: string, isHigherAuthority: boolean = true): Promise<DailyAllowance> {
    console.log(`[Storage] rejectDailyAllowance - allowanceId: ${id}, rejectionReason: ${rejectionReason}, isHigherAuthority: ${isHigherAuthority}`);
    
    // Get current allowance
    const existing = await this.getDailyAllowance(id);
    if (!existing) throw new Error('Allowance not found');
    
    // If already rejected by higher authority, cannot change
    if (existing.rejectionReason) {
      throw new Error('Allowance already rejected by higher authority. Status is locked and cannot be changed.');
    }
    
    // If higher authority rejects, lock the status
    if (isHigherAuthority) {
      console.log(`[Storage] Higher authority rejection - status will be locked`);
      const [result] = await db.update(dailyAllowances).set({
        approvalStatus: 'rejected',
        rejectionReason,
      }).where(eq(dailyAllowances.id, id)).returning();
      return result;
    }
    
    // Regular rejection
    const [result] = await db.update(dailyAllowances).set({
      approvalStatus: 'rejected',
    }).where(eq(dailyAllowances.id, id)).returning();
    return result;
  }

  async getPendingAllowances(): Promise<any[]> {
    const result = await db.select().from(dailyAllowances)
      .where(or(
        eq(dailyAllowances.approvalStatus, 'pending'),
        eq(dailyAllowances.approvalStatus, 'processing')
      ))
      .orderBy(dailyAllowances.submittedAt);
    
    if (result.length === 0) return [];
    
    // BULK FETCH: Get all unique employee IDs and team IDs at once
    const employeeIds = Array.from(new Set(result.map(a => a.employeeId)));
    const teamIds = Array.from(new Set(result.map(a => a.teamId).filter(Boolean)));
    
    // Fetch all employees in one query
    const allEmployees = await db.select().from(employees).where(inArray(employees.id, employeeIds));
    const employeeMap = new Map(allEmployees.map(e => [e.id, e]));
    
    // Fetch all teams in one query
    let teamMap = new Map();
    if (teamIds.length > 0) {
      const allTeams = await db.select().from(teams).where(inArray(teams.id, teamIds));
      teamMap = new Map(allTeams.map(t => [t.id, t]));
    }
    
    // Enrich with cached data (no additional queries)
    return result.map(allowance => {
      const employee = employeeMap.get(allowance.employeeId);
      const team = allowance.teamId ? teamMap.get(allowance.teamId) : null;
      return {
        ...allowance,
        employeeName: employee?.name || 'Unknown',
        employeeEmail: employee?.email || '',
        teamName: team?.name || null,
      };
    });
  }

  async getAllAllowances(): Promise<any[]> {
    const result = await db.select().from(dailyAllowances)
      .orderBy(dailyAllowances.submittedAt);
    
    if (result.length === 0) return [];
    
    // BULK FETCH: Get all unique employee IDs and team IDs at once
    const employeeIds = Array.from(new Set(result.map(a => a.employeeId)));
    const teamIds = Array.from(new Set(result.map(a => a.teamId).filter(Boolean)));
    
    // Fetch all employees in one query
    const allEmployees = await db.select().from(employees).where(inArray(employees.id, employeeIds));
    const employeeMap = new Map(allEmployees.map(e => [e.id, e]));
    
    // Fetch all teams in one query
    let teamMap = new Map();
    if (teamIds.length > 0) {
      const allTeams = await db.select().from(teams).where(inArray(teams.id, teamIds));
      teamMap = new Map(allTeams.map(t => [t.id, t]));
    }
    
    // Enrich with cached data
    return result.map(allowance => {
      const employee = employeeMap.get(allowance.employeeId);
      const team = allowance.teamId ? teamMap.get(allowance.teamId) : null;
      return {
        ...allowance,
        employeeName: employee?.name || 'Unknown',
        employeeEmail: employee?.email || '',
        teamName: team?.name || null,
      };
    });
  }

  async getPendingAllowancesForTeams(employeeId: string): Promise<any[]> {
    const userTeams = await this.getTeamsForEmployee(employeeId);
    const teamIds = userTeams.map(t => t.id);
    
    if (teamIds.length === 0) {
      return [];
    }
    
    const teamMembersQuery = await db.select({ employeeId: teamMembers.employeeId })
      .from(teamMembers)
      .where(inArray(teamMembers.teamId, teamIds));
    
    const teamMemberEmployeeIds = Array.from(new Set(teamMembersQuery.map(m => m.employeeId)));
    
    if (teamMemberEmployeeIds.length === 0) {
      return [];
    }
    
    const result = await db.select().from(dailyAllowances)
      .where(and(
        or(
          eq(dailyAllowances.approvalStatus, 'pending'),
          eq(dailyAllowances.approvalStatus, 'processing')
        ),
        inArray(dailyAllowances.employeeId, teamMemberEmployeeIds)
      ))
      .orderBy(dailyAllowances.submittedAt);
    
    if (result.length === 0) return [];
    
    // BULK FETCH: Get all unique employee IDs and team IDs at once
    const allowanceEmployeeIds = [...new Set(result.map(a => a.employeeId))];
    const allowanceTeamIds = [...new Set(result.map(a => a.teamId).filter(Boolean))];
    
    // Fetch all employees in one query
    const allEmployees = await db.select().from(employees).where(inArray(employees.id, allowanceEmployeeIds));
    const employeeMap = new Map(allEmployees.map(e => [e.id, e]));
    
    // Fetch all teams in one query
    let teamMap = new Map();
    if (allowanceTeamIds.length > 0) {
      const allTeams = await db.select().from(teams).where(inArray(teams.id, allowanceTeamIds));
      teamMap = new Map(allTeams.map(t => [t.id, t]));
    }
    
    // Enrich with cached data (no additional queries)
    return result.map(allowance => {
      const employee = employeeMap.get(allowance.employeeId);
      const team = allowance.teamId ? teamMap.get(allowance.teamId) : null;
      return {
        ...allowance,
        employeeName: employee?.name || 'Unknown',
        employeeEmail: employee?.email || '',
        teamName: team?.name || null,
      };
    });
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

  async getTeamsForEmployee(employeeId: string): Promise<Team[]> {
    const result = await db.select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
    }).from(teams)
      .innerJoin(teamMembers, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.employeeId, employeeId));
    return result;
  }

  async updateTeam(id: string, team: Partial<InsertTeam>): Promise<Team> {
    const [result] = await db.update(teams).set(team).where(eq(teams.id, id)).returning();
    return result;
  }

  async deleteTeam(id: string): Promise<void> {
    await db.delete(teams).where(eq(teams.id, id));
  }

  async addTeamMember(teamId: string, employeeId: string, reportingPerson1?: string | null, reportingPerson2?: string | null, reportingPerson3?: string | null): Promise<TeamMember> {
    
    // Check if member already exists in the team
    const existing = await db.select().from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.employeeId, employeeId)
      ));
    
    if (existing.length > 0) {
      throw new Error('Employee is already a member of this team');
    }
    
    const [result] = await db.insert(teamMembers).values({ 
      teamId, 
      employeeId,
      reportingPerson1: reportingPerson1 || null,
      reportingPerson2: reportingPerson2 || null,
      reportingPerson3: reportingPerson3 || null,
    }).returning();
    console.log('[Storage] addTeamMember result:', result);
    return result;
  }

  async removeTeamMember(teamId: string, employeeId: string): Promise<void> {
    // First, get the member being removed to find their ID
    const memberToRemove = await db.select().from(teamMembers).where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.employeeId, employeeId)
    ));

    if (memberToRemove.length > 0) {
      const removedMemberId = memberToRemove[0].id;
      
      // Clean up RP references - remove this member from all RP assignments
      const allMembers = await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
      
      for (const member of allMembers) {
        const updates: any = {};
        let hasUpdates = false;
        
        if (member.reportingPerson1 === removedMemberId) {
          updates.reportingPerson1 = null;
          hasUpdates = true;
        }
        if (member.reportingPerson2 === removedMemberId) {
          updates.reportingPerson2 = null;
          hasUpdates = true;
        }
        if (member.reportingPerson3 === removedMemberId) {
          updates.reportingPerson3 = null;
          hasUpdates = true;
        }
        
        if (hasUpdates) {
          console.log('[Storage] Cleaning up RP references for member:', member.id, 'updates:', updates);
          await db.update(teamMembers).set(updates).where(eq(teamMembers.id, member.id));
        }
      }
    }
    
    // Now delete the member
    await db.delete(teamMembers).where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.employeeId, employeeId)
    ));
    
    console.log('[Storage] Removed team member - teamId:', teamId, 'employeeId:', employeeId);
  }

  async getTeamMembers(teamId: string): Promise<any[]> {
    console.log('[Storage] getTeamMembers - teamId:', teamId);
    try {
      const result = await db.select({
        id: teamMembers.id,
        employeeId: teamMembers.employeeId,
        name: employees.name,
        email: employees.email,
        designation: designations.name,
        reportingPerson1: teamMembers.reportingPerson1,
        reportingPerson2: teamMembers.reportingPerson2,
        reportingPerson3: teamMembers.reportingPerson3,
      }).from(teamMembers)
        .innerJoin(employees, eq(teamMembers.employeeId, employees.id))
        .leftJoin(designations, eq(employees.designationId, designations.id))
        .where(eq(teamMembers.teamId, teamId));
      console.log('[Storage] getTeamMembers result:', result);
      return result;
    } catch (error) {
      console.error('[Storage] getTeamMembers error:', error);
      throw error;
    }
  }

  async isEmployeeReportingPerson(employeeId: string): Promise<boolean> {
    console.log(`[Storage] isEmployeeReportingPerson - START - employeeId: ${employeeId}`);
    
    // Check if this employee is assigned as RP1, RP2, or RP3 in any team
    // First get all teamMember IDs for this employee
    const employeeMembers = await db.select({ id: teamMembers.id }).from(teamMembers)
      .where(eq(teamMembers.employeeId, employeeId));
    
    console.log(`[Storage] isEmployeeReportingPerson - Found ${employeeMembers.length} team members for employee`);
    console.log(`[Storage] isEmployeeReportingPerson - Team members:`, employeeMembers);
    
    if (employeeMembers.length === 0) {
      console.log(`[Storage] isEmployeeReportingPerson - No team members found, returning false`);
      return false;
    }
    
    const memberIds = employeeMembers.map(m => m.id);
    console.log(`[Storage] isEmployeeReportingPerson - Member IDs to check:`, memberIds);
    
    // Check if any of those memberIds appear as RP1, RP2, or RP3 in any team
    const result = await db.select().from(teamMembers)
      .where(or(
        inArray(teamMembers.reportingPerson1, memberIds),
        inArray(teamMembers.reportingPerson2, memberIds),
        inArray(teamMembers.reportingPerson3, memberIds)
      ));
    
    console.log(`[Storage] isEmployeeReportingPerson - Found ${result.length} RP assignments`);
    console.log(`[Storage] isEmployeeReportingPerson - RP assignments:`, result);
    const isRP = result.length > 0;
    console.log(`[Storage] isEmployeeReportingPerson - RESULT: ${isRP}`);
    return isRP;
  }

  async updateTeamMemberReporting(memberId: string, reportingPerson1?: string, reportingPerson2?: string, reportingPerson3?: string): Promise<any> {
    console.log('[Storage] updateTeamMemberReporting - memberId:', memberId, 'rp1:', reportingPerson1, 'rp2:', reportingPerson2, 'rp3:', reportingPerson3);
    
    const updates: any = {};
    if (reportingPerson1 !== undefined) updates.reportingPerson1 = reportingPerson1 || null;
    if (reportingPerson2 !== undefined) updates.reportingPerson2 = reportingPerson2 || null;
    if (reportingPerson3 !== undefined) updates.reportingPerson3 = reportingPerson3 || null;
    
    console.log('[Storage] Updates object:', updates);
    
    const [result] = await db.update(teamMembers)
      .set(updates)
      .where(eq(teamMembers.id, memberId))
      .returning();
    
    console.log('[Storage] Updated result:', result);
    return result;
  }

  // App Settings operations
  async getAppSettings(): Promise<AppSettings | undefined> {
    console.log('[Storage] getAppSettings');
    const result = await db.select().from(appSettings).limit(1);
    console.log('[Storage] getAppSettings result:', result);
    return result[0];
  }

  async updateAppSettings(settings: InsertAppSettings): Promise<AppSettings> {
    console.log('[Storage] updateAppSettings:', settings);
    
    // Get existing settings
    const existing = await this.getAppSettings();
    
    if (existing) {
      // Update existing
      const [result] = await db.update(appSettings)
        .set(settings)
        .where(eq(appSettings.id, existing.id))
        .returning();
      console.log('[Storage] Updated app settings:', result);
      return result;
    } else {
      // Create new
      const [result] = await db.insert(appSettings).values(settings).returning();
      console.log('[Storage] Created app settings:', result);
      return result;
    }
  }
}

export const storage = new DrizzleStorage();
