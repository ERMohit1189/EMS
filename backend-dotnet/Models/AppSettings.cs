namespace VendorRegistrationBackend.Models
{
    public class AppSettings
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();

        // Application approval settings
        public int? ApprovalsRequiredForAllowance { get; set; }
        public int? PoGenerationDate { get; set; }
        public int? InvoiceGenerationDate { get; set; }

        // Email/SMTP settings
        public string? SmtpHost { get; set; }
        public int? SmtpPort { get; set; }
        public string? SmtpUser { get; set; }
        public string? SmtpPass { get; set; }
        public bool SmtpSecure { get; set; } = false;
        public string? FromEmail { get; set; }
        public string? FromName { get; set; }

        // Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
