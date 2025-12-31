using System.Text.Json.Serialization;

namespace VendorRegistrationBackend.DTOs
{
    public class UpdateTeamMemberReportingDto
    {
        [JsonPropertyName("reportingPerson1")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ReportingPerson1 { get; set; }

        [JsonPropertyName("reportingPerson2")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ReportingPerson2 { get; set; }

        [JsonPropertyName("reportingPerson3")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ReportingPerson3 { get; set; }
    }
}
