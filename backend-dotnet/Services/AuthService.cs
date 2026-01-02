using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<Employee?> AuthenticateAsync(string email, string password)
    {
        try
        {
            var emailNorm = email?.Trim().ToLowerInvariant() ?? string.Empty;
            var emp = await _db.Employees
                .Include(e => e.Department)
                .Include(e => e.Designation)
                .FirstOrDefaultAsync(e => (e.Email ?? "").ToLower() == emailNorm);

            if (emp == null)
            {
                Serilog.Log.Information("[AuthService] Authenticate failed: user not found for email {Email}", emailNorm);
                return null;
            }

            var verified = false;
            try
            {
                verified = BCrypt.Net.BCrypt.Verify(password, emp.PasswordHash);
            }
            catch (Exception ex)
            {
                Serilog.Log.Warning(ex, "[AuthService] BCrypt.Verify threw for user {Email}", emailNorm);
                return null;
            }

            if (!verified)
            {
                Serilog.Log.Information("[AuthService] Authenticate failed: invalid password for user {Email}", emailNorm);
                return null;
            }

            // Generate empCode if missing (for legacy employees created before empCode feature)
            if (string.IsNullOrEmpty(emp.EmpCode))
            {
                emp.EmpCode = GenerateEmpCode();
                _db.Employees.Update(emp);
                await _db.SaveChangesAsync();
                Serilog.Log.Information("[AuthService] Generated empCode {EmpCode} for user {Email}", emp.EmpCode, emailNorm);
            }

            Serilog.Log.Information("[AuthService] Authenticate success for user {Email}", emailNorm);
            return emp;
        }
        catch (Exception ex)
        {
            Serilog.Log.Error(ex, "[AuthService] Authenticate exception for email {Email}", email);
            return null;
        }
    }

    public string GenerateJwtToken(Employee employee, bool isReportingPerson = false, List<string>? reportingTeamIds = null)
    {
        var jwtSettings = _config.GetSection("Jwt");
        var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey is not configured");
        var issuer = jwtSettings["Issuer"];
        var audience = jwtSettings["Audience"];
        var expiryMinutes = int.Parse(jwtSettings["ExpiryInMinutes"] ?? "10080");

        var key = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, employee.Id),
            new Claim(ClaimTypes.Name, employee.Name ?? ""),
            new Claim(ClaimTypes.Email, employee.Email ?? ""),
            new Claim(ClaimTypes.Role, (employee.Role ?? "user").ToLower()),
            new Claim("UserType", "employee"),
            new Claim("IsReportingPerson", isReportingPerson ? "true" : "false"),
            new Claim("EmpCode", employee.EmpCode ?? "")
        };

        if (reportingTeamIds?.Count > 0)
        {
            claims.Add(new Claim("ReportingTeamIds", string.Join(",", reportingTeamIds)));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        var tokenHandler = new JwtSecurityTokenHandler();
        return tokenHandler.WriteToken(token);
    }

    public string GenerateVendorJwtToken(Vendor vendor)
    {
        var jwtSettings = _config.GetSection("Jwt");
        var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey is not configured");
        var issuer = jwtSettings["Issuer"];
        var audience = jwtSettings["Audience"];
        var expiryMinutes = int.Parse(jwtSettings["ExpiryInMinutes"] ?? "10080");

        var key = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, vendor.Id),
            new Claim(ClaimTypes.Name, vendor.Name ?? ""),
            new Claim(ClaimTypes.Email, vendor.Email ?? ""),
            new Claim(ClaimTypes.Role, (vendor.Role ?? "vendor").ToLower()),
            new Claim("UserType", "vendor"),
            new Claim("VendorCode", vendor.VendorCode ?? "")
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        var tokenHandler = new JwtSecurityTokenHandler();
        return tokenHandler.WriteToken(token);
    }

    public async Task<string> CreateSessionAsync(Employee employee)
    {
        // Deprecated: Using JWT tokens instead of server-side sessions
        // This method is kept for backward compatibility but does nothing
        await Task.CompletedTask;
        return Guid.NewGuid().ToString();
    }

    public async Task DestroySessionAsync(string sid)
    {
        // Deprecated: Using JWT tokens instead of server-side sessions
        // This method is kept for backward compatibility but does nothing
        await Task.CompletedTask;
    }

    private string GenerateEmpCode()
    {
        var lastEmp = _db.Employees
            .OrderByDescending(e => e.CreatedAt)
            .FirstOrDefault();

        int nextNumber = 1;
        if (lastEmp?.EmpCode != null && int.TryParse(lastEmp.EmpCode.Replace("EMP", ""), out int lastNumber))
        {
            nextNumber = lastNumber + 1;
        }

        return $"EMP{nextNumber:D5}";
    }

    public async Task<Vendor?> AuthenticateVendorAsync(string email, string password)
    {
        try
        {
            var emailNorm = email?.Trim().ToLowerInvariant() ?? string.Empty;
            var vendor = await _db.Vendors
                .FirstOrDefaultAsync(v => (v.Email ?? "").ToLower() == emailNorm);

            if (vendor == null)
            {
                Serilog.Log.Information("[AuthService] Vendor authenticate failed: user not found for email {Email}", emailNorm);
                return null;
            }

            var verified = false;
            try
            {
                verified = BCrypt.Net.BCrypt.Verify(password, vendor.PasswordHash);
            }
            catch (Exception ex)
            {
                Serilog.Log.Warning(ex, "[AuthService] BCrypt.Verify threw for vendor {Email}", emailNorm);
                return null;
            }

            if (!verified)
            {
                Serilog.Log.Information("[AuthService] Vendor authenticate failed: invalid password for user {Email}", emailNorm);
                return null;
            }

            Serilog.Log.Information("[AuthService] Vendor authenticate success for user {Email}", emailNorm);
            return vendor;
        }
        catch (Exception ex)
        {
            Serilog.Log.Error(ex, "[AuthService] Vendor authenticate exception for email {Email}", email);
            return null;
        }
    }

    public async Task<string> CreateVendorSessionAsync(Vendor vendor)
    {
        // Deprecated: Using JWT tokens instead of server-side sessions
        // This method is kept for backward compatibility but does nothing
        await Task.CompletedTask;
        return Guid.NewGuid().ToString();
    }
}
