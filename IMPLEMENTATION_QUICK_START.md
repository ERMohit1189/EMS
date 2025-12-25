# Quick Start Implementation Guide

## 📋 Files to Update (In Order)

### 1. Database Migration ✅
```
File: server/migrations/20251223_add_vendor_password_otps_table.sql
Status: READY TO RUN
Action: Execute this SQL in PostgreSQL
```

**Copy the full SQL migration and run it in your database.**

---

### 2. Schema Updates (shared/schema.ts)
```
File: shared/schema.ts
Lines: 382-398 (new), 363 (modified)
Changes:
  ✅ Added vendorPasswordOtps table definition (DONE)
  ✅ Added poIds to invoices table (DONE)
Status: COMPLETE
```

**No action needed - already updated.**

---

### 3. Storage Layer (server/storage.ts)
```
File: server/storage.ts
Changes Needed:
  [ ] Add import: vendorPasswordOtps
  [ ] Replace createVendorPasswordOTP() function
  [ ] Replace findValidOTPByEmail() function
  [ ] Replace markOtpUsed() function
```

**See: `CODE_CHANGES_storage.ts.md` for exact code to use**

---

### 4. API Routes (server/routes.ts)
```
File: server/routes.ts
Changes Needed:
  [ ] Replace POST /api/vendors/request-reset-otp endpoint
```

**See: `CODE_CHANGES_routes.ts.md` for exact code to use**

---

### 5. Frontend (client/src/pages/vendor/InvoiceGeneration.tsx)
```
File: client/src/pages/vendor/InvoiceGeneration.tsx
Status: COMPLETE
Changes Applied:
  ✅ Added groupByVendor state
  ✅ Updated generateInvoices() function
  ✅ Added UI toggle
  ✅ Updated PDF generation
```

**No action needed - already updated.**

---

## 🚀 Step-by-Step Implementation

### Step 1: Backup Your Database
```bash
pg_dump your_database_name > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Database Migration
```sql
-- Copy entire contents from:
-- server/migrations/20251223_add_vendor_password_otps_table.sql
-- Paste and execute in PostgreSQL
```

### Step 3: Update schema/schema.ts
- ✅ Already done
- No action needed

### Step 4: Update server/storage.ts
1. Open `server/storage.ts`
2. Find line ~3 (imports section)
3. Add: `vendorPasswordOtps,` to imports
4. Find createVendorPasswordOTP() ~line 1918
5. Replace with new code from `CODE_CHANGES_storage.ts.md`
6. Do same for findValidOTPByEmail() and markOtpUsed()

### Step 5: Update server/routes.ts
1. Open `server/routes.ts`
2. Find POST `/api/vendors/request-reset-otp` ~line 524
3. Replace entire endpoint with code from `CODE_CHANGES_routes.ts.md`

### Step 6: Update frontend (InvoiceGeneration.tsx)
- ✅ Already done
- No action needed

### Step 7: Restart Services
```bash
# Stop current server
# Rebuild TypeScript (if needed)
npm run build
# Restart server
npm start
```

### Step 8: Test Everything
```bash
# Test OTP endpoint
curl -X POST http://localhost:7000/api/vendors/request-reset-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Expected: 200 or 404 (not 500)
```

---

## ✅ Verification Checklist

### Database
- [ ] Migration executed without errors
- [ ] `vendor_password_otps` table exists
- [ ] `invoices` table has `po_ids` column
- [ ] Indexes created successfully

### Backend
- [ ] `vendorPasswordOtps` imported in storage.ts
- [ ] createVendorPasswordOTP() uses new code
- [ ] findValidOTPByEmail() uses new code
- [ ] markOtpUsed() uses new code
- [ ] POST /api/vendors/request-reset-otp updated
- [ ] Server restarts without errors

### Frontend
- [ ] InvoiceGeneration.tsx has groupByVendor state
- [ ] Checkbox toggle visible in UI
- [ ] Single invoice mode works (toggle OFF)
- [ ] Grouped invoice mode works (toggle ON)
- [ ] PDF generation works for both modes

### Testing
- [ ] OTP request with valid email → 200 OK
- [ ] OTP request with invalid email → 404
- [ ] Invoice generation (single) → Works
- [ ] Invoice generation (grouped) → Works
- [ ] PDF download → Works
- [ ] PDF print → Works

---

## 📁 Reference Documents

### Implementation Details
- `CHANGES_SUMMARY.md` - Comprehensive overview of all changes
- `CODE_CHANGES_storage.ts.md` - Storage layer code
- `CODE_CHANGES_schema.ts.md` - Schema changes
- `CODE_CHANGES_routes.ts.md` - API routes code
- `CODE_CHANGES_InvoiceGeneration.tsx.md` - Frontend code

### Database
- `server/migrations/20251223_add_vendor_password_otps_table.sql` - OTP table migration
- `server/migrations/20251223_add_po_ids_to_invoices.sql` - Invoice poIds migration

---

## 🔧 Troubleshooting

### Problem: 500 error from OTP endpoint
**Solution**: Check server logs
```bash
tail -f server.log | grep "OTP Request Error"
# Check /tmp/email_errors.log
cat /tmp/email_errors.log
```

### Problem: vendor_password_otps table not found
**Solution**:
- [ ] Run the SQL migration
- [ ] Verify table exists: `\dt vendor_password_otps` in psql

### Problem: TypeScript errors with vendorPasswordOtps
**Solution**:
- [ ] Verify schema.ts has vendorPasswordOtps definition
- [ ] Verify storage.ts imports vendorPasswordOtps
- [ ] Run `npm run build` to check for errors

### Problem: Invoice PDF not showing all POs
**Solution**:
- [ ] Verify groupByVendor toggle is enabled
- [ ] Check browser console for errors
- [ ] Verify poIds are being sent to API

### Problem: SMTP not configured, OTP not sent
**Solution**:
- This is expected behavior - OTP still stored in database
- Check `/tmp/email_errors.log` for email error details
- Configure SMTP in Admin Email Settings to send emails

---

## 📊 Features Enabled

### ✅ OTP-Based Password Reset
- Request OTP → Get 6-digit code
- Validate OTP → Confirm ownership
- Reset password → Set new password securely

### ✅ Multiple PO Invoice Support
- **Default**: One invoice per PO
- **Optional**: One consolidated invoice per vendor
- **PDF**: Shows all PO numbers with count
- **Totals**: Automatically combined amounts

---

## 🎯 Success Criteria

You'll know everything is working when:

1. ✅ OTP endpoint returns 200 for valid email
2. ✅ OTP endpoint returns 404 for invalid email
3. ✅ Vendor can request OTP from forgot password page
4. ✅ Vendor can validate OTP code
5. ✅ Vendor can reset password using OTP
6. ✅ Single invoice generation works (default)
7. ✅ Grouped invoice generation works (toggle ON)
8. ✅ PDF shows single PO number (single mode)
9. ✅ PDF shows multiple PO numbers (grouped mode)
10. ✅ No 500 errors in server logs

---

## 📞 Support

If you encounter issues:

1. Check the detailed logs:
   - Server console output
   - `/tmp/email_errors.log`
   - Browser DevTools Network tab

2. Review the detailed change files:
   - See what was changed and why
   - Copy exact code snippets

3. Run migrations in correct order:
   - Database first
   - Then restart server
   - Then test

---

## 🎉 You're All Set!

Once you complete all steps and pass the verification checklist, your system will have:

✅ Secure OTP-based password reset for vendors
✅ Flexible invoice generation (single or grouped POs)
✅ Professional PDF generation for both modes
✅ Complete audit logging for security

Happy coding! 🚀
