using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Services;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuthService _authService;
        private readonly IAuthAuditService _auditService;

        public AuthController(AppDbContext context, IAuthService authService, IAuthAuditService auditService)
        {
            _context = context;
            _authService = authService;
            _auditService = auditService;
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

        [HttpOptions("/api/employees/login")]
        [AllowAnonymous]
        public IActionResult OptionsEmployeeLogin()
        {
            // Handle CORS preflight request for employee login
            return Ok();
        }

        [HttpPost("/api/employees/login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
            {
                await _auditService.LogAuthAttemptAsync(HttpContext, "Employee", request.Email ?? "", "Failed", "InvalidRequest");
                return BadRequest(new { message = "Email and password are required" });
            }

            var user = await _authService.AuthenticateAsync(request.Email, request.Password);

            if (user == null)
            {
                await _auditService.LogAuthAttemptAsync(HttpContext, "Employee", request.Email, "Failed", "InvalidCredentials");
                return Unauthorized(new { success = false, message = "Invalid credentials" });
            }

            // Check if user is a reporting person in ANY team (RP1, RP2, or RP3)
            // A reporting person is an employee whose team member record has reportingPerson1/2/3 equal to their OWN team member ID
            bool isReportingPerson = false;
            var reportingTeamIds = new List<string>();
            if (!string.IsNullOrEmpty(user.Id))
            {
                Console.WriteLine($"[AuthController] Checking reporting person status for userId: {user.Id}");

                // Get teams where this employee is a reporting person
                // (team member record has reportingPerson1/2/3 equal to its own ID)
                var reportingTeams = await _context.TeamMembers
                    .Where(tm => tm.EmployeeId == user.Id)
                    .ToListAsync();

                Console.WriteLine($"[AuthController] Employee team memberships found: {reportingTeams.Count}");
                reportingTeams.ForEach(tm => Console.WriteLine($"[AuthController] - TeamMember ID: {tm.Id}, RP1: {tm.ReportingPerson1}, RP2: {tm.ReportingPerson2}, RP3: {tm.ReportingPerson3}"));

                var reportingTeamsList = reportingTeams
                    .Where(tm => tm.ReportingPerson1 == tm.Id || tm.ReportingPerson2 == tm.Id || tm.ReportingPerson3 == tm.Id)
                    .Select(tm => tm.TeamId)
                    .Distinct()
                    .ToList();

                Console.WriteLine($"[AuthController] Found {reportingTeamsList.Count} teams where employee is a reporting person");
                reportingTeamsList.ForEach(teamId => Console.WriteLine($"[AuthController] - Team: {teamId}"));

                isReportingPerson = reportingTeamsList.Count > 0;
                reportingTeamIds = reportingTeamsList;

                Console.WriteLine($"[AuthController] isReportingPerson: {isReportingPerson}");
            }

            // Generate JWT token
            var token = _authService.GenerateJwtToken(user, isReportingPerson, reportingTeamIds);

            // Log successful login
            await _auditService.LogAuthAttemptAsync(HttpContext, "Employee", request.Email, "Success", null, user.Id);

            return Ok(new LoginResponseDto
            {
                Success = true,
                Message = "Login successful",
                Token = token,
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
                    IsReportingPerson = isReportingPerson,
                    ReportingTeamIds = reportingTeamIds
                }
            });
        }


        [HttpOptions("/api/vendors/login")]
        [AllowAnonymous]
        public IActionResult OptionsVendorLogin()
        {
            // Handle CORS preflight request for vendor login
            return Ok();
        }

        [HttpPost("/api/vendors/login")]
        [AllowAnonymous]
        public async Task<IActionResult> VendorLogin([FromBody] VendorLoginRequestDto request)
        {
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
            {
                await _auditService.LogAuthAttemptAsync(HttpContext, "Vendor", request.Email ?? "", "Failed", "InvalidRequest");
                return BadRequest(new { message = "Email and password are required" });
            }

            var vendor = await _authService.AuthenticateVendorAsync(request.Email, request.Password);

            if (vendor == null)
            {
                await _auditService.LogAuthAttemptAsync(HttpContext, "Vendor", request.Email, "Failed", "InvalidCredentials");
                return Unauthorized(new { success = false, message = "Invalid credentials" });
            }

            // Only allow vendors with explicit 'approved' status to login
            var vendorStatus = vendor.Status?.Trim() ?? string.Empty;
            if (!vendorStatus.Equals("approved", StringComparison.OrdinalIgnoreCase))
            {
                await _auditService.LogAuthAttemptAsync(HttpContext, "Vendor", request.Email, "Failed", "NotApproved");
                var errMsg = string.IsNullOrWhiteSpace(vendorStatus)
                    ? "Your account is not approved and cannot log in."
                    : $"Your account status is '{vendorStatus}' and cannot log in.";
                return Unauthorized(new { success = false, message = errMsg });
            }

            // Generate JWT token
            var token = _authService.GenerateVendorJwtToken(vendor);

            // Log successful login
            await _auditService.LogAuthAttemptAsync(HttpContext, "Vendor", request.Email, "Success", null, vendor.Id);

            return Ok(new VendorLoginResponseDto
            {
                Success = true,
                Message = "Login successful",
                Token = token,
                Vendor = new VendorResponseDto
                {
                    Id = vendor.Id,
                    VendorCode = vendor.VendorCode,
                    Name = vendor.Name,
                    Email = vendor.Email,
                    Mobile = vendor.Mobile,
                    Status = vendor.Status,
                    Role = vendor.Role
                }
            });
        }
        [HttpPost("logout")]
        [Authorize]
        public IActionResult Logout()
        {
            // With JWT, logout is handled by the client deleting the token
            // The server doesn't need to maintain any state
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

                // Use the UserType claim we explicitly set during login instead of checking role
                // This is more reliable since role might be different (e.g., "manager", "admin", etc.)
                var userType = User.FindFirst("UserType")?.Value ?? "";

                // Check if user is a reporting person in ANY team (RP1, RP2, or RP3)
                // A reporting person is an employee whose team member record has reportingPerson1/2/3 equal to their OWN team member ID
                bool isReportingPerson = false;
                if (!string.IsNullOrEmpty(userId))
                {
                    // Get all team memberships for this employee first (to avoid LINQ comparison issues)
                    var employeeTeamMembers = await _context.TeamMembers
                        .Where(tm => tm.EmployeeId == userId)
                        .ToListAsync();

                    // Then check in-memory if any have self-referencing reportingPerson fields
                    isReportingPerson = employeeTeamMembers
                        .Any(tm => tm.ReportingPerson1 == tm.Id ||
                                   tm.ReportingPerson2 == tm.Id ||
                                   tm.ReportingPerson3 == tm.Id);

                    Console.WriteLine($"[AuthController Session] Employee {userId} has {employeeTeamMembers.Count} team memberships");
                    Console.WriteLine($"[AuthController Session] isReportingPerson: {isReportingPerson}");
                }

                if (userType == "vendor") {
                    return Ok(new {
                        authenticated = true,
                        userType,
                        vendorId = userId,
                        vendorEmail = email,
                        vendorName = name,
                        vendorRole = role
                    });
                } else {
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
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
