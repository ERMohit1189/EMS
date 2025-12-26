using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface ISalaryService
    {
        // Salary Structure Management
        Task<SalaryStructure?> GetSalaryStructureByIdAsync(string id);
        Task<SalaryStructure?> GetSalaryStructureByEmployeeAsync(string employeeId);
        Task<List<SalaryStructure>> GetAllSalaryStructuresAsync();
        Task<SalaryStructure> CreateSalaryStructureAsync(SalaryStructure salaryStructure);
        Task<SalaryStructure?> UpdateSalaryStructureAsync(string id, SalaryStructure salaryStructure);
        Task<bool> DeleteSalaryStructureAsync(string id);
        Task<decimal> CalculateGrossAsync(string employeeId);
        Task<decimal> CalculateNetAsync(string employeeId);
        Task<int> GetSalaryStructureCountAsync();

        // Salary Generation & Reports
        Task<List<dynamic>> GenerateSalariesAsync(int month, int year, bool missingOnly = false);
        Task<List<dynamic>> GetSalaryReportAsync();

        // Generated Salary Management (matches Node.js API)
        Task<DTOs.SaveGeneratedSalariesResultDto?> SaveGeneratedSalariesAsync(int month, int year, List<DTOs.GeneratedSalaryItemDto> salaries, string? generatedBy = null);
        Task<List<dynamic>> GetGeneratedSalariesAsync(int year, int month, int page = 1, int pageSize = 20, string? search = null);
        Task<GeneratedSalary?> GetGeneratedSalaryAsync(string id);
        Task<bool> DeleteGeneratedSalaryAsync(string id);
        Task<bool> SalaryExistsAsync(string employeeId, int month, int year);
        Task<List<dynamic>> GetSalaryGeneratedSummariesAsync();
    }
}
