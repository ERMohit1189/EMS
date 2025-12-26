using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ZonesController : ControllerBase
    {
        private readonly IZoneService _zoneService;

        public ZonesController(IZoneService zoneService)
        {
            _zoneService = zoneService;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllZones([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 50;
            if (pageSize > 500) pageSize = 500;

            var (zones, totalCount) = await _zoneService.GetZonesPagedAsync(page, pageSize);
            return Ok(new { data = zones, totalCount });
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetZone(string id)
        {
            var zone = await _zoneService.GetZoneByIdAsync(id);
            if (zone == null)
                return NotFound(new { message = "Zone not found" });

            return Ok(zone);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateZone([FromBody] Zone zone)
        {
            if (string.IsNullOrEmpty(zone.Name))
                return BadRequest(new { message = "Zone name is required" });

            try
            {
                var createdZone = await _zoneService.CreateZoneAsync(zone);
                return Created($"/api/zones/{createdZone.Id}", createdZone);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateZone(string id, [FromBody] Zone zone)
        {
            if (string.IsNullOrEmpty(zone.Name))
                return BadRequest(new { message = "Zone name is required" });

            var updatedZone = await _zoneService.UpdateZoneAsync(id, zone);
            if (updatedZone == null)
                return NotFound(new { message = "Zone not found" });

            return Ok(new { message = "Zone updated successfully", data = updatedZone });
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteZone(string id)
        {
            var success = await _zoneService.DeleteZoneAsync(id);
            if (!success)
                return NotFound(new { message = "Zone not found" });

            return Ok(new { message = "Zone deleted successfully" });
        }
    }
}
