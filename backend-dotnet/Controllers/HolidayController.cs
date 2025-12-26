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
        public async Task<IActionResult> GetAllHolidays()
        {
            var holidays = await _holidayService.GetAllHolidaysAsync();
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

        [HttpPost]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> CreateHoliday([FromBody] Holiday holiday)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var createdHoliday = await _holidayService.CreateHolidayAsync(holiday);
                return Created($"/api/holiday/{createdHoliday.Id}", new
                {
                    id = createdHoliday.Id,
                    name = createdHoliday.Name,
                    date = createdHoliday.Date
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
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

            return Ok(new { message = "Holiday updated successfully" });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> DeleteHoliday(string id)
        {
            var success = await _holidayService.DeleteHolidayAsync(id);
            if (!success)
                return NotFound(new { message = "Holiday not found" });

            return Ok(new { message = "Holiday deleted successfully" });
        }
    }
}
