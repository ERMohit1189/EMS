namespace VendorRegistrationBackend.Models
{
    public class Attendance
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string EmployeeId { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public string AttendanceData { get; set; } = string.Empty; // JSON
        public bool Submitted { get; set; }
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
        public bool Locked { get; set; }
        public DateTime? LockedAt { get; set; }
        public string? LockedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Employee? Employee { get; set; }
    }
}
