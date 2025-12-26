using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface ISalaryService
    {
        Task<SalaryStructure?> GetSalaryStructureByIdAsync(string id);
        Task<SalaryStructure?> GetSalaryStructureByEmployeeAsync(string employeeId);
        Task<List<SalaryStructure>> GetAllSalaryStructuresAsync();
        Task<SalaryStructure> CreateSalaryStructureAsync(SalaryStructure salaryStructure);
        Task<SalaryStructure?> UpdateSalaryStructureAsync(string id, SalaryStructure salaryStructure);
        Task<bool> DeleteSalaryStructureAsync(string id);
        Task<decimal> CalculateGrossAsync(string employeeId);
        Task<decimal> CalculateNetAsync(string employeeId);
        Task<int> GetSalaryStructureCountAsync();
        Task<List<dynamic>> GenerateSalariesAsync(int month, int year, bool missingOnly = false);
        Task<List<dynamic>> GetSalaryReportAsync();
    }
}
