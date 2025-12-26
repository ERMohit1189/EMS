using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface ISiteService
    {
        Task<Site?> GetSiteByIdAsync(string id);
        Task<List<Site>> GetSitesByVendorAsync(string vendorId);
        Task<List<Site>> GetAllSitesAsync();
        Task<Site> CreateSiteAsync(Site site);
        Task<Site?> UpdateSiteAsync(string id, Site site);
        Task<Site?> UpdateSiteAsync(string id, UpdateSiteDto dto);
        Task<bool> DeleteSiteAsync(string id);
        Task<BatchUpsertResult> BatchUpsertSitesAsync(List<dynamic> sites);
        Task<Dictionary<string, object>> GetAtpCountsAsync();
        Task<BulkUpdateStatusResult> BulkUpdateStatusByPlanAsync(List<string> planIds, string? phyAtStatus, string? softAtStatus, bool shouldApproveStatus);
    }
}
