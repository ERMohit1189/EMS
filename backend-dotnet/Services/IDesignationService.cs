using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface IDesignationService
    {
        Task<List<Designation>> GetAllDesignationsAsync();
    }
}
