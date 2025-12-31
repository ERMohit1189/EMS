using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Data;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CirclesController : ControllerBase
    {
        private readonly ICircleService _circleService;

        public CirclesController(ICircleService circleService)
        {
            _circleService = circleService;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllCircles([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 50;
            if (pageSize > 500) pageSize = 500;

            var (circles, totalCount) = await _circleService.GetCirclesPagedAsync(page, pageSize);
            return Ok(new { data = circles, totalCount });
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCircle(string id)
        {
            var circle = await _circleService.GetCircleByIdAsync(id);
            if (circle == null)
                return NotFound(new { message = "Circle not found" });

            return Ok(circle);
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> CreateCircle([FromBody] Circle circle)
        {
            if (string.IsNullOrEmpty(circle.Name))
                return BadRequest(new { message = "Circle name is required" });

            try
            {
                var createdCircle = await _circleService.CreateCircleAsync(circle);
                return Created($"/api/circles/{createdCircle.Id}", createdCircle);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateCircle(string id, [FromBody] Circle circle)
        {
            if (string.IsNullOrEmpty(circle.Name))
                return BadRequest(new { message = "Circle name is required" });

            var updatedCircle = await _circleService.UpdateCircleAsync(id, circle);
            if (updatedCircle == null)
                return NotFound(new { message = "Circle not found" });

            return Ok(new { message = "Circle updated successfully", data = updatedCircle });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> DeleteCircle(string id)
        {
            var success = await _circleService.DeleteCircleAsync(id);
            if (!success)
                return NotFound(new { message = "Circle not found" });

            return Ok(new { message = "Circle deleted successfully" });
        }
    }
}
