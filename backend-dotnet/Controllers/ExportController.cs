using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.DTOs;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api")]
    public class ExportController : ControllerBase
    {
        // In-memory storage for export headers (can be replaced with database storage)
        private static ExportHeaderDto? _exportHeader;

        [HttpGet("export-headers")]
        [AllowAnonymous]
        public IActionResult GetExportHeaders()
        {
            try
            {
                // Return stored header or default empty header
                return Ok(_exportHeader ?? new ExportHeaderDto());
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("export-headers")]
        [AllowAnonymous]
        public IActionResult SaveExportHeaders([FromBody] ExportHeaderDto header)
        {
            try
            {
                if (header == null)
                    return BadRequest(new { error = "Header data is required" });

                _exportHeader = header;
                return Ok(header);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
