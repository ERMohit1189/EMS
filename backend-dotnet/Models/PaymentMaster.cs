namespace VendorRegistrationBackend.Models
{
    public class PaymentMaster
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string SiteId { get; set; } = string.Empty;
        public string PlanId { get; set; } = string.Empty;
        public string VendorId { get; set; } = string.Empty;
        public string AntennaSize { get; set; } = string.Empty;
        public decimal? SiteAmount { get; set; }
        public decimal VendorAmount { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Site? Site { get; set; }
        public Vendor? Vendor { get; set; }
    }
}
