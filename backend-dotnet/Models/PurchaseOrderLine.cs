namespace VendorRegistrationBackend.Models
{
    public class PurchaseOrderLine
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string PoId { get; set; } = string.Empty; // Required, Foreign Key
        public string SiteId { get; set; } = string.Empty; // Required, Foreign Key

        // Line Details
        public string? Description { get; set; } // Required
        public int Quantity { get; set; } = 1; // Required, default 1
        public decimal UnitPrice { get; set; } = 0m; // Required, default 0
        public decimal TotalAmount { get; set; } = 0m; // Required, default 0

        // Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public PurchaseOrder? PurchaseOrder { get; set; }
        public Site? Site { get; set; }
    }
}
