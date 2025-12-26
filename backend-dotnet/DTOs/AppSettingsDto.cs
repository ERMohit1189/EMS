namespace VendorRegistrationBackend.DTOs
{
    public class AppSettingsDto
    {
        public string? Id { get; set; }
        public int? ApprovalsRequiredForAllowance { get; set; }
        public int? PoGenerationDate { get; set; }
        public int? InvoiceGenerationDate { get; set; }
    }

    public class EmailSettingsDto
    {
        public string? SmtpHost { get; set; }
        public int? SmtpPort { get; set; }
        public string? SmtpUser { get; set; }
        public string? SmtpPass { get; set; }
        public bool SmtpSecure { get; set; } = false;
        public string? FromEmail { get; set; }
        public string? FromName { get; set; }
    }

    public class EmailTestRequestDto
    {
        public string? To { get; set; }
    }

    public class EmailTestResponseDto
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string? MessageId { get; set; }
        public object? Settings { get; set; }
        public object? Preview { get; set; }
        public object? Company { get; set; }
    }
}
