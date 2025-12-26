using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface IPurchaseOrderService
    {
        Task<PurchaseOrder?> GetPurchaseOrderByIdAsync(string id);
        Task<List<PurchaseOrder>> GetPurchaseOrdersByVendorAsync(string vendorId);
        Task<List<PurchaseOrder>> GetAllPurchaseOrdersAsync();
        Task<PurchaseOrder> CreatePurchaseOrderAsync(PurchaseOrder po);
        Task<PurchaseOrder?> UpdatePurchaseOrderAsync(string id, PurchaseOrder po);
        Task<bool> DeletePurchaseOrderAsync(string id);
    }
}
