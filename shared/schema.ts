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
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Vendors Table
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorCode: varchar("vendor_code").unique(),
  name: text("name").notNull(),
  email: varchar("email").notNull(),
  mobile: varchar("mobile").notNull(),
  address: text("address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  pincode: varchar("pincode"),
  country: varchar("country").notNull().default("India"),
  aadhar: varchar("aadhar"),
  pan: varchar("pan"),
  gstin: varchar("gstin"),
  moa: text("moa"),
  aadharDoc: varchar("aadhar_doc"),
  panDoc: varchar("pan_doc"),
  gstinDoc: varchar("gstin_doc"),
  moaDoc: text("moa_doc"),
  category: varchar("category").notNull().default("Individual"), // Individual, Company
  status: varchar("status").notNull().default("Pending"), // Pending, Approved, Rejected
  role: varchar("role").notNull().default("Vendor"), // Vendor, Admin, Manager
  password: varchar("password"), // Hashed password for vendor login
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxStatus: index("idx_vendors_status").on(table.status),
  idxEmail: index("idx_vendors_email").on(table.email),
  idxVendorCode: index("idx_vendors_vendor_code").on(table.vendorCode),
}));

// Vendor Rates Table - default vendor amount per antenna size
export const vendorRates = pgTable("vendor_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  antennaSize: varchar("antenna_size").notNull(),
  vendorAmount: decimal("vendor_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxVendor: index("idx_vendor_rate_vendor").on(table.vendorId),
  uniqueAntenna: sql`UNIQUE(${table.vendorId}, ${table.antennaSize})`
}));

// Sites Table - Comprehensive HOP Management (Excel columns retained)
export const sites = pgTable("sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  // Partner code from Excel (e.g., PARTNER CODE). This stores the vendor code
  // on the site row for easier reporting and exports (also can be derived
  // by joining vendors.vendor_code). Nullable to support existing rows.
  partnerCode: varchar("partner_code"),
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
}, (table) => ({
  idxVendor: index("idx_sites_vendor").on(table.vendorId),
  idxZone: index("idx_sites_zone").on(table.zoneId),
  idxStatus: index("idx_sites_status").on(table.status),
  idxPlanId: index("idx_sites_plan_id").on(table.planId),
  idxCircle: index("idx_sites_circle").on(table.circle),
  idxPartnerName: index("idx_sites_partner_name").on(table.partnerName),
}));

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
  name: text("name").notNull(), // Required
  email: varchar("email").notNull().unique(), // Required
  password: text("password"),
  dob: date("dob"),
  fatherName: text("father_name").notNull(), // Required
  mobile: varchar("mobile").notNull().unique(), // Required
  alternateNo: varchar("alternate_no"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country").default("India"),
  departmentId: varchar("department_id").references(() => departments.id),
  designationId: varchar("designation_id").references(() => designations.id), // Should be required, but nullable due to existing data
  role: varchar("role").notNull().default("user"), // Required - admin, user
  doj: date("doj").notNull(), // Required
  aadhar: varchar("aadhar"),
  pan: varchar("pan"),
  bloodGroup: varchar("blood_group"),
  maritalStatus: varchar("marital_status").notNull(), // Required - Single, Married
  nominee: text("nominee"),
  ppeKit: boolean("ppe_kit").default(false),
  kitNo: varchar("kit_no"),
  photo: varchar("photo"),
  status: varchar("status").notNull().default("Active"), // Active, Inactive
  emp_code: varchar("emp_code").unique(), // Employee code like EMP00001
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxEmail: index("idx_employees_email").on(table.email),
  idxDepartment: index("idx_employees_department").on(table.departmentId),
  idxDesignation: index("idx_employees_designation").on(table.designationId),
  idxStatus: index("idx_employees_status").on(table.status),
}));

