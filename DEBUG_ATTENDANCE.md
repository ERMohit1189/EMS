# Debug Guide: Attendance Not Saving

## Quick Check

### 1. Verify Migration Ran
```bash
node run-migration.cjs
```

Should show:
```
✓ Constraint verified: { constraint_name: 'unique_employee_month_year', ... }
```

### 2. Restart Server
**IMPORTANT:** Must restart server after migration!
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 3. Test & Check Logs

**Browser Console (F12 → Console):**
```javascript
// When you click Submit, you should see:
[BulkAttendance] Employee <id>: 30 days marked {1: {status: 'present'}, ...}
[BulkAttendance] Submitting data: {employeeCount: 3, firstEmployee: '...', ...}
```

**Server Console (Terminal):**
```
[Bulk Attendance] Employee <id>: { hasEmpSpecific: true, dataKeys: [...], firstDayValue: {...} }
[Bulk Attendance] Upserting 3 records
[Bulk Attendance] ✓ Bulk upsert completed, 3 records affected
```

## If Records Not Saving

### Scenario 1: No Server Logs
**Problem:** Server console shows nothing when you click Submit

**Check:**
1. Open Network tab in browser DevTools
2. Click Submit
3. Find `/api/attendance/bulk` request
4. Check if it's reaching the server (200 OK or error?)

**Solutions:**
- If 404: Server not running or wrong API URL
- If 401/403: Authentication issue
- If no request: Frontend error (check browser console)

### Scenario 2: Server Logs Show Error
**Problem:** Server console shows:
```
[Bulk Attendance] Bulk upsert failed: ...
[Bulk Attendance] Falling back to individual operations...
```

**Solutions:**
- Check the full error message
- Verify constraint exists (run `node run-migration.cjs`)
- Restart server

### Scenario 3: Success Message But No Data
**Problem:** Server says success but reload shows empty

**Debug Steps:**

1. **Check what's being saved:**
```javascript
// In browser console after clicking Submit:
console.log(attendanceData);
```

2. **Query database directly:**
```javascript
// Create query-db.cjs:
const { Client } = require('pg');

async function query() {
  const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_6Q3eRmWfkFds@ep-rough-rain-ahrvhny5-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
  });

  await client.connect();

  // Replace with actual employee ID
  const result = await client.query(`
    SELECT * FROM attendances
    WHERE employee_id = 'YOUR_EMPLOYEE_ID'
    AND month = 12 AND year = 2025
  `);

  console.log('Database record:', result.rows);

  if (result.rows.length > 0) {
    console.log('Attendance data:', JSON.parse(result.rows[0].attendance_data));
  }

  await client.end();
}

query();
```

Run:
```bash
node query-db.cjs
```

### Scenario 4: First Employee Empty, Others OK
**Problem:** Only first employee has no data

**This was the original bug!**

**Check:**
1. Browser console should show ALL employees:
```
[BulkAttendance] Employee emp1: 30 days marked {...}
[BulkAttendance] Employee emp2: 30 days marked {...}
[BulkAttendance] Employee emp3: 30 days marked {...}
```

2. Server console should show ALL employees:
```
[Bulk Attendance] Employee emp1: { hasEmpSpecific: true, ... }
[Bulk Attendance] Employee emp2: { hasEmpSpecific: true, ... }
[Bulk Attendance] Employee emp3: { hasEmpSpecific: true, ... }
```

**If first employee shows 0 days or missing:**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check `attendanceByEmployee` state in React DevTools

## Common Mistakes

### ❌ Migration Not Run
```bash
# Run this!
node run-migration.cjs
```

### ❌ Server Not Restarted
After migration, MUST restart server:
```bash
Ctrl+C
npm run dev
```

### ❌ Wrong Employee ID
Check that employee IDs match:
```javascript
// Frontend sends:
employeeIds: ['emp1', 'emp2', 'emp3']

// Backend should show:
[Bulk Attendance] Employee emp1: ...
[Bulk Attendance] Employee emp2: ...
[Bulk Attendance] Employee emp3: ...
```

### ❌ Empty Attendance Data
If you see:
```
[BulkAttendance] Employee emp1: 0 days marked {}
```

This means:
- No days were marked for that employee
- OR `attendanceByEmployee[emp1]` is empty
- Check React state in DevTools

## Step-by-Step Debugging

1. **Mark attendance for 3 employees**
   - Select team
   - Select 3 employees
   - Click "Mark All Present"

2. **Open browser console (F12)**
   - Should see employee data logged

3. **Click Submit**

4. **Check browser console:**
   ```
   [BulkAttendance] Submitting data: ...
   ```

5. **Check server console:**
   ```
   [Bulk Attendance] Employee ...: ...
   [Bulk Attendance] Upserting 3 records
   [Bulk Attendance] ✓ Bulk upsert completed, 3 records affected
   ```

6. **Wait for success toast**

7. **Reload page**

8. **Select same team and employees**

9. **Verify:**
   - Grid shows attendance data
   - ALL employees including first have data

## If Still Not Working

Create a detailed bug report:

1. **Browser Console Output:**
   ```
   (copy ALL logs)
   ```

2. **Server Console Output:**
   ```
   (copy ALL logs)
   ```

3. **Network Request:**
   - Go to Network tab
   - Find `/api/attendance/bulk`
   - Copy Request Payload
   - Copy Response

4. **Database State:**
   ```bash
   node query-db.cjs
   ```

5. **Migration Status:**
   ```bash
   node run-migration.cjs
   ```

Share all above information for help.
