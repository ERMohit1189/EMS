namespace VendorRegistrationBackend.Models
{
    public class PurchaseOrder
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string PoNumber { get; set; } = string.Empty; // Required, Unique
        public string VendorId { get; set; } = string.Empty; // Required

        // PO Details
        public string? Description { get; set; }
        public int? Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal TotalAmount { get; set; } // Required

        // GST Details
        public string GSTType { get; set; } = "cgstsgst"; // cgstsgst, igst
        public bool GSTApply { get; set; } = true;
        public decimal IGSTPercentage { get; set; } = 0m;
        public decimal IGSTAmount { get; set; } = 0m;
        public decimal CGSTPercentage { get; set; } = 0m;
        public decimal CGSTAmount { get; set; } = 0m;
        public decimal SGSTPercentage { get; set; } = 0m;
        public decimal SGSTAmount { get; set; } = 0m;

        // Dates
        public DateTime PODate { get; set; } // Required
        public DateTime DueDate { get; set; } // Required

        // Status & Approval
        public string Status { get; set; } = "Draft"; // Draft, Approved, Issued, Completed, Cancelled
        public string? ApprovedBy { get; set; } // User ID who approved
        public DateTime? ApprovalDate { get; set; }
        public string? Remarks { get; set; }

        // Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Vendor? Vendor { get; set; }
        public ICollection<PurchaseOrderLine> Lines { get; set; } = new List<PurchaseOrderLine>();
    }
}
