using System.Collections.Generic;

namespace VendorRegistrationBackend.DTOs
{
    public class GeneratedSalaryItemDto
    {
        public string EmployeeId { get; set; } = string.Empty;
        public int TotalDays { get; set; }
        public int PresentDays { get; set; }
        public int HalfDays { get; set; }
        public int AbsentDays { get; set; }
        public int LeaveDays { get; set; }
        public int Sundays { get; set; }
        public int Holidays { get; set; }
        public decimal WorkingDays { get; set; }
        public decimal SalaryDays { get; set; }
        public decimal BasicSalary { get; set; }
        public decimal HRA { get; set; }
        public decimal DA { get; set; }
        public decimal LTA { get; set; }
        public decimal Conveyance { get; set; }
        public decimal Medical { get; set; }
        public decimal Bonuses { get; set; }
        public decimal OtherBenefits { get; set; }
        public decimal GrossSalary { get; set; }
        public decimal PerDaySalary { get; set; }
        public decimal EarnedSalary { get; set; }
        public decimal PF { get; set; }
        public decimal ProfessionalTax { get; set; }
        public decimal IncomeTax { get; set; }
        public decimal EPF { get; set; }
        public decimal ESIC { get; set; }
        public decimal FixedDeductions { get; set; }
        public decimal AbsentDaysDeduction { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal NetSalary { get; set; }
    }

    public class SaveGeneratedSalariesRequestDto
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public List<GeneratedSalaryItemDto> Salaries { get; set; } = new List<GeneratedSalaryItemDto>();
    }

    public class SaveGeneratedSalariesResultDto
    {
        public bool Success { get; set; }
        public int Count { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