// Salary Structure Table
export const salaryStructures = pgTable("salary_structures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id")
    .notNull()
    .references(() => employees.id),
  month: integer("month").notNull().default(1),
  year: integer("year").notNull().default(2025),
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
  // Calculated salary fields
  // Note: calculated fields and attendance columns moved to `generate_salary`.
  // Keep only the core structure fields here (base components and deductions).
  wantDeduction: boolean("want_deduction").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxEmployeeId: index("idx_salary_employee").on(table.employeeId),
  idxMonthYear: index("idx_salary_month_year").on(table.month, table.year),
}));

// Generated Salaries - persisted results of monthly salary generation
export const generateSalary = pgTable("generate_salary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalDays: integer("total_days"),
  presentDays: integer("present_days"),
  halfDays: integer("half_days"),
  absentDays: integer("absent_days"),
  leaveDays: integer("leave_days"),
  workingDays: decimal("working_days", { precision: 6, scale: 2 }),

  basicSalary: decimal("basic_salary", { precision: 12, scale: 2 }),
  hra: decimal("hra", { precision: 12, scale: 2 }),
  da: decimal("da", { precision: 12, scale: 2 }),
  lta: decimal("lta", { precision: 12, scale: 2 }),
  conveyance: decimal("conveyance", { precision: 12, scale: 2 }),
  medical: decimal("medical", { precision: 12, scale: 2 }),
  bonuses: decimal("bonuses", { precision: 12, scale: 2 }).default("0"),
  otherBenefits: decimal("other_benefits", { precision: 12, scale: 2 }).default("0"),

  grossSalary: decimal("gross_salary", { precision: 12, scale: 2 }),
  perDaySalary: decimal("per_day_salary", { precision: 12, scale: 2 }),
  earnedSalary: decimal("earned_salary", { precision: 12, scale: 2 }),

  pf: decimal("pf", { precision: 12, scale: 2 }),
  professionalTax: decimal("professional_tax", { precision: 12, scale: 2 }),
  incomeTax: decimal("income_tax", { precision: 12, scale: 2 }).default("0"),
  epf: decimal("epf", { precision: 12, scale: 2 }),
  esic: decimal("esic", { precision: 12, scale: 2 }),
  totalDeductions: decimal("total_deductions", { precision: 12, scale: 2 }),
  netSalary: decimal("net_salary", { precision: 12, scale: 2 }),

  details: text("details"), // JSON string of full breakdown if needed
  generatedBy: varchar("generated_by"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxEmployeeMonth: index("idx_generated_salary_employee_month").on(table.employeeId, table.month, table.year),
}));

// Purchase Orders Table
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poNumber: varchar("po_number").notNull().unique(),
  vendorId: varchar("vendor_id")
    .notNull()
    .references(() => vendors.id),
  // siteId removed from PO header; site details are stored in `purchase_order_lines` and should be joined as needed
  description: text("description"),
  quantity: integer("quantity"),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }),
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
}, (table) => ({
  idxVendor: index("idx_po_vendor").on(table.vendorId),
  idxStatus: index("idx_po_status").on(table.status),
  idxPoDate: index("idx_po_date").on(table.poDate),
}));

// Purchase Order Lines Table - items for a PO header
export const purchaseOrderLines = pgTable("purchase_order_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poId: varchar("po_id").notNull().references(() => purchaseOrders.id),
  siteId: varchar("site_id").notNull().references(() => sites.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxPo: index("idx_pol_po").on(table.poId),
  idxSite: index("idx_pol_site").on(table.siteId),
}));

export type PurchaseOrderLine = typeof purchaseOrderLines.$inferSelect;

// Invoices Table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  vendorId: varchar("vendor_id")
    .notNull()
    .references(() => vendors.id),
  poIds: varchar("po_ids").array().notNull().default(sql`ARRAY[]::varchar[]`), // All PO IDs for this invoice
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
}, (table) => ({
  idxVendor: index("idx_invoice_vendor").on(table.vendorId),
  idxStatus: index("idx_invoice_status").on(table.status),
  idxInvoiceDate: index("idx_invoice_date").on(table.invoiceDate),
}));

