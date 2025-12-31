namespace VendorRegistrationBackend.DTOs
{
    public class LoginRequestDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string UserType { get; set; } = string.Empty; // "employee", "vendor", "admin"
    }

    public class LoginResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? Token { get; set; }
        public UserDto? User { get; set; }
    }

    public class UserDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string UserType { get; set; } = string.Empty;
        // Additional employee fields
        public string? EmpCode { get; set; }
        public string? Department { get; set; }
        public string? Designation { get; set; }
        public string? Photo { get; set; }
        public bool? IsReportingPerson { get; set; }
        public List<string>? ReportingTeamIds { get; set; }
    }
}
