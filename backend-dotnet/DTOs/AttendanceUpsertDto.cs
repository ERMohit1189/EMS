using System.Text.Json;

namespace VendorRegistrationBackend.DTOs
{
    public class AttendanceUpsertDto
    {
        public string EmployeeId { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public JsonElement AttendanceData { get; set; }
    }
}