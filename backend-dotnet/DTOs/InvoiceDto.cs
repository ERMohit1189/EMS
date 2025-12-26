namespace VendorRegistrationBackend.DTOs
{
    public class CreateInvoiceDto
    {
        public string InvoiceNumber { get; set; } = string.Empty;
        public string VendorId { get; set; } = string.Empty;
        public string? PoIds { get; set; } // JSON array
        public DateTime InvoiceDate { get; set; }
        public DateTime DueDate { get; set; }
        public decimal Amount { get; set; }
        public decimal GST { get; set; } = 0m;
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "Draft"; // Draft, Submitted, Approved, Paid, Rejected
        public string? PaymentMethod { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string? BankDetails { get; set; }
        public string? Remarks { get; set; }
    }

    public class UpdateInvoiceDto
    {
        public string VendorId { get; set; } = string.Empty;
        public DateTime InvoiceDate { get; set; }
        public DateTime DueDate { get; set; }
        public decimal Amount { get; set; }
        public decimal GST { get; set; }
        public decimal TotalAmount { get; set; }
        public string? PoIds { get; set; }
        public string Status { get; set; } = "Draft";
        public string? PaymentMethod { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string? BankDetails { get; set; }
        public string? Remarks { get; set; }
    }

    public class InvoiceDto
    {
        public string Id { get; set; } = string.Empty;
        public string InvoiceNumber { get; set; } = string.Empty;
        public string VendorId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime InvoiceDate { get; set; }
        public DateTime DueDate { get; set; }
    }
}
