namespace VendorRegistrationBackend.Models
{
    public class SalaryStructure
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string EmployeeId { get; set; } = string.Empty; // Required

        // Month & Year (Required)
        public int Month { get; set; } = 1; // 1-12
        public int Year { get; set; } = 2025;

        // Salary Components - Earnings
        public decimal BasicSalary { get; set; } // Required
        public decimal HRA { get; set; } // House Rent Allowance
        public decimal DA { get; set; } // Dearness Allowance
        public decimal LTA { get; set; } // Leave Travel Allowance
        public decimal Conveyance { get; set; }
        public decimal Medical { get; set; }
        public decimal Bonuses { get; set; } = 0m;
        public decimal OtherBenefits { get; set; } = 0m;

        // Salary Components - Deductions
        public decimal PF { get; set; } // Provident Fund
        public decimal ProfessionalTax { get; set; }
        public decimal IncomeTax { get; set; } = 0m;
        public decimal EPF { get; set; } // Employees' Provident Fund
        public decimal ESIC { get; set; } // Employees' State Insurance

        // Flags
        public bool WantDeduction { get; set; } = true;

        // Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Employee? Employee { get; set; }
    }
}
