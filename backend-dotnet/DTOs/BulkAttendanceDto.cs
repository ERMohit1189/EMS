using System.Collections.Generic;
using System.Text.Json;

namespace VendorRegistrationBackend.DTOs
{
    public class BulkAttendanceDto
    {
        public List<string> EmployeeIds { get; set; } = new List<string>();
        public int Month { get; set; }
        public int Year { get; set; }
        public JsonElement AttendanceData { get; set; }
        public string? Mode { get; set; }
        public int? Day { get; set; }
        public bool LockAfterSave { get; set; }
    }
}