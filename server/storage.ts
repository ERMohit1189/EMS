import { db } from "./db";
import {
  vendors,
  sites,
  employees,
  salaryStructures,
  purchaseOrders,
  invoices,
  type InsertVendor,
  type InsertSite,
  type InsertEmployee,
  type InsertSalary,
  type InsertPO,
  type InsertInvoice,
  type Vendor,
  type Site,
  type Employee,
  type SalaryStructure,
  type PurchaseOrder,
  type Invoice,
} from "@shared/schema";
import { eq, count } from "drizzle-orm";

export interface IStorage {
  // Vendor operations
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  getVendor(id: string): Promise<Vendor | undefined>;
  getVendors(limit: number, offset: number): Promise<Vendor[]>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor>;
  deleteVendor(id: string): Promise<void>;
  deleteAllVendors(): Promise<void>;
  getVendorCount(): Promise<number>;

  // Site operations
  createSite(site: InsertSite): Promise<Site>;
  getSite(id: string): Promise<Site | undefined>;
  getSites(limit: number, offset: number): Promise<Site[]>;
  getSitesByVendor(vendorId: string): Promise<Site[]>;
  updateSite(id: string, site: Partial<InsertSite>): Promise<Site>;
  deleteSite(id: string): Promise<void>;
  deleteAllSites(): Promise<void>;
  getSiteCount(): Promise<number>;

  // Employee operations
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployees(limit: number, offset: number): Promise<Employee[]>;
  updateEmployee(
    id: string,
    employee: Partial<InsertEmployee>
  ): Promise<Employee>;
  deleteEmployee(id: string): Promise<void>;
  getEmployeeCount(): Promise<number>;

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
  getInvoiceCount(): Promise<number>;
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

  // Site operations
  async createSite(site: InsertSite): Promise<Site> {
    const [result] = await db.insert(sites).values(site).returning();
    return result;
  }

  async getSite(id: string): Promise<Site | undefined> {
    const [result] = await db.select().from(sites).where(eq(sites.id, id));
    return result;
  }

  async getSites(limit: number, offset: number): Promise<Site[]> {
    return await db.select().from(sites).limit(limit).offset(offset);
  }

  async getSitesByVendor(vendorId: string): Promise<Site[]> {
    return await db.select().from(sites).where(eq(sites.vendorId, vendorId));
  }

  async updateSite(id: string, site: Partial<InsertSite>): Promise<Site> {
    const [result] = await db
      .update(sites)
      .set(site)
      .where(eq(sites.id, id))
      .returning();
    return result;
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

  // Employee operations
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [result] = await db.insert(employees).values(employee).returning();
    return result;
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [result] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id));
    return result;
  }

  async getEmployees(limit: number, offset: number): Promise<Employee[]> {
    return await db.select().from(employees).limit(limit).offset(offset);
  }

  async updateEmployee(
    id: string,
    employee: Partial<InsertEmployee>
  ): Promise<Employee> {
    const [result] = await db
      .update(employees)
      .set(employee)
      .where(eq(employees.id, id))
      .returning();
    return result;
  }

  async deleteEmployee(id: string): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  async getEmployeeCount(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(employees);
    return Number(result[0]?.count) || 0;
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

  async getInvoiceCount(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(invoices);
    return Number(result[0]?.count) || 0;
  }
}

export const storage = new DrizzleStorage();
