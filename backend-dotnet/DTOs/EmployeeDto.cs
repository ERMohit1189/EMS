namespace VendorRegistrationBackend.DTOs
{
    public class CreateEmployeeDto
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? DepartmentId { get; set; }
        public string? DesignationId { get; set; }
        public string? Mobile { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? FatherName { get; set; }
        public string? AlternateNo { get; set; }
        public string? Aadhar { get; set; }
        public string? PAN { get; set; }
        public string? BloodGroup { get; set; }
        public string? MaritalStatus { get; set; }
        public string? Nominee { get; set; }
        public DateTime? DateOfJoining { get; set; }
    }

    public class UpdateEmployeeDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Mobile { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? FatherName { get; set; }
        public string? AlternateNo { get; set; }
        public string? Aadhar { get; set; }
        public string? PAN { get; set; }
        public string? BloodGroup { get; set; }
        public string? MaritalStatus { get; set; }
        public string? Nominee { get; set; }
    }

    public class EmployeeDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? EmpCode { get; set; }
        public string? DepartmentId { get; set; }
        public string? DesignationId { get; set; }
        public string? Mobile { get; set; }
        public string? City { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
