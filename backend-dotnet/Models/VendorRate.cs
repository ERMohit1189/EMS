namespace VendorRegistrationBackend.Models
{
    public class VendorRate
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string VendorId { get; set; } = string.Empty;
        public string AntennaSize { get; set; } = string.Empty;
        public decimal Rate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Vendor? Vendor { get; set; }
    }
}
