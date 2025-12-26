using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Services;
using System.Security.Claims;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuthService _authService;

        public AuthController(AppDbContext context, IAuthService authService)
        {
            _context = context;
            _authService = authService;
        }

        [HttpGet("login")]
        [AllowAnonymous]
        public IActionResult GetLogin([FromQuery] string? returnUrl)
        {
            // Handle GET redirect from cookie authentication middleware
            // Return 401 Unauthorized to indicate login is required
            return Unauthorized(new {
                message = "Authentication required",
                returnUrl = returnUrl
            });
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                return BadRequest(new { message = "Email and password are required" });

            var user = await _authService.AuthenticateAsync(request.Email, request.Password);

            if (user == null)
                return Unauthorized(new { success = false, message = "Invalid credentials" });

            // Create session (persistent server-side session id)
            var sessionId = await _authService.CreateSessionAsync(user);

            // Set authentication cookie (ASP.NET cookies for ClaimsPrincipal)
            var claims = new[] {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role ?? "user"),
                // Keep legacy claim name for compatibility
                new Claim("Role", user.Role ?? "user"),
                // Add UserType claim for session validation
                new Claim("UserType", "employee")
            };

            var claimsIdentity = new ClaimsIdentity(claims, "Cookies");
            var claimsPrincipal = new ClaimsPrincipal(claimsIdentity);

            await HttpContext.SignInAsync("Cookies", claimsPrincipal);

            // Also set a server session id cookie (sid) so client and DB rows can be correlated
            var cookieOptions = new Microsoft.AspNetCore.Http.CookieOptions
            {
                HttpOnly = true,
                SameSite = Microsoft.AspNetCore.Http.SameSiteMode.None,
                Secure = Request.IsHttps,
                Path = "/",
                Expires = DateTimeOffset.UtcNow.AddDays(7)
            };
            Response.Cookies.Append("sid", sessionId, cookieOptions);

            return Ok(new LoginResponseDto
            {
                Success = true,
                Message = "Login successful",
                User = new UserDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Role = user.Role ?? "user",
                    EmpCode = user.EmpCode,
                    Department = user.Department?.Name,
                    Designation = user.Designation?.Name,
                    Photo = user.Photo,
                    IsReportingPerson = false,
                    ReportingTeamIds = new List<string>()
                }
            });
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            // Destroy server session row if sid cookie present
            var sid = Request.Cookies.ContainsKey("sid") ? Request.Cookies["sid"] : null;
            if (!string.IsNullOrEmpty(sid))
            {
                await _authService.DestroySessionAsync(sid);
                // Remove the sid cookie from client
                Response.Cookies.Delete("sid", new Microsoft.AspNetCore.Http.CookieOptions
                {
                    HttpOnly = true,
                    SameSite = Microsoft.AspNetCore.Http.SameSiteMode.None,
                    Secure = Request.IsHttps,
                    Path = "/"
                });
            }

            await HttpContext.SignOutAsync("Cookies");
            return Ok(new { message = "Logged out successfully" });
        }

        [HttpGet("me")]
        [Authorize]
        public IActionResult GetCurrentUser()
        {
            if (!User.Identity?.IsAuthenticated ?? false)
                return Unauthorized();

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var name = User.FindFirst(ClaimTypes.Name)?.Value;
            var email = User.FindFirst(ClaimTypes.Email)?.Value;
            var role = User.FindFirst("Role")?.Value;

            return Ok(new UserDto
            {
                Id = userId ?? "",
                Name = name ?? "",
                Email = email ?? "",
                Role = role ?? ""
            });
        }

        [HttpGet("session")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSession()
        {
            try
            {
                var isAuthenticated = User?.Identity?.IsAuthenticated ?? false;
                if (!isAuthenticated) return Ok(new { authenticated = false });

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var name = User.FindFirst(ClaimTypes.Name)?.Value;
                var email = User.FindFirst(ClaimTypes.Email)?.Value;
                var role = User.FindFirst("Role")?.Value ?? string.Empty;

                var userType = role.ToLower() == "vendor" ? "vendor" : "employee";

                // Check if user is a reporting person by first getting all employee teams, then checking if employee is reporting person in any of them
                bool isReportingPerson = false;
                if (!string.IsNullOrEmpty(userId))
                {
                    // Get all teams of the employee
                    var employeeTeams = await _context.TeamMembers
                        .Where(tm => tm.EmployeeId == userId)
                        .Select(tm => tm.TeamId)
                        .ToListAsync();

                    // Check if employee is a reporting person in any of those teams
                    if (employeeTeams.Count > 0)
                    {
                        isReportingPerson = await _context.TeamMembers
                            .Where(tm => employeeTeams.Contains(tm.TeamId) &&
                                        (tm.ReportingPerson1 == userId || tm.ReportingPerson2 == userId || tm.ReportingPerson3 == userId))
                            .AnyAsync();
                    }
                }

                return Ok(new {
                    authenticated = true,
                    userType,
                    employeeId = userId,
                    employeeEmail = email,
                    employeeName = name,
                    employeeRole = role,
                    isReportingPerson
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
