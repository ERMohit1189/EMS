# EMS Portal - API Documentation for .NET Core Backend

This document defines all API endpoints your .NET Core backend must implement for the Angular frontend.

---

## **Base URL**
```
http://localhost:5000/api
```

---

## **1. VENDOR MANAGEMENT APIs**

### **1.1 Register Vendor**
**POST** `/vendors`

**Request Body:**
```json
{
  "name": "Acme Towers Ltd",
  "email": "contact@acme.com",
  "mobile": "9876543210",
  "address": "123 Business Park",
  "city": "New Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "country": "India",
  "aadhar": "123456789012",
  "pan": "ABCDE1234F",
  "gstin": "07AAAAA0000A1Z5",
  "moa": "base64_encoded_file",
  "category": "Company"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid-or-int",
  "name": "Acme Towers Ltd",
  "email": "contact@acme.com",
  "status": "Pending",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### **1.2 Get All Vendors**
**GET** `/vendors?page=1&pageSize=10&status=Pending`

**Query Parameters:**
- `page` (int): Page number
- `pageSize` (int): Records per page
- `status` (string): Filter by status (Pending, Approved, Rejected)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "1",
      "name": "Acme Towers Ltd",
      "email": "contact@acme.com",
      "mobile": "9876543210",
      "city": "New Delhi",
      "state": "Delhi",
      "category": "Company",
      "status": "Approved",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "totalCount": 42,
  "pageNumber": 1,
  "pageSize": 10
}
```

---

### **1.3 Get Vendor by ID**
**GET** `/vendors/{id}`

**Response (200 OK):**
```json
{
  "id": "1",
  "name": "Acme Towers Ltd",
  "email": "contact@acme.com",
  "mobile": "9876543210",
  "address": "123 Business Park",
  "city": "New Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "country": "India",
  "aadhar": "123456789012",
  "pan": "ABCDE1234F",
  "gstin": "07AAAAA0000A1Z5",
  "category": "Company",
  "status": "Approved",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### **1.4 Update Vendor Status**
**PATCH** `/vendors/{id}/status`

**Request Body:**
```json
{
  "status": "Approved"
}
```

**Response (200 OK):**
```json
{
  "id": "1",
  "name": "Acme Towers Ltd",
  "status": "Approved",
  "updatedAt": "2024-01-15T11:30:00Z"
}
```

---

### **1.5 Delete Vendor**
**DELETE** `/vendors/{id}`

**Response (204 No Content)**

---

### **1.6 Bulk Import Vendors from Excel**
**POST** `/vendors/bulk-import`

**Request Body (multipart/form-data):**
```
file: <Excel file with vendor data>
```

**Response (200 OK):**
```json
{
  "importedCount": 25,
  "failedCount": 2,
  "errors": [
    {
      "row": 5,
      "error": "Email already exists"
    }
  ]
}
```

---

### **1.7 Export Vendors to Excel**
**GET** `/vendors/export?format=excel`

**Response:** Excel file download

---

## **2. SITE MANAGEMENT APIs**

### **2.1 Register Site**
**POST** `/sites`

**Request Body:**
```json
{
  "siteId": "DL-1001",
  "vendorId": "1",
  "planId": "P-500",
  "antennaSize": "2.4m",
  "incDate": "2024-01-20",
  "state": "Delhi",
  "region": "North",
  "zone": "Zone-1",
  "inside": true,
  "formNo": "F-101",
  "siteAmount": 50000,
  "vendorAmount": 45000,
  "softAtRemark": "Pending"
}
```

**Response (201 Created):**
```json
{
  "id": "site-uuid",
  "siteId": "DL-1001",
  "vendorId": "1",
  "status": "Pending",
  "createdAt": "2024-01-20T10:30:00Z"
}
```

---

### **2.2 Get All Sites**
**GET** `/sites?page=1&pageSize=10&status=Active&vendorId=1`

**Query Parameters:**
- `page` (int)
- `pageSize` (int)
- `status` (string): Active, Inactive, Pending
- `vendorId` (string): Filter by vendor

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "site-uuid",
      "siteId": "DL-1001",
      "vendorId": "1",
      "vendorName": "Acme Towers",
      "planId": "P-500",
      "antennaSize": "2.4m",
      "state": "Delhi",
      "region": "North",
      "zone": "Zone-1",
      "status": "Active",
      "siteAmount": 50000,
      "vendorAmount": 45000,
      "createdAt": "2024-01-20T10:30:00Z"
    }
  ],
  "totalCount": 127,
  "pageNumber": 1,
  "pageSize": 10
}
```

---

### **2.3 Get Site by ID**
**GET** `/sites/{id}`

**Response (200 OK):** (Same structure as above)

---

### **2.4 Update Site**
**PUT** `/sites/{id}`

**Request Body:** (Same as register site)

**Response (200 OK):** Updated site object

---

