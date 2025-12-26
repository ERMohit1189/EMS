using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface IEmployeeService
    {
        Task<EmployeeDto?> GetEmployeeByIdAsync(string id);
        Task<List<EmployeeDto>> GetAllEmployeesAsync();
        Task<(List<EmployeeDto> employees, int totalCount)> GetEmployeesPagedAsync(int page, int pageSize);
        Task<Employee> CreateEmployeeAsync(CreateEmployeeDto dto);
        Task<Employee?> UpdateEmployeeAsync(string id, UpdateEmployeeDto dto);
        Task<bool> DeleteEmployeeAsync(string id);
        Task<bool> ChangePasswordAsync(string id, string oldPassword, string newPassword);
        Task<bool> SyncCredentialsAsync(string employeeId, string password);
        Task<List<EmployeeDto>> GetEmployeesWithoutCredentialsAsync();
        // Create a minimal test employee (development only)

    }
}
