namespace VendorRegistrationBackend.DTOs
{
    public class CreatePurchaseOrderDto
    {
        public string PoNumber { get; set; } = string.Empty;
        public string VendorId { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal TotalAmount { get; set; }
        public string GSTType { get; set; } = "cgstsgst"; // cgstsgst, igst
        public bool GSTApply { get; set; } = true;
        public decimal IGSTPercentage { get; set; } = 0m;
        public decimal IGSTAmount { get; set; } = 0m;
        public decimal CGSTPercentage { get; set; } = 0m;
        public decimal CGSTAmount { get; set; } = 0m;
        public decimal SGSTPercentage { get; set; } = 0m;
        public decimal SGSTAmount { get; set; } = 0m;
        public DateTime PODate { get; set; }
        public DateTime DueDate { get; set; }
    }

    public class UpdatePurchaseOrderDto
    {
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "Draft";
        public string? Remarks { get; set; }
        public DateTime PODate { get; set; }
        public DateTime DueDate { get; set; }
    }

    public class PurchaseOrderDto
    {
        public string Id { get; set; } = string.Empty;
        public string PoNumber { get; set; } = string.Empty;
        public string VendorId { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "Draft";
        public DateTime PODate { get; set; }
        public DateTime DueDate { get; set; }
    }
}
