using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace VendorRegistrationBackend.Models
{
    public class TeamMember
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string TeamId { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string? ReportingPerson1 { get; set; }
        public string? ReportingPerson2 { get; set; }
        public string? ReportingPerson3 { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [JsonIgnore]
        public Team? Team { get; set; }
    }
}