### **2.5 Update Site Status**
**PATCH** `/sites/{id}/status`

**Request Body:**
```json
{
  "status": "Active",
  "remark": "Soft AT cleared"
}
```

**Response (200 OK)**

---

### **2.6 Bulk Import Sites**
**POST** `/sites/bulk-import`

**Request Body (multipart/form-data):**
```
file: <Excel file>
```

**Response:**
```json
{
  "importedCount": 50,
  "failedCount": 3
}
```

---

### **2.7 Delete Site**
**DELETE** `/sites/{id}`

**Response (204 No Content)**

---

## **3. EMPLOYEE MANAGEMENT APIs**

### **3.1 Register Employee**
**POST** `/employees`

**Request Body:**
```json
{
  "name": "Amit Singh",
  "dob": "1990-05-15",
  "fatherName": "Vikram Singh",
  "mobile": "9988776655",
  "alternateNo": "9988776654",
  "address": "Sector 62",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "country": "India",
  "designation": "Field Engineer",
  "doj": "2023-06-01",
  "aadhar": "112233445566",
  "pan": "ABCDE1111F",
  "bloodGroup": "O+",
  "maritalStatus": "Married",
  "nominee": "Spouse",
  "ppeKit": true,
  "kitNo": "K-101"
}
```

**Response (201 Created):**
```json
{
  "id": "emp-uuid",
  "name": "Amit Singh",
  "designation": "Field Engineer",
  "status": "Active",
  "createdAt": "2023-06-01T10:30:00Z"
}
```

---

### **3.2 Get All Employees**
**GET** `/employees?page=1&pageSize=10&designation=Field Engineer`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "emp-uuid",
      "name": "Amit Singh",
      "designation": "Field Engineer",
      "mobile": "9988776655",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "doj": "2023-06-01",
      "bloodGroup": "O+",
      "status": "Active",
      "ppeKit": true
    }
  ],
  "totalCount": 85,
  "pageNumber": 1,
  "pageSize": 10
}
```

---

### **3.3 Get Employee by ID**
**GET** `/employees/{id}`

**Response (200 OK):** Full employee object

---

### **3.4 Update Employee**
**PUT** `/employees/{id}`

**Request Body:** (Same as register)

**Response (200 OK)**

---

### **3.5 Bulk Import Employees**
**POST** `/employees/bulk-import`

**Response:**
```json
{
  "importedCount": 60,
  "failedCount": 1
}
```

---

## **4. SALARY MANAGEMENT APIs**

### **4.1 Create/Update Salary Structure**
**POST** `/salary-structures`

**Request Body:**
```json
{
  "employeeId": "emp-uuid",
  "basicSalary": 15000,
  "hra": 7500,
  "da": 3000,
  "lta": 1500,
  "conveyance": 2000,
  "medical": 1250,
  "bonuses": 0,
  "otherBenefits": 0,
  "pf": 1800,
  "professionalTax": 200,
  "incomeTax": 0,
  "epf": 1800,
  "esic": 500
}
```

**Response (201/200 OK):**
```json
{
  "id": "salary-uuid",
  "employeeId": "emp-uuid",
  "grossSalary": 30250,
  "netSalary": 28150,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### **4.2 Get Salary by Employee ID**
**GET** `/employees/{employeeId}/salary`

**Response (200 OK):** Salary structure object

---

### **4.3 Get All Salary Structures**
**GET** `/salary-structures?page=1&pageSize=10`

**Response (200 OK):**
```json
{
  "data": [...],
  "totalCount": 85
}
```

---

## **5. PO & INVOICE APIs**

### **5.1 Generate PO**
**POST** `/purchase-orders`

**Request Body:**
```json
{
  "vendorId": "1",
  "sites": ["site-uuid-1", "site-uuid-2"],
  "amount": 95000,
  "poDate": "2024-01-25",
  "description": "Tower Installation Services"
}
```

**Response (201 Created):**
```json
{
  "id": "po-uuid",
  "poNumber": "PO-2024-001",
  "vendorId": "1",
  "amount": 95000,
  "status": "Pending",
  "createdAt": "2024-01-25T10:30:00Z"
}
```

---

### **5.2 Get All POs**
**GET** `/purchase-orders?vendorId=1&status=Pending`

**Response (200 OK)**

---

### **5.3 Generate Invoice**
**POST** `/invoices`

**Request Body:**
```json
{
  "vendorId": "1",
  "poId": "po-uuid",
  "invoiceDate": "2024-02-01",
  "amount": 95000,
  "description": "Installation invoice for PO-2024-001"
}
```

**Response (201 Created):**
```json
{
  "id": "invoice-uuid",
  "invoiceNumber": "INV-2024-001",
  "vendorId": "1",
  "amount": 95000,
  "status": "Pending",
  "createdAt": "2024-02-01T10:30:00Z"
}
```

---

### **5.4 Get All Invoices**
**GET** `/invoices?vendorId=1&status=Pending`

---

## **6. REPORTING APIs**

### **6.1 Dashboard Summary**
**GET** `/dashboard/summary`

**Response (200 OK):**
```json
{
  "totalVendors": 42,
  "totalSites": 127,
  "activeSites": 110,
  "totalEmployees": 85,
  "pendingPOs": 5,
  "totalRevenue": 2500000
}
```

---

### **6.2 Vendor Report**
**GET** `/reports/vendors?from=2024-01-01&to=2024-12-31&format=excel`

**Response:** Excel file or JSON

---

### **6.3 Site Report**
**GET** `/reports/sites`

---

### **6.4 Attendance Report**
**GET** `/reports/attendance`

---

### **6.5 Payroll Report**
**GET** `/reports/payroll`

---

## **7. ERROR RESPONSES**

### **400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "Invalid input",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### **401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Unauthorized access"
}
```

### **404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Resource not found"
}
```

