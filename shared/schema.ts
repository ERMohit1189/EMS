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
  role: varchar("role").notNull().default("Vendor"), // Vendor, Admin, Manager
  password: varchar("password"), // Hashed password for vendor login
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
  siteAmount: decimal("site_amount", { precision: 10, scale: 2 }),
  vendorAmount: decimal("vendor_amount", { precision: 10, scale: 2 }),
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

// Departments Table
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Designations Table
export const designations = pgTable("designations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employees Table
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: varchar("email").notNull().unique(),
  password: text("password"),
  dob: date("dob"),
  fatherName: text("father_name").notNull(),
  mobile: varchar("mobile").notNull().unique(),
  alternateNo: varchar("alternate_no"),
  address: text("address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  country: varchar("country").notNull().default("India"),
  departmentId: varchar("department_id").references(() => departments.id),
  designationId: varchar("designation_id").references(() => designations.id),
  role: varchar("role").notNull().default("user"), // admin, user
  doj: date("doj").notNull(),
  aadhar: varchar("aadhar"),
  pan: varchar("pan"),
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
  basicSalary: decimal("basic_salary", { precision: 12, scale: 2 }).notNull(),
  hra: decimal("hra", { precision: 12, scale: 2 }).notNull(),
  da: decimal("da", { precision: 12, scale: 2 }).notNull(),
  lta: decimal("lta", { precision: 12, scale: 2 }).notNull(),
  conveyance: decimal("conveyance", { precision: 12, scale: 2 }).notNull(),
  medical: decimal("medical", { precision: 12, scale: 2 }).notNull(),
  bonuses: decimal("bonuses", { precision: 12, scale: 2 }).notNull().default("0"),
  otherBenefits: decimal("other_benefits", { precision: 12, scale: 2 }).notNull().default("0"),
  pf: decimal("pf", { precision: 12, scale: 2 }).notNull(),
  professionalTax: decimal("professional_tax", { precision: 12, scale: 2 }).notNull(),
  incomeTax: decimal("income_tax", { precision: 12, scale: 2 }).notNull().default("0"),
  epf: decimal("epf", { precision: 12, scale: 2 }).notNull(),
  esic: decimal("esic", { precision: 12, scale: 2 }).notNull(),
  wantDeduction: boolean("want_deduction").notNull().default(true),
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
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  gstType: varchar("gst_type").default("cgstsgst"), // cgstsgst, igst
  gstApply: boolean("gst_apply").default(true),
  igstPercentage: decimal("igst_percentage", { precision: 5, scale: 2 }).default("0"),
  igstAmount: decimal("igst_amount", { precision: 12, scale: 2 }).default("0"),
  cgstPercentage: decimal("cgst_percentage", { precision: 5, scale: 2 }).default("0"),
  cgstAmount: decimal("cgst_amount", { precision: 12, scale: 2 }).default("0"),
  sgstPercentage: decimal("sgst_percentage", { precision: 5, scale: 2 }).default("0"),
  sgstAmount: decimal("sgst_amount", { precision: 12, scale: 2 }).default("0"),
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
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  gst: decimal("gst", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
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
  siteAmount: decimal("site_amount", { precision: 12, scale: 2 }).notNull(),
  vendorAmount: decimal("vendor_amount", { precision: 12, scale: 2 }).notNull(),
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

// Attendance Table
export const attendances = pgTable("attendances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id")
    .notNull()
    .references(() => employees.id),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  attendanceData: text("attendance_data").notNull(), // JSON string of day attendance
  submittedAt: timestamp("submitted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily Allowances Table
export const dailyAllowances = pgTable("daily_allowances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id")
    .notNull()
    .references(() => employees.id),
  teamId: varchar("team_id").references(() => teams.id),
  date: date("date").notNull(),
  allowanceData: text("allowance_data").notNull(), // JSON string of allowance details
  approvalStatus: varchar("approval_status").notNull().default("pending"), // pending, processing, approved, rejected
  approvalCount: integer("approval_count").notNull().default(0), // Number of approvals received
  paidStatus: varchar("paid_status").notNull().default("unpaid"), // unpaid, partial, full
  approvedBy: varchar("approved_by"), // JSON array of approver IDs
  rejectedBy: varchar("rejected_by"), // Higher authority that rejected
  approvedAt: timestamp("approved_at"),
  submittedAt: timestamp("submitted_at").defaultNow(),
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
}).extend({
  aadhar: z.string().min(0).optional(),
  pan: z.string().min(0).optional(),
  dob: z.union([z.string(), z.null()]).optional().transform((val) => val || undefined),
});

export const insertSalarySchema = createInsertSchema(salaryStructures)
  .omit({
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

export const insertAttendanceSchema = createInsertSchema(attendances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
});

export const insertDailyAllowanceSchema = createInsertSchema(dailyAllowances)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    submittedAt: true,
    approvalStatus: true,
    approvedBy: true,
    approvedAt: true,
    paidStatus: true,
  })
  .extend({
    teamId: z.string().optional().nullable(),
    date: z.union([z.string(), z.date()]).transform((val) => {
      if (typeof val === 'string') return val;
      return val.toISOString().split('T')[0];
    }),
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
  state: varchar("state"),
  city: varchar("city"),
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

export type Attendance = typeof attendances.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type DailyAllowance = typeof dailyAllowances.$inferSelect;
export type InsertDailyAllowance = z.infer<typeof insertDailyAllowanceSchema>;

// Teams Table
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team Members Table
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  employeeId: varchar("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  reportingPerson1: varchar("reporting_person_1"),
  reportingPerson2: varchar("reporting_person_2"),
  reportingPerson3: varchar("reporting_person_3"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

// App Settings Table
export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  approvalsRequiredForAllowance: integer("approvals_required_for_allowance").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
