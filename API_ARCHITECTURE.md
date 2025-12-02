# Enterprise Management System (EMS) - API Architecture & Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Backend Infrastructure](#backend-infrastructure)
3. [API Endpoints Reference](#api-endpoints-reference)
4. [Frontend-Backend Connection Flow](#frontend-backend-connection-flow)
5. [Authentication & Session Management](#authentication--session-management)
6. [Data Models](#data-models)

---

## System Architecture

### Technology Stack
- **Frontend**: React 18.x + Vite with TypeScript
- **Backend**: Express.js + Node.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based (express-session)
- **Password Hashing**: bcrypt

### Architecture Overview
```
┌─────────────────────────────────────┐
│   React Frontend (client/src)        │
│   - Pages (SPA Routing)              │
│   - Components (UI)                  │
│   - Hooks (Data Management)          │
└────────────┬────────────────────────┘
             │
             │ HTTP/REST API
             │ (fetch/CORS)
             │
┌────────────▼────────────────────────┐
│   Express.js Backend (server)        │
│   - Routes (/api/*)                  │
│   - Middleware (Auth, Validation)    │
│   - Storage Layer (Database CRUD)    │
└────────────┬────────────────────────┘
             │
             │ Drizzle ORM
             │
┌────────────▼────────────────────────┐
│   PostgreSQL Database                │
│   - Tables (Vendors, Sites, etc)     │
│   - Indexes (Performance)            │
│   - Constraints (Data Integrity)     │
└─────────────────────────────────────┘
```

---

## Backend Infrastructure

### API Base URL Configuration
- **Development**: `http://localhost:5000`
- **Production**: Configured via `VITE_API_BASE_URL` environment variable
- **Frontend Access**: `getApiBaseUrl()` from `client/src/lib/api.ts`

### Express Middleware Stack
1. Session Management (express-session with PostgreSQL store)
2. JSON Parser (for request body)
3. CORS Headers
4. Cache Control (no-cache for API routes)

### Database Connection
- Drizzle ORM with PostgreSQL
- Connection string via `DATABASE_URL` environment variable
- Connection pooling for performance

---

## API Endpoints Reference

### 1. VENDOR MANAGEMENT

#### Register/Create Vendor
```
POST /api/vendors
Request Body:
{
  "name": string (required),
  "email": string (required),
  "mobile": string (required),
  "address": string (required),
  "city": string (required),
  "state": string (required),
  "category": string (default: "Individual"),
  "pincode": string (optional),
  "aadhar": string (optional),
  "pan": string (optional),
  "gstin": string (optional),
  "moa": string (optional)
}
Response: { ...vendor, tempPassword: string }
Frontend: VendorRegistration.tsx → handleSubmit()
```

#### Vendor Login
```
POST /api/vendors/login
Request Body:
{
  "email": string (required),
  "password": string (required)
}
Response: { success: true, vendor: { id, name, email } }
Frontend: VendorLogin.tsx → handleLogin()
Session: Sets req.session.vendorId and req.session.vendorEmail
```

#### Get Vendors (Paginated)
```
GET /api/vendors?page=1&pageSize=10
Response: { data: Vendor[], totalCount: number, pageNumber: number, pageSize: number }
Frontend: VendorList.tsx → useEffect() → loadVendors()
```

#### Get Vendor By ID
```
GET /api/vendors/:id
Response: Vendor object
Frontend: VendorEdit.tsx → useEffect() → loadVendor()
```

#### Update Vendor
```
PUT /api/vendors/:id
Request Body: Partial<Vendor>
Response: Updated Vendor object
Frontend: VendorEdit.tsx → handleUpdate()
```

#### Update Vendor Status
```
PATCH /api/vendors/:id/status
Request Body: { status: "Pending" | "Approved" | "Rejected" }
Response: Updated Vendor object
Frontend: VendorList.tsx → handleStatusChange()
```

#### Generate Vendor Password
```
POST /api/vendors/:id/generate-password
Response: { success: true, vendor: {...}, tempPassword: string }
Frontend: VendorCredentials.tsx → handleGeneratePassword()
```

#### Check Vendor Usage
```
GET /api/vendors/:id/usage
Response: { isUsed: boolean }
Frontend: VendorList.tsx → handleDeleteVendor() (before deletion)
```

#### Delete Vendor
```
DELETE /api/vendors/:id
Response: { success: true }
Frontend: VendorList.tsx → handleDeleteVendor()
Constraint: Only if not used in sites, POs, or invoices
```

#### Vendor Logout
```
POST /api/vendors/logout
Response: { success: true }
Frontend: Logout button → handleLogout()
Session: Destroys session
```

---

### 2. SITE MANAGEMENT

#### Create/Import Site
```
POST /api/sites
Request Body: InsertSite (all 81+ columns)
Response: Site object
Frontend: SiteRegistration.tsx → handleSubmit() or ExcelImport.tsx
```

#### Create/Update Site (Upsert)
```
POST /api/sites/upsert
Request Body: InsertSite with planId
Response: Site object
Frontend: ExcelImport.tsx → processBulkImport()
Logic: Creates if planId doesn't exist, updates if exists
```

#### Get Sites (Paginated)
```
GET /api/sites?page=1&pageSize=10
Response: { data: Site[], totalCount: number, pageNumber: number, pageSize: number }
Frontend: SiteStatus.tsx → loadSites()
```

#### Get Site By ID
```
GET /api/sites/:id
Response: Site object
Frontend: SiteEdit.tsx → loadSite()
```

#### Get Sites For PO Generation
```
GET /api/sites/for-po-generation
Response: { data: Site[] }
Frontend: POGeneration.tsx → getSitesForPO()
Filter: Returns sites with status "Approved"
```

#### Export Sites By Date Range
```
GET /api/sites/export/by-date-range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
Response: { data: Site[] }
Frontend: SiteStatus.tsx → exportToExcel() (filtered data)
```

#### Update Site
```
PUT /api/sites/:id
Request Body: Partial<Site>
Response: Updated Site object
Frontend: SiteEdit.tsx → handleUpdate()
Constraint: Cannot update if PO exists for site
```

#### Update Site Status
```
PATCH /api/sites/:id/status
Request Body: { status: string, remark?: string }
Response: Updated Site object
Frontend: SiteList.tsx → handleStatusChange()
Constraint: Cannot update if PO exists for site
```

#### Bulk Update Site Status
```
POST /api/sites/bulk-update-status
Request Body: { siteIds: string[], phyAtStatus?: string, softAtStatus?: string }
Response: { success: true, updated: number }
Frontend: SiteStatus.tsx → handleBulkStatusUpdate()
```

#### Bulk Update Site Status By Plan
```
POST /api/sites/bulk-update-status-by-plan
Request Body: { planIds: string[], phyAtStatus?: string, softAtStatus?: string }
Response: { success: true }
Frontend: SiteStatus.tsx → handleBulkApproval()
Logic: Also auto-updates site status if both AT statuses are Approved
```

#### Bulk Update Site Remarks
```
POST /api/sites/bulk-update-remarks
Request Body: { siteIds: string[], phyAtRemark?: string, softAtRemark?: string }
Response: { success: true, updated: number }
Frontend: SiteStatus.tsx → handleBulkRemarksUpdate()
```

#### Recalculate Site Statuses
```
POST /api/sites/recalculate-status
Response: { success: true, message: "Updated X sites to Approved status" }
Frontend: SiteStatus.tsx → handleRecalculateStatus()
Logic: Sets status to "Approved" if both AT statuses are "Approved"
```

#### Delete Site
```
DELETE /api/sites/:id
Response: { success: true }
Frontend: SiteList.tsx → handleDeleteSite()
```

---

### 3. EMPLOYEE MANAGEMENT

#### Employee Login
```
POST /api/employees/login
Request Body: { email: string, password: string }
Response: { 
  success: true, 
  employee: { 
    id, name, email, role, department, designation, isReportingPerson 
  } 
}
Frontend: EmployeeLogin.tsx → handleLogin()
Session: Sets req.session.employeeId and req.session.employeeEmail
```

#### Get Employees (Paginated)
```
GET /api/employees?page=1&pageSize=10
Response: { data: Employee[], totalCount: number, pageNumber, pageSize }
Frontend: EmployeeList.tsx → loadEmployees()
```

#### Get Employee By ID
```
GET /api/employees/:id
Response: Employee object
Frontend: EmployeeEdit.tsx → loadEmployee()
```

#### Create Employee
```
POST /api/employees
Request Body: InsertEmployee
Response: Employee object
Frontend: EmployeeRegistration.tsx → handleSubmit()
Note: Password generated on backend, sent to employee
```

#### Update Employee
```
PUT /api/employees/:id
Request Body: Partial<Employee>
Response: Updated Employee object
Frontend: EmployeeEdit.tsx → handleUpdate()
```

#### Change Password
```
POST /api/employees/:id/change-password
Request Body: { currentPassword: string, newPassword: string }
Response: { success: true, message: "Password changed successfully" }
Frontend: ChangePassword.tsx → handleChangePassword()
```

#### Sync Employee Credentials
```
POST /api/employees/sync-credentials
Request Body: { employeeId: string, password: string }
Response: { success: true, employee: Employee }
Frontend: EmployeeCredentials.tsx → handleSyncPassword()
Purpose: Store hashed password in database for login
```

#### Delete Employee
```
DELETE /api/employees/:id
Response: { success: true }
Frontend: EmployeeList.tsx → handleDeleteEmployee()
```

---

### 4. SALARY & ATTENDANCE

#### Create Salary Structure
```
POST /api/salary-structures
Request Body: InsertSalary
Response: SalaryStructure object
Frontend: SalaryStructure.tsx → handleSubmit()
```

#### Get Salary By Employee
```
GET /api/salary-structures/:employeeId
Response: SalaryStructure object
Frontend: SalaryStructure.tsx → loadSalary()
```

#### Update Salary
```
PUT /api/salary-structures/:id
Request Body: Partial<SalaryStructure>
Response: Updated SalaryStructure
Frontend: SalaryStructure.tsx → handleUpdate()
```

#### Create Attendance Record
```
POST /api/attendances
Request Body: InsertAttendance
Response: Attendance object
Frontend: Attendance.tsx → submitAttendance()
```

#### Get Attendance By Employee/Month
```
GET /api/attendances/:employeeId/:month/:year
Response: Attendance object
Frontend: Attendance.tsx → loadAttendance()
```

---

### 5. DAILY ALLOWANCES

#### Create Daily Allowance
```
POST /api/daily-allowances
Request Body: InsertDailyAllowance
Response: DailyAllowance object with approvalStatus: "pending"
Frontend: Allowances.tsx → submitAllowance()
Workflow: Created with pending status, needs approval from reporting persons
```

#### Get Daily Allowances (Paginated)
```
GET /api/daily-allowances?page=1&pageSize=10&status=pending
Response: { data: DailyAllowance[], totalCount, pageNumber, pageSize }
Frontend: Allowances.tsx → loadAllowances() or AllowanceApproval.tsx
```

#### Approve Daily Allowance
```
POST /api/daily-allowances/:id/approve
Request Body: { approverId: string }
Response: DailyAllowance object with updated approvalStatus
Frontend: AllowanceApproval.tsx → handleApprove()
Logic: Increments approvalCount, updates status based on required approvals
```

#### Reject Daily Allowance
```
POST /api/daily-allowances/:id/reject
Request Body: { approverId: string, rejectionReason: string }
Response: DailyAllowance object with approvalStatus: "rejected"
Frontend: AllowanceApproval.tsx → handleReject()
```

#### Mark as Paid
```
PATCH /api/daily-allowances/:id/mark-paid
Request Body: { paidStatus: "full" | "partial", paidAmount?: number }
Response: DailyAllowance object with updated paidStatus
Frontend: Allowances.tsx → markAsPaid()
```

---

### 6. PURCHASE ORDERS

#### Create Purchase Order
```
POST /api/purchase-orders
Request Body: InsertPO
Response: PurchaseOrder object
Frontend: POGeneration.tsx → createPO()
Auto-generation: Generates unique PO number, sets status to "Draft"
```

#### Get Purchase Orders (Paginated)
```
GET /api/purchase-orders?page=1&pageSize=10
Response: { data: PurchaseOrder[], totalCount, pageNumber, pageSize }
Frontend: Dashboard.tsx or POGeneration.tsx
```

#### Get PO By ID
```
GET /api/purchase-orders/:id
Response: PurchaseOrder object (with vendor & site details)
Frontend: POPrint.tsx → loadPO()
```

#### Update PO Status
```
PATCH /api/purchase-orders/:id/status
Request Body: { status: "Approved" | "Issued" | "Completed" }
Response: Updated PurchaseOrder
Frontend: POGeneration.tsx → handleApprove()
```

#### Generate PO PDF
```
GET /api/purchase-orders/:id/pdf
Response: PDF file (binary)
Frontend: POPrint.tsx → handlePrintPDF()
Uses: html2canvas + jsPDF libraries on frontend
```

#### Delete PO
```
DELETE /api/purchase-orders/:id
Response: { success: true }
Frontend: POGeneration.tsx → handleDeletePO()
Constraint: Only if status is "Draft"
```

---

### 7. INVOICES

#### Create Invoice
```
POST /api/invoices
Request Body: InsertInvoice
Response: Invoice object
Frontend: InvoiceGeneration.tsx → createInvoice()
```

#### Get Invoices (Paginated)
```
GET /api/invoices?page=1&pageSize=10
Response: { data: Invoice[], totalCount, pageNumber, pageSize }
Frontend: Dashboard.tsx or InvoiceGeneration.tsx
```

#### Get Invoice By ID
```
GET /api/invoices/:id
Response: Invoice object
Frontend: InvoiceGeneration.tsx → loadInvoice()
```

#### Update Invoice Status
```
PATCH /api/invoices/:id/status
Request Body: { status: "Draft" | "Submitted" | "Approved" | "Paid" | "Rejected" }
Response: Updated Invoice
Frontend: InvoiceGeneration.tsx → handleStatusChange()
```

#### Mark Invoice as Paid
```
PATCH /api/invoices/:id/mark-paid
Request Body: { paymentDate: date, paymentMethod: string }
Response: Updated Invoice
Frontend: InvoiceGeneration.tsx → handleMarkPaid()
```

---

### 8. TEAMS & HIERARCHY

#### Create Team
```
POST /api/teams
Request Body: { name: string, members: string[] (employeeIds) }
Response: Team object
Frontend: Teams.tsx → createTeam()
```

#### Get Teams
```
GET /api/teams
Response: Team[] array
Frontend: Teams.tsx → loadTeams()
```

#### Get Team Members
```
GET /api/teams/:id/members
Response: TeamMember[] with reporting hierarchy
Frontend: Teams.tsx → loadTeamMembers()
```

#### Update Team
```
PUT /api/teams/:id
Request Body: { name: string, members: string[] }
Response: Updated Team
Frontend: Teams.tsx → updateTeam()
```

#### Delete Team
```
DELETE /api/teams/:id
Response: { success: true }
Frontend: Teams.tsx → deleteTeam()
```

---

### 9. DEPARTMENTS & DESIGNATIONS

#### Get Departments
```
GET /api/departments
Response: Department[]
Frontend: EmployeeRegistration.tsx or Settings.tsx
```

#### Create Department
```
POST /api/departments
Request Body: { name: string }
Response: Department object
Frontend: Settings.tsx → addDepartment()
```

#### Delete Department
```
DELETE /api/departments/:id
Response: { success: true }
Frontend: Settings.tsx → deleteDepartment()
```

#### Get Designations
```
GET /api/designations
Response: Designation[]
Frontend: EmployeeRegistration.tsx or Settings.tsx
```

#### Create Designation
```
POST /api/designations
Request Body: { name: string }
Response: Designation object
Frontend: Settings.tsx → addDesignation()
```

#### Delete Designation
```
DELETE /api/designations/:id
Response: { success: true }
Frontend: Settings.tsx → deleteDesignation()
```

---

### 10. PAYMENT MASTERS

#### Create Payment Master
```
POST /api/payment-masters
Request Body: InsertPaymentMaster
Response: PaymentMaster object
Frontend: PaymentMaster.tsx → createPaymentMaster()
```

#### Get Payment Masters (Paginated)
```
GET /api/payment-masters?page=1&pageSize=10
Response: { data: PaymentMaster[], totalCount, pageNumber, pageSize }
Frontend: PaymentMaster.tsx → loadPaymentMasters()
```

#### Update Payment Master
```
PUT /api/payment-masters/:id
Request Body: Partial<PaymentMaster>
Response: Updated PaymentMaster
Frontend: PaymentMaster.tsx → updatePaymentMaster()
```

#### Delete Payment Master
```
DELETE /api/payment-masters/:id
Response: { success: true }
Frontend: PaymentMaster.tsx → deletePaymentMaster()
```

---

### 11. ZONES

#### Get Zones
```
GET /api/zones?pageSize=10000
Response: Zone[]
Frontend: SiteRegistration.tsx, ZoneMaster.tsx
```

#### Create Zone
```
POST /api/zones
Request Body: { name: string, shortName: string }
Response: Zone object
Frontend: ZoneMaster.tsx → createZone()
```

#### Delete Zone
```
DELETE /api/zones/:id
Response: { success: true }
Frontend: ZoneMaster.tsx → deleteZone()
```

---

### 12. EXPORT HEADERS & SETTINGS

#### Get Export Header Settings
```
GET /api/export-headers
Response: ExportHeader object
Frontend: Any export function, ExportHeaders.tsx
```

#### Save Export Header Settings
```
POST /api/export-headers
Request Body: Partial<ExportHeader>
Response: ExportHeader object
Frontend: ExportHeaders.tsx → handleSave()
```

#### Get App Settings
```
GET /api/app-settings
Response: { approvalsRequiredForAllowance: number }
Frontend: Settings.tsx → loadSettings()
```

#### Update App Settings
```
PUT /api/app-settings
Request Body: { approvalsRequiredForAllowance: number }
Response: Updated AppSettings
Frontend: Settings.tsx → handleSaveApprovals()
```

---

## Frontend-Backend Connection Flow

### Example: Vendor Registration Flow
```
1. User fills VendorRegistration.tsx form
2. Click Submit → handleSubmit() called
3. Form validation with Zod schema
4. POST /api/vendors with form data
5. Backend validates with insertVendorSchema
6. Backend auto-generates vendorCode (starting from 1001)
7. Backend hashes password with bcrypt
8. Backend creates vendor in database
9. Response returns tempPassword
10. Frontend shows success toast with password
11. Redirect to VendorList.tsx
```

### Example: Site Status Update Flow
```
1. User selects sites in SiteStatus.tsx
2. Click bulk action button
3. Choose new status/remarks
4. POST /api/sites/bulk-update-status-by-plan
5. Backend updates all selected sites
6. Backend auto-calculates site status:
   - If phyAtStatus === "Approved" AND softAtStatus === "Approved"
   - Then site status = "Approved"
7. Response returns { success: true, updated: count }
8. Frontend reloads sites list
9. UI reflects new statuses
```

### Example: Daily Allowance Approval Flow
```
1. Employee submits allowance in Allowances.tsx
2. POST /api/daily-allowances with allowance data
3. Backend creates allowance with approvalStatus: "pending"
4. Reporting person sees it in AllowanceApproval.tsx
5. GET /api/daily-allowances?status=pending (loaded)
6. Reporting person clicks Approve
7. POST /api/daily-allowances/:id/approve
8. Backend increments approvalCount
9. Backend checks if approvalCount >= required approvals
10. If yes: approvalStatus changes to "approved"
11. Allowance can then be marked as paid
12. Employee sees approved allowance in history
```

---

## Authentication & Session Management

### Session Flow
1. User logs in (vendor or employee)
2. Backend validates credentials against hashed password
3. Backend creates session with user ID
4. Session stored in PostgreSQL (connect-pg-simple)
5. Session ID sent in HTTP cookie
6. Subsequent requests include session cookie
7. Backend middleware verifies session
8. User data available in req.session
9. On logout: Session destroyed

### Password Security
- Passwords hashed with bcrypt (10 salt rounds)
- Never stored or transmitted in plain text
- Temporary passwords generated for new vendors/employees
- Users required to change password on first login

---

## Data Models

### Core Tables

#### Vendors
- `vendorCode` (unique): Auto-generated starting from 1001
- `email` (unique): Primary identifier
- `password`: Hashed with bcrypt
- Status: Pending → Approved → Active
- Role: Vendor, Admin, Manager

#### Sites
- 81+ columns for comprehensive HOP management
- Linked to Vendor via vendorId
- Linked to Zone via zoneId
- Status auto-calculated based on AT statuses
- Status locked after PO generation

#### Employees
- `email` (unique): Primary identifier for login
- Department & Designation (foreign keys)
- Password: Hashed with bcrypt
- Three-level reporting hierarchy (RP1, RP2, RP3)

#### Daily Allowances
- Linked to Employee and Team
- Multi-level approval workflow
- Tracks approval count and paid status
- Supports partial and full payments

#### Purchase Orders & Invoices
- PO → linked to Site & Vendor
- Invoice → linked to PO
- GST calculations (IGST or CGST+SGST)
- Status tracking: Draft → Approved → Issued → Paid

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{ "error": "Validation error message" }
```
Cause: Invalid request data, missing required fields

#### 401 Unauthorized
```json
{ "error": "Invalid email or password" }
```
Cause: Login failed, wrong credentials

#### 404 Not Found
```json
{ "error": "Resource not found" }
```
Cause: ID doesn't exist in database

#### 500 Internal Server Error
```json
{ "error": "Database error or server issue" }
```
Cause: Unexpected server error

### Frontend Error Handling
```typescript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    const data = await response.json();
    toast({ title: 'Error', description: data.error, variant: 'destructive' });
    return;
  }
  const result = await response.json();
  // Process success
} catch (error) {
  toast({ title: 'Error', description: error.message, variant: 'destructive' });
}
```

---

## Database Indexes for Performance

### Vendor Indexes
- `idx_vendors_status`: Query vendors by approval status
- `idx_vendors_email`: Unique email lookup
- `idx_vendors_vendor_code`: Unique vendor code lookup

### Site Indexes
- `idx_sites_vendor`: Query sites by vendor
- `idx_sites_zone`: Query sites by zone
- `idx_sites_status`: Query sites by status

### Employee Indexes
- `idx_employees_email`: Unique email lookup
- `idx_employees_department`: Query employees by department
- `idx_employees_designation`: Query by designation
- `idx_employees_status`: Query by status

### Allowance Indexes
- `idx_approval_status`: Find pending/approved allowances
- `idx_team_id`: Query by team
- `idx_paid_status`: Find unpaid allowances

---

## Configuration & Environment

### Environment Variables
```
DATABASE_URL=postgresql://user:pass@host:port/dbname
VITE_API_BASE_URL=http://localhost:5000  # or production URL
```

### Feature Flags
```typescript
// Development-only features
if (import.meta.env.DEV) {
  // Employee management routes visible
  // PWA prompt disabled by default
}

// Production features
if (!import.meta.env.DEV) {
  // Employee management hidden
  // PWA prompt disabled (can be enabled via Settings)
}
```

---

## Development Guidelines

### Adding New API Endpoint
1. Define schema in `shared/schema.ts`
2. Create route in `server/routes.ts`
3. Implement storage method in `server/storage.ts`
4. Add frontend page in `client/src/pages/`
5. Use `getApiBaseUrl()` for base URL
6. Handle errors with toast notifications

### Frontend API Calls Pattern
```typescript
import { getApiBaseUrl } from '@/lib/api';

const response = await fetch(`${getApiBaseUrl()}/api/endpoint`, {
  method: 'GET|POST|PUT|DELETE|PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error);
}

return await response.json();
```

---

## Production Deployment

### Build & Deployment
```bash
npm run build          # Builds frontend + server
# Output in dist/ directory

# Deploy to production
# - Set VITE_API_BASE_URL to production backend URL
# - Set DATABASE_URL to production database
# - Configure session store (use PostgreSQL)
```

### Performance Optimizations
- Database indexes on frequently queried columns
- Pagination for large datasets
- Caching headers for static assets
- Session store in database (not memory)
- Connection pooling for database

---

## Support & Troubleshooting

### Common Issues

**API calls fail with 404**
- Check `VITE_API_BASE_URL` environment variable
- Verify backend server is running
- Check endpoint path spelling

**Session not persisting**
- Verify PostgreSQL is running
- Check session store configuration
- Clear browser cookies and retry

**Password login fails**
- Verify employee has password set (`sync-credentials`)
- Check bcrypt comparison logic
- Ensure password is hashed, not plain text

---

## Document Version
- **Last Updated**: December 2, 2025
- **EMS Version**: 1.0.0
- **API Version**: v1
