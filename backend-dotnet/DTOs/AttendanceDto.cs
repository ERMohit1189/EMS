namespace VendorRegistrationBackend.DTOs
{
    using System.Text.Json;

    public class CreateAttendanceDto
    {
        public string EmployeeId { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public JsonElement AttendanceData { get; set; } // Accept JSON object or string
        public bool Submitted { get; set; } = false;
        public DateTime? SubmittedAt { get; set; }
        public bool Locked { get; set; } = false;
        public DateTime? LockedAt { get; set; }
    }

    public class UpdateAttendanceDto
    {
        public JsonElement? AttendanceData { get; set; }
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

    public class AttendanceResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public string AttendanceData { get; set; } = string.Empty;
        public bool Submitted { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public bool Locked { get; set; }
        public DateTime? LockedAt { get; set; }
        public string? LockedBy { get; set; }
    }

    public class LockAttendanceDto
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public bool LockAll { get; set; } = false;
    }

    public class UnlockAttendanceDto
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public bool UnlockAll { get; set; } = false;
        public string? EmployeeId { get; set; }
    }
}
