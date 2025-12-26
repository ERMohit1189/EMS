namespace VendorRegistrationBackend.Models
{
    public class Holiday
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty; // Required
        public DateTime Date { get; set; } // Required - Holiday Date
        public string? State { get; set; } // State/Region (Optional)
        public string Type { get; set; } = "public"; // public, optional, restricted
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true; // Required, default true
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