// Vendor Password OTP Table - For OTP-based password reset
export const vendorPasswordOtps = pgTable("vendor_password_otps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  email: varchar("email").notNull(),
  otpHash: varchar("otp_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxEmail: index("idx_vendor_otp_email").on(table.email),
  idxVendorId: index("idx_vendor_otp_vendor_id").on(table.vendorId),
  idxExpiresAt: index("idx_vendor_otp_expires_at").on(table.expiresAt),
}));

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
  siteAmount: decimal("site_amount", { precision: 12, scale: 2 }),
  vendorAmount: decimal("vendor_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxSite: index("idx_payment_site").on(table.siteId),
  idxVendor: index("idx_payment_vendor").on(table.vendorId),
  idxAntenna: index("idx_payment_antenna").on(table.antennaSize),
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
  submitted: boolean("submitted").default(false), // Whether attendance is finalized
  submittedAt: timestamp("submitted_at"),
  locked: boolean("locked").default(false), // Whether attendance is locked (month-end or report generated)
  lockedAt: timestamp("locked_at"),
  lockedBy: varchar("locked_by"), // Employee ID who locked it
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxEmployeeMonth: index("idx_employee_month_year").on(table.employeeId, table.month, table.year),
  uniqueEmployeeMonthYear: sql`UNIQUE(${table.employeeId}, ${table.month}, ${table.year})`,
}));

// Daily Allowances Table
export const dailyAllowances = pgTable("daily_allowances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id")
    .notNull()
    .references(() => employees.id),
  teamId: varchar("team_id").references(() => teams.id),
  date: date("date").notNull(),
  allowanceData: text("allowance_data").notNull(), // JSON string of allowance details
  selectedEmployeeIds: text("selected_employee_ids"), // JSON array of selected employee IDs for bulk submissions
  approvalStatus: varchar("approval_status").notNull().default("pending"), // pending, processing, approved, rejected
  approvalCount: integer("approval_count").notNull().default(0), // Number of approvals received
  requiredApprovals: integer("required_approvals"), // Required approvals locked at first approval (from app settings)
  paidStatus: varchar("paid_status").notNull().default("unpaid"), // unpaid, partial, full
  approvedBy: varchar("approved_by"), // JSON array of approver IDs
  approvalHistory: text("approval_history"), // JSON array of approval records [{approverId, approverName, level, remark, editedData, timestamp}]
  rejectionReason: varchar("rejection_reason"), // Reason for rejection
  approvedAt: timestamp("approved_at"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxApprovalStatus: index("idx_approval_status").on(table.approvalStatus),
  idxTeamId: index("idx_team_id").on(table.teamId),
  idxApprovalCount: index("idx_approval_count").on(table.approvalCount),
  idxPaidStatus: index("idx_paid_status").on(table.paidStatus),
}));

