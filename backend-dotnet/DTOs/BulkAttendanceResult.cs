using System.Collections.Generic;

namespace VendorRegistrationBackend.DTOs
{
    public class BulkAttendanceFailed
    {
        public string EmployeeId { get; set; } = string.Empty;
        public string Error { get; set; } = string.Empty;
    }

    public class BulkAttendanceResult
    {
        public List<string> Success { get; set; } = new List<string>();
        public List<BulkAttendanceFailed> Failed { get; set; } = new List<BulkAttendanceFailed>();
        public Dictionary<string, List<string>> Skipped { get; set; } = new Dictionary<string, List<string>>();
        public int LockedCount { get; set; }
        public int Total { get; set; }
    }
}
