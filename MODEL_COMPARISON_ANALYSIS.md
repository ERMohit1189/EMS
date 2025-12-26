# Node.js vs .NET Model Comparison - DETAILED ANALYSIS

## Critical Discrepancies Found

### 1. **EMPLOYEE Model** ⚠️ MISSING PROPERTIES
**Node.js Properties:**
- id, name, email, password, dob, fatherName, mobile, alternateNo, address, city, state, country, departmentId, designationId, role, doj, aadhar, pan, bloodGroup, maritalStatus, nominee, ppeKit, kitNo, photo, status, emp_code, createdAt, updatedAt

**Current .NET Properties:**
- Id, Name, Email, PasswordHash, Role, EmpCode, Status, CreatedAt, UpdatedAt, Department (nav), Designation (nav), Employee (nav)

**MISSING in .NET:**
- ❌ dob (Date of Birth)
- ❌ fatherName (Father's Name - REQUIRED in Node.js)
- ❌ mobile (Mobile Number - REQUIRED in Node.js)
- ❌ alternateNo (Alternate Mobile Number)
- ❌ address (Address - REQUIRED in Node.js)
- ❌ city (City)
- ❌ state (State)
- ❌ country (Country - defaults to "India")
- ❌ doj (Date of Joining - REQUIRED in Node.js)
- ❌ aadhar (Aadhar Number)
- ❌ pan (PAN)
- ❌ bloodGroup (Blood Group)
- ❌ maritalStatus (Marital Status - REQUIRED in Node.js: Single, Married)
- ❌ nominee (Nominee Name)
- ❌ ppeKit (PPE Kit Flag)
- ❌ kitNo (Kit Number)
- ❌ photo (Photo URL)

---

### 2. **VENDOR Model** ⚠️ MISSING PROPERTIES
**Node.js Properties:**
- id, vendorCode, name, email, mobile, address, city, state, pincode, country, aadhar, pan, gstin, moa, aadharDoc, panDoc, gstinDoc, moaDoc, category, status, role, password, createdAt, updatedAt

**Current .NET Properties:**
- Id, Name, Email, Role, Status, CreatedAt, UpdatedAt, Sites (nav), PurchaseOrders (nav), Invoices (nav)

**MISSING in .NET:**
- ❌ vendorCode (Vendor Code)
- ❌ mobile (Mobile - REQUIRED in Node.js)
- ❌ address (Address - REQUIRED in Node.js)
- ❌ city (City - REQUIRED in Node.js)
- ❌ state (State - REQUIRED in Node.js)
- ❌ pincode (Pincode)
- ❌ country (Country - defaults to "India")
- ❌ aadhar (Aadhar Number)
- ❌ pan (PAN)
- ❌ gstin (GSTIN)
- ❌ moa (MOA Document)
- ❌ aadharDoc (Aadhar Document URL)
- ❌ panDoc (PAN Document URL)
- ❌ gstinDoc (GSTIN Document URL)
- ❌ moaDoc (MOA Document URL)
- ❌ category (Category: Individual/Company - REQUIRED in Node.js)
- ❌ password (Password Hash - REQUIRED for login)

---

### 3. **SALARY STRUCTURE Model** ⚠️ CRITICAL MISMATCH
**Node.js Properties:**
```
id, employeeId, month, year,
basicSalary, hra, da, lta, conveyance, medical, bonuses, otherBenefits,
pf, professionalTax, incomeTax, epf, esic,
wantDeduction, createdAt, updatedAt
```

**Current .NET Properties:**
```
Id, EmployeeId, MonthYear (string?),
Basic, Hra, Da, Conveyance, MedicalAllowance, OtherAllowances,
Deductions,
GrossSalary, NetSalary, CreatedAt, UpdatedAt, Employee (nav)
```

**MISSING in .NET:**
- ❌ month (Month - REQUIRED in Node.js)
- ❌ year (Year - REQUIRED in Node.js)
- ❌ lta (Leave Travel Allowance)
- ❌ bonuses (Bonuses)
- ❌ otherBenefits (Other Benefits)
- ❌ pf (Provident Fund)
- ❌ professionalTax (Professional Tax)
- ❌ incomeTax (Income Tax)
- ❌ epf (EPF)
- ❌ esic (ESIC)
- ❌ wantDeduction (Deduction Flag)

**EXTRA in .NET (Not in Node.js):**
- MonthYear (should be separate month/year columns)

---

### 4. **INVOICE Model** ⚠️ CRITICAL MISMATCH
**Node.js Properties:**
```
id, invoiceNumber, vendorId, poIds, invoiceDate, dueDate,
amount, gst, totalAmount, status, paymentMethod, paymentDate,
bankDetails, remarks, createdAt, updatedAt
```

**Current .NET Properties:**
```
Id, InvoiceNumber, VendorId, Amount, Status, PoIds, CreatedAt, UpdatedAt, Vendor (nav)
```

**MISSING in .NET:**
- ❌ invoiceDate (Invoice Date - REQUIRED in Node.js)
- ❌ dueDate (Due Date - REQUIRED in Node.js)
- ❌ gst (GST Amount)
- ❌ totalAmount (Total Amount = Amount + GST - REQUIRED in Node.js)
- ❌ paymentMethod (Payment Method)
- ❌ paymentDate (Payment Date)
- ❌ bankDetails (Bank Details - Text)
- ❌ remarks (Remarks - Text)

---

### 5. **HOLIDAY Model** ⚠️ CRITICAL MISMATCH
**Node.js Properties:**
```
id, name, date, state, type, description, isActive, createdAt, updatedAt
```

**Current .NET Properties:**
```
Id, Name, HolidayDate (DATE field), IsLocked
```

**ISSUES:**
- ❌ date field should be "HolidayDate" not a separate date field
- ❌ isActive (Boolean - REQUIRED in Node.js, defaults to true)
- ❌ state (State/Region - Optional)
- ❌ type (Type: public/optional/restricted - REQUIRED in Node.js, default "public")
- ❌ description (Description - Optional)
- ❌ createdAt (Timestamp)
- ❌ updatedAt (Timestamp)
- ❌ IsLocked (NOT in Node.js schema - wrong property!)

---

### 6. **LEAVE ALLOTMENT Model** ⚠️ COMPLETELY WRONG STRUCTURE
**Node.js Properties:**
```
id, employeeId, year,
medicalLeave, casualLeave, earnedLeave, sickLeave, personalLeave, unpaidLeave, leaveWithoutPay,
usedMedicalLeave, usedCasualLeave, usedEarnedLeave, usedSickLeave, usedPersonalLeave, usedUnpaidLeave, usedLeaveWithoutPay,
carryForwardEarned, carryForwardPersonal,
createdAt, updatedAt
```

**Current .NET Properties:**
```
Id, EmployeeId, LeaveType (string),
AllocatedDays (int), UsedDays (int), CarryForwardDays (int), CarryForwardElPl (int),
CreatedAt, UpdatedAt, Employee (nav)
```

**CRITICAL ISSUE:**
- The .NET model stores leave allotment as MULTIPLE ROWS (one per leave type)
- The Node.js model stores leave allotment as ONE ROW per employee per year with separate columns for each leave type
- This is a fundamental architectural difference!

**MISSING in .NET:**
- ❌ year (Year - REQUIRED in Node.js)
- ❌ medicalLeave, casualLeave, earnedLeave, sickLeave, personalLeave, unpaidLeave, leaveWithoutPay
- ❌ usedMedicalLeave, usedCasualLeave, usedEarnedLeave, usedSickLeave, usedPersonalLeave, usedUnpaidLeave, usedLeaveWithoutPay
- ❌ carryForwardEarned, carryForwardPersonal (Booleans for per-type carry forward)

---

### 7. **LEAVE REQUEST Model** ⚠️ MISSING PROPERTIES
**Node.js Properties:**
```
id, employeeId, leaveType, startDate, endDate, days, status,
appliedBy, appliedAt, approvedBy, approvedAt, approvalHistory, rejectionReason,
remark, approverRemark, createdAt, updatedAt
```

**Current .NET Properties:**
```
Id, EmployeeId, LeaveType, FromDate, ToDate, Days, Reason, Status, ApproverRemark, CreatedAt, UpdatedAt, Employee (nav)
```

**ISSUES:**
- ✅ FromDate/ToDate (good, but should be startDate/endDate for consistency)
- ✅ Days, Status, ApproverRemark
- ❌ appliedBy (Employee ID who applied - REQUIRED in Node.js)
- ❌ appliedAt (Timestamp of application - REQUIRED in Node.js)
- ❌ approvedBy (Employee ID who approved)
- ❌ approvedAt (Timestamp of approval)
- ❌ approvalHistory (JSON array of approval events)
- ❌ rejectionReason (Reason for rejection)
- ❌ remark (Employee's remark)

---

### 8. **ATTENDANCE Model** ⚠️ CORRECT STRUCTURE
**Node.js Properties:**
```
id, employeeId, month, year, attendanceData, submitted, submittedAt,
locked, lockedAt, lockedBy, createdAt, updatedAt
```

**Current .NET Properties:**
```
Id, EmployeeId, Month, Year, AttendanceData, Submitted, SubmittedAt,
Locked, LockedAt, LockedBy, CreatedAt, UpdatedAt, Employee (nav)
```

**Status:** ✅ CORRECT - Matches Node.js structure

---

### 9. **PURCHASE ORDER Model** ⚠️ MISSING PROPERTIES
**Node.js Properties:**
```
id, poNumber, vendorId, description, quantity, unitPrice, totalAmount,
gstType, gstApply, igstPercentage, igstAmount, cgstPercentage, cgstAmount, sgstPercentage, sgstAmount,
poDate, dueDate, status, approvedBy, approvalDate, remarks, createdAt, updatedAt
```

**Current .NET Properties:**
- Likely incomplete - need to verify

**SHOULD INCLUDE:**
- ❌ poDate (Date)
- ❌ dueDate (Date)
- ❌ gstType (cgstsgst/igst)
- ❌ gstApply (Boolean)
- ❌ igstPercentage, igstAmount
- ❌ cgstPercentage, cgstAmount
- ❌ sgstPercentage, sgstAmount
- ❌ approvedBy, approvalDate
- ❌ remarks

---

### 10. **SITE Model** ⚠️ VERY COMPLEX - NEEDS VERIFICATION
The Node.js Site model has EXTENSIVE Excel columns for HOP (Microwave Hop) management including:
- Antenna details, service readiness, material delivery, installation tracking, AT status, issue tracking, survey info
- Over 50+ fields!

**Need to verify if .NET Site model includes all these fields.**

---

## Summary of Issues

| Model | Status | Critical Issues |
|-------|--------|-----------------|
| Employee | ❌ BROKEN | Missing 20+ essential fields (dob, fatherName, mobile, address, etc.) |
| Vendor | ❌ BROKEN | Missing 15+ fields (vendorCode, mobile, address, documents, etc.) |
| Salary | ❌ BROKEN | Wrong structure - missing month/year and detailed components |
| Invoice | ❌ BROKEN | Missing invoiceDate, dueDate, gst, totalAmount, payment details |
| Holiday | ❌ BROKEN | Completely wrong - has IsLocked instead of isActive/type/description |
| LeaveAllotment | ❌ BROKEN | Completely wrong structure - should be 1 row per emp/year, not per type |
| LeaveRequest | ❌ BROKEN | Missing appliedBy, appliedAt, approvedBy, approvedAt, history |
| Attendance | ✅ CORRECT | Matches Node.js structure perfectly |
| PurchaseOrder | ❌ BROKEN | Missing GST details, dates, approval info |
| Site | ⚠️ UNKNOWN | Need to verify if Excel columns are included |

---

## Recommendation

**These models need to be completely rewritten to match the Node.js schema** to ensure:
1. Data consistency and compatibility
2. Feature parity between front-end and back-end
3. All business logic requirements are met
4. Database migration path is clear

Would you like me to rewrite all the .NET models to match the Node.js schema exactly?
