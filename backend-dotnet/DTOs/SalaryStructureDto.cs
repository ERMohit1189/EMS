namespace VendorRegistrationBackend.DTOs
{
    public class CreateSalaryStructureDto
    {
        public string EmployeeId { get; set; } = string.Empty;
        public int Month { get; set; } = 1;
        public int Year { get; set; } = 2025;
        public decimal BasicSalary { get; set; }
        public decimal HRA { get; set; }
        public decimal DA { get; set; }
        public decimal LTA { get; set; }
        public decimal Conveyance { get; set; }
        public decimal Medical { get; set; }
        public decimal Bonuses { get; set; } = 0m;
        public decimal OtherBenefits { get; set; } = 0m;
        public decimal PF { get; set; }
        public decimal ProfessionalTax { get; set; }
        public decimal IncomeTax { get; set; } = 0m;
        public decimal EPF { get; set; }
        public decimal ESIC { get; set; }
        public bool WantDeduction { get; set; } = true;
    }

    public class UpdateSalaryStructureDto
    {
        public decimal BasicSalary { get; set; }
        public decimal HRA { get; set; }
        public decimal DA { get; set; }
        public decimal LTA { get; set; }
        public decimal Conveyance { get; set; }
        public decimal Medical { get; set; }
        public decimal Bonuses { get; set; }
        public decimal OtherBenefits { get; set; }
        public decimal PF { get; set; }
        public decimal ProfessionalTax { get; set; }
        public decimal IncomeTax { get; set; }
        public decimal EPF { get; set; }
        public decimal ESIC { get; set; }
        public bool WantDeduction { get; set; }
    }

    public class SalaryStructureDto
    {
        public string Id { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public decimal BasicSalary { get; set; }
        public decimal HRA { get; set; }
        public decimal DA { get; set; }
        public decimal LTA { get; set; }
        public decimal Conveyance { get; set; }
        public decimal Medical { get; set; }
        public decimal Bonuses { get; set; }
        public decimal OtherBenefits { get; set; }
    }

    public class SalaryStructureResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public decimal BasicSalary { get; set; }
        public decimal HRA { get; set; }
        public decimal DA { get; set; }
        public decimal LTA { get; set; }
        public decimal Conveyance { get; set; }
        public decimal Medical { get; set; }
        public decimal Bonuses { get; set; }
        public decimal OtherBenefits { get; set; }
        public decimal PF { get; set; }
        public decimal ProfessionalTax { get; set; }
        public decimal IncomeTax { get; set; }
        public decimal EPF { get; set; }
        public decimal ESIC { get; set; }
        public bool WantDeduction { get; set; }

        // Employee information
        public EmployeeInfoDto? Employee { get; set; }
    }

    public class EmployeeInfoDto
    {
        public string Id { get; set; } = string.Empty;
        public string EmpCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public string? Department { get; set; }
    }
}
