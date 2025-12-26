using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface IHolidayService
    {
        Task<Holiday?> GetHolidayByIdAsync(string id);
        Task<List<Holiday>> GetAllHolidaysAsync(int? year = null, string? state = null);
        Task<List<Holiday>> GetHolidaysByYearAsync(int year);
        Task<List<Holiday>> GetHolidaysForMonthAsync(int year, int month, string? state = null);
        Task<(Holiday holiday, bool isUpdated)> UpsertHolidayAsync(Holiday holiday);
        Task<List<(Holiday holiday, bool isUpdated)>> BulkUpsertAsync(List<Holiday> holidays);
        Task<IEnumerable<object>> GenerateHolidaySuggestionsAsync(int year, string? state = null);
        Task<Holiday> CreateHolidayAsync(Holiday holiday);
        Task<Holiday?> UpdateHolidayAsync(string id, Holiday holiday);
        Task<bool> DeleteHolidayAsync(string id);
    }
} 
