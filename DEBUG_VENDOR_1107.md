# Debug: Vendor 1107 Not Showing in List

## Problem
Vendor with code 1107 is not appearing in Payment Master / Site List / PO Generation vendor dropdowns.

## Root Causes

### 1. Vendor 1107 Doesn't Exist in Database
**Check**:
```sql
SELECT id, vendor_code, name, status
FROM vendors
WHERE vendor_code = '1107';
```

If no results → vendor doesn't exist in DB

**Solution**: Create the vendor or use correct vendor code

### 2. Vendor Code is Stored Differently
**Check**:
```sql
-- Search for vendors with 1107 in name or code
SELECT id, vendor_code, name, status
FROM vendors
WHERE name ILIKE '%1107%'
   OR vendor_code ILIKE '%1107%'
LIMIT 5;
```

If found → vendor code might have extra spaces, leading zeros, etc.

### 3. Vendor Has Inactive/Null Status
**Check**:
```sql
-- Check vendor 1107 status
SELECT id, vendor_code, name, status,
       CASE
         WHEN status IS NULL THEN 'NULL STATUS'
         WHEN status = '' THEN 'EMPTY STATUS'
         ELSE status
       END as status_check
FROM vendors
WHERE vendor_code = '1107';
```

**Solution**: Update status to 'Active' if needed:
```sql
UPDATE vendors
SET status = 'Active'
WHERE vendor_code = '1107';
```

## How to Check API Response

### Option 1: Browser Console
```javascript
// In browser console, run:
fetch('/api/vendors?pageSize=10000&minimal=true')
  .then(r => r.json())
  .then(data => {
    const v1107 = data.data.find(v => v.vendorCode === '1107');
    console.log('Vendor 1107:', v1107);
    console.log('Total vendors:', data.data.length);
  });
```

If not found → vendor isn't returned by API

### Option 2: Command Line
```bash
curl "http://localhost:7000/api/vendors?pageSize=10000&minimal=true" \
  -H "Cookie: session=your_session" | grep -i 1107
```

Should show vendor 1107 in JSON response

### Option 3: Check Server Logs
Restart server with:
```bash
npm run dev 2>&1 | grep -i "1107\|vendor"
```

Watch for any errors related to vendor 1107

## Complete Debugging Steps

### Step 1: Verify Vendor Exists
```bash
psql -U your_user -d your_database -c "SELECT COUNT(*) FROM vendors WHERE vendor_code = '1107';"
```

Expected: `1` (or more if duplicates)
If `0`: vendor doesn't exist

### Step 2: Check Vendor Details
```bash
psql -U your_user -d your_database -c "SELECT id, vendor_code, name, status FROM vendors WHERE vendor_code = '1107';"
```

Look for:
- ✅ `id` is NOT NULL
- ✅ `vendor_code` is '1107' (no extra spaces)
- ✅ `name` is NOT NULL or empty
- ✅ `status` is 'Active' or not NULL

### Step 3: Check API Returns It
```bash
# In browser console or curl:
curl "http://localhost:7000/api/vendors?pageSize=10000&minimal=true" | jq '.data[] | select(.vendorCode == "1107")'
```

Should return vendor 1107 data

### Step 4: Check Frontend Loads It
In browser DevTools → Network tab:
1. Look for `/api/vendors?pageSize=10000&minimal=true`
2. Click it
3. Click Response tab
4. Search for `"1107"`
5. Should find vendor in response

### Step 5: Check if SmartSearch Filters It
In browser Console:
```javascript
// Check if vendor 1107 is in the loaded list
const input = document.querySelector('input[placeholder*="Vendor"]');
// Type "1107" and see if it appears in dropdown
```

If dropdown appears with 1107 → frontend is working

## Common Issues & Fixes

### Issue: Vendor exists but not showing
**Cause**: Status is 'Inactive', 'Pending', or NULL
**Fix**:
```sql
UPDATE vendors SET status = 'Active' WHERE vendor_code = '1107';
```

### Issue: Vendor code has spaces
**Example**: vendor_code = ' 1107 ' instead of '1107'
**Fix**:
```sql
UPDATE vendors SET vendor_code = TRIM(vendor_code);
```

### Issue: Vendor code is numeric stored as integer
**Example**: vendor_code = 1107 (integer) instead of '1107' (string)
**Check**:
```sql
SELECT data_type FROM information_schema.columns
WHERE table_name = 'vendors' AND column_name = 'vendor_code';
```

Should return `character varying` or `text`, NOT `integer`

### Issue: API limit reached
**Current limit**: pageSize=10000
**If you have > 10000 vendors**:
```javascript
// In PaymentMaster.tsx, increase pageSize:
const response = await fetch(`${getApiBaseUrl()}/api/vendors?pageSize=20000&minimal=true`);
```

## Testing Checklist

- [ ] Verified vendor 1107 exists in database: `SELECT * FROM vendors WHERE vendor_code = '1107'`
- [ ] Checked vendor status is 'Active': `UPDATE vendors SET status = 'Active' WHERE vendor_code = '1107'`
- [ ] Verified API returns vendor 1107: curl or browser console
- [ ] Restarted server after any DB changes: `npm run dev`
- [ ] Checked browser Network tab for API response
- [ ] Typed "1107" in vendor textbox and saw it in dropdown
- [ ] Selected vendor 1107 successfully

## Report Your Finding

Once you've debugged, share:
```
Vendor 1107 Status:
- ✅ Exists in database: Yes/No
- Status: [Active/Inactive/Null]
- Vendor Name: [name]
- API Returns it: Yes/No
- Shows in Dropdown: Yes/No
- Error Message (if any): [error]
```

---

**Next Steps**:
1. Run the SQL queries above
2. Check if vendor 1107 exists
3. Update status if needed
4. Restart server
5. Test in browser
6. Report findings
