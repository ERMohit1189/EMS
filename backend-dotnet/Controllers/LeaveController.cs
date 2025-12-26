using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;

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
        public async Task<IActionResult> ApproveLeaveRequest(string id, [FromBody] dynamic request)
        {
            string approverRemark = request?.approverRemark ?? "";
            var approverId = User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value ?? "";

            var success = await _leaveService.ApproveLeaveRequestAsync(id, approverRemark, approverId);
            if (!success)
                return NotFound(new { message = "Leave request not found" });

            return Ok(new { message = "Leave request approved successfully" });
        }

        [HttpPost("{id}/reject")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> RejectLeaveRequest(string id, [FromBody] dynamic request)
        {
            string approverRemark = request?.approverRemark ?? "";
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

            return Ok(allotment);
        }

        [HttpGet("allotments")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GetAllLeaveAllotments()
        {
            var allotments = await _leaveService.GetAllLeaveAllotmentsAsync();
            return Ok(allotments);
        }

        [HttpPost("allotments")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> CreateLeaveAllotment([FromBody] LeaveAllotment allotment)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var createdAllotment = await _leaveService.CreateLeaveAllotmentAsync(allotment);
                return Created($"/api/leave/allotments/{createdAllotment.Id}", new
                {
                    id = createdAllotment.Id,
                    employeeId = createdAllotment.EmployeeId
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("allotments/{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> UpdateLeaveAllotment(string id, [FromBody] LeaveAllotment allotment)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var updatedAllotment = await _leaveService.UpdateLeaveAllotmentAsync(id, allotment);
            if (updatedAllotment == null)
                return NotFound(new { message = "Leave allotment not found" });

            return Ok(new { message = "Leave allotment updated successfully" });
        }

        [HttpPost("apply")]
        [Authorize]
        public async Task<IActionResult> ApplyLeave([FromBody] dynamic request)
        {
            try
            {
                string employeeId = request.employeeId;
                string leaveType = request.leaveType;
                string startDate = request.startDate;
                string endDate = request.endDate;
                string remark = request.remark ?? "";

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
        public async Task<IActionResult> ValidateDates([FromBody] dynamic request)
        {
            try
            {
                string startDate = request.startDate;
                string endDate = request.endDate;

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

        [HttpGet("allotments/years/{employeeId}")]
        [Authorize]
        public async Task<IActionResult> GetLeaveAllotmentYears(string employeeId)
        {
            var allotments = await _leaveService.GetAllLeaveAllotmentsAsync();
            var yearsForEmployee = allotments
                .Where(la => la.EmployeeId == employeeId)
                .Select(la => la.Year)
                .Distinct()
                .OrderByDescending(y => y)
                .ToList();

            return Ok(new { years = yearsForEmployee });
        }
    }
}
