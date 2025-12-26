using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface IInvoiceService
    {
        Task<Invoice?> GetInvoiceByIdAsync(string id);
        Task<List<Invoice>> GetAllInvoicesAsync();
        Task<List<Invoice>> GetInvoicesByVendorAsync(string vendorId);
        Task<Invoice> CreateInvoiceAsync(Invoice invoice);
        Task<Invoice?> UpdateInvoiceAsync(string id, Invoice invoice);
        Task<bool> DeleteInvoiceAsync(string id);
    }
}
