namespace VendorRegistrationBackend.Models
{
    public class LeaveRequest
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string EmployeeId { get; set; } = string.Empty; // Required

        // Leave Details
        public string LeaveType { get; set; } = string.Empty; // Required
        public DateTime StartDate { get; set; } // Required
        public DateTime EndDate { get; set; } // Required
        public int Days { get; set; } = 1; // Required, default 1

        // Request Details
        public string? Remark { get; set; } // Employee's remark
        public string Status { get; set; } = "pending"; // pending, approved, rejected

        // Approval Details
        public string? AppliedBy { get; set; } // Employee ID who applied
        public DateTime? AppliedAt { get; set; } = DateTime.UtcNow;
        public string? ApprovedBy { get; set; } // Employee ID who approved
        public DateTime? ApprovedAt { get; set; }
        public string? ApprovalHistory { get; set; } // JSON array of approval events
        public string? RejectionReason { get; set; }
        public string? ApproverRemark { get; set; }

        // Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Employee? Employee { get; set; }
    }
}
