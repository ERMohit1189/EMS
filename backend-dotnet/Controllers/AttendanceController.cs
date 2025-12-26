using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AttendanceController : ControllerBase
    {
        private readonly IAttendanceService _attendanceService;

        public AttendanceController(IAttendanceService attendanceService)
        {
            _attendanceService = attendanceService;
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> GetAttendance(string id)
        {
            var attendance = await _attendanceService.GetAttendanceByIdAsync(id);
            if (attendance == null)
                return NotFound(new { message = "Attendance record not found" });

            return Ok(attendance);
        }

        [HttpGet("{employeeId}/{month}/{year}")]
        [Authorize]
        public async Task<IActionResult> GetEmployeeAttendance(string employeeId, int month, int year)
        {
            if (month < 1 || month > 12)
                return BadRequest(new { message = "Month must be between 1 and 12" });

            var attendance = await _attendanceService.GetAttendanceByEmployeeAsync(employeeId, month, year);
            return Ok(attendance);
        }

        [HttpGet("employee/{employeeId}/month/{month}/year/{year}")]
        [Authorize]
        public async Task<IActionResult> GetEmployeeAttendanceAlt(string employeeId, int month, int year)
        {
            if (month < 1 || month > 12)
                return BadRequest(new { message = "Month must be between 1 and 12" });

            var attendance = await _attendanceService.GetAttendanceByEmployeeAsync(employeeId, month, year);
            return Ok(attendance);
        }

        [HttpGet]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GetAllAttendance()
        {
            var attendance = await _attendanceService.GetAllAttendanceAsync();
            return Ok(attendance);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateAttendance([FromBody] Attendance attendance)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var createdAttendance = await _attendanceService.CreateAttendanceAsync(attendance);
                return Created($"/api/attendance/{createdAttendance.Id}", new
                {
                    id = createdAttendance.Id,
                    employeeId = createdAttendance.EmployeeId,
                    month = createdAttendance.Month,
                    year = createdAttendance.Year
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> UpdateAttendance(string id, [FromBody] Attendance attendance)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var updatedAttendance = await _attendanceService.UpdateAttendanceAsync(id, attendance);
            if (updatedAttendance == null)
                return NotFound(new { message = "Attendance record not found" });

            return Ok(new { message = "Attendance updated successfully" });
        }

        [HttpPost("{id}/lock")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> LockAttendance(string id)
        {
            var success = await _attendanceService.LockAttendanceAsync(id);
            if (!success)
                return NotFound(new { message = "Attendance record not found" });

            return Ok(new { message = "Attendance locked successfully" });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> DeleteAttendance(string id)
        {
            var success = await _attendanceService.DeleteAttendanceAsync(id);
            if (!success)
                return NotFound(new { message = "Attendance record not found" });

            return Ok(new { message = "Attendance deleted successfully" });
        }
    }
}
