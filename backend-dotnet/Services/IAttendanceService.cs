using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface IAttendanceService
    {
        Task<Attendance?> GetAttendanceByIdAsync(string id);
        Task<List<Attendance>> GetAttendanceByEmployeeAsync(string employeeId, int month, int year);
        Task<List<Attendance>> GetAllAttendanceAsync();
        Task<Attendance> CreateAttendanceAsync(Attendance attendance);
        Task<Attendance?> UpdateAttendanceAsync(string id, Attendance attendance);
        Task<bool> DeleteAttendanceAsync(string id);
        Task<bool> LockAttendanceAsync(string id);
    }
}
