using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface IExportHeaderService
    {
        Task<ExportHeader?> GetExportHeaderAsync();
        Task<ExportHeader> SaveExportHeaderAsync(ExportHeader header);
        Task<bool> DeleteExportHeaderAsync();
    }
}
