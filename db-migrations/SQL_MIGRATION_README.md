# Database Migration Files

This folder contains SQL migration scripts for the EOMS (Employee Operations Management System) database.

## Available Migration Files

### 1. `00_complete_schema_reference.sql` ⭐ START HERE
**Complete database schema reference** - Shows all tables in the system with their structure and relationships.

**Tables Included:**
- Employee Management: Employees, Departments, Designations
- Salary & Payroll: SalaryStructures, **GeneratedSalaries (NEW)**, PaymentMasters
- Attendance & Leave: Attendances, LeaveRequests, LeaveAllotments
- Holidays
- Vendor Management: Vendors, VendorRates
- Site Management: Zones, Circles, Sites
- Purchase Orders & Invoices: PurchaseOrders, PurchaseOrderLines, Invoices
- Team Management: Teams, TeamMembers
- Session Management: Sessions

**How to Use:**
1. Open in SQL Server Management Studio (SSMS)
2. Review the schema to understand table structures
3. Execute if database doesn't exist

### 2. `20251226_salary_system_tables.sql`
**Comprehensive salary management system schema** - Includes SalaryStructures, GeneratedSalaries, Attendances, Holidays, and PaymentMasters tables.

**Key Features:**
- Full documentation of salary calculation workflow
- Includes all indexes for performance
- Idempotent (safe to run multiple times)

**When to Use:**
- Setting up salary module from scratch
- Creating salary-related tables

### 3. `20251226_add_generated_salary.sql`
**GeneratedSalaries table only** - Minimal migration for just the new generated salary records table.

**When to Use:**
- If you already have most tables and just need GeneratedSalaries
- Quick addition of salary audit trail capability

### 4. `MIGRATION_GUIDE.md`
**Step-by-step migration instructions** - How to apply migrations and troubleshoot issues.

## Quick Start

### Option 1: Auto-Creation (Recommended for Development)
The backend automatically creates all tables on startup:
```bash
cd backend-dotnet
dotnet run
```

### Option 2: Manual SQL Execution
```sql
-- Open 00_complete_schema_reference.sql in SSMS
-- Or open the specific migration file you need
-- Execute (F5)
```

### Option 3: SQL Server Command Line
```bash
sqlcmd -S your_server -d EOMS -i "00_complete_schema_reference.sql"
```

## File Structure

```
db-migrations/
├── 00_complete_schema_reference.sql    (All tables)
├── 20251226_salary_system_tables.sql   (Salary module)
├── 20251226_add_generated_salary.sql   (GeneratedSalaries table)
├── 20251226_add_teams.sql              (Teams module)
├── MIGRATION_GUIDE.md                  (Instructions)
├── SQL_MIGRATION_README.md             (This file)
└── InitialCreate.sql                   (Legacy)
```

## Database: EOMS

**Connection String:**
```
Server=(local);Database=EOMS;Trusted_Connection=true;
```

**Or via .NET configuration:**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(local);Database=EOMS;Trusted_Connection=true;"
  }
}
```

## Key Tables for Salary Management

### Relationship Diagram
```
Employees
  ├── SalaryStructures (salary configuration per month/year)
  ├── Attendances (daily attendance as JSON)
  ├── LeaveAllotments (leave balance per year)
  └── GeneratedSalaries (calculated salaries - audit trail)

Attendances.AttendanceData (JSON)
  └── { "1": { "status": "present" }, "2": { "status": "absent" }, ... }

GeneratedSalaries
  ├── Derived from: Attendances + SalaryStructures
  ├── Calculates: WorkingDays, EarnedSalary, NetSalary
  └── Locks: Attendance records (Locked = 1)
```

## Salary Calculation Summary

**Formula:**
```
Working Days = Present Days + (Half Days × 0.5) + Leave Days
Per Day Salary = Gross Salary / Days In Month
Earned Salary = Per Day Salary × Working Days
Net Salary = Earned Salary - Total Deductions
```

**Attendance Status Values:**
- `present` - Full working day
- `absent` - Not counted as working day
- `leave` - Counted as working day (approved leave)
- `firstHalf` - Half working day (0.5)
- `secondHalf` - Half working day (0.5)

## API Endpoints

### Salary Generation
```
POST /api/salary/generate?month=12&year=2025
```

### Save Generated Salaries
```
POST /api/salary/save
{
  "month": 12,
  "year": 2025,
  "salaries": [...]
}
```

### View Generated Salaries
```
GET /api/reports/salary-generated/{year}/{month}?page=1&pageSize=20
```

### Delete Generated Salary
```
DELETE /api/reports/salary-generated/{id}
```

## Verification Queries

**Check if tables exist:**
```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'dbo'
ORDER BY TABLE_NAME
```

**View GeneratedSalaries:**
```sql
SELECT * FROM GeneratedSalaries
WHERE Month = 12 AND Year = 2025
ORDER BY EmployeeId
```

**Check attendance lock status:**
```sql
SELECT EmployeeId, Locked, COUNT(*) as RecordCount
FROM Attendances
WHERE Month = 12 AND Year = 2025
GROUP BY EmployeeId, Locked
```

## Created SQL Files

### 1. 00_complete_schema_reference.sql
- **Size**: Comprehensive
- **Purpose**: Complete database schema
- **Tables**: All 17 tables with indexes
- **Use Case**: Fresh database setup or reference

### 2. 20251226_salary_system_tables.sql
- **Size**: Medium
- **Purpose**: Salary management module
- **Tables**: 5 salary-related tables (SalaryStructures, GeneratedSalaries, Attendances, Holidays, PaymentMasters)
- **Use Case**: Adding salary module to existing database

### 3. 20251226_add_generated_salary.sql
- **Size**: Small
- **Purpose**: Just the new GeneratedSalaries table
- **Tables**: 1 table with 3 indexes
- **Use Case**: Minimal addition if most tables already exist

## How to Apply Migrations

### Method 1: SSMS (Easiest)
1. Open SQL Server Management Studio
2. Connect to your EOMS database
3. File → Open → Select migration file
4. Execute (F5)
5. Check the results pane for success message

### Method 2: Command Line
```bash
# Using sqlcmd
sqlcmd -S localhost -d EOMS -i "D:\VendorRegistrationForm\db-migrations\00_complete_schema_reference.sql"
```

### Method 3: .NET Application
```bash
cd backend-dotnet
dotnet run
# Database is auto-created on startup
```

## New Features (2025-12-26)

✅ **GeneratedSalaries Table**
- Audit trail for all generated salaries
- Complete attendance breakdown
- All salary calculations stored
- Admin tracking (generatedBy field)

✅ **Working Days Calculation**
- Formula: workingDays = presentDays + (halfDays × 0.5) + leaveDays
- Half-days counted as 0.5 each
- Leave days counted as full days
- Absent days not counted

✅ **Attendance Locking**
- Prevents modification after payroll
- Unlocked on salary deletion
- Maintains data integrity

## Troubleshooting

### Table Already Exists
**Solution**: This is normal and expected. SQL scripts include `IF NOT EXISTS` checks.

### Foreign Key Error
**Solution**: Run the complete schema file to create all tables in correct order.

### Column Not Found
**Solution**: Ensure you're using the latest migration files. Check file dates.

### Cannot Connect to Database
**Solution**: Verify connection string and SQL Server is running.

---

**Status**: ✅ Production Ready
**Last Updated**: 2025-12-26
**Database**: EOMS v1.0
