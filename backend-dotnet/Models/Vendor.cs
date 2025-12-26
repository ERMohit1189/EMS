namespace VendorRegistrationBackend.Models
{
    public class Vendor
    {
        // Primary Key & Basic Info
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string VendorCode { get; set; } = string.Empty; // Unique
        public string Name { get; set; } = string.Empty; // Required
        public string Email { get; set; } = string.Empty; // Required, Unique
        public string? Mobile { get; set; } // Required, Unique
        public string? Address { get; set; } // Required
        public string? City { get; set; } // Required
        public string? State { get; set; } // Required
        public string? Pincode { get; set; }
        public string? Country { get; set; } = "India";

        // Document Details
        public string? Aadhar { get; set; }
        public string? PAN { get; set; }
        public string? GSTIN { get; set; }
        public string? MOA { get; set; }
        public string? AadharDoc { get; set; } // Document URL
        public string? PANDoc { get; set; } // Document URL
        public string? GSTINDoc { get; set; } // Document URL
        public string? MOADoc { get; set; } // Document URL

        // Vendor Category & Status
        public string? Category { get; set; } = "Individual"; // Individual, Company
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
        public string Role { get; set; } = "Vendor"; // Vendor, Admin, Manager

        // Authentication
        public string? PasswordHash { get; set; } // Password for vendor login

        // Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<Site> Sites { get; set; } = new List<Site>();
        public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
        public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
        public ICollection<VendorRate> VendorRates { get; set; } = new List<VendorRate>();
        public ICollection<PaymentMaster> PaymentMasters { get; set; } = new List<PaymentMaster>();
        public ICollection<VendorPasswordOtp> PasswordOtps { get; set; } = new List<VendorPasswordOtp>();
    }
}
