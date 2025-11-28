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

// Sites Table - Comprehensive HOP Management (Excel columns retained)
export const sites = pgTable("sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").notNull().unique(),
  vendorId: varchar("vendor_id")
    .notNull()
    .references(() => vendors.id),
  zoneId: varchar("zone_id").references(() => zones.id),
  planId: varchar("plan_id").notNull(),
  siteAmount: decimal("site_amount", 10, 2),
  vendorAmount: decimal("vendor_amount", 10, 2),
  // Excel columns - HOP Details
  sno: integer("s_no"),
  circle: varchar("circle"),
  nominalAop: varchar("nominal_aop"),
  hopType: varchar("hop_type"),
  hopAB: varchar("hop_a_b"),
  hopBA: varchar("hop_b_a"),
  district: varchar("district"),
  project: varchar("project"),
  siteAAntDia: varchar("site_a_ant_dia"),
  siteBAntDia: varchar("site_b_ant_dia"),
  maxAntSize: varchar("max_ant_size"),
  siteAName: varchar("site_a_name"),
  tocoVendorA: varchar("toco_vendor_a"),
  tocoIdA: varchar("toco_id_a"),
  siteBName: varchar("site_b_name"),
  tocoVendorB: varchar("toco_vendor_b"),
  tocoIdB: varchar("toco_id_b"),
  // Excel columns - Service Readiness
  mediaAvailabilityStatus: varchar("media_availability_status"),
  srNoSiteA: varchar("sr_no_site_a"),
  srDateSiteA: date("sr_date_site_a"),
  srNoSiteB: varchar("sr_no_site_b"),
  srDateSiteB: date("sr_date_site_b"),
  hopSrDate: date("hop_sr_date"),
  // Excel columns - Service Planning & SO Release
  spDateSiteA: date("sp_date_site_a"),
  spDateSiteB: date("sp_date_site_b"),
  hopSpDate: date("hop_sp_date"),
  soReleasedDateSiteA: date("so_released_date_site_a"),
  soReleasedDateSiteB: date("so_released_date_site_b"),
  hopSoDate: date("hop_so_date"),
  // Excel columns - RFAI & Material
  rfaiOfferedDateSiteA: date("rfai_offered_date_site_a"),
  rfaiOfferedDateSiteB: date("rfai_offered_date_site_b"),
  actualHopRfaiOfferedDate: date("actual_hop_rfai_offered_date"),
  partnerName: varchar("partner_name"),
  rfaiSurveyCompletionDate: date("rfai_survey_completion_date"),
  moNumberSiteA: varchar("mo_number_site_a"),
  materialTypeSiteA: varchar("material_type_site_a"),
  moDateSiteA: date("mo_date_site_a"),
  moNumberSiteB: varchar("mo_number_site_b"),
  materialTypeSiteB: varchar("material_type_site_b"),
  moDateSiteB: date("mo_date_site_b"),
  srnRmoNumber: varchar("srn_rmo_number"),
  srnRmoDate: date("srn_rmo_date"),
  hopMoDate: date("hop_mo_date"),
  hopMaterialDispatchDate: date("hop_material_dispatch_date"),
  hopMaterialDeliveryDate: date("hop_material_delivery_date"),
  materialDeliveryStatus: varchar("material_delivery_status"),
  // Excel columns - Installation & AT Status
  siteAInstallationDate: date("site_a_installation_date"),
  ptwNumberSiteA: varchar("ptw_number_site_a"),
  ptwStatusA: varchar("ptw_status_a"),
  siteBInstallationDate: date("site_b_installation_date"),
  ptwNumberSiteB: varchar("ptw_number_site_b"),
  ptwStatusB: varchar("ptw_status_b"),
  hopIcDate: date("hop_ic_date"),
  alignmentDate: date("alignment_date"),
  hopInstallationRemarks: text("hop_installation_remarks"),
  visibleInNms: varchar("visible_in_nms"),
  nmsVisibleDate: date("nms_visible_date"),
  softAtOfferDate: date("soft_at_offer_date"),
  softAtAcceptanceDate: date("soft_at_acceptance_date"),
  softAtStatus: varchar("soft_at_status"),
  phyAtOfferDate: date("phy_at_offer_date"),
  phyAtAcceptanceDate: date("phy_at_acceptance_date"),
  phyAtStatus: varchar("phy_at_status"),
  bothAtStatus: varchar("both_at_status"),
  // Excel columns - Issue & Survey Info
  priIssueCategory: varchar("pri_issue_category"),
  priSiteId: varchar("pri_site_id"),
  priOpenDate: date("pri_open_date"),
  priCloseDate: date("pri_close_date"),
  priHistory: text("pri_history"),
  rfiSurveyAllocationDate: date("rfi_survey_allocation_date"),
  descope: varchar("descope"),
  reasonOfExtraVisit: text("reason_of_extra_visit"),
  wccReceived80Percent: varchar("wcc_received_80_percent"),
  wccReceivedDate80Percent: date("wcc_received_date_80_percent"),
  wccReceived20Percent: varchar("wcc_received_20_percent"),
  wccReceivedDate20Percent: date("wcc_received_date_20_percent"),
  wccReceivedDate100Percent: date("wcc_received_date_100_percent"),
  survey: varchar("survey"),
  finalPartnerSurvey: varchar("final_partner_survey"),
  surveyDate: date("survey_date"),
  // Status & Timestamps
  status: varchar("status").notNull().default("Pending"),
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
  gstPercentage: decimal("gst_percentage", 5, 2).default("0"),
  gstAmount: decimal("gst_amount", 12, 2).default("0"),
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

