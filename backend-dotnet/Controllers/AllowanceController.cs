using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/allowances")]
    public class AllowanceController : ControllerBase
    {
        private readonly IAllowanceService _allowanceService;

        public AllowanceController(IAllowanceService allowanceService)
        {
            _allowanceService = allowanceService;
        }

        // POST /api/allowances - Create or update allowance
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateAllowance([FromBody] CreateAllowanceRequestDto request)
        {
            try
            {
                if (request == null)
                    return BadRequest(new { error = "Request body is required" });

                if (string.IsNullOrEmpty(request.EmployeeId))
                    return BadRequest(new { error = "EmployeeId is required" });

                if (request.Date == default)
                    return BadRequest(new { error = "Date is required" });

                var loggedInEmployeeId = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
                var result = await _allowanceService.CreateAllowanceAsync(request, loggedInEmployeeId);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // POST /api/allowances/bulk - Bulk submit allowances for multiple employees
        [HttpPost("bulk")]
        [Authorize]
        public async Task<IActionResult> BulkCreateAllowance([FromBody] BulkAllowanceRequestDto request)
        {
            try
            {
                if (request == null)
                    return BadRequest(new { error = "Request body is required" });

                // Handle both selectedEmployeeIds and employeeIds field names
                var employeeIds = request.SelectedEmployeeIds ?? request.EmployeeIds ?? new List<string>();

                if (employeeIds.Count == 0)
                    return BadRequest(new { error = "SelectedEmployeeIds are required" });

                if (string.IsNullOrEmpty(request.Date))
                    return BadRequest(new { error = "Date is required" });

                if (string.IsNullOrEmpty(request.AllowanceData))
                    return BadRequest(new { error = "AllowanceData is required" });

                // Set the converted employee IDs
                request.SelectedEmployeeIds = employeeIds;

                var loggedInEmployeeId = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
                var results = await _allowanceService.BulkCreateAllowanceAsync(request, loggedInEmployeeId);

                return Ok(new { data = results });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // GET /api/allowances/pending - Get pending allowances for approval
        [HttpGet("pending")]
        [Authorize]
        public async Task<IActionResult> GetPendingAllowances([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null)
        {
            try
            {
                var loggedInEmployeeId = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var role = User?.FindFirst(ClaimTypes.Role)?.Value?.ToLower() ?? "";

                // For non-admins, get only team members' allowances
                if (role != "admin" && role != "superadmin")
                {
                    var allowances = await _allowanceService.GetTeamAllowancesAsync(loggedInEmployeeId ?? "", page, pageSize);
                    var count = allowances.Count;
                    return Ok(new { data = allowances, page, pageSize, total = count });
                }

                // For admins, get all pending allowances
                var allAllowances = await _allowanceService.GetPendingAllowancesAsync(page, pageSize, search);
                return Ok(new { data = allAllowances, page, pageSize, total = allAllowances.Count });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // GET /api/allowances/all - Get all allowances (admin view)
        [HttpGet("all")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GetAllAllowances([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var allowances = await _allowanceService.GetAllAllowancesAsync(page, pageSize);
                return Ok(new { data = allowances, page, pageSize, total = allowances.Count });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // GET /api/allowances/team/all - Get all team members' allowances
        [HttpGet("team/all")]
        [Authorize]
        public async Task<IActionResult> GetTeamAllowances([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var loggedInEmployeeId = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
                var allowances = await _allowanceService.GetTeamAllAllowancesAsync(loggedInEmployeeId, page, pageSize);

                return Ok(new { data = allowances, page, pageSize, total = allowances.Count });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // GET /api/allowances/:employeeId - Get allowances for a specific employee
        [HttpGet("{employeeId}")]
        [Authorize]
        public async Task<IActionResult> GetAllowancesByEmployee(string employeeId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                if (string.IsNullOrEmpty(employeeId))
                    return BadRequest(new { error = "EmployeeId is required" });

                var loggedInEmployeeId = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var role = User?.FindFirst(ClaimTypes.Role)?.Value?.ToLower() ?? "";

                // Employees can only view their own allowances
                if (role != "admin" && role != "superadmin" && loggedInEmployeeId != employeeId)
                    return Forbid();

                var allowances = await _allowanceService.GetAllowancesByEmployeeAsync(employeeId, page, pageSize);
                return Ok(new { data = allowances, page, pageSize, total = allowances.Count });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // PUT /api/allowances/:id/approve - Approve an allowance
        [HttpPut("{id}/approve")]
        [Authorize]
        public async Task<IActionResult> ApproveAllowance(string id, [FromBody] ApproveAllowanceRequestDto request)
        {
            try
            {
                if (string.IsNullOrEmpty(id))
                    return BadRequest(new { error = "Allowance ID is required" });

                var approverId = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
                var approverName = User?.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
                var approverRole = User?.FindFirst(ClaimTypes.Role)?.Value ?? "user";

                var result = await _allowanceService.ApproveAllowanceAsync(id, request, approverId, approverName, approverRole);

                if (result == null)
                    return NotFound(new { error = "Allowance not found" });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // PUT /api/allowances/:id/reject - Reject an allowance
        [HttpPut("{id}/reject")]
        [Authorize]
        public async Task<IActionResult> RejectAllowance(string id, [FromBody] RejectAllowanceRequestDto request)
        {
            try
            {
                if (string.IsNullOrEmpty(id))
                    return BadRequest(new { error = "Allowance ID is required" });

                if (string.IsNullOrEmpty(request.RejectionReason))
                    return BadRequest(new { error = "RejectionReason is required" });

                var rejecterId = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
                var role = User?.FindFirst(ClaimTypes.Role)?.Value?.ToLower() ?? "";
                var isHigherAuthority = role == "superadmin" || role == "admin";

                var result = await _allowanceService.RejectAllowanceAsync(id, request, rejecterId, request.RejectionReason, isHigherAuthority);

                if (result == null)
                    return NotFound(new { error = "Allowance not found" });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // DELETE /api/allowances/:id - Delete an allowance
        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> DeleteAllowance(string id)
        {
            try
            {
                if (string.IsNullOrEmpty(id))
                    return BadRequest(new { error = "Allowance ID is required" });

                var result = await _allowanceService.DeleteAllowanceAsync(id);

                if (!result)
                    return NotFound(new { error = "Allowance not found" });

                return Ok(new { success = true, message = "Allowance deleted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // GET /api/allowances/caps/:employeeId - Get allowance caps for employee
        [HttpGet("caps/{employeeId}")]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> GetAllowanceCaps(string employeeId)
        {
            try
            {
                if (string.IsNullOrEmpty(employeeId))
                    return BadRequest(new { error = "EmployeeId is required" });

                var loggedInEmployeeId = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var role = User?.FindFirst(ClaimTypes.Role)?.Value?.ToLower() ?? "";

                // Employees can only view their own allowance caps
                if (role != "admin" && role != "superadmin" && loggedInEmployeeId != employeeId)
                    return Forbid();

                // Return default allowance caps
                // These are the maximum amounts an employee can claim for each allowance type
                var caps = new
                {
                    travelAllowance = 5000m,
                    foodAllowance = 3000m,
                    accommodationAllowance = 8000m,
                    mobileAllowance = 2000m,
                    internetAllowance = 1500m,
                    utilitiesAllowance = 2000m,
                    parkingAllowance = 1000m,
                    miscAllowance = 2500m
                };

                return Ok(caps);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
