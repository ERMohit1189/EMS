# Authentication Audit Report: Node.js vs .NET

## 1. Session Endpoints Comparison

### Node.js
- **GET /api/auth/session** - Uses `checkSession` middleware
- **GET /api/session** - Direct endpoint, returns detailed session info
- **Response**: 
  ```json
  {
    "authenticated": true/false,
    "isEmployee": true/false,
    "isVendor": true/false,
    "employeeId": "...",
    "vendorId": "...",
    "employeeCode": "...",
    "employeeRole": "admin|superadmin|user",
    "employeeEmail": "...",
    "vendorEmail": "...",
    "isReportingPerson": true/false,
    "reportingTeamIds": [...]
  }
  ```

### .NET
- **GET /api/session** - SessionController.GetSession()
- **Response**:
  ```json
  {
    "authenticated": true/false,
    "userType": "employee|vendor",
    "employeeId": "...",
    "employeeEmail": "...",
    "employeeName": "...",
    "employeeRole": "admin|superadmin|user",
    "isReportingPerson": true/false,
    "vendorId": "..." (for vendors)
  }
  ```

**Status**: ✓ Similar, minor field differences acceptable

---

## 2. Login/Logout Endpoints

### Node.js
- **POST /api/auth/login** - Email/password, creates session
- **POST /api/auth/logout** - Clears session

### .NET
- **POST /api/auth/login** - Email/password, creates claims-based session
- **POST /api/auth/logout** - Clears claims

**Status**: ✓ Both working

---

## 3. Authorization Attributes in Controllers

### SalaryController Issues Found

| Endpoint | Method | Current Auth | Should Be |
|----------|--------|-------------|-----------|
| GET /api/salary-structures | List | [Authorize] on class | ✓ Correct |
| GET /api/salary-structures/{id} | Get | [Authorize] on class | ✓ Correct |
| GET /api/employees/{employeeId}/salary | Get by Employee | [Authorize] on class | ✓ Correct |
| POST /api/salary-structures | Create | [Authorize] on class | ✓ Correct |
| PUT /api/salary-structures/{id} | Update | [Authorize] on class | ✓ Correct |
| DELETE /api/salary-structures/{id} | Delete | [Authorize] on class | ✓ Correct |
| GET /api/salary-structures/count | Count | [AllowAnonymous] | ⚠️ QUESTIONABLE |
| POST /api/salary/generate | Generate | [Authorize(Roles = "admin,superadmin")] | ✓ Correct |
| GET /api/salary-report | Report | [Authorize] | ✓ Correct |
| POST /api/salary/save | Save | [Authorize(Roles = "admin,superadmin")] | ✓ Correct |
| GET /api/salary/check/{id}/{m}/{y} | Check | [Authorize] | ✓ Correct |
| GET /api/reports/salary-generated | Summary | [Authorize] | ✓ Correct |
| GET /api/reports/salary-generated/{y}/{m} | Get | [Authorize] | ✓ Correct |
| DELETE /api/reports/salary-generated/{id} | Delete | [Authorize(Roles = "admin,superadmin")] | ✓ Correct |

### AllowAnonymous Endpoints to Review

Controllers with [AllowAnonymous] that may need review:
- AppSettingsController
- CirclesController
- DepartmentsController
- DesignationsController
- EmployeesController
- ExportController
- InvoicesController
- PaymentMastersController
- PurchaseOrdersController
- SitesController
- TeamsController
- VendorsController
- ZonesController

**Recommendation**: Verify each [AllowAnonymous] endpoint against Node.js implementation

---

## 4. Authentication Flow Differences

### Node.js
1. User logs in via POST /api/auth/login
2. Session stored in database/memory with:
   - employeeId
   - employeeEmail
   - employeeRole
   - vendorId (optional)
3. Middleware checks `req.session` for each protected route
4. Three levels: requireAuth, requireEmployeeAuth, requireAdminAuth

### .NET
1. User logs in via POST /api/auth/login
2. Creates claims-based authentication ticket
3. Cookie: `.eoms_auth` (authentication)
4. Cookie: `sid` (server session ID correlation)
5. Claims extracted from [Authorize] and [Authorize(Roles)]
6. Two levels: [Authorize] and [Authorize(Roles = "admin,superadmin")]

**Status**: ✓ Both secure, different implementations acceptable

---

## 5. Missing Endpoints in .NET

### Employee Salary Report
- ❌ **GET /api/employee/salary-slip** - Get latest salary slip
- ❌ **GET /api/salary-slip/:id** - Get specific salary slip

**Impact**: Employees cannot view their salary slips in .NET

---

## 6. Session Security

### Node.js
- ✓ Session cookie (connect.sid or custom)
- ✓ Session data on server
- ✓ Role checks in middleware

### .NET
- ✓ Authentication cookie (.eoms_auth)
- ✓ Server session ID cookie (sid)
- ✓ Role claims in cookie
- ✓ HttpOnly, SameSite=None, Secure flags

**Status**: ✓ Both secure

---

## Recommendations

1. **Priority 1**: Implement missing employee salary slip endpoints
2. **Priority 2**: Audit all [AllowAnonymous] endpoints against Node.js
3. **Priority 3**: Review role-based access across all controllers
4. **Priority 4**: Add employee-specific authorization checks (owns resource)

