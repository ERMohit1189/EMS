namespace VendorRegistrationBackend.DTOs
{
    public class ExportHeaderDto
    {
        public List<string> Columns { get; set; } = new List<string>();
        public Dictionary<string, string>? CustomNames { get; set; }
    }
}
