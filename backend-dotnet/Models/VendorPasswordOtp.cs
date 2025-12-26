namespace VendorRegistrationBackend.Models
{
    public class VendorPasswordOtp
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string VendorId { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public bool Used { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Vendor? Vendor { get; set; }
    }
}
