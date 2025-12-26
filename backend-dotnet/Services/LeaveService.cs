using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class LeaveService : ILeaveService
    {
        private readonly AppDbContext _context;

        public LeaveService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<LeaveRequest?> GetLeaveRequestByIdAsync(string id)
        {
            return await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .FirstOrDefaultAsync(lr => lr.Id == id);
        }

        public async Task<List<LeaveRequest>> GetLeaveRequestsByEmployeeAsync(string employeeId)
        {
            return await _context.LeaveRequests
                .Where(lr => lr.EmployeeId == employeeId)
                .OrderByDescending(lr => lr.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<LeaveRequest>> GetAllLeaveRequestsAsync()
        {
            return await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .OrderByDescending(lr => lr.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<LeaveRequest>> GetLeaveRequestsByStatusAsync(string status)
        {
            return await _context.LeaveRequests
                .Where(lr => lr.Status == status)
                .Include(lr => lr.Employee)
                .OrderByDescending(lr => lr.CreatedAt)
                .ToListAsync();
        }

        public async Task<LeaveRequest> CreateLeaveRequestAsync(LeaveRequest leaveRequest)
        {
            leaveRequest.Id = Guid.NewGuid().ToString();
            leaveRequest.Status = "pending";
            leaveRequest.CreatedAt = DateTime.UtcNow;
            leaveRequest.UpdatedAt = DateTime.UtcNow;

            _context.LeaveRequests.Add(leaveRequest);
            await _context.SaveChangesAsync();
            return leaveRequest;
        }

        public async Task<LeaveRequest?> UpdateLeaveRequestAsync(string id, LeaveRequest leaveRequest)
        {
            var existing = await _context.LeaveRequests.FindAsync(id);
            if (existing == null) return null;

            existing.StartDate = leaveRequest.StartDate;
            existing.EndDate = leaveRequest.EndDate;
            existing.LeaveType = leaveRequest.LeaveType;
            existing.Remark = leaveRequest.Remark;
            existing.Days = leaveRequest.Days;
            existing.UpdatedAt = DateTime.UtcNow;

            _context.LeaveRequests.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> ApproveLeaveRequestAsync(string id, string approverRemark, string approverId)
        {
            var leaveRequest = await _context.LeaveRequests.FindAsync(id);
            if (leaveRequest == null) return false;

            leaveRequest.Status = "approved";
            leaveRequest.ApproverRemark = approverRemark;
            leaveRequest.ApprovedBy = approverId;
            leaveRequest.ApprovedAt = DateTime.UtcNow;
            leaveRequest.UpdatedAt = DateTime.UtcNow;

            _context.LeaveRequests.Update(leaveRequest);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RejectLeaveRequestAsync(string id, string approverRemark, string approverId)
        {
            var leaveRequest = await _context.LeaveRequests.FindAsync(id);
            if (leaveRequest == null) return false;

            leaveRequest.Status = "rejected";
            leaveRequest.ApproverRemark = approverRemark;
            leaveRequest.RejectionReason = approverRemark;
            leaveRequest.ApprovedBy = approverId;
            leaveRequest.ApprovedAt = DateTime.UtcNow;
            leaveRequest.UpdatedAt = DateTime.UtcNow;

            _context.LeaveRequests.Update(leaveRequest);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteLeaveRequestAsync(string id)
        {
            var leaveRequest = await _context.LeaveRequests.FindAsync(id);
            if (leaveRequest == null) return false;

            _context.LeaveRequests.Remove(leaveRequest);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<LeaveAllotment?> GetLeaveAllotmentAsync(string employeeId, int year)
        {
            return await _context.LeaveAllotments
                .Include(la => la.Employee)
                .FirstOrDefaultAsync(la => la.EmployeeId == employeeId && la.Year == year);
        }

        public async Task<List<LeaveAllotment>> GetAllLeaveAllotmentsAsync()
        {
            return await _context.LeaveAllotments
                .Include(la => la.Employee)
                .ToListAsync();
        }

        public async Task<LeaveAllotment> CreateLeaveAllotmentAsync(LeaveAllotment allotment)
        {
            allotment.Id = Guid.NewGuid().ToString();
            allotment.CreatedAt = DateTime.UtcNow;
            allotment.UpdatedAt = DateTime.UtcNow;

            _context.LeaveAllotments.Add(allotment);
            await _context.SaveChangesAsync();
            return allotment;
        }

        public async Task<LeaveAllotment?> UpdateLeaveAllotmentAsync(string id, LeaveAllotment allotment)
        {
            var existing = await _context.LeaveAllotments.FindAsync(id);
            if (existing == null) return null;

            existing.MedicalLeave = allotment.MedicalLeave;
            existing.CasualLeave = allotment.CasualLeave;
            existing.EarnedLeave = allotment.EarnedLeave;
            existing.SickLeave = allotment.SickLeave;
            existing.PersonalLeave = allotment.PersonalLeave;
            existing.UnpaidLeave = allotment.UnpaidLeave;
            existing.LeaveWithoutPay = allotment.LeaveWithoutPay;
            existing.CarryForwardEarned = allotment.CarryForwardEarned;
            existing.CarryForwardPersonal = allotment.CarryForwardPersonal;
            existing.UsedMedicalLeave = allotment.UsedMedicalLeave;
            existing.UsedCasualLeave = allotment.UsedCasualLeave;
            existing.UsedEarnedLeave = allotment.UsedEarnedLeave;
            existing.UsedSickLeave = allotment.UsedSickLeave;
            existing.UsedPersonalLeave = allotment.UsedPersonalLeave;
            existing.UsedUnpaidLeave = allotment.UsedUnpaidLeave;
            existing.UsedLeaveWithoutPay = allotment.UsedLeaveWithoutPay;
            existing.UpdatedAt = DateTime.UtcNow;

            _context.LeaveAllotments.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }
    }
}
