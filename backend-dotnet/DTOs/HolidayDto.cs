namespace VendorRegistrationBackend.DTOs
{
    public class CreateHolidayDto
    {
        public string Name { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string? State { get; set; }
        public string? Type { get; set; } = "public"; // public, optional, restricted
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateHolidayDto
    {
        public string Name { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string? State { get; set; }
        public string? Type { get; set; } = "public";
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class HolidayDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string? State { get; set; }
        public string? Type { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; }
    }
}
