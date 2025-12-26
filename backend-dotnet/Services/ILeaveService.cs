using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface ILeaveService
    {
        Task<LeaveRequest?> GetLeaveRequestByIdAsync(string id);
        Task<List<LeaveRequest>> GetLeaveRequestsByEmployeeAsync(string employeeId);
        Task<List<LeaveRequest>> GetAllLeaveRequestsAsync();
        Task<List<LeaveRequest>> GetLeaveRequestsByStatusAsync(string status);
        Task<LeaveRequest> CreateLeaveRequestAsync(LeaveRequest leaveRequest);
        Task<LeaveRequest?> UpdateLeaveRequestAsync(string id, LeaveRequest leaveRequest);
        Task<bool> ApproveLeaveRequestAsync(string id, string approverRemark, string approverId);
        Task<bool> RejectLeaveRequestAsync(string id, string approverRemark, string approverId);
        Task<bool> DeleteLeaveRequestAsync(string id);

        // Leave allotments
        Task<LeaveAllotment?> GetLeaveAllotmentAsync(string employeeId, int year);
        Task<List<object>> GetLeaveAllotmentsForYearAsync(int year);
        Task<List<LeaveAllotment>> GetAllLeaveAllotmentsAsync();
        Task<LeaveAllotment> CreateLeaveAllotmentAsync(LeaveAllotment allotment);
        Task<LeaveAllotment?> UpdateLeaveAllotmentAsync(string id, LeaveAllotment allotment);
        Task<(LeaveAllotment allotment, bool isUpdated)> UpsertLeaveAllotmentAsync(LeaveAllotment allotment, bool forceOverride = false, string? reason = null, string? performedBy = null);
        Task<(int count, List<object> skipped)> BulkUpsertLeaveAllotmentsAsync(int year, int medicalLeave, int casualLeave, int earnedLeave, int sickLeave, int personalLeave, int unpaidLeave, int leaveWithoutPay, bool carryForwardEarned, bool carryForwardPersonal, bool forceOverride = false, string? forceReason = null, string? performedBy = null);
        Task<bool> DeleteLeaveAllotmentWithChecksAsync(string id, string? performedBy = null);
        Task<bool> LeaveAllotmentExistsAsync(string employeeId, int year);
        Task<List<int>> GetLeaveAllotmentYearsAsync(string employeeId);
    }
}
