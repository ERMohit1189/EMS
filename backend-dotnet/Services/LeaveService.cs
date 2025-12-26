using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class LeaveService : ILeaveService
    {
        private readonly AppDbContext _context;

        public LeaveService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<LeaveRequest?> GetLeaveRequestByIdAsync(string id)
        {
            return await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .FirstOrDefaultAsync(lr => lr.Id == id);
        }

        public async Task<List<LeaveRequest>> GetLeaveRequestsByEmployeeAsync(string employeeId)
        {
            return await _context.LeaveRequests
                .Where(lr => lr.EmployeeId == employeeId)
                .OrderByDescending(lr => lr.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<LeaveRequest>> GetAllLeaveRequestsAsync()
        {
            return await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .OrderByDescending(lr => lr.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<LeaveRequest>> GetLeaveRequestsByStatusAsync(string status)
        {
            return await _context.LeaveRequests
                .Where(lr => lr.Status == status)
                .Include(lr => lr.Employee)
                .OrderByDescending(lr => lr.CreatedAt)
                .ToListAsync();
        }

        public async Task<LeaveRequest> CreateLeaveRequestAsync(LeaveRequest leaveRequest)
        {
            leaveRequest.Id = Guid.NewGuid().ToString();
            leaveRequest.Status = "pending";
            leaveRequest.CreatedAt = DateTime.UtcNow;
            leaveRequest.UpdatedAt = DateTime.UtcNow;

            _context.LeaveRequests.Add(leaveRequest);
            await _context.SaveChangesAsync();
            return leaveRequest;
        }

        public async Task<LeaveRequest?> UpdateLeaveRequestAsync(string id, LeaveRequest leaveRequest)
        {
            var existing = await _context.LeaveRequests.FindAsync(id);
            if (existing == null) return null;

            existing.StartDate = leaveRequest.StartDate;
            existing.EndDate = leaveRequest.EndDate;
            existing.LeaveType = leaveRequest.LeaveType;
            existing.Remark = leaveRequest.Remark;
            existing.Days = leaveRequest.Days;
            existing.UpdatedAt = DateTime.UtcNow;

            _context.LeaveRequests.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> ApproveLeaveRequestAsync(string id, string approverRemark, string approverId)
        {
            var leaveRequest = await _context.LeaveRequests.FindAsync(id);
            if (leaveRequest == null) return false;

            leaveRequest.Status = "approved";
            leaveRequest.ApproverRemark = approverRemark;
            leaveRequest.ApprovedBy = approverId;
            leaveRequest.ApprovedAt = DateTime.UtcNow;
            leaveRequest.UpdatedAt = DateTime.UtcNow;

            _context.LeaveRequests.Update(leaveRequest);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RejectLeaveRequestAsync(string id, string approverRemark, string approverId)
        {
            var leaveRequest = await _context.LeaveRequests.FindAsync(id);
            if (leaveRequest == null) return false;

            leaveRequest.Status = "rejected";
            leaveRequest.ApproverRemark = approverRemark;
            leaveRequest.RejectionReason = approverRemark;
            leaveRequest.ApprovedBy = approverId;
            leaveRequest.ApprovedAt = DateTime.UtcNow;
            leaveRequest.UpdatedAt = DateTime.UtcNow;

            _context.LeaveRequests.Update(leaveRequest);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteLeaveRequestAsync(string id)
        {
            var leaveRequest = await _context.LeaveRequests.FindAsync(id);
            if (leaveRequest == null) return false;

            _context.LeaveRequests.Remove(leaveRequest);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<LeaveAllotment?> GetLeaveAllotmentAsync(string employeeId, int year)
        {
            return await _context.LeaveAllotments
                .Include(la => la.Employee)
                .FirstOrDefaultAsync(la => la.EmployeeId == employeeId && la.Year == year);
        }

        public async Task<List<LeaveAllotment>> GetAllLeaveAllotmentsAsync()
        {
            return await _context.LeaveAllotments
                .Include(la => la.Employee)
                .ToListAsync();
        }

        public async Task<List<object>> GetLeaveAllotmentsForYearAsync(int year)
        {
            // Load allotments and attendances for the year, then compute used leaves
            var allotments = await _context.LeaveAllotments
                .Include(la => la.Employee)
                .Where(la => la.Year == year)
                .ToListAsync();

            var attendances = await _context.Attendances
                .Where(a => a.Year == year)
                .ToListAsync();

            var usedMap = new Dictionary<string, string>
            {
                { "medicalLeave", "ML" },
                { "casualLeave", "CL" },
                { "earnedLeave", "EL" },
                { "sickLeave", "SL" },
                { "personalLeave", "PL" },
                { "unpaidLeave", "UL" },
                { "leaveWithoutPay", "LWP" }
            };

            var usedByEmployee = new Dictionary<string, Dictionary<string, int>>();

            foreach (var a in attendances)
            {
                if (string.IsNullOrEmpty(a.AttendanceData) || string.IsNullOrEmpty(a.EmployeeId)) continue;
                Dictionary<string, dynamic> data;
                try
                {
                    data = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, dynamic>>(a.AttendanceData) ?? new Dictionary<string, dynamic>();
                }
                catch
                {
                    data = new Dictionary<string, dynamic>();
                }

                if (!usedByEmployee.ContainsKey(a.EmployeeId))
                {
                    usedByEmployee[a.EmployeeId] = new Dictionary<string, int> { { "ML",0 },{ "CL",0 },{ "EL",0 },{ "SL",0 },{ "PL",0 },{ "UL",0 },{ "LWP",0 } };
                }

                foreach (var dayData in data.Values)
                {
                    try
                    {
                        string status = dayData?.status ?? null;
                        string leaveType = dayData?.leaveType ?? null;
                        if (status == "leave" && !string.IsNullOrEmpty(leaveType))
                        {
                            if (usedByEmployee[a.EmployeeId].ContainsKey(leaveType))
                                usedByEmployee[a.EmployeeId][leaveType]++;
                        }
                    }
                    catch { }
                }
            }

            var enriched = allotments.Select(la => {
                var used = usedByEmployee.ContainsKey(la.EmployeeId) ? usedByEmployee[la.EmployeeId] : new Dictionary<string,int> { { "ML",0 },{ "CL",0 },{ "EL",0 },{ "SL",0 },{ "PL",0 },{ "UL",0 },{ "LWP",0 } };
                return new {
                    id = la.Id,
                    employeeId = la.EmployeeId,
                    employeeName = la.Employee?.Name,
                    employeeCode = la.Employee?.EmpCode,
                    year = la.Year,
                    medicalLeave = la.MedicalLeave,
                    casualLeave = la.CasualLeave,
                    earnedLeave = la.EarnedLeave,
                    sickLeave = la.SickLeave,
                    personalLeave = la.PersonalLeave,
                    unpaidLeave = la.UnpaidLeave,
                    leaveWithoutPay = la.LeaveWithoutPay,
                    carryForwardEarned = la.CarryForwardEarned,
                    carryForwardPersonal = la.CarryForwardPersonal,
                    usedMedicalLeave = used["ML"],
                    usedCasualLeave = used["CL"],
                    usedEarnedLeave = used["EL"],
                    usedSickLeave = used["SL"],
                    usedPersonalLeave = used["PL"],
                    usedUnpaidLeave = used["UL"],
                    usedLeaveWithoutPay = used["LWP"],
                } as object;
            }).ToList();

            return enriched;
        }

        public async Task<LeaveAllotment> CreateLeaveAllotmentAsync(LeaveAllotment allotment)
        {
            allotment.Id = Guid.NewGuid().ToString();
            allotment.CreatedAt = DateTime.UtcNow;
            allotment.UpdatedAt = DateTime.UtcNow;

            _context.LeaveAllotments.Add(allotment);
            await _context.SaveChangesAsync();
            return allotment;
        }

        public async Task<(LeaveAllotment allotment, bool isUpdated)> UpsertLeaveAllotmentAsync(LeaveAllotment allotment, bool forceOverride = false, string? reason = null, string? performedBy = null)
        {
            // Find existing by employeeId and year
            var existing = await _context.LeaveAllotments.FirstOrDefaultAsync(l => l.EmployeeId == allotment.EmployeeId && l.Year == allotment.Year);
            if (existing != null)
            {
                // Compute used leaves from attendance for this employee/year
                var attendance = await _context.Attendances.Where(a => a.EmployeeId == existing.EmployeeId && a.Year == existing.Year).ToListAsync();
                var used = new Dictionary<string,int> { {"ML",0},{"CL",0},{"EL",0},{"SL",0},{"PL",0},{"UL",0},{"LWP",0} };
                foreach (var a in attendance)
                {
                    if (string.IsNullOrEmpty(a.AttendanceData)) continue;
                    Dictionary<string, dynamic> data;
                    try { data = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, dynamic>>(a.AttendanceData) ?? new Dictionary<string, dynamic>(); } catch { data = new Dictionary<string, dynamic>(); }
                    foreach (var dd in data.Values)
                    {
                        try
                        {
                            string status = dd?.status ?? null;
                            string leaveType = dd?.leaveType ?? null;
                            if (status == "leave" && !string.IsNullOrEmpty(leaveType) && used.ContainsKey(leaveType)) used[leaveType]++;
                        }
                        catch { }
                    }
                }

                // Check violations
                var violations = new List<string>();
                if (allotment.MedicalLeave < used["ML"]) violations.Add($"medicalLeave (allocated {allotment.MedicalLeave} < consumed {used["ML"]})");
                if (allotment.CasualLeave < used["CL"]) violations.Add($"casualLeave (allocated {allotment.CasualLeave} < consumed {used["CL"]})");
                if (allotment.EarnedLeave < used["EL"]) violations.Add($"earnedLeave (allocated {allotment.EarnedLeave} < consumed {used["EL"]})");
                if (allotment.SickLeave < used["SL"]) violations.Add($"sickLeave (allocated {allotment.SickLeave} < consumed {used["SL"]})");
                if (allotment.PersonalLeave < used["PL"]) violations.Add($"personalLeave (allocated {allotment.PersonalLeave} < consumed {used["PL"]})");
                if (allotment.UnpaidLeave < used["UL"]) violations.Add($"unpaidLeave (allocated {allotment.UnpaidLeave} < consumed {used["UL"]})");
                if (allotment.LeaveWithoutPay < used["LWP"]) violations.Add($"leaveWithoutPay (allocated {allotment.LeaveWithoutPay} < consumed {used["LWP"]})");

                if (violations.Any())
                {
                    // Insert blocked update audit
                    try
                    {
                        var prevJson = System.Text.Json.JsonSerializer.Serialize(existing);
                        var newJson = System.Text.Json.JsonSerializer.Serialize(allotment);
                        await _context.Database.ExecuteSqlRawAsync($"INSERT INTO leave_allotment_override_audits (allotment_id, employee_id, year, operation, performed_by, previous_allotment, new_allotment, reason, created_at) VALUES ({existing.Id}, {existing.EmployeeId}, {existing.Year}, 'blocked_update', {performedBy ?? "NULL"}, '{prevJson}', '{newJson}', 'Attempt to decrease allocation below consumed: {string.Join(", ", violations)}', GETUTCDATE())");
                    }
                    catch { }

                    throw new InvalidOperationException($"Cannot decrease allocation below consumed leaves: {string.Join(", ", violations)}");
                }

                // Check next year existence
                var nextYearExists = await _context.LeaveAllotments.AnyAsync(l => l.EmployeeId == existing.EmployeeId && l.Year == existing.Year + 1);
                if (nextYearExists && !forceOverride)
                {
                    throw new InvalidOperationException("Cannot modify this allotment because a next-year allotment already exists. Use force override if necessary.");
                }

                // If force override, insert audit
                if (forceOverride)
                {
                    try
                    {
                        var prevJson = System.Text.Json.JsonSerializer.Serialize(existing);
                        var newJson = System.Text.Json.JsonSerializer.Serialize(allotment);
                        await _context.Database.ExecuteSqlRawAsync($"INSERT INTO leave_allotment_override_audits (allotment_id, employee_id, year, operation, performed_by, previous_allotment, new_allotment, reason, created_at) VALUES ({existing.Id}, {existing.EmployeeId}, {existing.Year}, 'override', {performedBy ?? "NULL"}, '{prevJson}', '{newJson}', {(reason != null ? "'"+reason.Replace("'","''")+"'" : "NULL")}, GETUTCDATE())");
                    }
                    catch { }
                }

                // apply update
                existing.MedicalLeave = allotment.MedicalLeave;
                existing.CasualLeave = allotment.CasualLeave;
                existing.EarnedLeave = allotment.EarnedLeave;
                existing.SickLeave = allotment.SickLeave;
                existing.PersonalLeave = allotment.PersonalLeave;
                existing.UnpaidLeave = allotment.UnpaidLeave;
                existing.LeaveWithoutPay = allotment.LeaveWithoutPay;
                existing.CarryForwardEarned = allotment.CarryForwardEarned;
                existing.CarryForwardPersonal = allotment.CarryForwardPersonal;
                existing.UpdatedAt = DateTime.UtcNow;

                _context.LeaveAllotments.Update(existing);
                await _context.SaveChangesAsync();
                return (existing, true);
            }
            else
            {
                // create new
                allotment.Id = Guid.NewGuid().ToString();
                allotment.CreatedAt = DateTime.UtcNow;
                allotment.UpdatedAt = DateTime.UtcNow;
                _context.LeaveAllotments.Add(allotment);
                await _context.SaveChangesAsync();
                if (forceOverride)
                {
                    try
                    {
                        var newJson = System.Text.Json.JsonSerializer.Serialize(allotment);
                        await _context.Database.ExecuteSqlRawAsync($"INSERT INTO leave_allotment_override_audits (allotment_id, employee_id, year, operation, performed_by, previous_allotment, new_allotment, reason, created_at) VALUES ({allotment.Id}, {allotment.EmployeeId}, {allotment.Year}, 'create_override', {performedBy ?? "NULL"}, NULL, '{newJson}', {(reason != null ? "'"+reason.Replace("'","''")+"'" : "NULL")}, GETUTCDATE())");
                    }
                    catch { }
                }
                return (allotment, false);
            }
        }

        public async Task<LeaveAllotment?> UpdateLeaveAllotmentAsync(string id, LeaveAllotment allotment)
        {
            // Find existing by id
            var existing = await _context.LeaveAllotments.FindAsync(id);
            if (existing == null) return null;

            // Prevent changing key fields through update payload
            allotment.Id = id;
            allotment.EmployeeId = existing.EmployeeId;
            allotment.Year = existing.Year;

            // Use Upsert logic to perform validation/override checks
            (LeaveAllotment updatedAllotment, bool isUpdated) = await UpsertLeaveAllotmentAsync(allotment, false, null, null);

            return updatedAllotment;
        }

        public async Task<(int count, List<object> skipped)> BulkUpsertLeaveAllotmentsAsync(int year, int medicalLeave, int casualLeave, int earnedLeave, int sickLeave, int personalLeave, int unpaidLeave, int leaveWithoutPay, bool carryForwardEarned, bool carryForwardPersonal, bool forceOverride = false, string? forceReason = null, string? performedBy = null)
        {
            var activeEmployees = await _context.Employees.Where(e => e.Status == "Active" && e.Role != "superadmin").ToListAsync();
            int count = 0;
            var skipped = new List<object>();

            foreach (var emp in activeEmployees)
            {
                var existing = await _context.LeaveAllotments.FirstOrDefaultAsync(l => l.EmployeeId == emp.Id && l.Year == year);
                var allotmentData = new LeaveAllotment {
                    EmployeeId = emp.Id,
                    Year = year,
                    MedicalLeave = medicalLeave,
                    CasualLeave = casualLeave,
                    EarnedLeave = earnedLeave,
                    SickLeave = sickLeave,
                    PersonalLeave = personalLeave,
                    UnpaidLeave = unpaidLeave,
                    LeaveWithoutPay = leaveWithoutPay,
                    CarryForwardEarned = carryForwardEarned,
                    CarryForwardPersonal = carryForwardPersonal
                };

                if (existing != null)
                {
                    // check next-year and usage violations
                    var nextYearExists = await _context.LeaveAllotments.AnyAsync(l => l.EmployeeId == emp.Id && l.Year == year + 1);
                    if (nextYearExists && !forceOverride)
                    {
                        skipped.Add(new { employeeId = emp.Id, name = emp.Name, reasons = new[] { "nextYear allotment exists" } });
                        continue;
                    }

                    // compute used
                    var attendance = await _context.Attendances.Where(a => a.EmployeeId == emp.Id && a.Year == year).ToListAsync();
                    var used = new Dictionary<string,int> { {"ML",0},{"CL",0},{"EL",0},{"SL",0},{"PL",0},{"UL",0},{"LWP",0} };
                    foreach (var a in attendance)
                    {
                        if (string.IsNullOrEmpty(a.AttendanceData)) continue;
                        Dictionary<string, dynamic> data;
                        try { data = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, dynamic>>(a.AttendanceData) ?? new Dictionary<string, dynamic>(); } catch { data = new Dictionary<string, dynamic>(); }
                        foreach (var dd in data.Values)
                        {
                            try
                            {
                                string status = dd?.status ?? null;
                                string leaveType = dd?.leaveType ?? null;
                                if (status == "leave" && !string.IsNullOrEmpty(leaveType) && used.ContainsKey(leaveType)) used[leaveType]++;
                            }
                            catch { }
                        }
                    }

                    var violations = new List<string>();
                    if (medicalLeave < used["ML"]) violations.Add($"medicalLeave (allocated {medicalLeave} < consumed {used["ML"]})");
                    if (casualLeave < used["CL"]) violations.Add($"casualLeave (allocated {casualLeave} < consumed {used["CL"]})");
                    if (earnedLeave < used["EL"]) violations.Add($"earnedLeave (allocated {earnedLeave} < consumed {used["EL"]})");
                    if (sickLeave < used["SL"]) violations.Add($"sickLeave (allocated {sickLeave} < consumed {used["SL"]})");
                    if (personalLeave < used["PL"]) violations.Add($"personalLeave (allocated {personalLeave} < consumed {used["PL"]})");
                    if (unpaidLeave < used["UL"]) violations.Add($"unpaidLeave (allocated {unpaidLeave} < consumed {used["UL"]})");
                    if (leaveWithoutPay < used["LWP"]) violations.Add($"leaveWithoutPay (allocated {leaveWithoutPay} < consumed {used["LWP"]})");

                    if (violations.Any())
                    {
                        skipped.Add(new { employeeId = emp.Id, name = emp.Name, reasons = violations });
                        continue;
                    }

                    // update
                    existing.MedicalLeave = medicalLeave;
                    existing.CasualLeave = casualLeave;
                    existing.EarnedLeave = earnedLeave;
                    existing.SickLeave = sickLeave;
                    existing.PersonalLeave = personalLeave;
                    existing.UnpaidLeave = unpaidLeave;
                    existing.LeaveWithoutPay = leaveWithoutPay;
                    existing.CarryForwardEarned = carryForwardEarned;
                    existing.CarryForwardPersonal = carryForwardPersonal;
                    existing.UpdatedAt = DateTime.UtcNow;
                    _context.LeaveAllotments.Update(existing);

                    if (forceOverride)
                    {
                        try
                        {
                            var prevJson = System.Text.Json.JsonSerializer.Serialize(existing);
                            var newJson = System.Text.Json.JsonSerializer.Serialize(allotmentData);
                            await _context.Database.ExecuteSqlRawAsync($"INSERT INTO leave_allotment_override_audits (allotment_id, employee_id, year, operation, performed_by, previous_allotment, new_allotment, reason, created_at) VALUES ({existing.Id}, {emp.Id}, {year}, 'bulk_override_update', {performedBy ?? "NULL"}, '{prevJson}', '{newJson}', {(forceReason != null ? "'"+forceReason.Replace("'","''")+"'" : "NULL")}, GETUTCDATE())");
                        }
                        catch { }
                    }
                }
                else
                {
                    var created = new LeaveAllotment {
                        Id = Guid.NewGuid().ToString(),
                        EmployeeId = emp.Id,
                        Year = year,
                        MedicalLeave = medicalLeave,
                        CasualLeave = casualLeave,
                        EarnedLeave = earnedLeave,
                        SickLeave = sickLeave,
                        PersonalLeave = personalLeave,
                        UnpaidLeave = unpaidLeave,
                        LeaveWithoutPay = leaveWithoutPay,
                        CarryForwardEarned = carryForwardEarned,
                        CarryForwardPersonal = carryForwardPersonal,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.LeaveAllotments.Add(created);
                    if (forceOverride)
                    {
                        try
                        {
                            var newJson = System.Text.Json.JsonSerializer.Serialize(created);
                            await _context.Database.ExecuteSqlRawAsync($"INSERT INTO leave_allotment_override_audits (allotment_id, employee_id, year, operation, performed_by, previous_allotment, new_allotment, reason, created_at) VALUES ({created.Id}, {emp.Id}, {year}, 'bulk_override_create', {performedBy ?? "NULL"}, NULL, '{newJson}', {(forceReason != null ? "'"+forceReason.Replace("'","''")+"'" : "NULL")}, GETUTCDATE())");
                        }
                        catch { }
                    }
                }
                count++;
            }

            await _context.SaveChangesAsync();
            return (count, skipped);
        }

        public async Task<bool> DeleteLeaveAllotmentWithChecksAsync(string id, string? performedBy = null)
        {
            var allotment = await _context.LeaveAllotments.FindAsync(id);
            if (allotment == null) return false;

            // compute consumed
            var used = new Dictionary<string,int> { {"ML",0},{"CL",0},{"EL",0},{"SL",0},{"PL",0},{"UL",0},{"LWP",0} };
            var attendance = await _context.Attendances.Where(a => a.EmployeeId == allotment.EmployeeId && a.Year == allotment.Year).ToListAsync();
            foreach (var a in attendance)
            {
                if (string.IsNullOrEmpty(a.AttendanceData)) continue;
                Dictionary<string, dynamic> data;
                try { data = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, dynamic>>(a.AttendanceData) ?? new Dictionary<string, dynamic>(); } catch { data = new Dictionary<string, dynamic>(); }
                foreach (var dd in data.Values)
                {
                    try
                    {
                        string status = dd?.status ?? null;
                        string leaveType = dd?.leaveType ?? null;
                        if (status == "leave" && !string.IsNullOrEmpty(leaveType) && used.ContainsKey(leaveType)) used[leaveType]++;
                    }
                    catch { }
                }
            }

            bool consumed = used.Values.Any(v => v > 0);
            var nextYearExists = await _context.LeaveAllotments.AnyAsync(l => l.EmployeeId == allotment.EmployeeId && l.Year == allotment.Year + 1);
            if (consumed || nextYearExists)
            {
                try
                {
                    var aJson = System.Text.Json.JsonSerializer.Serialize(allotment);
                    await _context.Database.ExecuteSqlRawAsync($"INSERT INTO leave_allotment_override_audits (allotment_id, employee_id, year, operation, performed_by, previous_allotment, new_allotment, reason, created_at) VALUES ({allotment.Id}, {allotment.EmployeeId}, {allotment.Year}, 'blocked_delete', {performedBy ?? "NULL"}, '{aJson}', NULL, 'Attempt to delete but consumption/next-year exists', GETUTCDATE())");
                }
                catch { }

                throw new InvalidOperationException("Cannot delete leave allotment: either leave has been consumed or a next-year allotment exists");
            }

            _context.LeaveAllotments.Remove(allotment);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> LeaveAllotmentExistsAsync(string employeeId, int year)
        {
            return await _context.LeaveAllotments.AnyAsync(l => l.EmployeeId == employeeId && l.Year == year);
        }

        public async Task<List<int>> GetLeaveAllotmentYearsAsync(string employeeId)
        {
            return await _context.LeaveAllotments
                .Where(l => l.EmployeeId == employeeId)
                .Select(l => l.Year)
                .Distinct()
                .OrderByDescending(y => y)
                .ToListAsync();
        }
    }
}
