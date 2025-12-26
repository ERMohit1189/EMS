using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services;

public class AuthService : IAuthService {
    private readonly AppDbContext _db;
    public AuthService(AppDbContext db) { _db = db; }

    public async Task<Employee?> AuthenticateAsync(string email, string password) {
        var emp = await _db.Employees
            .Include(e => e.Department)
            .Include(e => e.Designation)
            .FirstOrDefaultAsync(e => e.Email == email);
        if (emp == null) return null;
        if (!BCrypt.Net.BCrypt.Verify(password, emp.PasswordHash)) return null;
        return emp;
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