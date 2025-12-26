using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        public LeaveController(ILeaveService leaveService)
        {
            _leaveService = leaveService;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetLeaveRequest(string id)
        {
            var leaveRequest = await _leaveService.GetLeaveRequestByIdAsync(id);
            if (leaveRequest == null)
                return NotFound(new { message = "Leave request not found" });

            return Ok(leaveRequest);
        }

        [HttpGet("employee/{employeeId}")]
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
            var approverId = User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value ?? "";

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
            var approverId = User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value ?? "";

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
        public async Task<IActionResult> GetLeaveAllotment(string employeeId, int year)
        {
            var allotment = await _leaveService.GetLeaveAllotmentAsync(employeeId, year);
            if (allotment == null)
                return NotFound(new { message = "Leave allotment not found" });

            return Ok(allotment);
        }

        [HttpGet("employee/{employeeId}/{year}")]
        public async Task<IActionResult> GetLeaveAllotmentByEmployee(string employeeId, int year)
        {
            var allotment = await _leaveService.GetLeaveAllotmentAsync(employeeId, year);
            if (allotment == null)
                return NotFound(new { message = "Leave allotment not found" });

            // Map to DTO to avoid circular references with Employee navigation property
            var dto = new EmployeeLeaveAllotmentDto
            {
                Id = allotment.Id,
                Year = allotment.Year,
                MedicalLeave = allotment.MedicalLeave,
                CasualLeave = allotment.CasualLeave,
                EarnedLeave = allotment.EarnedLeave,
                SickLeave = allotment.SickLeave,
                PersonalLeave = allotment.PersonalLeave,
                UnpaidLeave = allotment.UnpaidLeave,
                LeaveWithoutPay = allotment.LeaveWithoutPay,
                CarryForwardEarned = allotment.CarryForwardEarned,
                CarryForwardPersonal = allotment.CarryForwardPersonal
            };

            return Ok(dto);
        }

        [HttpGet("employee/{employeeId}/{year}/exists")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> LeaveAllotmentExists(string employeeId, int year)
        {
            var exists = await _leaveService.LeaveAllotmentExistsAsync(employeeId, year);
            return Ok(new { exists });
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

                var performedBy = User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value ?? null;
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

                var performedBy = User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value ?? null;

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
        [Authorize]
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
        [Authorize]
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
        [Authorize]
        public async Task<IActionResult> GetMyLeaves()
        {
            var userId = User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value ?? "";
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User not authenticated" });

            var leaveRequests = await _leaveService.GetLeaveRequestsByEmployeeAsync(userId);
            return Ok(leaveRequests);
        }

        [HttpGet("pending")]
        [Authorize]
        public async Task<IActionResult> GetPendingLeaves([FromQuery] string teamId = "", [FromQuery] string employeeId = "")
        {
            var leaveRequests = await _leaveService.GetLeaveRequestsByStatusAsync("pending");

            // Filter by teamId or employeeId if provided
            if (!string.IsNullOrEmpty(employeeId))
            {
                leaveRequests = leaveRequests.Where(lr => lr.EmployeeId == employeeId).ToList();
            }

            return Ok(leaveRequests);
        }

        [HttpGet("employee/{employeeId}/years")]
        [Authorize]
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

                var performedBy = User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value ?? null;
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
                var performedBy = User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value ?? null;
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
