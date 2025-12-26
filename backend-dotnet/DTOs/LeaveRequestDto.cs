namespace VendorRegistrationBackend.DTOs
{
    public class CreateLeaveRequestDto
    {
        public string EmployeeId { get; set; } = string.Empty;
        public string LeaveType { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int Days { get; set; } = 1;
        public string? Remark { get; set; }
    }

    public class UpdateLeaveRequestDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string LeaveType { get; set; } = string.Empty;
        public string? Remark { get; set; }
        public int Days { get; set; }
    }

    public class LeaveRequestDto
    {
        public string Id { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string LeaveType { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int Days { get; set; }
        public string Status { get; set; } = "pending";
        public DateTime? AppliedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
    }
}
