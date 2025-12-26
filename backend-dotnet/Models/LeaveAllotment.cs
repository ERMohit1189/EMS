namespace VendorRegistrationBackend.Models
{
    public class LeaveAllotment
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string EmployeeId { get; set; } = string.Empty; // Required
        public int Year { get; set; } // Required - One row per employee per year

        // Leave Type Allocations
        public int MedicalLeave { get; set; } = 0;
        public int CasualLeave { get; set; } = 0;
        public int EarnedLeave { get; set; } = 0;
        public int SickLeave { get; set; } = 0;
        public int PersonalLeave { get; set; } = 0;
        public int UnpaidLeave { get; set; } = 0;
        public int LeaveWithoutPay { get; set; } = 0;

        // Carry Forward Flags (per-type)
        public bool CarryForwardEarned { get; set; } = false;
        public bool CarryForwardPersonal { get; set; } = false;

        // Used Leaves (Tracking)
        public int UsedMedicalLeave { get; set; } = 0;
        public int UsedCasualLeave { get; set; } = 0;
        public int UsedEarnedLeave { get; set; } = 0;
        public int UsedSickLeave { get; set; } = 0;
        public int UsedPersonalLeave { get; set; } = 0;
        public int UsedUnpaidLeave { get; set; } = 0;
        public int UsedLeaveWithoutPay { get; set; } = 0;

        // Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Employee? Employee { get; set; }
    }
}
