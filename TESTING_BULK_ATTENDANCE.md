# Testing Bulk Attendance Fixes

## Prerequisites

1. **Run Migration First:**
   ```bash
   # On Windows
   run-migration.bat

   # On Mac/Linux
   psql "postgresql://neondb_owner:npg_6Q3eRmWfkFds@ep-rough-rain-ahrvhny5-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require" -f add_attendance_unique_constraint.sql
   ```

2. **Restart the server** after migration

## Test Cases

### Test 1: First Employee Attendance Saving

**Steps:**
1. Go to Bulk Attendance Marking page
2. Select a team with at least 3 employees
3. Select all employees (or first 3)
4. Click "Mark All Present" for the current month
5. Click "Submit" button
6. **Check browser console** for logs:
   ```
   [BulkAttendance] Employee <id>: X days marked
   [BulkAttendance] Submitting data: ...
   ```
7. **Check server console** for logs:
   ```
   [Bulk Attendance] Employee <id>: { hasEmpSpecific: true, dataKeys: [...], firstDayValue: ... }
   [Bulk Attendance] Upserting X records
   ```
8. Wait for success message
9. Reload the page
10. Select the same team and employees
11. **Verify:** All employees including the FIRST one should show attendance data

**Expected Result:**
- ✅ First employee's attendance is saved
- ✅ All selected employees show attendance after reload
- ✅ Console shows proper data being sent

**Common Issue:**
- ❌ First employee shows empty attendance after reload
- ❌ Console shows empty data for first employee

---

### Test 2: Leave Type Selection

**Steps:**
1. Mark attendance for an employee
2. Click on a day to cycle through: Present → First Half → Second Half → Absent → Leave
3. When "Leave" is triggered, a dialog should appear
4. **Verify the leave dialog shows:**
   - Leave code (e.g., "CL", "SL", "PL")
   - Leave name (e.g., "Casual Leave")
   - Allocated count
   - Used count
   - Remaining count (in green if >0, red if 0)
   - "Unlimited" text for 999 allocation
   - Disabled state for leaves with 0 remaining

**Expected Result:**
- ✅ Leave dialog matches MonthlyAttendance exactly
- ✅ Shows "Allocated: X | Used: Y | Remaining: Z"
- ✅ Leaves with 0 remaining are disabled
- ✅ Selecting a leave code marks the day correctly
- ✅ Leave code (e.g., "CL") appears in the cell

---

### Test 3: Day Mode vs Month Mode

**Day Mode:**
1. Select "Single Day" mode
2. Select a specific day (e.g., day 15)
3. Mark attendance for multiple employees on that day
4. Click Submit
5. Reload and verify only that day is saved

**Month Mode:**
1. Select "Whole Month" mode
2. Mark attendance for the entire month
3. Click Submit
4. Reload and verify all days are saved

**Expected Result:**
- ✅ Day mode saves only selected day
- ✅ Month mode saves all marked days
- ✅ Both modes work for all employees including first

---

### Test 4: Error Handling

**Test 4a: Locked Attendance**
1. Lock attendance for one employee (use Monthly Attendance page)
2. Try to submit bulk attendance including that employee
3. **Verify:** Partial success message shows

**Test 4b: Salary Generated**
1. Generate salary for one employee
2. Try to submit bulk attendance including that employee
3. **Verify:** Error message shows for that employee

---

### Test 5: Multiple Employees

**Steps:**
1. Select 10+ employees
2. Mark different attendance patterns:
   - Employee 1: All present
   - Employee 2: Mix of present/absent/leave
   - Employee 3: First half/second half
3. Submit
4. Reload
5. **Verify:** ALL employees show correct data

**Console Debugging:**

**Frontend Console Should Show:**
```
[BulkAttendance] Employee emp1: 30 days marked {1: {status: 'present'}, 2: {status: 'present'}, ...}
[BulkAttendance] Employee emp2: 28 days marked {1: {status: 'present'}, 2: {status: 'absent'}, ...}
[BulkAttendance] Submitting data: {employeeCount: 10, firstEmployee: 'emp1', ...}
```

**Backend Console Should Show:**
```
[Bulk Attendance] Employee emp1: { hasEmpSpecific: true, dataKeys: ['1','2',...], firstDayValue: {status: 'present'} }
[Bulk Attendance] Upserting 10 records
```

**If Unique Constraint Missing:**
```
[Bulk Attendance] Bulk upsert failed, falling back to individual operations: ...
```

---

## Debugging Steps

### If First Employee Not Saving:

1. **Check Frontend Console:**
   ```javascript
   // Should see this for EVERY employee including first:
   [BulkAttendance] Employee <id>: X days marked
   ```

2. **Check Network Tab:**
   - Open DevTools → Network
   - Submit attendance
   - Find `/api/attendance/bulk` request
   - Check Request Payload
   - Verify first employee has data in `attendanceData` object

3. **Check Server Console:**
   ```
   [Bulk Attendance] Employee <id>: { hasEmpSpecific: true, ... }
   ```

4. **Check Database:**
   ```sql
   SELECT * FROM attendances
   WHERE employee_id = '<first-employee-id>'
   AND month = <month>
   AND year = <year>;
   ```

### If Leave Dialog Wrong:

1. Check that you're NOT using the old Tooltip-based dialog
2. Verify leave allotments exist:
   ```sql
   SELECT * FROM leave_allotments
   WHERE employee_id = '<employee-id>'
   AND year = <year>;
   ```

---

## Success Criteria

All tests pass when:
- ✅ First employee attendance saves correctly
- ✅ All employees save in single click
- ✅ Leave dialog shows proper allocation details
- ✅ Console logs show data for all employees
- ✅ Both day and month modes work
- ✅ Error handling works for locked/salary-generated employees
- ✅ Data persists after page reload

## If Tests Fail

1. **Migration not run:** Run `run-migration.bat` first
2. **Server not restarted:** Restart the server
3. **Cache issue:** Hard refresh browser (Ctrl+Shift+R)
4. **Check console logs:** Both frontend and backend for errors
5. **Verify data format:** Check network request payload structure
