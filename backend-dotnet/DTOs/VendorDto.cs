namespace VendorRegistrationBackend.DTOs
{
    public class CreateVendorDto
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? Mobile { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? Aadhar { get; set; }
        public string? Pan { get; set; }
        public string? GSTIN { get; set; }
        public string? MOA { get; set; }
        public string? Category { get; set; }
        public string? Country { get; set; }
    }

    public class UpdateVendorDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Mobile { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? Country { get; set; }
        public string? Aadhar { get; set; }
        public string? AadharDoc { get; set; }
        public string? Pan { get; set; }
        public string? PanDoc { get; set; }
        public string? Gstin { get; set; }
        public string? GstinDoc { get; set; }
        public string? Moa { get; set; }
        public string? MoaDoc { get; set; }
        public string? Category { get; set; }
    }

    public class VendorDto
    {
        public string Id { get; set; } = string.Empty;
        public string VendorCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Mobile { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? Country { get; set; }
        public string? Category { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Aadhar { get; set; }
        public string? AadharDoc { get; set; }
        public string? PAN { get; set; }
        public string? PANDoc { get; set; }
        public string? GSTIN { get; set; }
        public string? GSTINDoc { get; set; }
        public string? MOA { get; set; }
        public string? MOADoc { get; set; }
        public bool IsUsed { get; set; }
    }

    public class VendorRateDto
    {
        public string AntennaSize { get; set; } = string.Empty;
        public decimal VendorAmount { get; set; }
    }

    public class AddVendorRateDto
    {
        public string AntennaSize { get; set; } = string.Empty;
        public decimal VendorAmount { get; set; }
    }
}
