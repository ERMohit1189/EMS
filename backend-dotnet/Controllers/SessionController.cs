using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api")]
    public class SessionController : ControllerBase
    {
        [HttpGet("session")]
        [AllowAnonymous]
        public IActionResult GetSession()
        {
            try
            {
                // Check if user is authenticated
                var isAuthenticated = User?.Identity?.IsAuthenticated ?? false;

                System.Diagnostics.Debug.WriteLine($"[SessionController] IsAuthenticated: {isAuthenticated}");
                System.Diagnostics.Debug.WriteLine($"[SessionController] User Identity: {User?.Identity?.AuthenticationType ?? "null"}");

                if (!isAuthenticated)
                {
                    return Ok(new { authenticated = false });
                }

                // Get user info from claims - be resilient to different claim names
                var email = User?.FindFirst(ClaimTypes.Email)?.Value;
                var role = User?.FindFirst("Role")?.Value ?? User?.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
                var userId = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var name = User?.FindFirst(ClaimTypes.Name)?.Value;
                var userType = User?.FindFirst("UserType")?.Value ?? "employee"; // Default to employee

                System.Diagnostics.Debug.WriteLine($"[SessionController] User: {userId}, Email: {email}, Role: {role}, UserType: {userType}");

                return Ok(new
                {
                    authenticated = true,
                    userType = userType,
                    employeeId = userId,
                    employeeEmail = email,
                    employeeName = name,
                    employeeRole = role,
                    isReportingPerson = User?.FindFirst("IsReportingPerson")?.Value?.ToLower() == "true",
                    vendorId = User?.FindFirst("VendorId")?.Value // For vendor users
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[SessionController] Error: {ex.Message}");
                return Ok(new { authenticated = false, error = ex.Message });
            }
        }
    }
}
