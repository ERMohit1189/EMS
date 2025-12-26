namespace VendorRegistrationBackend.DTOs
{
    public class CheckMissingVendorsDto
    {
        public List<VendorCodeInfo> Vendors { get; set; } = new List<VendorCodeInfo>();
    }

    public class VendorCodeInfo
    {
        public string Code { get; set; } = string.Empty;
        public string? Name { get; set; }
    }

    public class BatchCreateVendorsDto
    {
        public List<string> Vendors { get; set; } = new List<string>();
    }

    public class BatchCreateVendorResultDto
    {
        public string Code { get; set; } = string.Empty;
        public string Id { get; set; } = string.Empty;
        public string? Name { get; set; }
    }

    public class GetMappingResultDto
    {
        public Dictionary<string, string> Mapping { get; set; } = new Dictionary<string, string>();
    }
}
