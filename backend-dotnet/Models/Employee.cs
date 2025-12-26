namespace VendorRegistrationBackend.Models
{
    public class Employee
    {
        // Primary Key & Basic Info
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty; // Required
        public string Email { get; set; } = string.Empty; // Required, Unique
        public string? PasswordHash { get; set; }

        // Personal Details
        public DateTime? DateOfBirth { get; set; }
        public string? FatherName { get; set; } // Required
        public string? Mobile { get; set; } // Required, Unique
        public string? AlternateNo { get; set; }
        public string? Address { get; set; } // Required
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; } = "India";

        // Employment Details
        public string EmpCode { get; set; } = string.Empty; // Unique (EMP00001, etc.)
        public string? DepartmentId { get; set; }
        public string? DesignationId { get; set; }
        public string Role { get; set; } = "user"; // admin, user, superadmin
        public DateTime? DateOfJoining { get; set; } // Required

        // Document Details
        public string? Aadhar { get; set; }
        public string? PAN { get; set; }
        public string? BloodGroup { get; set; }
        public string? MaritalStatus { get; set; } // Required: Single, Married
        public string? Nominee { get; set; }

        // Other Details
        public bool PPEKit { get; set; } = false;
        public string? KitNo { get; set; }
        public string? Photo { get; set; }
        public string Status { get; set; } = "Active"; // Active, Inactive

        // Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Department? Department { get; set; }
        public Designation? Designation { get; set; }
        public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
        public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
        public ICollection<LeaveAllotment> LeaveAllotments { get; set; } = new List<LeaveAllotment>();
        public ICollection<SalaryStructure> SalaryStructures { get; set; } = new List<SalaryStructure>();
    }
}