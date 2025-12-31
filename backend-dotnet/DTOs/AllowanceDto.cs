using System.Text.Json.Serialization;

namespace VendorRegistrationBackend.DTOs
{
    // Allowance data structure for individual fields
    public class AllowanceDataDto
    {
        [JsonPropertyName("travelAllowance")]
        public decimal TravelAllowance { get; set; }

        [JsonPropertyName("foodAllowance")]
        public decimal FoodAllowance { get; set; }

        [JsonPropertyName("accommodationAllowance")]
        public decimal AccommodationAllowance { get; set; }

        [JsonPropertyName("mobileAllowance")]
        public decimal MobileAllowance { get; set; }

        [JsonPropertyName("internetAllowance")]
        public decimal InternetAllowance { get; set; }

        [JsonPropertyName("utilitiesAllowance")]
        public decimal UtilitiesAllowance { get; set; }

        [JsonPropertyName("parkingAllowance")]
        public decimal ParkingAllowance { get; set; }

        [JsonPropertyName("miscAllowance")]
        public decimal MiscAllowance { get; set; }

        public decimal GetTotal()
        {
            return TravelAllowance + FoodAllowance + AccommodationAllowance + MobileAllowance + InternetAllowance + UtilitiesAllowance + ParkingAllowance + MiscAllowance;
        }
    }

    // Create/Update allowance request
    public class CreateAllowanceRequestDto
    {
        [JsonPropertyName("employeeId")]
        public string EmployeeId { get; set; } = string.Empty;

        [JsonPropertyName("teamId")]
        public string? TeamId { get; set; }

        [JsonPropertyName("date")]
        public DateTime Date { get; set; }

        [JsonPropertyName("allowanceData")]
        public AllowanceDataDto AllowanceData { get; set; } = new();

        [JsonPropertyName("requiredApprovals")]
        public int? RequiredApprovals { get; set; }
    }

    // Bulk allowance submission - matches frontend format
    public class BulkAllowanceRequestDto
    {
        [JsonPropertyName("date")]
        public string Date { get; set; } = string.Empty;

        [JsonPropertyName("teamId")]
        public string? TeamId { get; set; }

        [JsonPropertyName("employeeId")]
        public string? EmployeeId { get; set; }

        [JsonPropertyName("employeeIds")]
        public List<string>? EmployeeIds { get; set; }

        [JsonPropertyName("selectedEmployeeIds")]
        public List<string> SelectedEmployeeIds { get; set; } = new();

        [JsonPropertyName("allowanceData")]
        public string? AllowanceData { get; set; } // Sent as JSON string from frontend

        [JsonPropertyName("requiredApprovals")]
        public int? RequiredApprovals { get; set; }
    }

    // Bulk allowance data - matches frontend format with different field names
    public class BulkAllowanceDataDto
    {
        [JsonPropertyName("travelAllowance")]
        public decimal TravelAllowance { get; set; }

        [JsonPropertyName("foodAllowance")]
        public decimal FoodAllowance { get; set; }

        [JsonPropertyName("accommodationAllowance")]
        public decimal AccommodationAllowance { get; set; }

        [JsonPropertyName("mobileAllowance")]
        public decimal MobileAllowance { get; set; }

        [JsonPropertyName("internetAllowance")]
        public decimal InternetAllowance { get; set; }

        [JsonPropertyName("utilitiesAllowance")]
        public decimal UtilitiesAllowance { get; set; }

        [JsonPropertyName("parkingAllowance")]
        public decimal ParkingAllowance { get; set; }

        [JsonPropertyName("miscAllowance")]
        public decimal MiscAllowance { get; set; }

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }
    }

    // Approve allowance request
    public class ApproveAllowanceRequestDto
    {
        [JsonPropertyName("editedData")]
        public AllowanceDataDto? EditedData { get; set; }

        [JsonPropertyName("remark")]
        public string? Remark { get; set; }
    }

    // Reject allowance request
    public class RejectAllowanceRequestDto
    {
        [JsonPropertyName("rejectionReason")]
        public string RejectionReason { get; set; } = string.Empty;
    }

    // Approval history record
    public class ApprovalHistoryDto
    {
        [JsonPropertyName("approverId")]
        public string ApproverId { get; set; } = string.Empty;

        [JsonPropertyName("approverName")]
        public string ApproverName { get; set; } = string.Empty;

        [JsonPropertyName("level")]
        public string Level { get; set; } = string.Empty;

        [JsonPropertyName("remark")]
        public string? Remark { get; set; }

        [JsonPropertyName("editedData")]
        public AllowanceDataDto? EditedData { get; set; }

        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    // Daily allowance response
    public class DailyAllowanceResponseDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("employeeId")]
        public string EmployeeId { get; set; } = string.Empty;

        [JsonPropertyName("employeeName")]
        public string? EmployeeName { get; set; }

        [JsonPropertyName("teamId")]
        public string? TeamId { get; set; }

        [JsonPropertyName("teamName")]
        public string? TeamName { get; set; }

        [JsonPropertyName("date")]
        public DateTime Date { get; set; }

        [JsonPropertyName("allowanceData")]
        public AllowanceDataDto AllowanceData { get; set; } = new();

        [JsonPropertyName("approvalStatus")]
        public string ApprovalStatus { get; set; } = "pending";

        [JsonPropertyName("approvalCount")]
        public int ApprovalCount { get; set; }

        [JsonPropertyName("requiredApprovals")]
        public int? RequiredApprovals { get; set; }

        [JsonPropertyName("paidStatus")]
        public string PaidStatus { get; set; } = "unpaid";

        [JsonPropertyName("approvedBy")]
        public List<string>? ApprovedBy { get; set; }

        [JsonPropertyName("approvalHistory")]
        public List<ApprovalHistoryDto>? ApprovalHistory { get; set; }

        [JsonPropertyName("rejectionReason")]
        public string? RejectionReason { get; set; }

        [JsonPropertyName("approvedAt")]
        public DateTime? ApprovedAt { get; set; }

        [JsonPropertyName("submittedAt")]
        public DateTime SubmittedAt { get; set; }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("updatedAt")]
        public DateTime UpdatedAt { get; set; }
    }

    // Pagination response
    public class PaginatedAllowanceResponseDto
    {
        [JsonPropertyName("data")]
        public List<DailyAllowanceResponseDto> Data { get; set; } = new();

        [JsonPropertyName("page")]
        public int Page { get; set; }

        [JsonPropertyName("pageSize")]
        public int PageSize { get; set; }

        [JsonPropertyName("total")]
        public int Total { get; set; }
    }
}
