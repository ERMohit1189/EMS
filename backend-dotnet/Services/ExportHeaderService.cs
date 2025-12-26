using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class ExportHeaderService : IExportHeaderService
    {
        private readonly AppDbContext _context;

        public ExportHeaderService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<ExportHeader?> GetExportHeaderAsync()
        {
            try
            {
                // Return the first (and usually only) export header record
                var header = await _context.ExportHeaders.FirstOrDefaultAsync();
                return header;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error fetching export header: {ex.Message}");
            }
        }

        public async Task<ExportHeader> SaveExportHeaderAsync(ExportHeader header)
        {
            try
            {
                if (header == null)
                    throw new Exception("Export header data is required");

                // Check if header already exists
                var existing = await _context.ExportHeaders.FirstOrDefaultAsync();

                if (existing != null)
                {
                    // Update existing record
                    existing.CompanyName = header.CompanyName;
                    existing.ReportTitle = header.ReportTitle;
                    existing.FooterText = header.FooterText;
                    existing.ContactPhone = header.ContactPhone;
                    existing.ContactEmail = header.ContactEmail;
                    existing.Website = header.Website;
                    existing.Gstin = header.Gstin;
                    existing.Address = header.Address;
                    existing.State = header.State;
                    existing.City = header.City;
                    existing.ShowGeneratedDate = header.ShowGeneratedDate;
                    existing.UpdatedAt = DateTime.UtcNow;

                    _context.ExportHeaders.Update(existing);
                    await _context.SaveChangesAsync();
                    return existing;
                }
                else
                {
                    // Create new record
                    if (string.IsNullOrEmpty(header.Id))
                        header.Id = Guid.NewGuid().ToString();

                    header.CreatedAt = DateTime.UtcNow;
                    header.UpdatedAt = DateTime.UtcNow;

                    _context.ExportHeaders.Add(header);
                    await _context.SaveChangesAsync();
                    return header;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error saving export header: {ex.Message}");
            }
        }

        public async Task<bool> DeleteExportHeaderAsync()
        {
            try
            {
                var header = await _context.ExportHeaders.FirstOrDefaultAsync();
                if (header == null)
                    return false;

                _context.ExportHeaders.Remove(header);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error deleting export header: {ex.Message}");
            }
        }
    }
}
