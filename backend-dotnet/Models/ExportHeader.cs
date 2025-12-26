namespace VendorRegistrationBackend.Models
{
    public class ExportHeader
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string? CompanyName { get; set; }
        public string? ReportTitle { get; set; }
        public string? FooterText { get; set; }
        public string? ContactPhone { get; set; }
        public string? ContactEmail { get; set; }
        public string? Website { get; set; }
        public string? Gstin { get; set; }
        public string? Address { get; set; }
        public string? State { get; set; }
        public string? City { get; set; }
        public bool ShowGeneratedDate { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
