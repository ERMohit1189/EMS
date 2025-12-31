using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Serilog;
using System.Security.Claims;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api")]
    public class SessionController : ControllerBase
    {
        /// <summary>
        /// Returns current session information based on JWT token (if present).
        /// This endpoint is intentionally AllowAnonymous for frontend session restore.
        /// </summary>
        [HttpGet("session")]
        [AllowAnonymous]
        public IActionResult GetSession()
        {
            try
            {
                var identity = User?.Identity;
                var isAuthenticated = identity?.IsAuthenticated ?? false;

                Log.Information(
                    "[Session] Request received | IsAuthenticated={IsAuthenticated} | AuthType={AuthType}",
                    isAuthenticated,
                    identity?.AuthenticationType ?? "none"
                );

                // --------------------
                // NOT AUTHENTICATED
                // --------------------
                if (!isAuthenticated)
                {
                    return Ok(new
                    {
                        authenticated = false
                    });
                }

                // --------------------
                // CLAIMS (STANDARD)
                // --------------------
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var name = User.FindFirstValue(ClaimTypes.Name);
                var email = User.FindFirstValue(ClaimTypes.Email);
                var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

                // Optional custom claims (safe defaults)
                var userType = User.FindFirstValue("UserType") ?? "employee";

                var isReportingPerson =
                    User.FindFirstValue("IsReportingPerson")
                        ?.Equals("true", StringComparison.OrdinalIgnoreCase) == true;

                Log.Information(
                    "[Session] User resolved | UserId={UserId} | Name={Name} | Email={Email} | Role={Role} | UserType={UserType} | IsReportingPerson={IsReportingPerson}",
                    userId,
                    name,
                    email,
                    role,
                    userType,
                    isReportingPerson
                );

                // --------------------
                // VENDOR RESPONSE
                // --------------------
                if (userType.Equals("vendor", StringComparison.OrdinalIgnoreCase))
                {
                    return Ok(new
                    {
                        authenticated = true,
                        userType = "vendor",
                        vendorId = userId,
                        vendorName = name,
                        vendorEmail = email,
                        vendorRole = role
                    });
                }

                // --------------------
                // EMPLOYEE RESPONSE
                // --------------------
                return Ok(new
                {
                    authenticated = true,
                    userType = "employee",
                    employeeId = userId,
                    employeeName = name,
                    employeeEmail = email,
                    employeeRole = role,
                    isReportingPerson
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "[Session] Exception while resolving session");

                return Ok(new
                {
                    authenticated = false
                });
            }
        }
    }
}
