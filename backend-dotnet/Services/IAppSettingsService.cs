using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface IAppSettingsService
    {
        Task<AppSettings?> GetAppSettingsAsync();
        Task<AppSettings> UpdateAppSettingsAsync(AppSettings settings);
        Task<bool> DeleteAppSettingsAsync();
    }
}
