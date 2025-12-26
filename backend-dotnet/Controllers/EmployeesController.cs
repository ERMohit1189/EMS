using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeesController : ControllerBase
    {
        private readonly IEmployeeService _employeeService;

        public EmployeesController(IEmployeeService employeeService)
        {
            _employeeService = employeeService;
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> GetEmployee(string id)
        {
            var employee = await _employeeService.GetEmployeeByIdAsync(id);
            if (employee == null)
                return NotFound(new { message = "Employee not found" });

            return Ok(employee);
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllEmployees([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 50;
            if (pageSize > 500) pageSize = 500;

            var (employees, totalCount) = await _employeeService.GetEmployeesPagedAsync(page, pageSize);

            // Hide superadmin entries from non-superadmin callers
            if (!(User?.Identity?.IsAuthenticated ?? false) || !User.IsInRole("superadmin"))
            {
                var filtered = employees.Where(e => (e.Role ?? string.Empty).ToLowerInvariant() != "superadmin").ToList();
                return Ok(new { data = filtered, totalCount = filtered.Count });
            }

            return Ok(new { data = employees, totalCount });
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> CreateEmployee([FromBody] CreateEmployeeDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var employee = await _employeeService.CreateEmployeeAsync(dto);
                return Created($"/api/employees/{employee.Id}", new
                {
                    id = employee.Id,
                    empCode = employee.EmpCode,
                    email = employee.Email
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateEmployee(string id, [FromBody] UpdateEmployeeDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var employee = await _employeeService.UpdateEmployeeAsync(id, dto);
            if (employee == null)
                return NotFound(new { message = "Employee not found" });

            return Ok(new { message = "Employee updated successfully" });
        }

        [HttpPost("{id}/change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword(string id, [FromBody] dynamic request)
        {
            string oldPassword = request.oldPassword;
            string newPassword = request.newPassword;

            if (string.IsNullOrEmpty(oldPassword) || string.IsNullOrEmpty(newPassword))
                return BadRequest(new { message = "Old and new passwords are required" });

            var success = await _employeeService.ChangePasswordAsync(id, oldPassword, newPassword);
            if (!success)
                return BadRequest(new { message = "Invalid old password or employee not found" });

            return Ok(new { message = "Password changed successfully" });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> DeleteEmployee(string id)
        {
            var success = await _employeeService.DeleteEmployeeAsync(id);
            if (!success)
                return NotFound(new { message = "Employee not found" });

            return Ok(new { message = "Employee deleted successfully" });
        }

        // Sync credentials: set password for an employee (admin only)
        [HttpPost("sync-credentials")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> SyncCredentials([FromBody] SyncCredentialsDto dto)
        {
            if (dto == null || string.IsNullOrEmpty(dto.EmployeeId) || string.IsNullOrEmpty(dto.Password))
                return BadRequest(new { message = "EmployeeId and Password are required" });

            var success = await _employeeService.SyncCredentialsAsync(dto.EmployeeId, dto.Password);
            if (!success)
                return BadRequest(new { message = "Employee not found or failed to update" });

            return Ok(new { message = "Credentials synced successfully" });
        }

        // Get employees pending credentials (no password set)
        [HttpGet("pending-credentials")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> PendingCredentials()
        {
            var list = await _employeeService.GetEmployeesWithoutCredentialsAsync();
            return Ok(new { data = list });
        }
    }
}