using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class AttendanceService : IAttendanceService
    {
        private readonly AppDbContext _context;

        public AttendanceService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Attendance?> GetAttendanceByIdAsync(string id)
        {
            return await _context.Attendances
                .Include(a => a.Employee)
                .FirstOrDefaultAsync(a => a.Id == id);
        }

        public async Task<List<Attendance>> GetAttendanceByEmployeeAsync(string employeeId, int month, int year)
        {
            return await _context.Attendances
                .Where(a => a.EmployeeId == employeeId && a.Month == month && a.Year == year)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<Attendance>> GetAllAttendanceAsync()
        {
            return await _context.Attendances
                .Include(a => a.Employee)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        public async Task<Attendance> CreateAttendanceAsync(Attendance attendance)
        {
            attendance.Id = Guid.NewGuid().ToString();
            attendance.CreatedAt = DateTime.UtcNow;
            attendance.UpdatedAt = DateTime.UtcNow;

            _context.Attendances.Add(attendance);
            await _context.SaveChangesAsync();
            return attendance;
        }

        public async Task<Attendance?> UpdateAttendanceAsync(string id, Attendance attendance)
        {
            var existing = await _context.Attendances.FindAsync(id);
            if (existing == null) return null;

            existing.AttendanceData = attendance.AttendanceData;
            existing.Submitted = attendance.Submitted;
            existing.SubmittedAt = attendance.SubmittedAt;
            existing.UpdatedAt = DateTime.UtcNow;

            _context.Attendances.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteAttendanceAsync(string id)
        {
            var attendance = await _context.Attendances.FindAsync(id);
            if (attendance == null) return false;

            _context.Attendances.Remove(attendance);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> LockAttendanceAsync(string id)
        {
            var attendance = await _context.Attendances.FindAsync(id);
            if (attendance == null) return false;

            attendance.Locked = true;
            attendance.LockedAt = DateTime.UtcNow;
            attendance.UpdatedAt = DateTime.UtcNow;

            _context.Attendances.Update(attendance);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
