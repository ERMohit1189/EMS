using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface IDepartmentService
    {
        Task<List<Department>> GetAllDepartmentsAsync();
    }
}
