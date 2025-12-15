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
import { eq, count, and, gte, lte, inArray, getTableColumns, ne, sql, or, desc, isNull } from "drizzle-orm";
import { type InferSelectModel } from "drizzle-orm";

export interface IStorage {
  // Vendor operations
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  getVendor(id: string): Promise<Vendor | undefined>;
  getVendorByName(name: string): Promise<Vendor | undefined>;
  getVendorByEmail(email: string): Promise<Vendor | undefined>;
  getOrCreateVendorByName(name: string): Promise<Vendor>;
  getVendors(limit: number, offset: number): Promise<Vendor[]>;
  getAllVendors(minimal?: boolean): Promise<any[]>;
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
  getSitesForPOGenerationWithVendors(): Promise<any[]>;
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
  // Hash a password using server-side bcrypt
  hashPassword(password: string): Promise<string>;

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
  getPOsWithDetails(limit: number, offset: number): Promise<any[]>;
  getPOsByVendor(vendorId: string): Promise<PurchaseOrder[]>;
  getPOBySiteId(siteId: string): Promise<PurchaseOrder | undefined>;
  updatePO(id: string, po: Partial<InsertPO>): Promise<PurchaseOrder>;
  deletePO(id: string): Promise<void>;
  getPOCount(): Promise<number>;

  // Invoice operations
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoices(limit: number, offset: number): Promise<Invoice[]>;
  getInvoicesWithDetails(limit: number, offset: number): Promise<any[]>;
  getAvailablePOsWithAllDetails(limit: number, offset: number): Promise<any[]>;
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
  getTeamsForEmployee(employeeId: string): Promise<any[]>;
  getPendingAllowances(): Promise<any[]>;
  getPendingAllowancesForTeams(employeeId: string): Promise<any[]>;
  getAllAllowances(): Promise<any[]>;
  getAllAllowancesForTeams(employeeId: string): Promise<any[]>;
  updateDailyAllowance(id: string, allowance: Partial<InsertDailyAllowance>): Promise<DailyAllowance>;
  deleteDailyAllowance(id: string): Promise<void>;
  approveDailyAllowance(id: string, approvedBy: string, approverName?: string, approverLevel?: number, remark?: string, editedData?: any): Promise<DailyAllowance>;
  rejectDailyAllowance(id: string, rejectionReason: string, isHigherAuthority?: boolean): Promise<DailyAllowance>;

  // Team operations
  createTeam(team: InsertTeam): Promise<Team>;
  getTeam(id: string): Promise<Team | undefined>;
  getTeams(): Promise<Team[]>;
  getTeamsForEmployee(employeeId: string): Promise<Team[]>;
  getTeamsWhereReportingPerson(employeeId: string): Promise<Team[]>;
  updateTeam(id: string, team: Partial<InsertTeam>): Promise<Team>;
  deleteTeam(id: string): Promise<void>;
  addTeamMember(teamId: string, employeeId: string): Promise<TeamMember>;
  removeTeamMember(teamId: string, employeeId: string): Promise<void>;
  getTeamMembers(teamId: string): Promise<any[]>;
  getTeamMembersPaginated(teamId: string, page?: number, pageSize?: number): Promise<{ members: any[]; total: number }>;
  isEmployeeReportingPerson(employeeId: string): Promise<boolean>;
  updateTeamMemberReporting(memberId: string, reportingPerson1?: string, reportingPerson2?: string, reportingPerson3?: string): Promise<any>;

  // App Settings operations
  getAppSettings(): Promise<AppSettings | undefined>;
  updateAppSettings(settings: InsertAppSettings): Promise<AppSettings>;
}

export class DrizzleStorage implements IStorage {
  async getOrCreateVendorByName(name: string): Promise<Vendor> {
    try {
      if (!name || !name.trim()) {
        throw new Error('Vendor name must not be empty');
      }

      // Check if vendor with this name already exists
      const existing = await this.getVendorByName(name);
      if (existing) {
        console.log(`[Storage] Vendor found by name: ${name}`);
        return existing;
      }

      // Create a new vendor with minimal required fields
      const tempPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(tempPassword, 4);
      const uniqueSuffix = Math.random().toString(36).slice(-8).toUpperCase();

      const newVendor: InsertVendor = {
        name,
        vendorCode: `V${Date.now()}`,
        email: `${name.replace(/\s+/g, '').toLowerCase()}${Math.random().toString(36).slice(-6)}@vendor.local`,
        mobile: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        aadhar: `TEMP${Date.now()}${uniqueSuffix}`,
        pan: `TEMP${uniqueSuffix}`,
        password: hashedPassword,
      };
      
      console.log(`[Storage] Creating vendor: ${name}`);
      const result = await this.createVendor(newVendor);
      console.log(`[Storage] Vendor created: ${name} (id: ${result.id})`);
      return result;
    } catch (error: any) {
      console.error(`[Storage] getOrCreateVendorByName error for "${name}":`, {
        errorMessage: error.message,
        errorCode: error.code,
      });
      throw error;
    }
  }
  // Vendor operations
  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    try {
      let vendorCode = vendor.vendorCode;
      
      // Auto-generate vendor code if not provided
      if (!vendorCode) {
        // Get all vendors and find the maximum vendor code
        const allVendors = await db.select().from(vendors);
        let nextCode = 1001;
        
        if (allVendors && allVendors.length > 0) {
          // Get numeric values from existing codes and find max
          const numericCodes = allVendors
            .filter(v => v.vendorCode && !isNaN(parseInt(v.vendorCode)))
            .map(v => parseInt(v.vendorCode!))
            .sort((a, b) => b - a);
          
          if (numericCodes.length > 0) {
            nextCode = numericCodes[0] + 1;
          } else {
            nextCode = 1001 + allVendors.length;
          }
        }
        
        vendorCode = nextCode.toString();
        console.log(`[Storage] Auto-generated vendor code: ${vendorCode}`);
      }
      
      const vendorToInsert = { ...vendor, vendorCode };
      console.log(`[Storage] Creating vendor with code: ${vendorCode}`);
      const [insertedVendor] = await db.insert(vendors).values(vendorToInsert).returning();
      console.log(`[Storage] Vendor created with code: ${insertedVendor.vendorCode}`);
      return insertedVendor;
    } catch (error: any) {
      console.error('[Storage] Vendor creation error:', {
        vendor,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetail: error.detail,
        error: error.toString()
      });

      // If the insert failed due to a unique constraint (race), try to fetch the existing vendor by vendorCode
      if (error.code === '23505' && vendor.vendorCode) {
        try {
          console.log('[Storage] Detected unique_violation during vendor insert. Attempting to fetch existing vendor by vendorCode:', vendor.vendorCode);
          const existing = await this.getVendorByCode(vendor.vendorCode);
          if (existing) {
            console.log('[Storage] Found existing vendor after unique_violation:', existing.id);
            return existing;
          }
        } catch (fetchErr) {
          console.error('[Storage] Error fetching vendor after unique_violation:', fetchErr);
        }
      }

      throw error;
    }
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

