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
        Task<LeaveAllotment?> GetLeaveAllotmentAsync(string employeeId, int year);
        Task<List<LeaveAllotment>> GetAllLeaveAllotmentsAsync();
        Task<LeaveAllotment> CreateLeaveAllotmentAsync(LeaveAllotment allotment);
        Task<LeaveAllotment?> UpdateLeaveAllotmentAsync(string id, LeaveAllotment allotment);
    }
}
