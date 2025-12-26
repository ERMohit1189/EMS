using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;
using VendorRegistrationBackend.DTOs;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/leave-allotments")]
    [Route("api/leaves")]
    [Route("api/[controller]")]
    [Authorize]
    public class LeaveController : ControllerBase
    {
        private readonly ILeaveService _leaveService;
        private readonly AppDbContext _context;

        public LeaveController(ILeaveService leaveService, AppDbContext context)
        {
            _leaveService = leaveService;
            _context = context;
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> GetLeaveRequest(string id)
        {
            var leaveRequest = await _leaveService.GetLeaveRequestByIdAsync(id);
            if (leaveRequest == null)
                return NotFound(new { message = "Leave request not found" });

            return Ok(leaveRequest);
        }

        [HttpGet("employee/{employeeId}")]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> GetEmployeeLeaveRequests(string employeeId)
        {
            var leaveRequests = await _leaveService.GetLeaveRequestsByEmployeeAsync(employeeId);
            return Ok(leaveRequests);
        }

        [HttpGet("status/{status}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GetLeaveRequestsByStatus(string status)
        {
            var leaveRequests = await _leaveService.GetLeaveRequestsByStatusAsync(status);
            return Ok(leaveRequests);
        }

        [HttpGet]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GetAllLeaveRequests()
        {
            var leaveRequests = await _leaveService.GetAllLeaveRequestsAsync();
            return Ok(leaveRequests);
        }

        [HttpGet("allotments")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GetLeaveAllotments([FromQuery] int? year)
        {
            var selectedYear = year ?? DateTime.UtcNow.Year;
            var data = await _leaveService.GetLeaveAllotmentsForYearAsync(selectedYear);
            return Ok(data);
        }

        [HttpPost]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> CreateLeaveRequest([FromBody] LeaveRequest leaveRequest)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var createdRequest = await _leaveService.CreateLeaveRequestAsync(leaveRequest);
                return Created($"/api/leave/{createdRequest.Id}", new
                {
                    id = createdRequest.Id,
                    employeeId = createdRequest.EmployeeId,
                    status = createdRequest.Status
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> UpdateLeaveRequest(string id, [FromBody] LeaveRequest leaveRequest)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var updatedRequest = await _leaveService.UpdateLeaveRequestAsync(id, leaveRequest);
            if (updatedRequest == null)
                return NotFound(new { message = "Leave request not found" });

            return Ok(new { message = "Leave request updated successfully" });
        }

        [HttpPost("{id}/approve")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> ApproveLeaveRequest(string id, [FromBody] ApproveLeaveRequestDto request)
        {
            string approverRemark = request?.ApproverRemark ?? "";
            var approverId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ??
                             User.FindFirst("sub")?.Value ??
                             User.FindFirst("id")?.Value ?? "";

            var success = await _leaveService.ApproveLeaveRequestAsync(id, approverRemark, approverId);
            if (!success)
                return NotFound(new { message = "Leave request not found" });

            return Ok(new { message = "Leave request approved successfully" });
        }

        [HttpPost("{id}/reject")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> RejectLeaveRequest(string id, [FromBody] RejectLeaveRequestDto request)
        {
            string approverRemark = request?.ApproverRemark ?? "";
            var approverId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ??
                             User.FindFirst("sub")?.Value ??
                             User.FindFirst("id")?.Value ?? "";

            var success = await _leaveService.RejectLeaveRequestAsync(id, approverRemark, approverId);
            if (!success)
                return NotFound(new { message = "Leave request not found" });

            return Ok(new { message = "Leave request rejected successfully" });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> DeleteLeaveRequest(string id)
        {
            var success = await _leaveService.DeleteLeaveRequestAsync(id);
            if (!success)
                return NotFound(new { message = "Leave request not found" });

            return Ok(new { message = "Leave request deleted successfully" });
        }

        [HttpGet("allotments/{employeeId}/{year}")]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> GetLeaveAllotment(string employeeId, int year)
        {
            var allotment = await _leaveService.GetLeaveAllotmentAsync(employeeId, year);
            if (allotment == null)
                return NotFound(new { message = "Leave allotment not found" });

            return Ok(allotment);
        }

        [HttpGet("employee/{employeeId}/{year}")]
        [Route("/api/leave-allotments/employee/{employeeId}/{year}")]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> GetLeaveAllotmentByEmployee(string employeeId, int year)
        {
            var allotment = await _leaveService.GetLeaveAllotmentAsync(employeeId, year);
            if (allotment == null)
                return NotFound(new { message = "Leave allotment not found" });

            // Count 1: Approved leave requests for the given year
            var approvedLeaves = await _context.LeaveRequests
                .Where(lr => lr.EmployeeId == employeeId &&
                             lr.Status == "approved" &&
                             lr.ApprovedAt.HasValue &&
                             lr.ApprovedAt.Value.Year == year)
                .ToListAsync();

            var usedByType = approvedLeaves
                .GroupBy(lr => lr.LeaveType)
                .ToDictionary(g => g.Key, g => g.Sum(lr => lr.Days));

            // Count 2: Attendance-marked leaves for the given year
            var attendanceRecords = await _context.Attendances
                .Where(a => a.EmployeeId == employeeId && a.Year == year)
                .ToListAsync();

            foreach (var attendance in attendanceRecords)
            {
                if (string.IsNullOrEmpty(attendance.AttendanceData)) continue;

                try
                {
                    var attendanceDataJson = System.Text.Json.JsonDocument.Parse(attendance.AttendanceData);
                    var root = attendanceDataJson.RootElement;

                    foreach (var property in root.EnumerateObject())
                    {
                        var dayData = property.Value;
                        if (dayData.TryGetProperty("status", out var statusEl) &&
                            statusEl.GetString() == "leave" &&
                            dayData.TryGetProperty("leaveType", out var leaveTypeEl))
                        {
                            var leaveType = leaveTypeEl.GetString() ?? string.Empty;
                            if (!string.IsNullOrEmpty(leaveType))
                            {
                                if (usedByType.ContainsKey(leaveType))
                                    usedByType[leaveType]++;
                                else
                                    usedByType[leaveType] = 1;
                            }
                        }
                    }
                }
                catch
                {
                    // Skip if JSON parsing fails
                }
            }

            // Calculate carried forward leaves from previous year if applicable
            int carriedMedicalLeave = 0;
            int carriedCasualLeave = 0;
            int carriedEarnedLeave = 0;
            int carriedSickLeave = 0;
            int carriedPersonalLeave = 0;
            int carriedUnpaidLeave = 0;
            int carriedLeaveWithoutPay = 0;

            // Fetch previous year's allotment to calculate carry forward
            var previousYearAllotment = await _leaveService.GetLeaveAllotmentAsync(employeeId, year - 1);
            if (previousYearAllotment != null)
            {
                // Calculate used leaves from previous year (same logic)
                var prevYearApprovedLeaves = await _context.LeaveRequests
                    .Where(lr => lr.EmployeeId == employeeId &&
                                 lr.Status == "approved" &&
                                 lr.ApprovedAt.HasValue &&
                                 lr.ApprovedAt.Value.Year == year - 1)
                    .ToListAsync();

                var prevYearUsedByType = prevYearApprovedLeaves
                    .GroupBy(lr => lr.LeaveType)
                    .ToDictionary(g => g.Key, g => g.Sum(lr => lr.Days));

                // Count attendance-marked leaves from previous year
                var prevYearAttendanceRecords = await _context.Attendances
                    .Where(a => a.EmployeeId == employeeId && a.Year == year - 1)
                    .ToListAsync();

                foreach (var attendance in prevYearAttendanceRecords)
                {
                    if (string.IsNullOrEmpty(attendance.AttendanceData)) continue;
                    try
                    {
                        var attendanceDataJson = System.Text.Json.JsonDocument.Parse(attendance.AttendanceData);
                        var root = attendanceDataJson.RootElement;
                        foreach (var property in root.EnumerateObject())
                        {
                            var dayData = property.Value;
                            if (dayData.TryGetProperty("status", out var statusEl) &&
                                statusEl.GetString() == "leave" &&
                                dayData.TryGetProperty("leaveType", out var leaveTypeEl))
                            {
                                var leaveType = leaveTypeEl.GetString() ?? string.Empty;
                                if (!string.IsNullOrEmpty(leaveType))
                                {
                                    if (prevYearUsedByType.ContainsKey(leaveType))
                                        prevYearUsedByType[leaveType]++;
                                    else
                                        prevYearUsedByType[leaveType] = 1;
                                }
                            }
                        }
                    }
                    catch { }
                }

                // Calculate remaining from previous year and carry forward if applicable
                int prevYearUsedEarned = prevYearUsedByType.ContainsKey("EL") ? prevYearUsedByType["EL"] : 0;
                int prevYearUsedPersonal = prevYearUsedByType.ContainsKey("PL") ? prevYearUsedByType["PL"] : 0;

                if (allotment.CarryForwardEarned)
                {
                    carriedEarnedLeave = previousYearAllotment.EarnedLeave - prevYearUsedEarned;
                    if (carriedEarnedLeave < 0) carriedEarnedLeave = 0;
                }

                if (allotment.CarryForwardPersonal)
                {
                    carriedPersonalLeave = previousYearAllotment.PersonalLeave - prevYearUsedPersonal;
                    if (carriedPersonalLeave < 0) carriedPersonalLeave = 0;
                }
            }

            // Build leaveTypes array with calculated remaining days
            var leaveTypes = new List<dynamic>
            {
                new {
                    code = "ML",
                    name = "Medical Leave",
                    allocated = allotment.MedicalLeave,
                    used = usedByType.ContainsKey("ML") ? usedByType["ML"] : 0,
                    carried = carriedMedicalLeave,
                    remaining = allotment.MedicalLeave + carriedMedicalLeave - (usedByType.ContainsKey("ML") ? usedByType["ML"] : 0)
                },
                new {
                    code = "CL",
                    name = "Casual Leave",
                    allocated = allotment.CasualLeave,
                    used = usedByType.ContainsKey("CL") ? usedByType["CL"] : 0,
                    carried = carriedCasualLeave,
                    remaining = allotment.CasualLeave + carriedCasualLeave - (usedByType.ContainsKey("CL") ? usedByType["CL"] : 0)
                },
                new {
                    code = "EL",
                    name = "Earned Leave",
                    allocated = allotment.EarnedLeave,
                    used = usedByType.ContainsKey("EL") ? usedByType["EL"] : 0,
                    carried = carriedEarnedLeave,
                    remaining = allotment.EarnedLeave + carriedEarnedLeave - (usedByType.ContainsKey("EL") ? usedByType["EL"] : 0)
                },
                new {
                    code = "SL",
                    name = "Sick Leave",
                    allocated = allotment.SickLeave,
                    used = usedByType.ContainsKey("SL") ? usedByType["SL"] : 0,
                    carried = carriedSickLeave,
                    remaining = allotment.SickLeave + carriedSickLeave - (usedByType.ContainsKey("SL") ? usedByType["SL"] : 0)
                },
                new {
                    code = "PL",
                    name = "Personal Leave",
                    allocated = allotment.PersonalLeave,
                    used = usedByType.ContainsKey("PL") ? usedByType["PL"] : 0,
                    carried = carriedPersonalLeave,
                    remaining = allotment.PersonalLeave + carriedPersonalLeave - (usedByType.ContainsKey("PL") ? usedByType["PL"] : 0)
                },
                new {
                    code = "UL",
                    name = "Unpaid Leave",
                    allocated = allotment.UnpaidLeave,
                    used = usedByType.ContainsKey("UL") ? usedByType["UL"] : 0,
                    carried = carriedUnpaidLeave,
                    remaining = allotment.UnpaidLeave + carriedUnpaidLeave - (usedByType.ContainsKey("UL") ? usedByType["UL"] : 0)
                },
                new {
                    code = "LWP",
                    name = "Leave Without Pay",
                    allocated = allotment.LeaveWithoutPay,
                    used = usedByType.ContainsKey("LWP") ? usedByType["LWP"] : 0,
                    carried = carriedLeaveWithoutPay,
                    remaining = allotment.LeaveWithoutPay + carriedLeaveWithoutPay - (usedByType.ContainsKey("LWP") ? usedByType["LWP"] : 0)
                }
            };

            return Ok(new
            {
                leaveTypes = leaveTypes,
                carryForwardApplied = allotment.CarryForwardEarned || allotment.CarryForwardPersonal,
                carryFromYear = (object)null
            });
        }

        [HttpGet("employee/{employeeId}/{year}/exists")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> LeaveAllotmentExists(string employeeId, int year)
        {
            var exists = await _leaveService.LeaveAllotmentExistsAsync(employeeId, year);
            return Ok(new { exists });
        }

        [HttpGet("employee/{employeeId}/{year}/{month}/approved-dates")]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> GetApprovedLeaveDates(string employeeId, int year, int month)
        {
            // Get all approved leave requests for the employee in the given year
            var approvedLeaves = await _context.LeaveRequests
                .Where(lr => lr.EmployeeId == employeeId &&
                             lr.Status == "approved" &&
                             lr.ApprovedAt.HasValue &&
                             lr.ApprovedAt.Value.Year == year)
                .ToListAsync();

            // Convert to dictionary of day => leave details for quick lookup on frontend
            var approvedDays = new Dictionary<int, string>();

            foreach (var leave in approvedLeaves)
            {
                // Generate all days in the leave period
                for (var date = leave.StartDate; date <= leave.EndDate; date = date.AddDays(1))
                {
                    // Only include days in the requested month and year
                    if (date.Year == year && date.Month == month)
                    {
                        int day = date.Day;
                        approvedDays[day] = leave.LeaveType; // Map day to leave type
                    }
                }
            }

            return Ok(approvedDays);
        }

        [HttpPost("allotments")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> CreateLeaveAllotment([FromBody] CreateLeaveAllotmentDto payload)
        {
            try
            {
                if (payload == null) return BadRequest(new { error = "Invalid payload" });

                // Convert DTO to LeaveAllotment model
                var allotment = new LeaveAllotment
                {
                    EmployeeId = payload.EmployeeId,
                    Year = payload.Year,
                    MedicalLeave = payload.MedicalLeave,
                    CasualLeave = payload.CasualLeave,
                    EarnedLeave = payload.EarnedLeave,
                    SickLeave = payload.SickLeave,
                    PersonalLeave = payload.PersonalLeave,
                    UnpaidLeave = payload.UnpaidLeave,
                    LeaveWithoutPay = payload.LeaveWithoutPay,
                    CarryForwardEarned = payload.CarryForwardEarned,
                    CarryForwardPersonal = payload.CarryForwardPersonal
                };

                var performedBy = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ??
                                 User.FindFirst("sub")?.Value ??
                                 User.FindFirst("id")?.Value ?? null;
                var res = await _leaveService.UpsertLeaveAllotmentAsync(allotment, payload.ForceOverride, payload.ForceReason, performedBy);
                return Ok(new { data = res.allotment, isUpdated = res.isUpdated });
            }
            catch (InvalidOperationException ex)
            {
                var msg = ex.Message ?? "Invalid operation";
                if (msg.Contains("next-year")) return StatusCode(403, new { error = msg });
                return BadRequest(new { error = msg });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPut("allotments/{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> UpdateLeaveAllotment(string id, [FromBody] UpdateLeaveAllotmentDto payload)
        {
            try
            {
                if (payload == null) return BadRequest(new { error = "Invalid payload" });

                // Convert DTO to LeaveAllotment model
                var allotment = new LeaveAllotment
                {
                    EmployeeId = payload.EmployeeId ?? string.Empty,
                    Year = payload.Year,
                    MedicalLeave = payload.MedicalLeave,
                    CasualLeave = payload.CasualLeave,
                    EarnedLeave = payload.EarnedLeave,
                    SickLeave = payload.SickLeave,
                    PersonalLeave = payload.PersonalLeave,
                    UnpaidLeave = payload.UnpaidLeave,
                    LeaveWithoutPay = payload.LeaveWithoutPay,
                    CarryForwardEarned = payload.CarryForwardEarned,
                    CarryForwardPersonal = payload.CarryForwardPersonal
                };

                var performedBy = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ??
                                 User.FindFirst("sub")?.Value ??
                                 User.FindFirst("id")?.Value ?? null;

                // If force override is needed, use UpsertLeaveAllotmentAsync instead
                if (payload.ForceOverride)
                {
                    var res = await _leaveService.UpsertLeaveAllotmentAsync(allotment, true, payload.ForceReason, performedBy);
                    return Ok(new { data = res.allotment, isUpdated = res.isUpdated, message = "Leave allotment updated successfully" });
                }

                var updatedAllotment = await _leaveService.UpdateLeaveAllotmentAsync(id, allotment);
                if (updatedAllotment == null)
                    return NotFound(new { error = "Leave allotment not found" });

                return Ok(new { data = updatedAllotment, message = "Leave allotment updated successfully" });
            }
            catch (InvalidOperationException ex)
            {
                var msg = ex.Message ?? "Invalid operation";
                if (msg.Contains("next-year")) return StatusCode(403, new { error = msg });
                return BadRequest(new { error = msg });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("apply")]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> ApplyLeave([FromBody] ApplyLeaveDto request)
        {
            try
            {
                if (request == null) return BadRequest(new { error = "Invalid payload" });

                string employeeId = request.EmployeeId;
                string leaveType = request.LeaveType;
                string startDate = request.StartDate;
                string endDate = request.EndDate;
                string remark = request.Remark ?? "";

                if (string.IsNullOrEmpty(employeeId) || string.IsNullOrEmpty(leaveType) ||
                    string.IsNullOrEmpty(startDate) || string.IsNullOrEmpty(endDate))
                    return BadRequest(new { error = "Missing required fields" });

                var leaveRequest = new LeaveRequest
                {
                    EmployeeId = employeeId,
                    LeaveType = leaveType,
                    StartDate = DateTime.Parse(startDate),
                    EndDate = DateTime.Parse(endDate),
                    Remark = remark,
                    Status = "pending",
                    CreatedAt = DateTime.UtcNow
                };

                var created = await _leaveService.CreateLeaveRequestAsync(leaveRequest);
                return Ok(new { message = "Leave applied successfully", id = created.Id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("validate-dates")]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> ValidateDates([FromBody] ValidateDatesDto request)
        {
            try
            {
                if (request == null) return BadRequest(new { error = "Invalid payload" });

                string startDate = request.StartDate;
                string endDate = request.EndDate;

                if (string.IsNullOrEmpty(startDate) || string.IsNullOrEmpty(endDate))
                    return BadRequest(new { error = "Start date and end date are required" });

                var invalidDates = new List<object>();

                var s = DateTime.Parse(startDate);
                var e = DateTime.Parse(endDate);

                for (var d = s; d <= e; d = d.AddDays(1))
                {
                    // Check if Sunday (0 = Sunday)
                    if (d.DayOfWeek == DayOfWeek.Sunday)
                    {
                        invalidDates.Add(new {
                            date = d.ToString("yyyy-MM-dd"),
                            reason = "Sunday"
                        });
                    }
                }

                return Ok(new { invalidDates });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("my")]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> GetMyLeaves()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ??
                         User.FindFirst("sub")?.Value ??
                         User.FindFirst("id")?.Value ?? "";
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User not authenticated" });

            var leaveRequests = await _leaveService.GetLeaveRequestsByEmployeeAsync(userId);

            // Map to DTO to avoid circular reference serialization issues
            var result = leaveRequests.Select(lr => new
            {
                id = lr.Id,
                employeeId = lr.EmployeeId,
                employeeName = lr.Employee?.Name ?? "Unknown",
                leaveType = lr.LeaveType,
                startDate = lr.StartDate,
                endDate = lr.EndDate,
                days = lr.Days,
                remark = lr.Remark,
                status = lr.Status,
                appliedBy = lr.AppliedBy,
                appliedAt = lr.AppliedAt,
                approvedBy = lr.ApprovedBy,
                approvedAt = lr.ApprovedAt,
                rejectionReason = lr.RejectionReason,
                approverRemark = lr.ApproverRemark,
                createdAt = lr.CreatedAt,
                updatedAt = lr.UpdatedAt
            }).ToList();

            return Ok(result);
        }

        [HttpGet("pending")]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> GetPendingLeaves([FromQuery] string teamId = "", [FromQuery] string employeeId = "")
        {
            var leaveRequests = await _leaveService.GetLeaveRequestsByStatusAsync("pending");

            // Filter by teamId or employeeId if provided
            if (!string.IsNullOrEmpty(employeeId))
            {
                leaveRequests = leaveRequests.Where(lr => lr.EmployeeId == employeeId).ToList();
            }

            // Map to DTO to avoid circular reference serialization issues
            var result = leaveRequests.Select(lr => new
            {
                id = lr.Id,
                employeeId = lr.EmployeeId,
                employeeName = lr.Employee?.Name ?? "Unknown",
                employeeEmail = lr.Employee?.Email,
                leaveType = lr.LeaveType,
                startDate = lr.StartDate,
                endDate = lr.EndDate,
                days = lr.Days,
                remark = lr.Remark,
                status = lr.Status,
                appliedBy = lr.AppliedBy,
                appliedAt = lr.AppliedAt,
                approvedBy = lr.ApprovedBy,
                approvedAt = lr.ApprovedAt,
                rejectionReason = lr.RejectionReason,
                approverRemark = lr.ApproverRemark,
                createdAt = lr.CreatedAt,
                updatedAt = lr.UpdatedAt
            }).ToList();

            return Ok(result);
        }

        [HttpGet("employee/{employeeId}/years")]
        [Route("/api/leave-allotments/employee/{employeeId}/years")]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> GetLeaveAllotmentYears(string employeeId)
        {
            var years = await _leaveService.GetLeaveAllotmentYearsAsync(employeeId);
            return Ok(new { years });
        }

        [HttpPost("allotments/bulk")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> BulkUpsertAllotments([FromBody] BulkLeaveAllotmentDto payload)
        {
            try
            {
                if (payload == null) return BadRequest(new { error = "Invalid payload" });

                var performedBy = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ??
                                 User.FindFirst("sub")?.Value ??
                                 User.FindFirst("id")?.Value ?? null;
                var res = await _leaveService.BulkUpsertLeaveAllotmentsAsync(
                    payload.Year,
                    payload.MedicalLeave,
                    payload.CasualLeave,
                    payload.EarnedLeave,
                    payload.SickLeave,
                    payload.PersonalLeave,
                    payload.UnpaidLeave,
                    payload.LeaveWithoutPay,
                    payload.CarryForwardEarned,
                    payload.CarryForwardPersonal,
                    payload.ForceOverride,
                    payload.ForceReason,
                    performedBy
                );

                return Ok(new { success = true, count = res.count, message = $"Leave allotted to {res.count} employees", skipped = res.skipped });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpDelete("allotments/{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> DeleteLeaveAllotment(string id)
        {
            try
            {
                var performedBy = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ??
                                 User.FindFirst("sub")?.Value ??
                                 User.FindFirst("id")?.Value ?? null;
                var success = await _leaveService.DeleteLeaveAllotmentWithChecksAsync(id, performedBy);
                if (!success) return NotFound(new { error = "Leave allotment not found" });
                return Ok(new { success = true, message = "Leave allotment deleted successfully" });
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(403, new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