  async getVendorByCode(vendorCode: string): Promise<Vendor | undefined> {
    const code = vendorCode ? String(vendorCode).trim().toLowerCase() : vendorCode;
    const result = await db
      .select()
      .from(vendors)
      .where(sql`LOWER(TRIM(${vendors.vendorCode})) = ${code}`);
    return result[0];
  }

  async getOrCreateVendorByCode(vendorCode: string, name: string): Promise<Vendor> {
    try {
      if (!vendorCode) {
        throw new Error(`Partner or ${name} must have PARTNER CODE`);
      }

      // Check if vendor with this code already exists
      const existing = await this.getVendorByCode(vendorCode);
      if (existing) {
        console.log(`[Storage] Vendor found by code: ${vendorCode} (${name})`);
        return existing;
      }

      // Create a new vendor with minimal required fields
      const vendorName = name || vendorCode;
      const tempPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(tempPassword, 4);
      const uniqueSuffix = Math.random().toString(36).slice(-8).toUpperCase();
      
      const newVendor: InsertVendor = {
        vendorCode,
        name: vendorName,
        email: `${vendorCode.replace(/\s+/g, '').toLowerCase()}${Math.random().toString(36).slice(-6)}@vendor.local`,
        mobile: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        aadhar: `TEMP${Date.now()}${uniqueSuffix}`,
        pan: `TEMP${uniqueSuffix}`,
        password: hashedPassword,
      };
      console.log(`[Storage] Creating vendor: ${name} (code: ${vendorCode})`);
      const result = await this.createVendor(newVendor);
      console.log(`[Storage] Vendor created: ${name} (code: ${vendorCode}, id: ${result.id})`);
      return result;
    } catch (error: any) {
      console.error(`[Storage] getOrCreateVendorByCode error for "${vendorCode}":`, {
        errorMessage: error.message,
        errorCode: error.code,
        errorDetail: error.detail,
      });
      throw error;
    }
  }

  async getVendors(limit: number, offset: number): Promise<Vendor[]> {
    return await db.select().from(vendors).limit(limit).offset(offset);
  }

