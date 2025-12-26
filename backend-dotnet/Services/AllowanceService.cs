using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Serialization;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface IAllowanceService
    {
        Task<DailyAllowanceResponseDto?> CreateAllowanceAsync(CreateAllowanceRequestDto request, string loggedInEmployeeId);
        Task<DailyAllowanceResponseDto?> GetAllowanceByIdAsync(string id);
        Task<List<DailyAllowanceResponseDto>> GetAllAllowancesAsync(int page = 1, int pageSize = 20);
        Task<List<DailyAllowanceResponseDto>> GetPendingAllowancesAsync(int page = 1, int pageSize = 20, string? searchEmployeeId = null);
        Task<List<DailyAllowanceResponseDto>> GetAllowancesByEmployeeAsync(string employeeId, int page = 1, int pageSize = 20);
        Task<List<DailyAllowanceResponseDto>> GetTeamAllowancesAsync(string reportingPersonId, int page = 1, int pageSize = 20);
        Task<List<DailyAllowanceResponseDto>> GetTeamAllAllowancesAsync(string reportingPersonId, int page = 1, int pageSize = 20);
        Task<DailyAllowanceResponseDto?> ApproveAllowanceAsync(string id, ApproveAllowanceRequestDto request, string approverId, string approverName, string approverRole);
        Task<DailyAllowanceResponseDto?> RejectAllowanceAsync(string id, RejectAllowanceRequestDto request, string rejecterId, string rejectionReason, bool isHigherAuthority);
        Task<bool> DeleteAllowanceAsync(string id);
        Task<List<DailyAllowanceResponseDto>> BulkCreateAllowanceAsync(BulkAllowanceRequestDto request, string loggedInEmployeeId);
        Task<int> GetAllowanceCountAsync();
    }

    public class AllowanceService : IAllowanceService
    {
        private readonly AppDbContext _context;
        private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        public AllowanceService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<DailyAllowanceResponseDto?> CreateAllowanceAsync(CreateAllowanceRequestDto request, string loggedInEmployeeId)
        {
            try
            {
                // Check if allowance already exists for this employee and date
                var existing = await _context.DailyAllowances
                    .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.Date.Date == request.Date.Date);

                if (existing != null)
                {
                    // Update existing if it's still pending
                    if (existing.ApprovalStatus != "pending")
                    {
                        throw new Exception("Cannot update allowance that is not in pending status");
                    }

                    existing.AllowanceData = JsonSerializer.Serialize(request.AllowanceData, _jsonOptions);
                    existing.UpdatedAt = DateTime.UtcNow;

                    _context.DailyAllowances.Update(existing);
                    await _context.SaveChangesAsync();

                    return await MapToResponseAsync(existing);
                }

                // Get required approvals from app settings (default: 1)
                var requiredApprovals = request.RequiredApprovals ?? 1;

                var allowance = new DailyAllowance
                {
                    Id = Guid.NewGuid().ToString(),
                    EmployeeId = request.EmployeeId,
                    TeamId = request.TeamId,
                    Date = request.Date,
                    AllowanceData = JsonSerializer.Serialize(request.AllowanceData, _jsonOptions),
                    ApprovalStatus = "pending",
                    ApprovalCount = 0,
                    RequiredApprovals = null, // Locked at first approval
                    PaidStatus = "unpaid",
                    SubmittedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.DailyAllowances.Add(allowance);
                await _context.SaveChangesAsync();

                return await MapToResponseAsync(allowance);
            }
            catch (Exception ex)
            {
                throw new Exception($"Error creating allowance: {ex.Message}");
            }
        }

        public async Task<DailyAllowanceResponseDto?> GetAllowanceByIdAsync(string id)
        {
            var allowance = await _context.DailyAllowances
                .Include(a => a.Employee)
                .FirstOrDefaultAsync(a => a.Id == id);

            return allowance != null ? await MapToResponseAsync(allowance) : null;
        }

        public async Task<List<DailyAllowanceResponseDto>> GetAllAllowancesAsync(int page = 1, int pageSize = 20)
        {
            var allowances = await _context.DailyAllowances
                .Include(a => a.Employee)
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var results = await Task.WhenAll(allowances.Select(a => MapToResponseAsync(a)));
            return results.ToList();
        }

        public async Task<List<DailyAllowanceResponseDto>> GetPendingAllowancesAsync(int page = 1, int pageSize = 20, string? searchEmployeeId = null)
        {
            var baseQuery = _context.DailyAllowances
                .Where(a => a.ApprovalStatus == "pending" || a.ApprovalStatus == "processing")
                .Include(a => a.Employee);

            // Apply search filter if provided
            IQueryable<DailyAllowance> finalQuery = baseQuery;
            if (!string.IsNullOrEmpty(searchEmployeeId))
            {
                finalQuery = baseQuery.Where(a => a.Employee!.Name.Contains(searchEmployeeId) || a.Employee!.EmpCode.Contains(searchEmployeeId));
            }

            var allowances = await finalQuery
                .OrderByDescending(a => a.Date)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var results = await Task.WhenAll(allowances.Select(a => MapToResponseAsync(a)));
            return results.ToList();
        }

        public async Task<List<DailyAllowanceResponseDto>> GetAllowancesByEmployeeAsync(string employeeId, int page = 1, int pageSize = 20)
        {
            var allowances = await _context.DailyAllowances
                .Where(a => a.EmployeeId == employeeId)
                .Include(a => a.Employee)
                .OrderByDescending(a => a.Date)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var results = await Task.WhenAll(allowances.Select(a => MapToResponseAsync(a)));
            return results.ToList();
        }

        public async Task<List<DailyAllowanceResponseDto>> GetTeamAllowancesAsync(string reportingPersonId, int page = 1, int pageSize = 20)
        {
            // Get team members reporting to this person (check ReportingPerson1, ReportingPerson2, ReportingPerson3)
            var teamMembers = await _context.TeamMembers
                .Where(tm => tm.ReportingPerson1 == reportingPersonId || tm.ReportingPerson2 == reportingPersonId || tm.ReportingPerson3 == reportingPersonId)
                .Select(tm => tm.EmployeeId)
                .ToListAsync();

            var allowances = await _context.DailyAllowances
                .Where(a => (a.ApprovalStatus == "pending" || a.ApprovalStatus == "processing") && teamMembers.Contains(a.EmployeeId))
                .Include(a => a.Employee)
                .OrderByDescending(a => a.Date)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var results = await Task.WhenAll(allowances.Select(a => MapToResponseAsync(a)));
            return results.ToList();
        }

        public async Task<List<DailyAllowanceResponseDto>> GetTeamAllAllowancesAsync(string reportingPersonId, int page = 1, int pageSize = 20)
        {
            // Get team members reporting to this person (check ReportingPerson1, ReportingPerson2, ReportingPerson3)
            var teamMembers = await _context.TeamMembers
                .Where(tm => tm.ReportingPerson1 == reportingPersonId || tm.ReportingPerson2 == reportingPersonId || tm.ReportingPerson3 == reportingPersonId)
                .Select(tm => tm.EmployeeId)
                .ToListAsync();

            var allowances = await _context.DailyAllowances
                .Where(a => teamMembers.Contains(a.EmployeeId))
                .Include(a => a.Employee)
                .OrderByDescending(a => a.Date)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var results = await Task.WhenAll(allowances.Select(a => MapToResponseAsync(a)));
            return results.ToList();
        }

        public async Task<DailyAllowanceResponseDto?> ApproveAllowanceAsync(string id, ApproveAllowanceRequestDto request, string approverId, string approverName, string approverRole)
        {
            try
            {
                var allowance = await _context.DailyAllowances.FindAsync(id);
                if (allowance == null)
                    throw new Exception("Allowance not found");

                if (allowance.ApprovalStatus == "rejected" || allowance.ApprovalStatus == "approved")
                    throw new Exception($"Cannot approve allowance that is already {allowance.ApprovalStatus}");

                // On first approval, lock the required approvals
                if (allowance.ApprovalCount == 0)
                {
                    allowance.ApprovalStatus = "processing";
                    allowance.RequiredApprovals ??= 1; // Lock it
                }

                // If edited data is provided, update the allowance data
                if (request.EditedData != null)
                {
                    allowance.AllowanceData = JsonSerializer.Serialize(request.EditedData, _jsonOptions);
                }

                // Increment approval count
                allowance.ApprovalCount++;

                // Add to approval history
                var approvalHistory = string.IsNullOrEmpty(allowance.ApprovalHistory)
                    ? new List<ApprovalHistoryDto>()
                    : JsonSerializer.Deserialize<List<ApprovalHistoryDto>>(allowance.ApprovalHistory, _jsonOptions) ?? new List<ApprovalHistoryDto>();

                approvalHistory.Add(new ApprovalHistoryDto
                {
                    ApproverId = approverId,
                    ApproverName = approverName,
                    Level = approverRole,
                    Remark = request.Remark,
                    EditedData = request.EditedData,
                    Timestamp = DateTime.UtcNow
                });

                allowance.ApprovalHistory = JsonSerializer.Serialize(approvalHistory, _jsonOptions);

                // Add to approved by list
                var approvedByList = string.IsNullOrEmpty(allowance.ApprovedBy)
                    ? new List<string>()
                    : JsonSerializer.Deserialize<List<string>>(allowance.ApprovedBy, _jsonOptions) ?? new List<string>();

                if (!approvedByList.Contains(approverId))
                    approvedByList.Add(approverId);

                allowance.ApprovedBy = JsonSerializer.Serialize(approvedByList, _jsonOptions);

                // Check if approval is complete
                if (allowance.ApprovalCount >= allowance.RequiredApprovals)
                {
                    allowance.ApprovalStatus = "approved";
                    allowance.ApprovedAt = DateTime.UtcNow;
                }

                allowance.UpdatedAt = DateTime.UtcNow;

                _context.DailyAllowances.Update(allowance);
                await _context.SaveChangesAsync();

                return await MapToResponseAsync(allowance);
            }
            catch (Exception ex)
            {
                throw new Exception($"Error approving allowance: {ex.Message}");
            }
        }

        public async Task<DailyAllowanceResponseDto?> RejectAllowanceAsync(string id, RejectAllowanceRequestDto request, string rejecterId, string rejectionReason, bool isHigherAuthority)
        {
            try
            {
                var allowance = await _context.DailyAllowances.FindAsync(id);
                if (allowance == null)
                    throw new Exception("Allowance not found");

                if (allowance.ApprovalStatus == "rejected" || allowance.ApprovalStatus == "approved")
                    throw new Exception($"Cannot reject allowance that is already {allowance.ApprovalStatus}");

                allowance.ApprovalStatus = "rejected";
                allowance.RejectionReason = rejectionReason;
                allowance.UpdatedAt = DateTime.UtcNow;

                // If rejected by higher authority, lock the status
                if (isHigherAuthority)
                {
                    allowance.ApprovalStatus = "rejected";
                }

                _context.DailyAllowances.Update(allowance);
                await _context.SaveChangesAsync();

                return await MapToResponseAsync(allowance);
            }
            catch (Exception ex)
            {
                throw new Exception($"Error rejecting allowance: {ex.Message}");
            }
        }

        public async Task<bool> DeleteAllowanceAsync(string id)
        {
            try
            {
                var allowance = await _context.DailyAllowances.FindAsync(id);
                if (allowance == null)
                    return false;

                _context.DailyAllowances.Remove(allowance);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error deleting allowance: {ex.Message}");
            }
        }

        public async Task<List<DailyAllowanceResponseDto>> BulkCreateAllowanceAsync(BulkAllowanceRequestDto request, string loggedInEmployeeId)
        {
            try
            {
                var results = new List<DailyAllowanceResponseDto>();
                var requiredApprovals = request.RequiredApprovals ?? 1;

                foreach (var employeeId in request.SelectedEmployeeIds)
                {
                    // Check if allowance already exists
                    var existing = await _context.DailyAllowances
                        .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Date.Date == request.Date.Date);

                    if (existing != null)
                    {
                        if (existing.ApprovalStatus == "pending")
                        {
                            existing.AllowanceData = JsonSerializer.Serialize(request.AllowanceData, _jsonOptions);
                            existing.UpdatedAt = DateTime.UtcNow;
                            _context.DailyAllowances.Update(existing);
                        }
                    }
                    else
                    {
                        var allowance = new DailyAllowance
                        {
                            Id = Guid.NewGuid().ToString(),
                            EmployeeId = employeeId,
                            TeamId = request.TeamId,
                            Date = request.Date,
                            AllowanceData = JsonSerializer.Serialize(request.AllowanceData, _jsonOptions),
                            SelectedEmployeeIds = JsonSerializer.Serialize(request.SelectedEmployeeIds, _jsonOptions),
                            ApprovalStatus = "pending",
                            ApprovalCount = 0,
                            RequiredApprovals = null,
                            PaidStatus = "unpaid",
                            SubmittedAt = DateTime.UtcNow,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        _context.DailyAllowances.Add(allowance);
                    }
                }

                await _context.SaveChangesAsync();

                // Fetch and return all created allowances
                foreach (var employeeId in request.SelectedEmployeeIds)
                {
                    var allowance = await _context.DailyAllowances
                        .Include(a => a.Employee)
                        .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Date.Date == request.Date.Date);

                    if (allowance != null)
                    {
                        results.Add(await MapToResponseAsync(allowance));
                    }
                }

                return results;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error bulk creating allowances: {ex.Message}");
            }
        }

        public async Task<int> GetAllowanceCountAsync()
        {
            return await _context.DailyAllowances.CountAsync();
        }

        private async Task<DailyAllowanceResponseDto> MapToResponseAsync(DailyAllowance allowance)
        {
            var employee = await _context.Employees.FindAsync(allowance.EmployeeId);

            var allowanceData = string.IsNullOrEmpty(allowance.AllowanceData)
                ? new AllowanceDataDto()
                : JsonSerializer.Deserialize<AllowanceDataDto>(allowance.AllowanceData, _jsonOptions) ?? new AllowanceDataDto();

            var approvalHistory = string.IsNullOrEmpty(allowance.ApprovalHistory)
                ? null
                : JsonSerializer.Deserialize<List<ApprovalHistoryDto>>(allowance.ApprovalHistory, _jsonOptions);

            var approvedBy = string.IsNullOrEmpty(allowance.ApprovedBy)
                ? null
                : JsonSerializer.Deserialize<List<string>>(allowance.ApprovedBy, _jsonOptions);

            return new DailyAllowanceResponseDto
            {
                Id = allowance.Id,
                EmployeeId = allowance.EmployeeId,
                EmployeeName = employee?.Name,
                TeamId = allowance.TeamId,
                Date = allowance.Date,
                AllowanceData = allowanceData,
                ApprovalStatus = allowance.ApprovalStatus,
                ApprovalCount = allowance.ApprovalCount,
                RequiredApprovals = allowance.RequiredApprovals,
                PaidStatus = allowance.PaidStatus,
                ApprovedBy = approvedBy,
                ApprovalHistory = approvalHistory,
                RejectionReason = allowance.RejectionReason,
                ApprovedAt = allowance.ApprovedAt,
                SubmittedAt = allowance.SubmittedAt,
                CreatedAt = allowance.CreatedAt,
                UpdatedAt = allowance.UpdatedAt
            };
        }
    }
}