### **500 Internal Server Error**
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "traceId": "0HN34B7QKQO1J:00000001"
}
```

---

## **8. AUTHENTICATION & SECURITY**

All endpoints require:
- **Authorization Header**: `Authorization: Bearer {jwt_token}`
- **Content-Type**: `application/json`

### **Login Endpoint**
**POST** `/auth/login`

**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "user": {
    "id": "user-1",
    "name": "Admin",
    "email": "admin@company.com"
  }
}
```

---

## **MSSQL Database Schema**

### **Vendors Table**
```sql
CREATE TABLE Vendors (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(255) NOT NULL,
    Email NVARCHAR(255) UNIQUE NOT NULL,
    Mobile NVARCHAR(15) NOT NULL,
    Address NVARCHAR(500),
    City NVARCHAR(100),
    State NVARCHAR(100),
    Pincode NVARCHAR(20),
    Country NVARCHAR(100),
    Aadhar NVARCHAR(50) UNIQUE,
    PAN NVARCHAR(50) UNIQUE,
    GSTIN NVARCHAR(50),
    MOA NVARCHAR(MAX),
    Category NVARCHAR(50), -- Individual, Company
    Status NVARCHAR(50), -- Pending, Approved, Rejected
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2
);
```

### **Sites Table**
```sql
CREATE TABLE Sites (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SiteId NVARCHAR(100) UNIQUE NOT NULL,
    VendorId UNIQUEIDENTIFIER NOT NULL,
    PlanId NVARCHAR(100),
    AntennaSize NVARCHAR(50),
    IncDate DATE,
    State NVARCHAR(100),
    Region NVARCHAR(100),
    Zone NVARCHAR(100),
    Inside BIT,
    FormNo NVARCHAR(100),
    SiteAmount DECIMAL(10,2),
    VendorAmount DECIMAL(10,2),
    Status NVARCHAR(50), -- Pending, Active, Inactive
    SoftATRemark NVARCHAR(500),
    PhyATRemark NVARCHAR(500),
    ATPRemark NVARCHAR(500),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2,
    FOREIGN KEY (VendorId) REFERENCES Vendors(Id)
);
```

### **Employees Table**
```sql
CREATE TABLE Employees (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(255) NOT NULL,
    DOB DATE,
    FatherName NVARCHAR(255),
    Mobile NVARCHAR(15),
    AlternateNo NVARCHAR(15),
    Address NVARCHAR(500),
    City NVARCHAR(100),
    State NVARCHAR(100),
    Country NVARCHAR(100),
    Designation NVARCHAR(100),
    DOJ DATE,
    Aadhar NVARCHAR(50) UNIQUE,
    PAN NVARCHAR(50) UNIQUE,
    BloodGroup NVARCHAR(10),
    MaritalStatus NVARCHAR(50),
    Nominee NVARCHAR(255),
    PPEKit BIT,
    KitNo NVARCHAR(100),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2
);
```

### **Salary Structure Table**
```sql
CREATE TABLE SalaryStructures (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    EmployeeId UNIQUEIDENTIFIER NOT NULL,
    BasicSalary DECIMAL(10,2),
    HRA DECIMAL(10,2),
    DA DECIMAL(10,2),
    LTA DECIMAL(10,2),
    Conveyance DECIMAL(10,2),
    Medical DECIMAL(10,2),
    Bonuses DECIMAL(10,2),
    OtherBenefits DECIMAL(10,2),
    PF DECIMAL(10,2),
    ProfessionalTax DECIMAL(10,2),
    IncomeTax DECIMAL(10,2),
    EPF DECIMAL(10,2),
    ESIC DECIMAL(10,2),
    GrossSalary DECIMAL(10,2),
    NetSalary DECIMAL(10,2),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2,
    FOREIGN KEY (EmployeeId) REFERENCES Employees(Id)
);
```

---

This documentation gives your .NET Core backend all the specifications needed!
