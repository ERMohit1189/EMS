namespace VendorRegistrationBackend.DTOs
{
    public class CreateAttendanceDto
    {
        public string EmployeeId { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public string? AttendanceData { get; set; } // JSON format
        public bool Submitted { get; set; } = false;
        public DateTime? SubmittedAt { get; set; }
        public bool Locked { get; set; } = false;
        public DateTime? LockedAt { get; set; }
    }

    public class UpdateAttendanceDto
    {
        public string? AttendanceData { get; set; }
        public bool Submitted { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public bool Locked { get; set; }
        public DateTime? LockedAt { get; set; }
    }

    public class AttendanceDto
    {
        public string Id { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public bool Submitted { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public bool Locked { get; set; }
    }
}
