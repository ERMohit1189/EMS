using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class AppSettingsService : IAppSettingsService
    {
        private readonly AppDbContext _context;

        public AppSettingsService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<AppSettings?> GetAppSettingsAsync()
        {
            try
            {
                // Return the first (and usually only) app settings record
                var settings = await _context.AppSettings.FirstOrDefaultAsync();
                return settings;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error fetching app settings: {ex.Message}");
            }
        }

        public async Task<AppSettings> UpdateAppSettingsAsync(AppSettings settings)
        {
            try
            {
                if (settings == null)
                    throw new Exception("App settings data is required");

                // Check if settings already exist
                var existing = await _context.AppSettings.FirstOrDefaultAsync();

                if (existing != null)
                {
                    // Update existing record
                    if (settings.ApprovalsRequiredForAllowance.HasValue)
                        existing.ApprovalsRequiredForAllowance = settings.ApprovalsRequiredForAllowance;
                    if (settings.PoGenerationDate.HasValue)
                        existing.PoGenerationDate = settings.PoGenerationDate;
                    if (settings.InvoiceGenerationDate.HasValue)
                        existing.InvoiceGenerationDate = settings.InvoiceGenerationDate;
                    if (!string.IsNullOrEmpty(settings.SmtpHost))
                        existing.SmtpHost = settings.SmtpHost;
                    if (settings.SmtpPort.HasValue)
                        existing.SmtpPort = settings.SmtpPort;
                    if (!string.IsNullOrEmpty(settings.SmtpUser))
                        existing.SmtpUser = settings.SmtpUser;
                    if (!string.IsNullOrEmpty(settings.SmtpPass) && settings.SmtpPass != "*****")
                        existing.SmtpPass = settings.SmtpPass;
                    existing.SmtpSecure = settings.SmtpSecure;
                    if (!string.IsNullOrEmpty(settings.FromEmail))
                        existing.FromEmail = settings.FromEmail;
                    if (!string.IsNullOrEmpty(settings.FromName))
                        existing.FromName = settings.FromName;
                    existing.UpdatedAt = DateTime.UtcNow;

                    _context.AppSettings.Update(existing);
                    await _context.SaveChangesAsync();
                    return existing;
                }
                else
                {
                    // Create new record
                    if (string.IsNullOrEmpty(settings.Id))
                        settings.Id = Guid.NewGuid().ToString();

                    settings.CreatedAt = DateTime.UtcNow;
                    settings.UpdatedAt = DateTime.UtcNow;

                    _context.AppSettings.Add(settings);
                    await _context.SaveChangesAsync();
                    return settings;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error updating app settings: {ex.Message}");
            }
        }

        public async Task<bool> DeleteAppSettingsAsync()
        {
            try
            {
                var settings = await _context.AppSettings.FirstOrDefaultAsync();
                if (settings == null)
                    return false;

                _context.AppSettings.Remove(settings);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error deleting app settings: {ex.Message}");
            }
        }
    }
}
