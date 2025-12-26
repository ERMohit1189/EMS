using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface ICircleService
    {
        Task<Circle?> GetCircleByIdAsync(string id);
        Task<List<Circle>> GetAllCirclesAsync();
        Task<(List<Circle> circles, int totalCount)> GetCirclesPagedAsync(int page, int pageSize);
        Task<Circle> CreateCircleAsync(Circle circle);
        Task<Circle?> UpdateCircleAsync(string id, Circle circle);
        Task<bool> DeleteCircleAsync(string id);
    }
}
