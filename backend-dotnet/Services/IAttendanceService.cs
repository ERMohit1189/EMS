using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface IAttendanceService
    {
        Task<Attendance?> GetAttendanceByIdAsync(string id);
        Task<Attendance?> GetAttendanceByEmployeeMonthAsync(string employeeId, int month, int year);
        Task<List<Attendance>> GetAllAttendanceAsync();
        Task<Attendance> CreateAttendanceAsync(Attendance attendance);
        Task<Attendance?> UpdateAttendanceAsync(string id, Attendance attendance);
        Task<(Attendance attendance, List<string> skippedDays)> UpsertAttendanceAsync(string employeeId, int month, int year, Dictionary<string, object> attendanceData, string? performedBy = null);
        Task<DTOs.BulkAttendanceResult> BulkUpsertAttendanceAsync(List<string> employeeIds, int month, int year, Dictionary<string, object> attendanceData, string? mode = null, int? day = null, bool lockAfterSave = false, string? performedBy = null);
        Task<bool> DeleteAttendanceAsync(string id);
        Task<bool> LockAttendanceByIdAsync(string id);
        Task<int> LockAttendanceMonthAsync(int month, int year, bool lockAll = false, string? performedBy = null);
        Task<int> UnlockAttendanceMonthAsync(int month, int year, bool unlockAll = false, string? employeeId = null);
        Task<(bool locked, int count)> GetLockStatusAsync(int month, int year);
    }
}
