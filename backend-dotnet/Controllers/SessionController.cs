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

                // Get user info from claims
                var email = User?.FindFirst(ClaimTypes.Email)?.Value;
                var role = User?.FindFirst(ClaimTypes.Role)?.Value;
                var userId = User?.FindFirst("userId")?.Value;

                // For now, return basic session info
                // In future, can query database for isReportingPerson flag
                return Ok(new
                {
                    isReportingPerson = false, // Default: can be set based on user role/database
                    authenticated = true,
                    email,
                    role,
                    userId
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