// Zod Schemas
export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  vendorCode: z.string().optional(),
  aadhar: z.string().optional().nullable(),
  pan: z.string().optional().nullable(),
  pincode: z.string().optional(),
  gstin: z.string().optional(),
  moa: z.string().optional(),
  status: z.string().optional(),
  role: z.string().optional(),
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
  // Required fields with validation
  name: z.string().min(1, "Full Name is required"),
  fatherName: z.string().min(1, "Father's Name is required"),
  maritalStatus: z.string().min(1, "Marital Status is required"),
  mobile: z.string().min(10, "Mobile No. is required"),
  email: z.string().email("Valid Email is required"),
  role: z.string().min(1, "Role is required"),
  designationId: z.string().min(1, "Designation is required"),
  doj: z.union([z.string(), z.date()]).refine(val => val !== null && val !== undefined, "Date of Joining is required"),
  
  // Optional fields - can be null/undefined
  dob: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => val || undefined),
  alternateNo: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  aadhar: z.string().optional().nullable(),
  pan: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  nominee: z.string().optional().nullable(),
  ppeKit: z.boolean().optional().nullable(),
  kitNo: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
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
}).extend({
  siteAmount: z.union([z.string(), z.number()]).nullable().optional().transform(val => val == null ? null : String(val)),
  vendorAmount: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export const insertVendorRateSchema = createInsertSchema(vendorRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  vendorAmount: z.union([z.string(), z.number()]).transform(val => String(val)),
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
export type VendorRate = typeof vendorRates.$inferSelect;
export type InsertVendorRate = z.infer<typeof insertVendorRateSchema>;
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
}, (table) => ({
  idxTeam: index("idx_team_members_team").on(table.teamId),
  idxEmployee: index("idx_team_members_employee").on(table.employeeId),
  idxRp1: index("idx_team_members_rp1").on(table.reportingPerson1),
  idxRp2: index("idx_team_members_rp2").on(table.reportingPerson2),
  idxRp3: index("idx_team_members_rp3").on(table.reportingPerson3),
}));

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
  poGenerationDate: integer("po_generation_date").default(1), // Day of month (1-31) when vendors can generate POs
  invoiceGenerationDate: integer("invoice_generation_date").default(1), // Day of month (1-31) when vendors can generate invoices
  smtpHost: varchar("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: varchar("smtp_user"),
  smtpPass: varchar("smtp_pass"),
  smtpSecure: boolean("smtp_secure").default(false),
  fromEmail: varchar("from_email"),
  fromName: varchar("from_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.number().optional().nullable(),
  smtpUser: z.string().optional().nullable(),
  smtpPass: z.string().optional().nullable(),
  smtpSecure: z.boolean().optional(),
  fromEmail: z.string().optional().nullable(),
  fromName: z.string().optional().nullable(),
});

export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;

// Additional Validation Schemas for Routes

// Department Schema
export const insertDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required").max(100, "Department name must be 100 characters or less"),
});

// Designation Schema
export const insertDesignationSchema = z.object({
  name: z.string().min(1, "Designation name is required").max(100, "Designation name must be 100 characters or less"),
});

// Login Schema (Vendor & Employee)
export const loginSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

// Password Change Schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Forgot Password Schema
export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
});

// Reset Password Schema
export const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Status Update Schema
export const statusUpdateSchema = z.object({
  status: z.enum(["Pending", "Approved", "Rejected", "Active", "Inactive"]),
});

// Site Status Update Schema
export const siteStatusUpdateSchema = z.object({
  status: z.enum(["Pending", "Active", "Inactive", "Suspended", "Completed"]),
  remark: z.string().optional(),
});

// Allowance Schema (POST)
export const createAllowanceSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  teamId: z.string().optional().nullable(),
  allowanceData: z.record(z.any()),
  date: z.union([z.string(), z.date()]),
});

// Bulk Allowance Schema
export const bulkAllowanceSchema = z.object({
  allowances: z.array(createAllowanceSchema).min(1, "At least one allowance is required"),
});

// Allowance Rejection Schema
export const allowanceRejectionSchema = z.object({
  rejectionReason: z.string()
    .min(5, "Rejection reason must be at least 5 characters")
    .max(500, "Rejection reason must be 500 characters or less"),
});

// Team Member Creation Schema
export const createTeamMemberSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  reportingPerson1: z.string().optional().nullable(),
  reportingPerson2: z.string().optional().nullable(),
  reportingPerson3: z.string().optional().nullable(),
});

// Reporting Person Update Schema
export const updateReportingSchema = z.object({
  reportingPerson1: z.string().optional().nullable(),
  reportingPerson2: z.string().optional().nullable(),
  reportingPerson3: z.string().optional().nullable(),
});

// Attendance Record Schema
export const attendanceRecordSchema = z.object({
  month: z.number().min(1, "Month must be between 1-12").max(12, "Month must be between 1-12"),
  year: z.number().min(2000, "Year must be 2000 or later").max(new Date().getFullYear() + 1),
  attendanceData: z.record(z.any()),
  employeeId: z.string().min(1, "Employee ID is required"),
});

