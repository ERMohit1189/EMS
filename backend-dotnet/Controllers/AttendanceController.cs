using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;
using VendorRegistrationBackend.DTOs;

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

            var attendance = await _attendanceService.GetAttendanceByEmployeeMonthAsync(employeeId, month, year);
            if (attendance == null)
                return Ok(new { }); // Return empty object for new/unsaved attendance

            // Map to DTO to avoid circular references with Employee navigation property
            var dto = new AttendanceResponseDto
            {
                Id = attendance.Id,
                EmployeeId = attendance.EmployeeId,
                Month = attendance.Month,
                Year = attendance.Year,
                AttendanceData = attendance.AttendanceData,
                Submitted = attendance.Submitted,
                SubmittedAt = attendance.SubmittedAt,
                Locked = attendance.Locked,
                LockedAt = attendance.LockedAt,
                LockedBy = attendance.LockedBy
            };
            return Ok(dto);
        }

        [HttpGet("employee/{employeeId}/month/{month}/year/{year}")]
        [Authorize]
        public async Task<IActionResult> GetEmployeeAttendanceAlt(string employeeId, int month, int year)
        {
            if (month < 1 || month > 12)
                return BadRequest(new { message = "Month must be between 1 and 12" });

            var attendance = await _attendanceService.GetAttendanceByEmployeeMonthAsync(employeeId, month, year);
            if (attendance == null)
                return Ok(new { }); // Return empty object for new/unsaved attendance

            // Map to DTO to avoid circular references with Employee navigation property
            var dto = new AttendanceResponseDto
            {
                Id = attendance.Id,
                EmployeeId = attendance.EmployeeId,
                Month = attendance.Month,
                Year = attendance.Year,
                AttendanceData = attendance.AttendanceData,
                Submitted = attendance.Submitted,
                SubmittedAt = attendance.SubmittedAt,
                Locked = attendance.Locked,
                LockedAt = attendance.LockedAt,
                LockedBy = attendance.LockedBy
            };
            return Ok(dto);
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
        public async Task<IActionResult> CreateOrUpdateAttendance([FromBody] CreateAttendanceDto payload)
        {
            try
            {
                if (payload == null)
                    return BadRequest(new { error = "Invalid payload" });

                string employeeId = payload.EmployeeId;
                int month = payload.Month;
                int year = payload.Year;

                if (string.IsNullOrEmpty(employeeId) || month < 1 || month > 12 || year <= 0 || payload.AttendanceData.ValueKind == System.Text.Json.JsonValueKind.Undefined)
                    return BadRequest(new { error = "Missing required fields: employeeId, month, year, attendanceData" });

                Dictionary<string, object> dataDict;
                try
                {
                    var json = System.Text.Json.JsonSerializer.Serialize(payload.AttendanceData);
                    dataDict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new Dictionary<string, object>();
                }
                catch (Exception ex)
                {
                    return BadRequest(new { error = "Invalid attendanceData format", details = ex.Message });
                }

                var performedBy = User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value ?? null;
                try
                {
                    var (attendance, skippedDays) = await _attendanceService.UpsertAttendanceAsync(employeeId, month, year, dataDict, performedBy);
                    if (skippedDays != null && skippedDays.Count > 0)
                    {
                        return Ok(new { success = true, attendance, skippedDays, message = $"Skipped {skippedDays.Count} locked day(s): {string.Join(", ", skippedDays)}" });
                    }

                    return Ok(new { success = true, attendance });
                }
                catch (InvalidOperationException ex)
                {
                    return StatusCode(403, new { error = ex.Message });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
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

        [HttpPost("bulk")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> BulkUpsert([FromBody] BulkAttendanceDto payload)
        {
            try
            {
                if (payload == null)
                    return BadRequest(new { error = "Invalid payload" });

                var employeeIds = payload.EmployeeIds ?? new List<string>();
                int month = payload.Month;
                int year = payload.Year;
                var attendanceData = payload.AttendanceData;
                string? mode = payload.Mode;
                int? day = payload.Day;

                Dictionary<string, object> dataDict;
                try
                {
                    var json = System.Text.Json.JsonSerializer.Serialize(attendanceData);
                    dataDict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new Dictionary<string, object>();
                }
                catch (Exception ex)
                {
                    return BadRequest(new { error = "Invalid attendanceData format", details = ex.Message });
                }

                var performedBy = User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value ?? null;
                bool lockAfterSave = payload.LockAfterSave;
                var res = await _attendanceService.BulkUpsertAttendanceAsync(employeeIds, month, year, dataDict, mode, day, lockAfterSave, performedBy);
                return Ok(new { success = true, results = new { success = res.Success, failed = res.Failed, skipped = res.Skipped }, summary = new { total = res.Total, successful = res.Success.Count, failed = res.Failed.Count }, lockedCount = res.LockedCount });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("lock")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> LockMonth([FromBody] LockAttendanceDto payload)
        {
            try
            {
                if (payload == null)
                    return BadRequest(new { error = "Invalid payload" });

                int month = payload.Month;
                int year = payload.Year;
                bool lockAll = payload.LockAll;
                var performedBy = User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value ?? null;

                int count = await _attendanceService.LockAttendanceMonthAsync(month, year, lockAll, performedBy);
                return Ok(new { success = true, count, message = $"Locked attendance for {count} employees" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("lock-status")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> LockStatus([FromQuery] int month, [FromQuery] int year)
        {
            var (locked, count) = await _attendanceService.GetLockStatusAsync(month, year);
            return Ok(new { locked, count });
        }

        [HttpPost("unlock")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> UnlockMonth([FromBody] UnlockAttendanceDto payload)
        {
            try
            {
                if (payload == null)
                    return BadRequest(new { error = "Invalid payload" });

                int month = payload.Month;
                int year = payload.Year;
                bool unlockAll = payload.UnlockAll;
                string? employeeId = payload.EmployeeId;

                int count = await _attendanceService.UnlockAttendanceMonthAsync(month, year, unlockAll, employeeId);
                return Ok(new { success = true, count, message = $"Unlocked attendance for {count} employees" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("{id}/lock")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> LockAttendance(string id)
        {
            var success = await _attendanceService.LockAttendanceByIdAsync(id);
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
