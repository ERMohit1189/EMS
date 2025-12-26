using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class SalaryService : ISalaryService
    {
        private readonly AppDbContext _context;

        public SalaryService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<SalaryStructure?> GetSalaryStructureByIdAsync(string id)
        {
            return await _context.SalaryStructures
                .Include(ss => ss.Employee)
                .FirstOrDefaultAsync(ss => ss.Id == id);
        }

        public async Task<SalaryStructure?> GetSalaryStructureByEmployeeAsync(string employeeId)
        {
            return await _context.SalaryStructures
                .FirstOrDefaultAsync(ss => ss.EmployeeId == employeeId);
        }

        public async Task<List<SalaryStructure>> GetAllSalaryStructuresAsync()
        {
            return await _context.SalaryStructures
                .Include(ss => ss.Employee)
                .ToListAsync();
        }

        public async Task<SalaryStructure> CreateSalaryStructureAsync(SalaryStructure salaryStructure)
        {
            salaryStructure.Id = Guid.NewGuid().ToString();
            salaryStructure.CreatedAt = DateTime.UtcNow;
            salaryStructure.UpdatedAt = DateTime.UtcNow;

            _context.SalaryStructures.Add(salaryStructure);
            await _context.SaveChangesAsync();
            return salaryStructure;
        }

        public async Task<SalaryStructure?> UpdateSalaryStructureAsync(string id, SalaryStructure salaryStructure)
        {
            var existing = await _context.SalaryStructures.FindAsync(id);
            if (existing == null) return null;

            existing.BasicSalary = salaryStructure.BasicSalary;
            existing.HRA = salaryStructure.HRA;
            existing.DA = salaryStructure.DA;
            existing.LTA = salaryStructure.LTA;
            existing.Conveyance = salaryStructure.Conveyance;
            existing.Medical = salaryStructure.Medical;
            existing.Bonuses = salaryStructure.Bonuses;
            existing.OtherBenefits = salaryStructure.OtherBenefits;
            existing.PF = salaryStructure.PF;
            existing.ProfessionalTax = salaryStructure.ProfessionalTax;
            existing.IncomeTax = salaryStructure.IncomeTax;
            existing.EPF = salaryStructure.EPF;
            existing.ESIC = salaryStructure.ESIC;
            existing.WantDeduction = salaryStructure.WantDeduction;
            existing.UpdatedAt = DateTime.UtcNow;

            _context.SalaryStructures.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteSalaryStructureAsync(string id)
        {
            var salaryStructure = await _context.SalaryStructures.FindAsync(id);
            if (salaryStructure == null) return false;

            _context.SalaryStructures.Remove(salaryStructure);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<decimal> CalculateGrossAsync(string employeeId)
        {
            var salaryStructure = await _context.SalaryStructures
                .FirstOrDefaultAsync(ss => ss.EmployeeId == employeeId);

            if (salaryStructure == null)
                return 0;

            decimal gross = salaryStructure.BasicSalary +
                           salaryStructure.HRA +
                           salaryStructure.DA +
                           salaryStructure.LTA +
                           salaryStructure.Conveyance +
                           salaryStructure.Medical +
                           salaryStructure.Bonuses +
                           salaryStructure.OtherBenefits;

            return gross;
        }

        public async Task<decimal> CalculateNetAsync(string employeeId)
        {
            var salaryStructure = await _context.SalaryStructures
                .FirstOrDefaultAsync(ss => ss.EmployeeId == employeeId);

            if (salaryStructure == null)
                return 0;

            decimal gross = await CalculateGrossAsync(employeeId);
            decimal deductions = salaryStructure.PF +
                                salaryStructure.ProfessionalTax +
                                salaryStructure.IncomeTax +
                                salaryStructure.EPF +
                                salaryStructure.ESIC;

            return gross - deductions;
        }

        public async Task<int> GetSalaryStructureCountAsync()
        {
            return await _context.SalaryStructures.CountAsync();
        }

        public async Task<List<dynamic>> GenerateSalariesAsync(int month, int year, bool missingOnly = false)
        {
            var salaryStructures = await _context.SalaryStructures
                .Include(ss => ss.Employee)
                .ToListAsync();

            var generatedSalaries = new List<dynamic>();

            foreach (var ss in salaryStructures)
            {
                if (ss.Employee == null) continue;

                var gross = await CalculateGrossAsync(ss.EmployeeId);
                var net = await CalculateNetAsync(ss.EmployeeId);

                generatedSalaries.Add(new
                {
                    id = Guid.NewGuid().ToString(),
                    employeeId = ss.EmployeeId,
                    employeeName = ss.Employee.Name,
                    employeeCode = ss.Employee.EmpCode,
                    department = ss.Employee.Department?.Name ?? "N/A",
                    designation = ss.Employee.Designation?.Name ?? "N/A",
                    basicSalary = ss.BasicSalary,
                    hra = ss.HRA,
                    da = ss.DA,
                    lta = ss.LTA,
                    conveyance = ss.Conveyance,
                    medical = ss.Medical,
                    bonuses = ss.Bonuses,
                    otherBenefits = ss.OtherBenefits,
                    grossSalary = gross,
                    pf = ss.PF,
                    professionalTax = ss.ProfessionalTax,
                    incomeTax = ss.IncomeTax,
                    epf = ss.EPF,
                    esic = ss.ESIC,
                    totalDeductions = ss.PF + ss.ProfessionalTax + ss.IncomeTax + ss.EPF + ss.ESIC,
                    netSalary = net,
                    month = month,
                    year = year,
                    createdAt = DateTime.UtcNow
                });
            }

            return generatedSalaries;
        }

        public async Task<List<dynamic>> GetSalaryReportAsync()
        {
            var salaryStructures = await _context.SalaryStructures
                .Include(ss => ss.Employee)
                .ToListAsync();

            var reportData = new List<dynamic>();

            foreach (var ss in salaryStructures)
            {
                if (ss.Employee == null) continue;

                var gross = await CalculateGrossAsync(ss.EmployeeId);
                var net = await CalculateNetAsync(ss.EmployeeId);
                var deductions = gross - net;

                reportData.Add(new
                {
                    id = ss.Id,
                    employeeId = ss.EmployeeId,
                    employeeName = ss.Employee.Name,
                    employeeCode = ss.Employee.EmpCode,
                    department = ss.Employee.Department?.Name ?? "N/A",
                    designation = ss.Employee.Designation?.Name ?? "N/A",
                    basicSalary = ss.BasicSalary,
                    hra = ss.HRA,
                    da = ss.DA,
                    lta = ss.LTA,
                    conveyance = ss.Conveyance,
                    medical = ss.Medical,
                    bonuses = ss.Bonuses,
                    otherBenefits = ss.OtherBenefits,
                    gross = gross,
                    pf = ss.PF,
                    professionalTax = ss.ProfessionalTax,
                    incomeTax = ss.IncomeTax,
                    epf = ss.EPF,
                    esic = ss.ESIC,
                    deductions = deductions,
                    net = net,
                    wantDeduction = ss.WantDeduction
                });
            }

            return reportData;
        }
    }
}