// Payment Master Table - Site & Vendor Amount Configuration by Antenna Size
export const paymentMasters = pgTable("payment_masters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id")
    .notNull()
    .references(() => sites.id),
  planId: varchar("plan_id").notNull(),
  vendorId: varchar("vendor_id")
    .notNull()
    .references(() => vendors.id),
  antennaSize: varchar("antenna_size").notNull(), // 0.6, 0.9, 1.2 kVA
  siteAmount: decimal("site_amount", 12, 2).notNull(),
  vendorAmount: decimal("vendor_amount", 12, 2).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  compositeKey: sql`UNIQUE(${table.siteId}, ${table.planId}, ${table.vendorId}, ${table.antennaSize})`
}));

// Zones Table - Zone Master with Short Names
export const zones = pgTable("zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  shortName: varchar("short_name").notNull().unique(),
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

export const insertPaymentMasterSchema = createInsertSchema(paymentMasters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertZoneSchema = createInsertSchema(zones).omit({
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

export type PaymentMaster = typeof paymentMasters.$inferSelect;
export type InsertPaymentMaster = z.infer<typeof insertPaymentMasterSchema>;

export type Zone = typeof zones.$inferSelect;
export type InsertZone = z.infer<typeof insertZoneSchema>;

// Export Header Settings Table
export const exportHeaders = pgTable("export_headers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name"),
  reportTitle: text("report_title"),
  footerText: text("footer_text"),
  contactPhone: varchar("contact_phone"),
  contactEmail: varchar("contact_email"),
  website: varchar("website"),
  gstin: varchar("gstin"),
  address: text("address"),
  showGeneratedDate: boolean("show_generated_date").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertExportHeaderSchema = createInsertSchema(exportHeaders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).refine((data) => {
  if (data.contactPhone) {
    if (data.contactPhone.length > 10) return false;
    if (!/^\d*$/.test(data.contactPhone)) return false;
  }
  return true;
}, {
  message: 'Contact phone must be 10 digits or less',
  path: ['contactPhone']
}).refine((data) => {
  if (data.contactEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) return false;
  }
  return true;
}, {
  message: 'Invalid email format',
  path: ['contactEmail']
}).refine((data) => {
  if (data.website) {
    if (!/^https?:\/\/.+/.test(data.website)) return false;
  }
  return true;
}, {
  message: 'Website must start with http:// or https://',
  path: ['website']
}).refine((data) => {
  if (data.gstin) {
    if (!/^[0-9A-Z]{15}$/.test(data.gstin)) return false;
  }
  return true;
}, {
  message: 'GSTIN must be 15 alphanumeric characters',
  path: ['gstin']
});

export type ExportHeader = typeof exportHeaders.$inferSelect;
export type InsertExportHeader = z.infer<typeof insertExportHeaderSchema>;
