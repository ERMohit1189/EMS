using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TeamsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TeamsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllTeams()
        {
            var departments = await _context.Departments
                .Select(d => new { id = d.Id, name = d.Name })
                .ToListAsync();

            return Ok(departments);
        }

        [HttpGet("my-reporting-teams")]
        public async Task<IActionResult> GetMyReportingTeams()
        {
            var userId = User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value ?? "";
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User not authenticated" });

            // For now, return all departments as teams that the user can manage
            // In a real system, this would be based on reporting relationships in the Employee model
            var currentUser = await _context.Employees.FindAsync(userId);
            if (currentUser == null)
                return NotFound(new { message = "User not found" });

            // If admin/superadmin, return all departments
            if (currentUser.Role == "admin" || currentUser.Role == "superadmin")
            {
                var allDepartments = await _context.Departments
                    .Select(d => new { id = d.Id, name = d.Name })
                    .ToListAsync();
                return Ok(allDepartments);
            }

            // For regular employees, return their own department
            if (currentUser.DepartmentId != null)
            {
                var userDept = await _context.Departments
                    .Where(d => d.Id == currentUser.DepartmentId)
                    .Select(d => new { id = d.Id, name = d.Name })
                    .ToListAsync();
                return Ok(userDept);
            }

            return Ok(new List<object>());
        }
    }
}
