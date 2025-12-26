using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/session")]
    public class SessionController : ControllerBase
    {
        [HttpGet]
        [AllowAnonymous]
        public IActionResult GetSession()
        {
            try
            {
                // Check if user is authenticated
                var isAuthenticated = User?.Identity?.IsAuthenticated ?? false;

                if (!isAuthenticated)
                {
                    return Ok(new { isReportingPerson = false, authenticated = false });
                }

                // Get user info from claims - be resilient to different claim names
                var email = User?.FindFirst(ClaimTypes.Email)?.Value;
                var role = User?.FindFirst("Role")?.Value ?? User?.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
                var userId = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var name = User?.FindFirst(ClaimTypes.Name)?.Value;

                return Ok(new
                {
                    isReportingPerson = false,
                    authenticated = true,
                    employeeId = userId,
                    employeeEmail = email,
                    employeeName = name,
                    employeeRole = role
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
