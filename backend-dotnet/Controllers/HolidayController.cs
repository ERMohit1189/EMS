using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/holidays")]
    [Route("api/[controller]")]
    [Authorize]
    public class HolidayController : ControllerBase
    {
        private readonly IHolidayService _holidayService;

        public HolidayController(IHolidayService holidayService)
        {
            _holidayService = holidayService;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetHoliday(string id)
        {
            var holiday = await _holidayService.GetHolidayByIdAsync(id);
            if (holiday == null)
                return NotFound(new { message = "Holiday not found" });

            return Ok(holiday);
        }

        [HttpGet]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GetAllHolidays([FromQuery] int? year, [FromQuery] string? state)
        {
            var holidays = await _holidayService.GetAllHolidaysAsync(year, state);
            return Ok(holidays);
        }

        [HttpGet("year/{year}")]
        public async Task<IActionResult> GetHolidaysByYear(int year)
        {
            if (year < 2020 || year > 2099)
                return BadRequest(new { message = "Year must be between 2020 and 2099" });

            var holidays = await _holidayService.GetHolidaysByYearAsync(year);
            return Ok(holidays);
        }

        // Get holidays for a specific month (used by employee-side logic)
        [HttpGet("month/{year}/{month}")]
        [Authorize]
        public async Task<IActionResult> GetHolidaysForMonth(int year, int month, [FromQuery] string? state)
        {
            if (month < 1 || month > 12) return BadRequest(new { message = "Invalid month" });
            var holidays = await _holidayService.GetHolidaysForMonthAsync(year, month, state);
            return Ok(holidays);
        }

        [HttpPost]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> UpsertHoliday([FromBody] Holiday holiday)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var (result, isUpdated) = await _holidayService.UpsertHolidayAsync(holiday);
            return Ok(new {
                id = result.Id,
                name = result.Name,
                date = result.Date.ToString("yyyy-MM-dd"),
                type = result.Type,
                description = result.Description,
                state = result.State,
                isActive = result.IsActive,
                createdAt = result.CreatedAt,
                updatedAt = result.UpdatedAt,
                isUpdated
            });
        }

        [HttpPost("bulk")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> BulkUpsert([FromBody] object payload)
        {
            try
            {
                var holidaysObj = (payload as System.Text.Json.JsonElement?).Value.GetProperty("holidays").EnumerateArray();
                var list = new List<Holiday>();
                foreach (var h in holidaysObj)
                {
                    var hol = new Holiday {
                        Name = h.GetProperty("name").GetString() ?? string.Empty,
                        Date = DateTime.Parse(h.GetProperty("date").GetString()),
                        Type = h.TryGetProperty("type", out var t) ? t.GetString() ?? "public" : "public",
                        Description = h.TryGetProperty("description", out var d) ? d.GetString() : null,
                        State = h.TryGetProperty("state", out var s) ? s.GetString() : null,
                        IsActive = true
                    };
                    list.Add(hol);
                }

                var results = await _holidayService.BulkUpsertAsync(list);
                var outList = results.Select(r => new { holiday = r.holiday, isUpdated = r.isUpdated }).ToList();
                var inserted = outList.Count(r => r.isUpdated == false);
                var updated = outList.Count(r => r.isUpdated == true);
                return Ok(new { holidays = outList, inserted, updated });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("generate")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> Generate([FromBody] object payload)
        {
            try
            {
                var json = (payload as System.Text.Json.JsonElement?).Value;
                var year = json.TryGetProperty("year", out var y) ? y.GetInt32() : DateTime.UtcNow.Year;
                var state = json.TryGetProperty("state", out var s) ? s.GetString() : null;
                var suggested = await _holidayService.GenerateHolidaySuggestionsAsync(year, state);
                return Ok(new { holidays = suggested });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> UpdateHoliday(string id, [FromBody] Holiday holiday)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var updatedHoliday = await _holidayService.UpdateHolidayAsync(id, holiday);
            if (updatedHoliday == null)
                return NotFound(new { message = "Holiday not found" });

            return Ok(updatedHoliday);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> DeleteHoliday(string id)
        {
            var success = await _holidayService.DeleteHolidayAsync(id);
            if (!success)
                return NotFound(new { message = "Holiday not found" });

            return Ok(new { success = true, message = "Holiday deleted successfully" });
        }
    }
}
