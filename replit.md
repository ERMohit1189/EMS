# Enterprise Management System (EMS) Portal

## Project Overview
Build an Enterprise Management System (EMS) Portal with React/Vite frontend and Express/Node.js backend using PostgreSQL. The system supports employee authentication, role-based dashboards, comprehensive salary management, monthly attendance tracking, and professional Excel/PDF export capabilities with vibrant colorful formatting and company branding from Export Settings, designed for client-ready report delivery. Deployment target is Plesk panel.

## Recent Changes (Latest First)

### UI/UX Improvements
- **Settings Menu Hidden** - Removed Settings group from admin sidebar to hide Settings icon access
- **Mobile Responsive Profile Edit** - Improved vendor profile mobile design:
  - All grid sections (Basic Info, Address Details, Documents) now convert to single-column card layout on mobile
  - Address Details section properly responsive for mobile devices
  - Grid changes: `sm:grid-cols-1 md:grid-cols-2/3` for proper mobile/tablet/desktop adaptation

### Vendor Account Management Features (Completed)
- **Vendor Profile Editor** (`/vendor/profile`) - Created editable profile page where vendors can update:
  - Name, mobile, address, city, state, pincode
  - Category (Individual/Company)
  - Documents (Aadhar, PAN, GSTIN)
  - Email and Vendor Code are locked for security
  - Uses PUT `/api/vendors/:id` endpoint for updates
- **Change Password** (`/vendor/change-password`) - Secure password change page:
  - Requires current password verification
  - Password confirmation required
  - Linked in vendor sidebar under Account menu
- **Forgot Password** (`/vendor/forgot-password`) - Password reset page:
  - Accessible from vendor login page with "Forgot Password?" link
  - Allows password reset using email address
  - Redirects to login after successful reset
- **Frontend Updates**:
  - Added "Forgot Password?" link on VendorLogin.tsx
  - Added "Profile" and "Change Password" menu items to vendor sidebar
- **Backend Endpoints Still Needed**:
  - `POST /api/vendors/:id/change-password` - Validate current password and update
  - `POST /api/vendors/forgot-password` - Reset password by email

### Monthly Attendance Feature Implementation
- **Database Schema**: Added `attendances` table with employee ID, month, year, and JSON-based attendance data storage
- **Backend Storage**: Implemented CRUD operations for attendance management (create, read, update, delete)
- **API Endpoints**: 
  - `POST /api/attendance` - Submit/update monthly attendance
  - `GET /api/attendance/:employeeId/:month/:year` - Retrieve attendance for specific month
- **Frontend Component**: Built calendar-style UI in `client/src/pages/employee/Attendance.tsx` with:
  - Interactive calendar grid for marking attendance (Present/Absent/Leave)
  - Real-time counters for Present, Absent, Leave status
  - Previous/Next month navigation
  - Submit button to save entire month's attendance at once
- **Integration**: Registered attendance page in employee dashboard routes

### Previous Implementation
- Centralized Excel export utilities with professional colorful formatting
- Enhanced all Excel exports with merged header rows (company name, address, report title, date)
- Completed SiteList export integration with company branding
- Employee authentication system with session management
- Salary management system including structure and reporting
- Vendor management with site management and Excel imports

## Project Architecture

### Database Tables
- **attendances** - Monthly attendance records with JSON-based daily status tracking
- **employees** - Employee master data with authentication
- **salaryStructures** - Salary components for each employee
- **sites** - Site/HOP management for vendors
- **vendors** - Vendor master data
- **departments** - Employee department master
- **designations** - Employee designation master
- **purchaseOrders** - PO management
- **invoices** - Invoice records
- **paymentMasters** - Payment configuration
- **zones** - Zone/region master
- **exportHeaders** - Export settings (company branding)

### Frontend Structure
- `/client/src/pages/employee/` - Employee-specific pages
  - Attendance.tsx - Calendar-based attendance marking
  - SalaryStructure.tsx - Employee salary configuration
  - SalaryReport.tsx - Salary report generation
  - EmployeeRegistration.tsx, EmployeeList.tsx, EmployeeEdit.tsx - Employee management
  - DepartmentMaster.tsx, DesignationMaster.tsx - Masters management
- `/client/src/pages/vendor/` - Vendor-specific pages
  - SiteList.tsx, SiteStatus.tsx - Site management and reporting
  - ExportHeaders.tsx - Export settings/branding
  - Various vendor management pages

### Backend Structure
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - Database operations using Drizzle ORM
- `server/db.ts` - Database connection
- `shared/schema.ts` - Drizzle ORM schema definitions

### Key Features
1. **Employee Authentication** - Email-based login with password verification
2. **Role-Based Dashboards** - Different views for Admin, Employee, Vendor
3. **Salary Management** - Comprehensive salary structure and reporting
4. **Attendance Management** - Monthly calendar-based attendance tracking
5. **Excel Export** - Professional colorful exports with company branding
6. **Site Management** - Comprehensive HOP/site management
7. **Vendor Management** - Vendor registration and credential management

## Stack
- Frontend: React, Vite, TypeScript, Tailwind CSS, Radix UI, Recharts
- Backend: Express.js, Node.js, TypeScript
- Database: PostgreSQL with Drizzle ORM
- Export: ExcelJS for professional Excel generation
- UI Components: Radix UI primitives

## Development Guidelines
- Follow the mockup_js stack guidelines for rapid frontend development
- All new models defined in `shared/schema.ts` before implementation
- Database operations use Drizzle ORM with type safety
- API validation uses Zod schemas
- Frontend uses wouter for routing
- Add `data-testid` attributes to all interactive elements

## Next Steps
- Implement attendance approval workflow
- Add attendance reports and analytics
- Implement leave management system
- Add payroll processing
- Implement approval workflows for various modules
