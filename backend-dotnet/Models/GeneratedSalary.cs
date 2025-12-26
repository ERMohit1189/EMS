namespace VendorRegistrationBackend.Models
{
    public class GeneratedSalary
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string EmployeeId { get; set; } = string.Empty;

        // Month & Year
        public int Month { get; set; }
        public int Year { get; set; }

        // Attendance Data
        public int TotalDays { get; set; } = 0;
        public int PresentDays { get; set; } = 0;
        public int HalfDays { get; set; } = 0;
        public int AbsentDays { get; set; } = 0;
        public int LeaveDays { get; set; } = 0;
        public int Sundays { get; set; } = 0;  // Number of Sundays in the month
        public int Holidays { get; set; } = 0;  // Number of holidays in the month
        public decimal WorkingDays { get; set; } = 0;
        public decimal SalaryDays { get; set; } = 0;  // Working Days + Sundays + Holidays

        // Salary Components - Earnings
        public decimal BasicSalary { get; set; } = 0;
        public decimal HRA { get; set; } = 0;
        public decimal DA { get; set; } = 0;
        public decimal LTA { get; set; } = 0;
        public decimal Conveyance { get; set; } = 0;
        public decimal Medical { get; set; } = 0;
        public decimal Bonuses { get; set; } = 0;
        public decimal OtherBenefits { get; set; } = 0;
        public decimal GrossSalary { get; set; } = 0;

        // Salary Calculations
        public decimal PerDaySalary { get; set; } = 0;
        public decimal EarnedSalary { get; set; } = 0;

        // Salary Components - Deductions
        public decimal PF { get; set; } = 0;
        public decimal ProfessionalTax { get; set; } = 0;
        public decimal IncomeTax { get; set; } = 0;
        public decimal EPF { get; set; } = 0;
        public decimal ESIC { get; set; } = 0;
        public decimal FixedDeductions { get; set; } = 0;  // PF + Tax + etc
        public decimal AbsentDaysDeduction { get; set; } = 0;  // Deduction based on absent days
        public decimal TotalDeductions { get; set; } = 0;

        // Net Salary
        public decimal NetSalary { get; set; } = 0;

        // Additional Fields
        public string? Details { get; set; } // JSON string for additional details
        public string? GeneratedBy { get; set; } // Admin ID who generated this

        // Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Employee? Employee { get; set; }
    }
}