  async getAllVendors(minimal = false): Promise<any[]> {
    if (minimal) {
      return await db
        .select({ id: vendors.id, vendorCode: vendors.vendorCode, name: vendors.name, status: vendors.status })
        .from(vendors);
    }
    return await db.select().from(vendors);
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
    // Convert empty DOB string to null and ensure doj is a string
    const employeeData = { 
      ...employee, 
      dob: typeof employee.dob === 'string'
        ? (employee.dob.trim() ? employee.dob : null)
        : (employee.dob instanceof Date ? employee.dob.toISOString().split('T')[0] : (employee.dob ?? null)),
      doj: typeof employee.doj === 'string'
        ? employee.doj
        : (employee.doj instanceof Date ? employee.doj.toISOString().split('T')[0] : employee.doj)
    };
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
    // Convert empty DOB string to null and ensure doj is a string
    const employeeData = { 
      ...employee, 
      dob: employee.dob !== undefined
        ? (typeof employee.dob === 'string'
            ? (employee.dob.trim() ? employee.dob : null)
            : (employee.dob instanceof Date ? employee.dob.toISOString().split('T')[0] : (employee.dob ?? null)))
        : employee.dob,
      doj: employee.doj !== undefined
        ? (typeof employee.doj === 'string'
            ? employee.doj
            : (employee.doj instanceof Date ? employee.doj.toISOString().split('T')[0] : employee.doj))
        : employee.doj
    };
    const [result] = await db
      .update(employees)
      .set(employeeData)
      .where(eq(employees.id, id))
      .returning();
    return result;
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
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
    
    // Optimized: Get employee with department and designation in ONE query using LEFT JOIN
    const result = await db
      .select({
        employee: employees,
        departmentName: departments.name,
        designationName: designations.name,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .where(eq(employees.email, email))
      .limit(1);

    if (result.length === 0 || !result[0].employee) {
      console.log(`[Storage] Employee not found`);
      return null;
    }

    const employee = result[0].employee;
    console.log(`[Storage] Employee lookup result: Found: ${employee.name}`);
    
    if (!employee.password) {
      console.log(`[Storage] No password set for employee`);
      return null;
    }
    
    try {
      const passwordMatch = await bcrypt.compare(password, employee.password);
      console.log(`[Storage] Password match result: ${passwordMatch}`);
      
      if (passwordMatch) {
        console.log(`[Storage] Login successful for ${email}`);
        
        // Add department and designation names from JOIN
        (employee as any).departmentName = result[0].departmentName || "Not Assigned";
        (employee as any).designationName = result[0].designationName || "Not Specified";
        
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
      .where(eq(sites.vendorId, vendorId));
    
    return result as Site[];
  }

  async getSitesForPOGeneration(): Promise<Site[]> {
    // ULTRA-FAST: Get approved sites only, without payment details
    // Payment amounts can be fetched separately if needed
    // This is the BOTTLENECK - simplifying to return fast
    // Include payment master amounts by left-joining paymentMasters.
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
      )
      .orderBy(desc(sites.createdAt))
      .limit(10000);

    return result as Site[];
  }

  async getSitesForPOGenerationWithVendors(): Promise<any[]> {
    // OPTIMIZED: Single query returns sites with vendor details already joined
    // Eliminates need for frontend to loop and look up vendors
    const result = await db
      .select({
        // Site fields
        ...getTableColumns(sites),
        vendorAmount: paymentMasters.vendorAmount,
        siteAmount: paymentMasters.siteAmount,
        // Vendor fields
        vendorName: vendors.name,
        vendorCode: vendors.vendorCode,
        vendorState: vendors.state,
        vendorEmail: vendors.email,
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
      .leftJoin(vendors, eq(sites.vendorId, vendors.id))
      .where(
        and(
          eq(sites.softAtStatus, "Approved"),
          eq(sites.phyAtStatus, "Approved")
        )
      )
      .orderBy(desc(sites.createdAt))
      .limit(10000);

    return result;
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
      // Check if both softAtStatus and phyAtStatus are "Approved"
      if (existingSite.softAtStatus === 'Approved' && existingSite.phyAtStatus === 'Approved') {
        // REDUCED LOGGING: Skip verbose log
        throw new Error(`can not update ${site.planId} due to both soft at and phy at is approved`);
      }

      // Update existing site - keep existing siteId and exclude planId from update
      const { planId, siteId, ...updateData } = site;
      // If vendorId is being updated and it's not an existing vendor id, try resolving by vendorCode
      if (updateData.vendorId) {
        try {
          const found = await this.getVendorByCode(String(updateData.vendorId));
          if (found) {
            // REDUCED LOGGING: Skip verbose vendor resolution log
            updateData.vendorId = found.id;
          }
        } catch (err) {
          // Only log errors
          console.error('[Storage] Error resolving vendorCode during update:', err);
        }
      }
      const finalUpdateData = this.autoUpdateSiteStatus(updateData);
      // REDUCED LOGGING: Skip verbose update log
      const [result] = await db
        .update(sites)
        .set(finalUpdateData)
        .where(eq(sites.planId, site.planId))
        .returning();
      return result;
    } else {
      // Insert new site - generate unique siteId if not provided or conflicts exist
      let finalSite = this.autoUpdateSiteStatus(site);
      
      // Check if siteId already exists - but ONLY if planId is NOT found
      // This means we're inserting a truly new site, not updating an existing one
      // Use retry logic to handle concurrent inserts with same siteId
      if (finalSite.siteId) {
        let retryCount = 0;
        let originalSiteId = finalSite.siteId;
        let needsRetry = true;

        while (needsRetry && retryCount < 5) {
          try {
            const existingBySiteId = await db.select().from(sites).where(eq(sites.siteId, finalSite.siteId));
            if (existingBySiteId.length > 0) {
              // siteId already exists, generate a new unique one
              finalSite.siteId = `${originalSiteId}-${Date.now()}-${Math.random().toString(36).slice(-8)}`;
              // REDUCED LOGGING: Skip verbose conflict log
              retryCount++;
            } else {
              // No conflict, ready to insert
              needsRetry = false;
            }
          } catch (err) {
            // Only log errors
            console.error(`[Storage] Error checking siteId conflict, retrying... Attempt ${retryCount + 1}:`, err);
            retryCount++;
            if (retryCount >= 5) {
              throw new Error(`Failed to generate unique siteId after ${retryCount} attempts`);
            }
            // Small delay before retry
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      try {
        // Ensure vendor exists before inserting site. If vendorId seems to be a vendorCode, try resolving it.
        let vendorExists = await db.select().from(vendors).where(eq(vendors.id, finalSite.vendorId));
        if (!vendorExists || vendorExists.length === 0) {
          // Try resolving by vendorCode
          try {
            const byCode = await this.getVendorByCode(String(finalSite.vendorId));
            if (byCode) {
              // REDUCED LOGGING: Skip verbose vendor resolution log
              finalSite.vendorId = byCode.id;
              vendorExists = [byCode];
            }
          } catch (err) {
            // Only log errors
            console.error('[Storage] Error while resolving vendorCode during insert:', err);
          }
        }

        if (!vendorExists || vendorExists.length === 0) {
          throw new Error(`Vendor not found for vendorId ${finalSite.vendorId} (planId: ${site.planId})`);
        }

        // REDUCED LOGGING: Skip verbose insert log

        // Try to insert with retry on unique constraint violation
        let insertRetryCount = 0;
        let insertSuccess = false;
        let result: any = null;

        while (!insertSuccess && insertRetryCount < 5) {
          try {
            const [insertResult] = await db.insert(sites).values(finalSite as InsertSite).returning();
            result = insertResult;
            insertSuccess = true;
            // REDUCED LOGGING: Skip verbose success log
          } catch (insertError: any) {
            // Check if it's a unique constraint violation on siteId
            if (insertError.message?.includes('sites_site_id_unique') || insertError.code === '23505') {
              insertRetryCount++;
              if (insertRetryCount >= 5) {
                console.error(`[Storage] Failed to insert after ${insertRetryCount} retry attempts due to siteId conflict`);
                throw insertError;
              }
              // Generate a new unique siteId and retry
              const originalSiteId = finalSite.siteId.split('-')[0]; // Get base siteId
              finalSite.siteId = `${originalSiteId}-${Date.now()}-${Math.random().toString(36).slice(-8)}`;
              // REDUCED LOGGING: Skip verbose retry log
            } else {
              // Different error, don't retry
              throw insertError;
            }
          }
        }

        if (!insertSuccess || !result) {
          throw new Error(`Failed to insert site after multiple attempts`);
        }

        return result;
      } catch (error: any) {
        console.error('[Storage] upsertSiteByPlanId insert error:', {
          planId: site.planId,
          siteId: finalSite.siteId,
          vendorId: finalSite.vendorId,
          errorMessage: error.message,
          errorCode: error.code,
        });
        throw error;
      }
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
      .offset(offset)
      .orderBy(desc(purchaseOrders.createdAt));
  }

  async getPOsWithDetails(limit: number, offset: number): Promise<any[]> {
    // OPTIMIZED: Uses idx_purchase_orders_vendor_created index for fast sorting
    // Joins sites and vendors ONLY for selected records to reduce memory usage
    // Performance: Much faster than joining all records then limiting
    const pos = await db
      .select({
        id: purchaseOrders.id,
        siteId: purchaseOrders.siteId,
        vendorId: purchaseOrders.vendorId,
        poNumber: purchaseOrders.poNumber,
        poDate: purchaseOrders.poDate,
        description: purchaseOrders.description,
        quantity: purchaseOrders.quantity,
        unitPrice: purchaseOrders.unitPrice,
        totalAmount: purchaseOrders.totalAmount,
        cgstAmount: purchaseOrders.cgstAmount,
        sgstAmount: purchaseOrders.sgstAmount,
        igstAmount: purchaseOrders.igstAmount,
        gstType: purchaseOrders.gstType,
        gstApply: purchaseOrders.gstApply,
        status: purchaseOrders.status,
        dueDate: purchaseOrders.dueDate,
        createdAt: purchaseOrders.createdAt,
        // Site details
        siteName: sites.hopAB,
        siteId2: sites.siteId,
        planId: sites.planId,
        siteAAntDia: sites.siteAAntDia,
        siteBAntDia: sites.siteBAntDia,
        partnerName: sites.partnerName, // Vendor name from sites table
        // Vendor details from vendors table
        vendorName: vendors.name,
        vendorCode: vendors.vendorCode,
      })
      .from(purchaseOrders)
      .leftJoin(sites, eq(purchaseOrders.siteId, sites.id))
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      // ORDER FIRST to use index efficiently
      .orderBy(desc(purchaseOrders.createdAt))
      // THEN LIMIT AND OFFSET (apply limit early to reduce joins)
      .limit(limit)
      .offset(offset);

    // Calculate maxAntennaSize for each PO and fallback vendor name
    return pos.map(po => ({
      ...po,
      // Fallback to partnerName if vendorName is null
      vendorName: po.vendorName || po.partnerName || 'Unknown Vendor',
      maxAntennaSize: Math.max(
        parseFloat(po.siteAAntDia || '0') || 0,
        parseFloat(po.siteBAntDia || '0') || 0
      )
    }));
  }

  async getPOsByVendor(vendorId: string): Promise<any[]> {
    const pos = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        poDate: purchaseOrders.poDate,
        vendorId: purchaseOrders.vendorId,
        siteId: purchaseOrders.siteId,
        description: purchaseOrders.description,
        quantity: purchaseOrders.quantity,
        unitPrice: purchaseOrders.unitPrice,
        totalAmount: purchaseOrders.totalAmount,
        cgstAmount: purchaseOrders.cgstAmount,
        sgstAmount: purchaseOrders.sgstAmount,
        igstAmount: purchaseOrders.igstAmount,
        gstType: purchaseOrders.gstType,
        gstApply: purchaseOrders.gstApply,
        status: purchaseOrders.status,
        dueDate: purchaseOrders.dueDate,
        createdAt: purchaseOrders.createdAt,
        // Site details with joins
        siteName: sites.hopAB,
        planId: sites.planId,
        siteAAntDia: sites.siteAAntDia,
        siteBAntDia: sites.siteBAntDia,
        partnerName: sites.partnerName, // Vendor name from sites table
        // Vendor details with joins
        vendorName: vendors.name,
        vendorCode: vendors.vendorCode,
      })
      .from(purchaseOrders)
      .leftJoin(sites, eq(purchaseOrders.siteId, sites.id))
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(eq(purchaseOrders.vendorId, vendorId));

    // Calculate maxAntennaSize for each PO and fallback vendor name
    return pos.map(po => ({
      ...po,
      // Fallback to partnerName if vendorName is null
      vendorName: po.vendorName || po.partnerName || 'Unknown Vendor',
      maxAntennaSize: Math.max(
        parseFloat(po.siteAAntDia || '0') || 0,
        parseFloat(po.siteBAntDia || '0') || 0
      )
    }));
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

  async getInvoicesWithDetails(limit: number, offset: number): Promise<any[]> {
    // OPTIMIZED: Joins POs, sites and vendors in single query to reduce round-trips
    // Returns invoices with all related data needed for display
    const invoicesData = await db
      .select({
        // Invoice fields
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        poId: invoices.poId,
        vendorId: invoices.vendorId,
        amount: invoices.amount,
        gst: invoices.gst,
        totalAmount: invoices.totalAmount,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        createdAt: invoices.createdAt,
        // PO details
        poNumber: purchaseOrders.poNumber,
        poDate: purchaseOrders.poDate,
        poDueDate: purchaseOrders.dueDate,
        description: purchaseOrders.description,
        quantity: purchaseOrders.quantity,
        unitPrice: purchaseOrders.unitPrice,
        cgstAmount: purchaseOrders.cgstAmount,
        sgstAmount: purchaseOrders.sgstAmount,
        igstAmount: purchaseOrders.igstAmount,
        // Site details
        siteId: purchaseOrders.siteId,
        siteName: sites.hopAB,
        siteId2: sites.siteId,
        planId: sites.planId,
        siteAAntDia: sites.siteAAntDia,
        siteBAntDia: sites.siteBAntDia,
        // Vendor details
        vendorName: vendors.name,
        vendorCode: vendors.vendorCode,
        vendorEmail: vendors.email,
      })
      .from(invoices)
      .leftJoin(purchaseOrders, eq(invoices.poId, purchaseOrders.id))
      .leftJoin(sites, eq(purchaseOrders.siteId, sites.id))
      .leftJoin(vendors, eq(invoices.vendorId, vendors.id))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    // Calculate maxAntennaSize for each invoice - ALL DATA ALREADY IN SINGLE QUERY
    return invoicesData.map(inv => ({
      ...inv,
      maxAntennaSize: Math.max(
        parseFloat(inv.siteAAntDia || '0') || 0,
        parseFloat(inv.siteBAntDia || '0') || 0
      ).toString(),
    }));
  }

  async getAvailablePOsWithAllDetails(limit: number, offset: number): Promise<any[]> {
    // ULTRA-OPTIMIZED: Single query returns POs with vendor and site details
    // Used for invoice generation - returns ONLY POs that don't have invoices yet
    // Joins with invoices table and filters where invoice is NULL (no invoice created)
    const posData = await db
      .select({
        // PO fields
        id: purchaseOrders.id,
        siteId: purchaseOrders.siteId,
        vendorId: purchaseOrders.vendorId,
        poNumber: purchaseOrders.poNumber,
        poDate: purchaseOrders.poDate,
        description: purchaseOrders.description,
        quantity: purchaseOrders.quantity,
        unitPrice: purchaseOrders.unitPrice,
        totalAmount: purchaseOrders.totalAmount,
        cgstAmount: purchaseOrders.cgstAmount,
        sgstAmount: purchaseOrders.sgstAmount,
        igstAmount: purchaseOrders.igstAmount,
        gstType: purchaseOrders.gstType,
        gstApply: purchaseOrders.gstApply,
        status: purchaseOrders.status,
        dueDate: purchaseOrders.dueDate,
        createdAt: purchaseOrders.createdAt,
        // Site details
        siteName: sites.hopAB,
        siteId2: sites.siteId,
        planId: sites.planId,
        siteAAntDia: sites.siteAAntDia,
        siteBAntDia: sites.siteBAntDia,
        // Vendor details
        vendorName: vendors.name,
        vendorCode: vendors.vendorCode,
        vendorEmail: vendors.email,
      })
      .from(purchaseOrders)
      .leftJoin(sites, eq(purchaseOrders.siteId, sites.id))
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(invoices, eq(purchaseOrders.id, invoices.poId))
      .where(isNull(invoices.id))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(limit)
      .offset(offset);

    // Calculate maxAntennaSize - ALL DATA IN SINGLE QUERY, NO LOOPS NEEDED
    return posData.map(po => ({
      ...po,
      maxAntennaSize: Math.max(
        parseFloat(po.siteAAntDia || '0') || 0,
        parseFloat(po.siteBAntDia || '0') || 0
      ).toString(),
    }));
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
  
  // Ensure selectedEmployeeIds is properly formatted as JSON string of IDs only
  let selectedEmployeeIdsJson = null;
  if (allowance.selectedEmployeeIds) {
    try {
      // If it's already a string, parse and re-stringify to ensure it's just IDs
      const parsed = typeof allowance.selectedEmployeeIds === 'string' 
        ? JSON.parse(allowance.selectedEmployeeIds)
        : allowance.selectedEmployeeIds;
      
      // Extract only IDs if objects were passed
      const idsOnly = Array.isArray(parsed) 
        ? parsed.map(item => typeof item === 'string' ? item : item.id || item.employeeId)
        : [];
      
      selectedEmployeeIdsJson = JSON.stringify(idsOnly);
      console.log('[Storage] Cleaned selectedEmployeeIds:', selectedEmployeeIdsJson);
    } catch (e) {
      console.error('[Storage] Error parsing selectedEmployeeIds:', e);
      selectedEmployeeIdsJson = null;
    }
  }
  
  const insertData = {
    employeeId: allowance.employeeId,
    teamId: allowance.teamId || null,
    date: allowance.date,
    allowanceData: allowance.allowanceData,
    selectedEmployeeIds: selectedEmployeeIdsJson,  // Only IDs as JSON string
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
  
  if (result.length === 0) {
    return [];
  }
  
  // Collect all employee IDs
  const allEmployeeIds = new Set<string>();
  result.forEach(allowance => {
    allEmployeeIds.add(allowance.employeeId);
    
    if (allowance.selectedEmployeeIds) {
      try {
        const selectedIds = JSON.parse(allowance.selectedEmployeeIds);
        if (Array.isArray(selectedIds)) {
          selectedIds.forEach(id => {
            if (typeof id === 'string') {
              allEmployeeIds.add(id);
            }
          });
        }
      } catch (e) {
        console.error('[Storage] Error parsing selectedEmployeeIds:', e);
      }
    }
  });
  
  // Bulk fetch all employees
  const employeeIdsArray = Array.from(allEmployeeIds);
  const allEmployees = await db.select().from(employees).where(inArray(employees.id, employeeIdsArray));
  const employeeMap = new Map(allEmployees.map(e => [e.id, e]));
  
  // Bulk fetch teams
  const teamIds = Array.from(new Set(result.map(a => a.teamId).filter((id): id is string => id != null)));
  let teamMap = new Map();
  if (teamIds.length > 0) {
    const allTeams = await db.select().from(teams).where(inArray(teams.id, teamIds));
    teamMap = new Map(allTeams.map(t => [t.id, t]));
  }
  
  // Enrich with names
  const enriched = result.map(allowance => {
    const primaryEmployee = employeeMap.get(allowance.employeeId);
    const team = allowance.teamId ? teamMap.get(allowance.teamId) : null;
    
    // Parse selectedEmployeeIds and enrich with names
    let selectedEmployeesWithNames: { id: any; name: string; email: string; }[] = [];
    if (allowance.selectedEmployeeIds) {
      try {
        const selectedIds = JSON.parse(allowance.selectedEmployeeIds);
        if (Array.isArray(selectedIds)) {
          selectedEmployeesWithNames = selectedIds.map(id => {
            const empId = typeof id === 'string' ? id : id.id;
            const emp = employeeMap.get(empId);
            return {
              id: empId,
              name: emp?.name || 'Unknown',
              email: emp?.email || '',
            };
          }).filter(emp => emp.id);
        }
      } catch (e) {
        console.error('[Storage] Error parsing selectedEmployeeIds:', e);
      }
    }
    
    return {
      ...allowance,
      employeeName: primaryEmployee?.name || 'Unknown',
      teamName: team?.name || null,
      selectedEmployees: selectedEmployeesWithNames, // Array of {id, name, email}
    };
  });
  
  return enriched;
}

  // async getEmployeeAllowancesByMonthYear(employeeId: string, month: number, year: number): Promise<any[]> {
  //   // Fetch allowances where employee is either the primary owner OR in selectedEmployeeIds
  //   const allAllowances = await db.select().from(dailyAllowances)
  //     .where(or(
  //       eq(dailyAllowances.employeeId, employeeId),
  //       sql`${dailyAllowances.selectedEmployeeIds}::text LIKE ${`%"${employeeId}"%`}`
  //     ))
  //     .orderBy(dailyAllowances.date);
    
  //   console.log('[Storage] Raw allowances count:', allAllowances.length);
    
  //   // Bulk fetch employee and teams
  //   const allowanceTeamIds = [...new Set(allAllowances.map(a => a.teamId).filter(Boolean))];
    
  //   // Get the logged-in employee's info
  //   const employee = await this.getEmployee(employeeId);
    
  //   let teamMap = new Map();
  //   if (allowanceTeamIds.length > 0) {
  //     const allTeams = await db.select().from(teams).where(inArray(teams.id, allowanceTeamIds));
  //     teamMap = new Map(allTeams.map(t => [t.id, t]));
  //   }
    
  //   // Enrich with employee and team names
  //   const enriched = allAllowances.map(allowance => {
  //     const team = allowance.teamId ? teamMap.get(allowance.teamId) : null;
  //     return {
  //       ...allowance,
  //       employeeName: employee?.name || 'Unknown',
  //       teamName: team?.name || null,
  //     };
  //   });
    
  //   // Filter by month and year in JavaScript
  //   const filtered = enriched.filter(allowance => {
  //     const allowanceDate = new Date(allowance.date);
  //     const allowanceMonth = allowanceDate.getMonth() + 1;
  //     const allowanceYear = allowanceDate.getFullYear();
  //     return allowanceMonth === month && allowanceYear === year;
  //   });
    
  //   console.log('[Storage] Filtered allowances with team names:', filtered.length);
  //   return filtered;
  // }

// UPDATED getEmployeeAllowancesByMonthYear FOR INDIVIDUAL RECORDS APPROACH
// Replace this function in your storage.ts file (around line 1200)

async getEmployeeAllowancesByMonthYear(employeeId: string, month: number, year: number): Promise<any[]> {
  try {
    console.log('[Storage] getEmployeeAllowancesByMonthYear - employeeId:', employeeId, 'month:', month, 'year:', year);
    
    // For individual records approach: 
    // Just fetch where employeeId matches (no need to check selectedEmployeeIds)
    const allAllowances = await db.select().from(dailyAllowances)
      .where(eq(dailyAllowances.employeeId, employeeId))
      .orderBy(dailyAllowances.date);
    
    console.log('[Storage] Raw allowances count:', allAllowances.length);
    
    if (allAllowances.length === 0) {
      return [];
    }
    
    // Collect unique team IDs
    const allowanceTeamIds = Array.from(
      new Set(
        allAllowances
          .map(a => a.teamId)
          .filter((id): id is string => id != null)
      )
    );
    
    // Fetch all teams at once
    let teamMap = new Map();
    if (allowanceTeamIds.length > 0) {
      const allTeams = await db.select().from(teams).where(inArray(teams.id, allowanceTeamIds));
      teamMap = new Map(allTeams.map(t => [t.id, t]));
    }
    
    // Get the employee's info (the logged-in user)
    const employee = await this.getEmployee(employeeId);
    const employeeName = employee?.name || 'Unknown';
    
    // Enrich allowances with employee and team names
    const enriched = allAllowances.map(allowance => {
      const team = allowance.teamId ? teamMap.get(allowance.teamId) : null;
      
      return {
        ...allowance,
        employeeName: employeeName,  // The record owner's name
        teamName: team?.name || null,
      };
    });
    
    // Filter by month and year
    const filtered = enriched.filter(allowance => {
      const allowanceDate = new Date(allowance.date);
      const allowanceMonth = allowanceDate.getMonth() + 1;
      const allowanceYear = allowanceDate.getFullYear();
      return allowanceMonth === month && allowanceYear === year;
    });
    
    console.log('[Storage] Filtered allowances for month/year:', filtered.length);
    return filtered;
    
  } catch (error) {
    console.error('[Storage] Error in getEmployeeAllowancesByMonthYear:', error);
    return [];
  }
}

// ============================================================================
// WHAT WAS CHANGED
// ============================================================================

/*
OLD APPROACH (Bulk):
- Checked: employeeId matches OR employee is in selectedEmployeeIds
- Used: sql`${dailyAllowances.selectedEmployeeIds}::text LIKE...`
- Result: Returned records where user was owner OR recipient

NEW APPROACH (Individual):
- Checks: ONLY where employeeId matches
- Each employee has their own record
- No need to check selectedEmployeeIds (not used anymore)
- Result: Returns only records owned by this employee

EXAMPLE:

Old approach with bulk:
- Admin creates bulk record for John, Sarah, Mike
- Database has 1 record: employeeId="admin_123", selectedEmployeeIds=["john_456","sarah_789","mike_101"]
- When John logs in: Returns this record (because John is in selectedEmployeeIds)
- When Sarah logs in: Returns this record (because Sarah is in selectedEmployeeIds)
- When Admin logs in: Returns this record (because Admin is employeeId)

New approach with individual:
- Admin creates individual records for John, Sarah, Mike
- Database has 3 records:
  - Record 1: employeeId="john_456", selectedEmployeeIds=null
  - Record 2: employeeId="sarah_789", selectedEmployeeIds=null
  - Record 3: employeeId="mike_101", selectedEmployeeIds=null
- When John logs in: Returns Record 1 (because John is employeeId)
- When Sarah logs in: Returns Record 2 (because Sarah is employeeId)
- When Mike logs in: Returns Record 3 (because Mike is employeeId)
- When Admin logs in: Returns NOTHING (Admin didn't receive allowances)

THIS IS CORRECT BEHAVIOR!

Admin is the SUBMITTER, not the RECIPIENT.
Only the employees who receive allowances see their own records.
*/

// ============================================================================
// ALTERNATE VERSION - If you want Admin to see what they submitted
// ============================================================================

/*
If you want the submitter (Admin) to also see all the allowances they created,
you need to add a "submittedBy" column to track who created each record.

Then modify the function like this:

async getEmployeeAllowancesByMonthYear(employeeId: string, month: number, year: number): Promise<any[]> {
  // Fetch where:
  // - employeeId matches (records where this employee received allowance)
  // - OR submittedBy matches (records that this employee created for others)
  
  const allAllowances = await db.select().from(dailyAllowances)
    .where(or(
      eq(dailyAllowances.employeeId, employeeId),
      eq(dailyAllowances.submittedBy, employeeId)  // If you add this column
    ))
    .orderBy(dailyAllowances.date);
    
  // ... rest of the function
}

But for now, with individual records:
- Each employee sees ONLY their own allowances
- The submitter (Admin) doesn't see them in their own list
- This is typically the correct behavior for allowance systems
*/

async updateDailyAllowance(id: string, allowance: Partial<InsertDailyAllowance>): Promise<DailyAllowance> {
  // Check if allowance is approved - cannot update if approved
  const existing = await this.getDailyAllowance(id);
  if (existing && existing.approvalStatus === 'approved') {
    throw new Error('Cannot update an approved allowance');
  }
  
  console.log('[Storage] updateDailyAllowance - input:', allowance);
  
  // Ensure selectedEmployeeIds is properly formatted as JSON string of IDs only
  let updateData: any = {};
  
  if (allowance.teamId !== undefined) {
    updateData.teamId = allowance.teamId || null;
  }
  
  if (allowance.allowanceData) {
    updateData.allowanceData = allowance.allowanceData;
  }
  
  if (allowance.selectedEmployeeIds !== undefined) {
    try {
      // Parse and clean the IDs
      const parsed = typeof allowance.selectedEmployeeIds === 'string' 
        ? JSON.parse(allowance.selectedEmployeeIds)
        : allowance.selectedEmployeeIds;
      
      // Extract only IDs if objects were passed
      const idsOnly = Array.isArray(parsed) 
        ? parsed.map(item => typeof item === 'string' ? item : item.id || item.employeeId)
        : [];
      
      updateData.selectedEmployeeIds = JSON.stringify(idsOnly);
      console.log('[Storage] Cleaned selectedEmployeeIds for update:', updateData.selectedEmployeeIds);
    } catch (e) {
      console.error('[Storage] Error parsing selectedEmployeeIds:', e);
      updateData.selectedEmployeeIds = null;
    }
  }
  
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

  async approveDailyAllowance(id: string, approvedBy: string, approverName?: string, approverLevel?: number, remark?: string, editedData?: any): Promise<DailyAllowance> {
    console.log(`[Storage] approveDailyAllowance - allowanceId: ${id}, approvedBy: ${approvedBy}, level: ${approverLevel}`);

    // Get current allowance
    const existing = await this.getDailyAllowance(id);
    if (!existing) throw new Error('Allowance not found');

    // Cannot approve if already rejected by higher authority
    if (existing.rejectionReason) {
      throw new Error('Cannot approve a rejected allowance. Status is locked.');
    }

    // Cannot approve if already finalized as approved (saved in database)
    if (existing.approvalStatus === 'approved') {
      throw new Error('Allowance already approved and locked. Cannot modify finalized records.');
    }

    // Cannot approve if already finalized as rejected (saved in database)
    if (existing.approvalStatus === 'rejected') {
      throw new Error('Allowance already rejected and locked. Cannot modify finalized records.');
    }

    // Get required approvals from app settings
    const appSettingsData = await this.getAppSettings();
    const currentRequiredApprovals = appSettingsData?.approvalsRequiredForAllowance || 1;
    console.log(`[Storage] Required approvals from settings: ${currentRequiredApprovals}`);

    // Use existing requiredApprovals if set (locked at first approval), otherwise use current setting
    const requiredApprovals = existing.requiredApprovals || currentRequiredApprovals;
    console.log(`[Storage] Required approvals (locked): ${requiredApprovals}`);

    // Increment approval count
    const newApprovalCount = (existing.approvalCount || 0) + 1;
    console.log(`[Storage] Approval count: ${existing.approvalCount} -> ${newApprovalCount}`);

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

    // Track approval history with reporting person level
    let approvalHistory: any[] = [];
    if (existing.approvalHistory) {
      try {
        approvalHistory = JSON.parse(existing.approvalHistory);
      } catch (e) {
        approvalHistory = [];
      }
    }

    // Add current approval to history
    approvalHistory.push({
      approverId: approvedBy,
      approverName: approverName || approvedBy,
      approverLevel: approverLevel || newApprovalCount, // Level 1, 2, or 3
      remark: remark || '',
      editedData: editedData || null,
      timestamp: new Date().toISOString(),
    });

    // Determine if this approval completes the required approvals (using locked requiredApprovals)
    const isFinalApproval = newApprovalCount >= requiredApprovals;

    // If final approval, save 'approved' status to lock the record
    // Otherwise, don't save status (it remains pending and is computed dynamically)
    const updateData: any = {
      approvalCount: newApprovalCount,
      approvedBy: JSON.stringify(currentApprovers),
      approvalHistory: JSON.stringify(approvalHistory),
      approvedAt: new Date(),
      requiredApprovals: requiredApprovals, // Lock the required approvals on first approval
    };

    // If admin edited the allowance data, update it
    if (editedData) {
      updateData.allowanceData = JSON.stringify(editedData);
      console.log(`[Storage] Allowance data updated by approver`);
    }

    if (isFinalApproval) {
      updateData.approvalStatus = 'approved';
      console.log(`[Storage] Final approval reached (${newApprovalCount}/${requiredApprovals}) - locking status as 'approved'`);
    } else {
      console.log(`[Storage] Partial approval (${newApprovalCount}/${requiredApprovals}) - status remains pending/processing`);
    }

    console.log(`[Storage] Update data:`, updateData);

    const [result] = await db.update(dailyAllowances).set(updateData)
      .where(eq(dailyAllowances.id, id)).returning();

    console.log(`[Storage] Approval updated. Final status: '${result.approvalStatus}', Approval count: ${result.approvalCount}/${requiredApprovals}`);
    return result;
  }

  async rejectDailyAllowance(id: string, rejectionReason: string, isHigherAuthority: boolean = true): Promise<DailyAllowance> {
    console.log(`[Storage] rejectDailyAllowance - allowanceId: ${id}, rejectionReason: ${rejectionReason}, isHigherAuthority: ${isHigherAuthority}`);
    
    // Get current allowance
    const existing = await this.getDailyAllowance(id);
    if (!existing) throw new Error('Allowance not found');
    
    // Cannot reject if already finalized as rejected
    if (existing.approvalStatus === 'rejected' || existing.rejectionReason) {
      throw new Error('Allowance already rejected and locked. Cannot modify finalized records.');
    }
    
    // Cannot reject if already finalized as approved
    if (existing.approvalStatus === 'approved') {
      throw new Error('Allowance already approved and locked. Cannot modify finalized records.');
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
    // Only get records that are NOT finalized (pending/processing)
    // Exclude records with saved 'approved' or 'rejected' status (finalized records)
    const result = await db.select().from(dailyAllowances)
      .where(and(
        or(
          eq(dailyAllowances.approvalStatus, 'pending'),
          eq(dailyAllowances.approvalStatus, 'processing'),
          isNull(dailyAllowances.approvalStatus)
        ),
        isNull(dailyAllowances.rejectionReason)
      ))
      .orderBy(dailyAllowances.submittedAt);
    
    if (result.length === 0) return [];
    
    return this.buildAllowancesList(result);
  }

  private async buildAllowancesList(result: any[]): Promise<any[]> {
    // BULK FETCH: Get all unique employee IDs and team IDs at once
    const employeeIds = Array.from(new Set(result.map(a => a.employeeId).filter((id): id is string => id != null)));
    const teamIds = Array.from(new Set(result.map(a => a.teamId).filter((id): id is string => id != null)));
    
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
    const employeeIds = Array.from(new Set(result.map(a => a.employeeId).filter((id): id is string => id != null)));
    const teamIds = Array.from(new Set(result.map(a => a.teamId).filter((id): id is string => id != null)));
    
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
    const allowanceEmployeeIds = Array.from(new Set(result.map(a => a.employeeId).filter((id): id is string => id != null)));
    const allowanceTeamIds = Array.from(new Set(result.map(a => a.teamId).filter((id): id is string => id != null)));
    
    // Fetch all employees in one query
    const allEmployees = await db.select().from(employees).where(inArray(employees.id, allowanceEmployeeIds));
    const employeeMap = new Map(allEmployees.map(e => [e.id, e]));
    
    // Fetch all teams in one query
    let teamMap = new Map();
    if (allowanceTeamIds.length > 0) {
      const teamIdsFiltered = allowanceTeamIds.filter((id): id is string => id != null);
      const allTeams = await db.select().from(teams).where(inArray(teams.id, teamIdsFiltered));
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

  async getAllAllowancesForTeams(employeeId: string): Promise<any[]> {
    // Get all allowances for team members (all statuses: pending, processing, approved, rejected)
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
    
    // Get ALL allowances regardless of status (pending, processing, approved, rejected)
    const result = await db.select().from(dailyAllowances)
      .where(inArray(dailyAllowances.employeeId, teamMemberEmployeeIds))
      .orderBy(dailyAllowances.submittedAt);
    
    if (result.length === 0) return [];
    
    // BULK FETCH: Get all unique employee IDs and team IDs at once
    const allowanceEmployeeIds = Array.from(new Set(result.map(a => a.employeeId).filter((id): id is string => id != null)));
    const allowanceTeamIds = Array.from(new Set(result.map(a => a.teamId).filter((id): id is string => id != null)));
    
    // Fetch all employees in one query
    const allEmployees = await db.select().from(employees).where(inArray(employees.id, allowanceEmployeeIds));
    const employeeMap = new Map(allEmployees.map(e => [e.id, e]));
    
    // Fetch all teams in one query
    let teamMap = new Map();
    if (allowanceTeamIds.length > 0) {
      const teamIdsFiltered2 = allowanceTeamIds.filter((id): id is string => id != null);
      const allTeams = await db.select().from(teams).where(inArray(teams.id, teamIdsFiltered2));
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

  async getTeamsWhereReportingPerson(employeeId: string): Promise<Team[]> {
    console.log('[Storage] getTeamsWhereReportingPerson called for employeeId:', employeeId);

    // A team member is a reporting person if their reportingPerson1/2/3 field equals their own team member ID
    // First, we need to find team member records where employeeId matches
    // Then check if that team member's reportingPerson1/2/3 equals their own id
    const result = await db.select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
    }).from(teams)
      .innerJoin(teamMembers, eq(teamMembers.teamId, teams.id))
      .where(
        and(
          eq(teamMembers.employeeId, employeeId),
          or(
            eq(teamMembers.reportingPerson1, teamMembers.id),
            eq(teamMembers.reportingPerson2, teamMembers.id),
            eq(teamMembers.reportingPerson3, teamMembers.id)
          )
        )
      )
      .groupBy(teams.id, teams.name, teams.description, teams.createdAt, teams.updatedAt);

    console.log('[Storage] Found teams:', result.length, 'teams');
    console.log('[Storage] Team details:', result);
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
      return result;
    } catch (error) {
      console.error('[Storage] getTeamMembers error:', error);
      throw error;
    }
  }

  async getTeamMembersPaginated(teamId: string, page?: number, pageSize?: number): Promise<{ members: any[]; total: number }> {
    try {
      const query = db.select({
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

      // Count total
      const countResult = await db.select({ total: count() }).from(teamMembers).where(eq(teamMembers.teamId, teamId));
      const total = Number(countResult?.[0]?.total ?? 0);

      // If pagination params provided, apply limit/offset
      let members: any[];
      if (page !== undefined && pageSize !== undefined && !isNaN(page) && !isNaN(pageSize)) {
        const limit = Math.max(1, pageSize);
        const offset = Math.max(0, (page - 1) * limit);
        members = await query.limit(limit).offset(offset);
      } else {
        members = await query;
      }

      return { members, total };
    } catch (error) {
      console.error('[Storage] getTeamMembersPaginated error:', error);
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
