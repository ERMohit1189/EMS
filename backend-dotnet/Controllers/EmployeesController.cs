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

        [HttpPut("{id}/profile")]
        [Authorize]
        public async Task<IActionResult> UpdateEmployeeProfile(string id)
        {
            try
            {
                var employee = await _employeeService.GetEmployeeByIdAsync(id);
                if (employee == null)
                    return NotFound(new { message = "Employee not found" });

                // Handle photo upload if provided
                var photoFile = Request.Form.Files.GetFile("photo");
                string? photoPath = null;

                if (photoFile != null && photoFile.Length > 0)
                {
                    // Validate file size (max 2MB)
                    if (photoFile.Length > 2 * 1024 * 1024)
                        return BadRequest(new { error = "Photo size should be less than 2MB" });

                    // Validate file type
                    var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
                    var extension = Path.GetExtension(photoFile.FileName).ToLowerInvariant();
                    if (!allowedExtensions.Contains(extension))
                        return BadRequest(new { error = "Only JPG, PNG, and GIF files are allowed" });

                    // Delete old photo if it exists
                    if (!string.IsNullOrEmpty(employee.Photo))
                    {
                        try
                        {
                            var oldFilePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", employee.Photo.TrimStart('/'));
                            if (System.IO.File.Exists(oldFilePath))
                            {
                                System.IO.File.Delete(oldFilePath);
                            }
                        }
                        catch (Exception ex)
                        {
                            // Log error but continue - file deletion is not critical
                            Console.WriteLine($"Error deleting old photo: {ex.Message}");
                        }
                    }

                    // Save file to wwwroot/uploads/photos
                    var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "photos");
                    Directory.CreateDirectory(uploadsDir);

                    var fileName = $"{Guid.NewGuid()}{extension}";
                    var filePath = Path.Combine(uploadsDir, fileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await photoFile.CopyToAsync(stream);
                    }

                    photoPath = $"/uploads/photos/{fileName}";
                    Console.WriteLine($"Photo saved successfully: {photoPath}");
                }

                // Map form data to UpdateEmployeeDto
                var dto = new UpdateEmployeeDto
                {
                    Name = Request.Form["name"].ToString() ?? employee.Name,
                    FatherName = Request.Form["fatherName"].ToString(),
                    Mobile = Request.Form["mobile"].ToString(),
                    AlternateNo = Request.Form["alternateNo"].ToString(),
                    Address = Request.Form["address"].ToString(),
                    City = Request.Form["city"].ToString(),
                    State = Request.Form["state"].ToString(),
                    Country = Request.Form["country"].ToString(),
                    BloodGroup = Request.Form["bloodGroup"].ToString(),
                    Aadhar = Request.Form["aadhar"].ToString(),
                    PAN = Request.Form["pan"].ToString(),
                    Photo = photoPath, // Include the photo path if uploaded
                };

                // Parse date of birth if provided
                if (Request.Form.TryGetValue("dob", out var dobValue) && !string.IsNullOrEmpty(dobValue.ToString()))
                {
                    if (DateTime.TryParse(dobValue.ToString(), out var dob))
                    {
                        dto.DateOfBirth = dob;
                    }
                }

                // Update employee with profile data
                var updatedEmployee = await _employeeService.UpdateEmployeeAsync(id, dto);
                if (updatedEmployee == null)
                    return BadRequest(new { error = "Failed to update employee profile" });

                // Build response
                if (photoFile != null && photoFile.Length > 0)
                {
                    return Ok(new { message = "Profile updated successfully", photo = updatedEmployee.Photo });
                }

                return Ok(new { message = "Profile updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("{id}/change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword(string id, [FromBody] ChangePasswordDto request)
        {
            if (!ModelState.IsValid || string.IsNullOrEmpty(request?.OldPassword) || string.IsNullOrEmpty(request?.NewPassword))
                return BadRequest(new { message = "Current and new passwords are required" });

            var success = await _employeeService.ChangePasswordAsync(id, request.OldPassword, request.NewPassword);
            if (!success)
                return BadRequest(new { message = "Invalid current password or employee not found" });

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