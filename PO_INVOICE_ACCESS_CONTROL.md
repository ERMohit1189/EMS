# PO and Invoice Generation Access Control

## Summary of Changes

### 1. Database Changes
- ✅ Added `po_generation_date` column to `app_settings` table (default: 1)
- ✅ Added `invoice_generation_date` column to `app_settings` table (default: 1)
- These columns store the day of month (1-31) when vendors can generate POs/Invoices

### 2. Access Control Rules

#### PO Generation (`POST /api/purchase-orders`)
**Employees (especially admin role):**
- ✅ Can generate POs for ANY vendor
- ✅ Can generate POs at ANY time
- ✅ No date restrictions

**Vendors:**
- ✅ Can ONLY generate POs for their own vendor account
- ✅ Can ONLY generate POs on the specific date set in app settings
- ❌ Cannot generate POs for other vendors
- ❌ Will get error if trying to generate on wrong date

#### Invoice Generation (`POST /api/invoices`)
**Employees (especially admin role):**
- ✅ Can generate invoices for ANY vendor
- ✅ Can generate invoices at ANY time
- ✅ No date restrictions
- ✅ Can generate invoices for any PO

**Vendors:**
- ✅ Can ONLY generate invoices for their own vendor account
- ✅ Can ONLY generate invoices on the specific date set in app settings
- ✅ Can ONLY generate invoices for POs that haven't been used yet
- ❌ Cannot generate invoices for other vendors' POs
- ❌ Will get error if PO already has an invoice
- ❌ Will get error if trying to generate on wrong date

### 3. Data Filtering

#### Sites for PO Generation (`GET /api/sites/for-po-generation`)
- **Employees:** See all approved sites
- **Vendors:** See only their own sites

#### PO List (`GET /api/purchase-orders`)
- **Employees:** See all POs
- **Vendors:** See only their own POs

#### Invoice List (`GET /api/invoices`)
- **Employees:** See all invoices
- **Vendors:** See only their own invoices

### 4. Error Messages

**Vendor trying to generate PO for another vendor:**
```
"You can only generate POs for your own vendor account"
```

**Vendor trying to generate PO on wrong date:**
```
"Vendors can only generate POs on day X of each month. Today is day Y."
```

**Vendor trying to generate invoice for another vendor:**
```
"You can only generate invoices for your own vendor account"
```

**Vendor trying to generate invoice for already-used PO:**
```
"This PO is already used in another invoice. Each PO can only have one invoice."
```

**Vendor trying to generate invoice on wrong date:**
```
"Vendors can only generate invoices on day X of each month. Today is day Y."
```

### 5. Settings Configuration

Admins can configure generation dates in the **Settings** page:
- **PO Generation Date**: Day of month (1-31) when vendors can create POs
- **Invoice Generation Date**: Day of month (1-31) when vendors can create invoices

**Example:** If set to day 5, vendors can only generate on the 5th of each month.

### 6. Testing

**To test as Admin:**
1. Login as employee with admin role
2. Navigate to PO Generation - should see all sites
3. Generate PO for any vendor - should work any day
4. Navigate to Invoice Generation - should see all POs
5. Generate invoice for any PO - should work any day

**To test as Vendor:**
1. Login as vendor
2. Navigate to PO Generation - should see only your sites
3. Try to generate PO:
   - On correct date: Should work for your vendor only
   - On wrong date: Should get error message
4. Navigate to Invoice Generation - should see only your POs
5. Try to generate invoice:
   - On correct date: Should work for unused POs only
   - On wrong date: Should get error message
   - For already-used PO: Should get error message

### 7. Files Modified

1. **shared/schema.ts**
   - Added `poGenerationDate` and `invoiceGenerationDate` to `appSettings` table

2. **server/routes.ts**
   - Updated `POST /api/purchase-orders` with vendor date restrictions
   - Updated `POST /api/invoices` with vendor date restrictions and PO usage check
   - Updated `GET /api/purchase-orders` with vendor filtering
   - Updated `GET /api/invoices` with vendor filtering
   - Updated `GET /api/sites/for-po-generation` with vendor filtering and auth requirement

3. **Database**
   - Added `po_generation_date` column (INTEGER, default 1)
   - Added `invoice_generation_date` column (INTEGER, default 1)

### 8. Migration Script

Run once to add the new columns:
```bash
node add-generation-date-settings.js
```

### 9. Default Settings
- PO Generation Date: Day 1 of each month
- Invoice Generation Date: Day 1 of each month
- Can be changed by admin in Settings page