// Sync Credentials Schema
export const syncCredentialsSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  newPassword: z.string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// Find or Create Vendor Schema
export const findOrCreateVendorSchema = z.object({
  vendorCode: z.string().min(1, "Vendor code is required").max(50),
  name: z.string().min(1, "Vendor name is required").max(255),
});

// Holidays Table
export const holidays = pgTable("holidays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  date: date("date").notNull(),
  state: varchar("state", { length: 100 }),
  type: varchar("type", { length: 50 }).notNull().default("public"), // public, optional, restricted
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxDate: index("idx_holiday_date").on(table.date),
  idxState: index("idx_holiday_state").on(table.state),
}));

// Holiday Insert Schema
export const insertHolidaySchema = z.object({
  name: z.string().min(1, "Holiday name is required").max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  state: z.string().max(100).optional().nullable(),
  type: z.enum(["public", "optional", "restricted"]).default("public"),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// Leave Allotment Table
export const leaveAllotments = pgTable("leave_allotments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id")
    .notNull()
    .references(() => employees.id),
  year: integer("year").notNull(),
  medicalLeave: integer("medical_leave").notNull().default(0),
  casualLeave: integer("casual_leave").notNull().default(0),
  earnedLeave: integer("earned_leave").notNull().default(0),
  sickLeave: integer("sick_leave").notNull().default(0),
  personalLeave: integer("personal_leave").notNull().default(0),
  unpaidLeave: integer("unpaid_leave").notNull().default(0),
  leaveWithoutPay: integer("leave_without_pay").notNull().default(0),
  // carryForward was previously a single boolean. Introduce per-type flags for finer control.
  carryForwardEarned: boolean("carry_forward_earned").notNull().default(false),
  carryForwardPersonal: boolean("carry_forward_personal").notNull().default(false),
  usedMedicalLeave: integer("used_medical_leave").notNull().default(0),
  usedCasualLeave: integer("used_casual_leave").notNull().default(0),
  usedEarnedLeave: integer("used_earned_leave").notNull().default(0),
  usedSickLeave: integer("used_sick_leave").notNull().default(0),
  usedPersonalLeave: integer("used_personal_leave").notNull().default(0),
  usedUnpaidLeave: integer("used_unpaid_leave").notNull().default(0),
  usedLeaveWithoutPay: integer("used_leave_without_pay").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxEmployeeYear: index("idx_leave_employee_year").on(table.employeeId, table.year),
}));

// Leave Allotment Insert Schema
export const insertLeaveAllotmentSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  year: z.number().min(2020).max(2100),
  medicalLeave: z.number().min(0).default(0),
  casualLeave: z.number().min(0).default(0),
  earnedLeave: z.number().min(0).default(0),
  sickLeave: z.number().min(0).default(0),
  personalLeave: z.number().min(0).default(0),
  unpaidLeave: z.number().min(0).default(0),
  leaveWithoutPay: z.number().min(0).default(0),
  // Per-type carry forward flags (Earned / Personal)
  carryForwardEarned: z.boolean().optional().default(false),
  carryForwardPersonal: z.boolean().optional().default(false),
});

// Leave Requests Table
export const leaveRequests = pgTable("leave_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  leaveType: varchar("leave_type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  days: integer("days").notNull().default(1),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected
  appliedBy: varchar("applied_by").notNull(), // employee id who applied
  appliedAt: timestamp("applied_at").defaultNow(),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  approvalHistory: text("approval_history"), // JSON array of approval events
  rejectionReason: varchar("rejection_reason"),
  remark: text("remark"),
  approverRemark: text("approver_remark"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxEmployee: index("idx_leave_requests_employee").on(table.employeeId),
  idxStatus: index("idx_leave_requests_status").on(table.status),
}));

export const insertLeaveRequestSchema = z.object({
  employeeId: z.string().min(1),
  leaveType: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().min(1).default(1),
  remark: z.string().optional().nullable(),
});

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;

