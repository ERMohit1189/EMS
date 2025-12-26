namespace VendorRegistrationBackend.Models
{
    public class Invoice
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string InvoiceNumber { get; set; } = string.Empty; // Required, Unique
        public string VendorId { get; set; } = string.Empty; // Required
        public string? PoIds { get; set; } // Array as string (JSON)

        // Invoice Dates
        public DateTime InvoiceDate { get; set; } // Required
        public DateTime DueDate { get; set; } // Required

        // Amount Details
        public decimal Amount { get; set; } // Required
        public decimal GST { get; set; } = 0m;
        public decimal TotalAmount { get; set; } // Required

        // Status & Payment
        public string Status { get; set; } = "Draft"; // Draft, Submitted, Approved, Paid, Rejected
        public string? PaymentMethod { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string? BankDetails { get; set; }
        public string? Remarks { get; set; }

        // Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Vendor? Vendor { get; set; }
    }
}
