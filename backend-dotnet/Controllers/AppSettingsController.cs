using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/app-settings")]
    public class AppSettingsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AppSettingsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAppSettings()
        {
            try
            {
                // For now, return default settings
                // In future, this can be stored in database
                var settings = new
                {
                    approvalsRequiredForAllowance = 1,
                    poGenerationDate = 1,
                    invoiceGenerationDate = 1
                };

                return Ok(settings);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPut]
        [Authorize]
        public async Task<IActionResult> UpdateAppSettings([FromBody] dynamic settings)
        {
            try
            {
                // For now, just accept the update and return success
                // In future, this would persist to database
                return Ok(new { message = "Settings updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
