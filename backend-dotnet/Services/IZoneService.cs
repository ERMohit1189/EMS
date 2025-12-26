using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface IZoneService
    {
        Task<Zone?> GetZoneByIdAsync(string id);
        Task<List<Zone>> GetAllZonesAsync();
        Task<(List<Zone> zones, int totalCount)> GetZonesPagedAsync(int page, int pageSize);
        Task<Zone> CreateZoneAsync(Zone zone);
        Task<Zone?> UpdateZoneAsync(string id, Zone zone);
        Task<bool> DeleteZoneAsync(string id);
    }
}
