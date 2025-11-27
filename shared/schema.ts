import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  date,
  boolean,
  decimal,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Vendors Table
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: varchar("email").notNull().unique(),
  mobile: varchar("mobile").notNull(),
  address: text("address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  pincode: varchar("pincode").notNull(),
  country: varchar("country").notNull().default("India"),
  aadhar: varchar("aadhar").notNull().unique(),
  pan: varchar("pan").notNull().unique(),
  gstin: varchar("gstin"),
  moa: text("moa"),
  category: varchar("category").notNull().default("Individual"), // Individual, Company
  status: varchar("status").notNull().default("Pending"), // Pending, Approved, Rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sites Table
export const sites = pgTable("sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").notNull().unique(),
  vendorId: varchar("vendor_id")
    .notNull()
    .references(() => vendors.id),
  planId: varchar("plan_id").notNull(),
  antennaSize: varchar("antenna_size").notNull(),
  incDate: date("inc_date").notNull(),
  state: varchar("state").notNull(),
  region: varchar("region").notNull(),
  zone: varchar("zone").notNull(),
  inside: boolean("inside").notNull().default(false),
  formNo: varchar("form_no").notNull(),
  siteAmount: decimal("site_amount", 10, 2).notNull(),
  vendorAmount: decimal("vendor_amount", 10, 2).notNull(),
  status: varchar("status").notNull().default("Pending"), // Pending, Active, Inactive
  softAtRemark: text("soft_at_remark"),
  phyAtRemark: text("phy_at_remark"),
  atpRemark: text("atp_remark"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employees Table
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  dob: date("dob").notNull(),
  fatherName: text("father_name").notNull(),
  mobile: varchar("mobile").notNull().unique(),
  alternateNo: varchar("alternate_no"),
  address: text("address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  country: varchar("country").notNull().default("India"),
  designation: varchar("designation").notNull(),
  doj: date("doj").notNull(),
  aadhar: varchar("aadhar").notNull().unique(),
  pan: varchar("pan").notNull().unique(),
  bloodGroup: varchar("blood_group").notNull(),
  maritalStatus: varchar("marital_status").notNull(), // Single, Married
  nominee: text("nominee").notNull(),
  ppeKit: boolean("ppe_kit").notNull().default(false),
  kitNo: varchar("kit_no"),
  status: varchar("status").notNull().default("Active"), // Active, Inactive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Salary Structure Table
export const salaryStructures = pgTable("salary_structures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id")
    .notNull()
    .references(() => employees.id),
  basicSalary: decimal("basic_salary", 12, 2).notNull(),
  hra: decimal("hra", 12, 2).notNull(),
  da: decimal("da", 12, 2).notNull(),
  lta: decimal("lta", 12, 2).notNull(),
  conveyance: decimal("conveyance", 12, 2).notNull(),
  medical: decimal("medical", 12, 2).notNull(),
  bonuses: decimal("bonuses", 12, 2).notNull().default(0),
  otherBenefits: decimal("other_benefits", 12, 2).notNull().default(0),
  pf: decimal("pf", 12, 2).notNull(),
  professionalTax: decimal("professional_tax", 12, 2).notNull(),
  incomeTax: decimal("income_tax", 12, 2).notNull().default(0),
  epf: decimal("epf", 12, 2).notNull(),
  esic: decimal("esic", 12, 2).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase Orders Table
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poNumber: varchar("po_number").notNull().unique(),
  vendorId: varchar("vendor_id")
    .notNull()
    .references(() => vendors.id),
  siteId: varchar("site_id")
    .notNull()
    .references(() => sites.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", 12, 2).notNull(),
  totalAmount: decimal("total_amount", 12, 2).notNull(),
  poDate: date("po_date").notNull(),
  dueDate: date("due_date").notNull(),
  status: varchar("status").notNull().default("Draft"), // Draft, Approved, Issued, Completed, Cancelled
  approvedBy: varchar("approved_by"),
  approvalDate: date("approval_date"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices Table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  vendorId: varchar("vendor_id")
    .notNull()
    .references(() => vendors.id),
  poId: varchar("po_id")
    .notNull()
    .references(() => purchaseOrders.id),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date").notNull(),
  amount: decimal("amount", 12, 2).notNull(),
  gst: decimal("gst", 12, 2).notNull().default(0),
  totalAmount: decimal("total_amount", 12, 2).notNull(),
  status: varchar("status").notNull().default("Draft"), // Draft, Submitted, Approved, Paid, Rejected
  paymentMethod: varchar("payment_method"),
  paymentDate: date("payment_date"),
  bankDetails: text("bank_details"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod Schemas
export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSiteSchema = createInsertSchema(sites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSalarySchema = createInsertSchema(salaryStructures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPOSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type Definitions
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type Site = typeof sites.$inferSelect;
export type InsertSite = z.infer<typeof insertSiteSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type SalaryStructure = typeof salaryStructures.$inferSelect;
export type InsertSalary = z.infer<typeof insertSalarySchema>;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPO = z.infer<typeof insertPOSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
