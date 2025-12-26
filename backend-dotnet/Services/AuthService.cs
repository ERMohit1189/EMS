using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services;

public class AuthService : IAuthService {
    private readonly AppDbContext _db;
    public AuthService(AppDbContext db) { _db = db; }

    public async Task<Employee?> AuthenticateAsync(string email, string password) {
        try {
            var emailNorm = email?.Trim().ToLowerInvariant() ?? string.Empty;
            var emp = await _db.Employees
                .Include(e => e.Department)
                .Include(e => e.Designation)
                .FirstOrDefaultAsync(e => (e.Email ?? "").ToLower() == emailNorm);

            if (emp == null) {
                Serilog.Log.Information("[AuthService] Authenticate failed: user not found for email {Email}", emailNorm);
                return null;
            }

            var verified = false;
            try {
                verified = BCrypt.Net.BCrypt.Verify(password, emp.PasswordHash);
            } catch (Exception ex) {
                Serilog.Log.Warning(ex, "[AuthService] BCrypt.Verify threw for user {Email}", emailNorm);
                return null;
            }

            if (!verified) {
                Serilog.Log.Information("[AuthService] Authenticate failed: invalid password for user {Email}", emailNorm);
                return null;
            }

            Serilog.Log.Information("[AuthService] Authenticate success for user {Email}", emailNorm);
            return emp;
        } catch (Exception ex) {
            Serilog.Log.Error(ex, "[AuthService] Authenticate exception for email {Email}", email);
            return null;
        }
    }

    public async Task<string> CreateSessionAsync(Employee employee) {
        var sid = Guid.NewGuid().ToString();
        var row = new SessionRow {
            Sid = sid,
            Data = $"{{\"employeeId\": \"{employee.Id}\", \"employeeEmail\": \"{employee.Email}\"}}",
            ExpiresAt = DateTime.UtcNow.AddHours(8),
        };
        _db.Sessions.Add(row);
        await _db.SaveChangesAsync();
        return sid;
    }

    public async Task DestroySessionAsync(string sid) {
        var row = await _db.Sessions.FindAsync(sid);
        if (row != null) {
            _db.Sessions.Remove(row);
            await _db.SaveChangesAsync();
        }
    }
}