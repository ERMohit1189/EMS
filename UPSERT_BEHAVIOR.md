# Site Upsert Behavior - Complete Guide

## What is Upsert?
**Upsert** = **Update** if record exists, otherwise **Insert** new record

## How Site Upsert Works

### Step 1: Check by `planId` (Primary Lookup Key)
```
Is there a site with planId = "QAII77777777772"?
├─ YES → Go to UPDATE flow
└─ NO  → Go to INSERT flow
```

### Step 2A: UPDATE Flow (Site Already Exists)
```
UPDATE site WHERE planId = "QAII77777777772"
- Keep existing siteId (don't change it)
- Keep existing id (UUID)
- Update all other fields to new values
- Update timestamp: updated_at = NOW()
```

**Example:**
```
Before: siteId="Beta410", planId="QAII77777777772", vendorId="old-id"
After:  siteId="Beta410", planId="QAII77777777772", vendorId="new-id" ✅ UPDATED
```

### Step 2B: INSERT Flow (New Site)
```
First, check if siteId conflicts:
├─ siteId exists in DB?
│  ├─ YES → Generate unique siteId (add random suffix)
│  └─ NO  → Use provided siteId
└─ INSERT new site with generated/provided siteId
```

**Example 1 - No conflict:**
```
Input:  siteId="NewSite123", planId="NEW123"
Output: Inserted with siteId="NewSite123" ✅
```

**Example 2 - Conflict detected:**
```
Input:  siteId="Beta410", planId="NEW456"
        (But "Beta410" already exists in DB)
Output: Inserted with siteId="Beta410-abc123def" ✅ (Auto-suffixed)
```

## Practical Scenarios

### Scenario 1: Import Same File Twice

**File Content:**
| PARTNER CODE | PLAN ID | SITE ID |
|---|---|---|
| VENDOR1 | QAII77777777772 | Beta410 |

**First Import:**
- planId check: Not found
- siteId check: Not found
- Action: **INSERT** with siteId="Beta410"
- Result: ✅ Success

**Second Import (Same file):**
- planId check: **FOUND** (from first import)
- Action: **UPDATE** existing site
- Keep: siteId="Beta410" (unchanged)
- Result: ✅ Success (not a duplicate error!)

### Scenario 2: Import Different Rows with Same siteId

**File Content:**
| PARTNER CODE | PLAN ID | SITE ID |
|---|---|---|
| VENDOR1 | PLAN1 | Beta410 |
| VENDOR2 | PLAN2 | Beta410 |

**First Row Import:**
- planId "PLAN1" check: Not found
- siteId "Beta410" check: Not found
- Action: **INSERT** with siteId="Beta410"
- Result: ✅ Success

**Second Row Import:**
- planId "PLAN2" check: Not found (different planId)
- siteId "Beta410" check: **FOUND** (from first row)
- Action: **INSERT** with auto-generated siteId="Beta410-xyz789abc"
- Result: ✅ Success (auto-handled!)

### Scenario 3: Update Existing Site

**Initial Data in Database:**
```
siteId: "Beta410"
planId: "QAII77777777772"
vendorId: "old-vendor-id"
partnerName: "OldName"
```

**Import New Data with Same planId:**
| PARTNER CODE | PLAN ID | SITE ID |
|---|---|---|
| NEWVENDOR | QAII77777777772 | Beta410 |

**Import Process:**
- planId check: **FOUND**
- Action: **UPDATE** site
- Keep: siteId="Beta410", planId="QAII77777777772"
- Update: vendorId="new-vendor-id", partnerName="NewName"
- Result: ✅ Success

**After Update:**
```
siteId: "Beta410" (UNCHANGED)
planId: "QAII77777777772" (UNCHANGED)
vendorId: "new-vendor-id" (UPDATED)
partnerName: "NewName" (UPDATED)
updated_at: NOW() (UPDATED)
```

## Error Cases

### Error: "Duplicate key value violates unique constraint"

**Cause:** Trying to INSERT a site with:
- Same `siteId` as existing site, AND
- DIFFERENT `planId` (so it's not an update)

**Why it happens:**
1. User provides new `planId` (different from existing record)
2. System doesn't find record by `planId` (not found!)
3. System tries to INSERT with provided `siteId`
4. But `siteId` already exists from previous import
5. **Unique constraint violation!**

**Solution:** This should NOT happen with current code because we:
- Check if `siteId` exists before inserting
- Auto-generate unique `siteId` if conflict found

**If you still get this error:**
- Server logs will show: `[Storage] siteId conflict detected for "Beta410", generated new unique siteId: Beta410-xyz123`
- Check server console for this message
- If you DON'T see it, the conflict detection might not be working

## Database Schema

### Unique Constraints
> **Note:** The `site_id` column has been removed; the table primary key `id` is the canonical site identifier now.

```sql
-- plan_id is NOT unique (can have multiple sites per plan)
-- plan_id is just a VARCHAR, no unique constraint
```

### Why siteId is unique but planId isn't:
- `siteId`: Physical site identifier, should be globally unique
- `planId`: Project plan reference, can have multiple sites per plan

## Server Logs

### Successful UPDATE:
```
[Storage] Updating site planId: QAII77777777772 (keeping existing siteId: Beta410)
```

### Successful INSERT:
```
[Storage] Inserting new site planId: PLAN2, siteId: Beta410-xyz123
```

### siteId Conflict Detected:
```
[Storage] siteId conflict detected for "Beta410" (planId: PLAN2), generated new unique siteId: Beta410-xyz123def
```

## Recommendations for Testing

### Test 1: Update Existing Record
```
1. Import file with planId="QAII77777777772", siteId="Beta410"
2. Import same file again
3. Expected: Both succeed, second one updates first
4. Check logs: Should see "Updating site" message
```

### Test 2: Insert New Records
```
1. Import file with 5 different siteIds and planIds
2. Expected: All 5 inserted successfully
3. No siteId conflicts
```

### Test 3: Handle Duplicate siteIds
```
1. Create Excel with 2 rows, both siteId="Beta410", different planIds
2. Import together
3. Expected: First inserted as "Beta410", second as "Beta410-xyz123"
4. Check logs for conflict detection message
```

## Changes Made (2025-12-13)

### server/storage.ts
- Enhanced logging for siteId conflict detection
- Shows both original siteId and generated unique siteId
- Added comments explaining the logic

### server/routes.ts
- Enhanced logging to show planId and siteId during upsert
- Logs the actual returned siteId (which might be different if auto-generated)
- Helps track whether records were inserted or updated

## Summary

✅ **Upsert by planId** - Check if `planId` exists
- If found → UPDATE (keep siteId)
- If not found → INSERT (auto-handle siteId conflicts)

✅ **Auto-conflict resolution** - If siteId exists when inserting
- Generate unique siteId with random suffix
- Never fail due to duplicate siteId

✅ **Full logging** - Server logs show exactly what happened
- UPDATE vs INSERT
- Original vs generated siteId
- Conflict detection details
