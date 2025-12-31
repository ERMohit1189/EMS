namespace VendorRegistrationBackend.DTOs
{
    public class SaveReportTemplateDto
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // "invoice" or "po"
        public string? DesignJson { get; set; }
        public string? QueriesJson { get; set; }
    }

    public class ReportTemplateResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public object? Design { get; set; }
        public object? Queries { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
