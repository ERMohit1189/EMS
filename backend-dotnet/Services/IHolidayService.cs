using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface IHolidayService
    {
        Task<Holiday?> GetHolidayByIdAsync(string id);
        Task<List<Holiday>> GetAllHolidaysAsync();
        Task<List<Holiday>> GetHolidaysByYearAsync(int year);
        Task<Holiday> CreateHolidayAsync(Holiday holiday);
        Task<Holiday?> UpdateHolidayAsync(string id, Holiday holiday);
        Task<bool> DeleteHolidayAsync(string id);
    }
}
