using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VendorRegistrationBackend.Models
{
    [Table("daily_allowances")]
    public class DailyAllowance
    {
        [Key]
        [Column("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [Column("employee_id")]
        public string EmployeeId { get; set; } = string.Empty;

        [Column("team_id")]
        public string? TeamId { get; set; }

        [Required]
        [Column("date")]
        public DateTime Date { get; set; }

        [Required]
        [Column("allowance_data")]
        public string AllowanceData { get; set; } = string.Empty; // JSON string with Travel, Food, Accommodation, Mobile, Internet, Utilities, Parking, Misc

        [Column("selected_employee_ids")]
        public string? SelectedEmployeeIds { get; set; } // JSON array for bulk submissions

        [Column("approval_status")]
        public string ApprovalStatus { get; set; } = "pending"; // pending, processing, approved, rejected

        [Column("approval_count")]
        public int ApprovalCount { get; set; } = 0;

        [Column("required_approvals")]
        public int? RequiredApprovals { get; set; } // Locked at first approval

        [Column("paid_status")]
        public string PaidStatus { get; set; } = "unpaid"; // unpaid, partial, full

        [Column("approved_by")]
        public string? ApprovedBy { get; set; } // JSON array of approver IDs

        [Column("approval_history")]
        public string? ApprovalHistory { get; set; } // JSON array: [{approverId, approverName, level, remark, editedData, timestamp}]

        [Column("rejection_reason")]
        public string? RejectionReason { get; set; }

        [Column("approved_at")]
        public DateTime? ApprovedAt { get; set; }

        [Column("submitted_at")]
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("EmployeeId")]
        public virtual Employee? Employee { get; set; }

        [ForeignKey("TeamId")]
        public virtual Team? Team { get; set; }
    }
}
