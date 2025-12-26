using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class AttendanceService : IAttendanceService
    {
        private readonly AppDbContext _context;

        public AttendanceService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Attendance?> GetAttendanceByIdAsync(string id)
        {
            return await _context.Attendances
                .Include(a => a.Employee)
                .FirstOrDefaultAsync(a => a.Id == id);
        }

        public async Task<Attendance?> GetAttendanceByEmployeeMonthAsync(string employeeId, int month, int year)
        {
            return await _context.Attendances
                .Include(a => a.Employee)
                .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Month == month && a.Year == year);
        }

        public async Task<List<Attendance>> GetAllAttendanceAsync()
        {
            return await _context.Attendances
                .Include(a => a.Employee)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        public async Task<Attendance> CreateAttendanceAsync(Attendance attendance)
        {
            attendance.Id = Guid.NewGuid().ToString();
            attendance.CreatedAt = DateTime.UtcNow;
            attendance.UpdatedAt = DateTime.UtcNow;

            _context.Attendances.Add(attendance);
            await _context.SaveChangesAsync();
            return attendance;
        }

        public async Task<Attendance?> UpdateAttendanceAsync(string id, Attendance attendance)
        {
            var existing = await _context.Attendances.FindAsync(id);
            if (existing == null) return null;

            existing.AttendanceData = attendance.AttendanceData;
            existing.Submitted = attendance.Submitted;
            existing.SubmittedAt = attendance.SubmittedAt;
            existing.UpdatedAt = DateTime.UtcNow;

            _context.Attendances.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<(Attendance attendance, List<string> skippedDays)> UpsertAttendanceAsync(string employeeId, int month, int year, Dictionary<string, object> attendanceData, string? performedBy = null)
        {
            // Check salary generation table existence and prevent modification if present
            try
            {
                var salaryExists = await _context.Database.ExecuteSqlRawAsync("SELECT 1 FROM generate_salary WHERE employeeId = {0} AND month = {1} AND year = {2}", employeeId, month, year);
                if (salaryExists > 0)
                {
                    throw new InvalidOperationException("Attendance cannot be modified after salary is saved for this month.");
                }
            }
            catch
            {
                // If table doesn't exist or query fails, ignore and proceed (best-effort parity)
            }

            var existing = await _context.Attendances.FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Month == month && a.Year == year);

            if (existing != null && existing.Locked)
            {
                throw new InvalidOperationException("Attendance is locked and cannot be modified. Please contact admin.");
            }

            var skippedDays = new List<string>();

            if (existing != null && !string.IsNullOrEmpty(existing.AttendanceData))
            {
                Dictionary<string, object> existingData;
                try
                {
                    existingData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(existing.AttendanceData) ?? new Dictionary<string, object>();
                }
                catch
                {
                    existingData = new Dictionary<string, object>();
                }

                var merged = new Dictionary<string, object>(existingData);
                foreach (var kv in attendanceData)
                {
                    if (existingData.TryGetValue(kv.Key, out var d))
                    {
                        try
                        {
                            var dJson = System.Text.Json.JsonSerializer.Serialize(d);
                            var newJson = System.Text.Json.JsonSerializer.Serialize(kv.Value);
                            if (!string.IsNullOrEmpty(dJson))
                            {
                                var dObj = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(dJson) ?? new Dictionary<string, object>();
                                if (dObj.ContainsKey("immutable") && (dObj["immutable"]?.ToString() == "True" || dObj["immutable"]?.ToString() == "true"))
                                {
                                    if (dJson != newJson)
                                    {
                                        skippedDays.Add(kv.Key);
                                        continue;
                                    }
                                }
                            }
                        }
                        catch { }
                    }

                    merged[kv.Key] = kv.Value;
                }

                existing.AttendanceData = System.Text.Json.JsonSerializer.Serialize(merged);
                existing.UpdatedAt = DateTime.UtcNow;
                _context.Attendances.Update(existing);
                await _context.SaveChangesAsync();
                return (existing, skippedDays);
            }
            else
            {
                var created = new Attendance {
                    Id = Guid.NewGuid().ToString(),
                    EmployeeId = employeeId,
                    Month = month,
                    Year = year,
                    AttendanceData = System.Text.Json.JsonSerializer.Serialize(attendanceData),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Attendances.Add(created);
                await _context.SaveChangesAsync();
                return (created, skippedDays);
            }
        }

        public async Task<DTOs.BulkAttendanceResult> BulkUpsertAttendanceAsync(List<string> employeeIds, int month, int year, Dictionary<string, object> attendanceData, string? mode = null, int? day = null, bool lockAfterSave = false, string? performedBy = null)
        {
            var result = new DTOs.BulkAttendanceResult { Total = employeeIds?.Count ?? 0 };

            if (employeeIds == null || employeeIds.Count == 0)
            {
                return result;
            }

            // Attempt to detect salary generated employees (best-effort raw SQL). If the table doesn't exist, ignore.
            var salaryEmployees = new HashSet<string>();
            try
            {
                // Build parametrized IN list and use raw ADO.NET to query
                var inParamNames = new List<string>();
                var cmd = _context.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = "SELECT employeeId FROM generate_salary WHERE month = @p0 AND year = @p1 AND employeeId IN (";
                var p0 = cmd.CreateParameter(); p0.ParameterName = "@p0"; p0.Value = month; cmd.Parameters.Add(p0);
                var p1 = cmd.CreateParameter(); p1.ParameterName = "@p1"; p1.Value = year; cmd.Parameters.Add(p1);

                for (int i = 0; i < employeeIds.Count; i++)
                {
                    var pname = "@p" + (i + 2);
                    inParamNames.Add(pname);
                    var p = cmd.CreateParameter(); p.ParameterName = pname; p.Value = employeeIds[i]; cmd.Parameters.Add(p);
                }

                cmd.CommandText += string.Join(",", inParamNames) + ")";

                await _context.Database.OpenConnectionAsync();
                using (var reader = await cmd.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        try
                        {
                            var eid = reader.GetString(0);
                            if (!string.IsNullOrEmpty(eid)) salaryEmployees.Add(eid);
                        }
                        catch { }
                    }
                }
                await _context.Database.CloseConnectionAsync();
            }
            catch
            {
                // best-effort - ignore and continue without salary checks
            }

            // Load existing attendance records for the target employees/month/year
            var existingRecords = await _context.Attendances
                .Where(a => employeeIds.Contains(a.EmployeeId) && a.Month == month && a.Year == year)
                .ToListAsync();

            var existingMap = existingRecords.ToDictionary(r => r.EmployeeId, r => r);
            var additionalLocked = existingRecords.Where(r => r.Locked).Select(r => r.EmployeeId).ToHashSet();

            var allLocked = new HashSet<string>(salaryEmployees.Concat(additionalLocked));

            var validEmployeeIds = employeeIds.Where(id => !allLocked.Contains(id)).ToList();

            if (!validEmployeeIds.Any())
            {
                // Everything is locked/has salary
                foreach (var lockedId in allLocked)
                {
                    result.Failed.Add(new DTOs.BulkAttendanceFailed { EmployeeId = lockedId, Error = salaryEmployees.Contains(lockedId) ? "Attendance cannot be modified after salary is saved" : "Attendance is locked" });
                }
                return result;
            }

            var recordsToUpsert = new List<(string employeeId, string attendanceJson)>();

            var fullySkipped = new List<string>();

            foreach (var empId in validEmployeeIds)
            {
                // Determine per-employee attendance payload
                object empSpecific = null;
                if (attendanceData.TryGetValue(empId, out var val)) empSpecific = val;

                bool attendanceDataIsTemplate = attendanceData.Keys.Any(k => int.TryParse(k, out _));

                Dictionary<string, object> finalData = null!;

                if (mode == "day" && day.HasValue)
                {
                    // Day mode: merge existing data and set only that day
                    var existing = existingMap.ContainsKey(empId) ? existingMap[empId] : null;
                    Dictionary<string, object> existingData = new Dictionary<string, object>();
                    if (existing != null && !string.IsNullOrEmpty(existing.AttendanceData))
                    {
                        try { existingData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(existing.AttendanceData) ?? new Dictionary<string, object>(); } catch { existingData = new Dictionary<string, object>(); }
                    }

                    object dayValue = null;
                    if (empSpecific is Dictionary<string, object> empDict && empDict.TryGetValue(day.Value.ToString(), out var dv)) dayValue = dv;
                    else if (empSpecific is IDictionary<string, object> empDict2 && empDict2.TryGetValue(day.Value.ToString(), out var dv2)) dayValue = dv2;
                    else if (attendanceDataIsTemplate && attendanceData.TryGetValue(day.Value.ToString(), out var dv3)) dayValue = dv3;

                    var merged = new Dictionary<string, object>(existingData);
                    if (dayValue != null) merged[day.Value.ToString()] = dayValue;

                    finalData = merged;
                }
                else
                {
                    if (empSpecific != null)
                    {
                        try
                        {
                            var json = System.Text.Json.JsonSerializer.Serialize(empSpecific);
                            finalData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new Dictionary<string, object>();
                        }
                        catch { finalData = new Dictionary<string, object>(); }
                    }
                    else if (attendanceDataIsTemplate)
                    {
                        // Use attendanceData as template for all
                        var json = System.Text.Json.JsonSerializer.Serialize(attendanceData);
                        finalData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new Dictionary<string, object>();
                    }
                    else
                    {
                        finalData = new Dictionary<string, object>();
                    }
                }

                // Parse existing to check for immutable days and skip if necessary
                var existingRec = existingMap.ContainsKey(empId) ? existingMap[empId] : null;
                var skippedForEmployee = new List<string>();
                if (existingRec != null && !string.IsNullOrEmpty(existingRec.AttendanceData))
                {
                    try
                    {
                        var existingData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(existingRec.AttendanceData) ?? new Dictionary<string, object>();
                        foreach (var key in finalData.Keys.ToList())
                        {
                            if (existingData.TryGetValue(key, out var d))
                            {
                                try
                                {
                                    var dJson = System.Text.Json.JsonSerializer.Serialize(d);
                                    var newJson = System.Text.Json.JsonSerializer.Serialize(finalData[key]);
                                    var dObj = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(dJson) ?? new Dictionary<string, object>();
                                    if (dObj.ContainsKey("immutable") && (dObj["immutable"]?.ToString() == "True" || dObj["immutable"]?.ToString() == "true"))
                                    {
                                        if (dJson != newJson)
                                        {
                                            skippedForEmployee.Add(key);
                                            finalData.Remove(key);
                                        }
                                    }
                                }
                                catch { }
                            }
                        }
                    }
                    catch { }
                }

                if (skippedForEmployee.Any()) result.Skipped[empId] = skippedForEmployee;

                if (finalData == null || finalData.Count == 0)
                {
                    fullySkipped.Add(empId);
                    continue;
                }

                var jsonFinal = System.Text.Json.JsonSerializer.Serialize(finalData);
                recordsToUpsert.Add((empId, jsonFinal));
            }

            // Perform upsert via EF: update existing ones and add new ones
            var successList = new List<string>();

            foreach (var rec in recordsToUpsert)
            {
                try
                {
                    if (existingMap.TryGetValue(rec.employeeId, out var existing))
                    {
                        existing.AttendanceData = rec.attendanceJson;
                        existing.UpdatedAt = DateTime.UtcNow;
                        _context.Attendances.Update(existing);
                    }
                    else
                    {
                        var created = new Attendance
                        {
                            Id = Guid.NewGuid().ToString(),
                            EmployeeId = rec.employeeId,
                            Month = month,
                            Year = year,
                            AttendanceData = rec.attendanceJson,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.Attendances.Add(created);
                    }
                    successList.Add(rec.employeeId);
                }
                catch (Exception ex)
                {
                    result.Failed.Add(new DTOs.BulkAttendanceFailed { EmployeeId = rec.employeeId, Error = ex.Message });
                }
            }

            await _context.SaveChangesAsync();

            // Lock after save if requested
            int lockedCount = 0;
            if (lockAfterSave && successList.Count > 0)
            {
                var toLock = _context.Attendances.Where(a => successList.Contains(a.EmployeeId) && a.Month == month && a.Year == year).ToList();
                foreach (var r in toLock)
                {
                    r.Locked = true;
                    r.LockedAt = DateTime.UtcNow;
                    r.LockedBy = performedBy;
                    r.UpdatedAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync();
                lockedCount = toLock.Count;
            }

            // Prepare result
            result.Success = successList;
            result.LockedCount = lockedCount;

            // Add failed entries for locked/salary employees
            foreach (var lockedId in allLocked)
            {
                result.Failed.Add(new DTOs.BulkAttendanceFailed { EmployeeId = lockedId, Error = salaryEmployees.Contains(lockedId) ? "Attendance cannot be modified after salary is saved" : "Attendance is locked" });
            }

            // fully skipped employees go to failed with message
            foreach (var fs in fullySkipped)
            {
                result.Failed.Add(new DTOs.BulkAttendanceFailed { EmployeeId = fs, Error = "All selected days are locked and were skipped" });
            }

            return result;
        }

        public async Task<bool> DeleteAttendanceAsync(string id)
        {
            var attendance = await _context.Attendances.FindAsync(id);
            if (attendance == null) return false;

            _context.Attendances.Remove(attendance);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> LockAttendanceAsync(string id)
        {
            var attendance = await _context.Attendances.FindAsync(id);
            if (attendance == null) return false;

            attendance.Locked = true;
            attendance.LockedAt = DateTime.UtcNow;
            attendance.UpdatedAt = DateTime.UtcNow;

            _context.Attendances.Update(attendance);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> LockAttendanceByIdAsync(string id)
        {
            return await LockAttendanceAsync(id);
        }

        public async Task<int> LockAttendanceMonthAsync(int month, int year, bool lockAll = false, string? performedBy = null)
        {
            if (!lockAll)
            {
                // No-op for single-employee lock (not implemented)
                return 0;
            }

            var records = await _context.Attendances.Where(a => a.Month == month && a.Year == year).ToListAsync();
            foreach (var r in records)
            {
                r.Locked = true;
                r.LockedAt = DateTime.UtcNow;
                r.LockedBy = performedBy;
                r.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return records.Count;
        }

        public async Task<int> UnlockAttendanceMonthAsync(int month, int year, bool unlockAll = false, string? employeeId = null)
        {
            if (unlockAll)
            {
                var records = await _context.Attendances.Where(a => a.Month == month && a.Year == year && a.Locked).ToListAsync();
                foreach (var r in records)
                {
                    r.Locked = false;
                    r.LockedAt = null;
                    r.LockedBy = null;
                    r.UpdatedAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync();
                return records.Count;
            }
            else if (!string.IsNullOrEmpty(employeeId))
            {
                var records = await _context.Attendances.Where(a => a.Month == month && a.Year == year && a.EmployeeId == employeeId && a.Locked).ToListAsync();
                foreach (var r in records)
                {
                    r.Locked = false;
                    r.LockedAt = null;
                    r.LockedBy = null;
                    r.UpdatedAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync();
                return records.Count;
            }

            throw new ArgumentException("Specify unlockAll=true or provide employeeId to unlock");
        }
        public async Task<(bool locked, int count)> GetLockStatusAsync(int month, int year)
        {
            var count = await _context.Attendances.CountAsync(a => a.Month == month && a.Year == year && a.Locked);
            return (count > 0, count);
        }

    }
}
