using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class PurchaseOrderService : IPurchaseOrderService
    {
        private readonly AppDbContext _context;

        public PurchaseOrderService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<PurchaseOrder?> GetPurchaseOrderByIdAsync(string id)
        {
            return await _context.PurchaseOrders
                .Include(po => po.Vendor)
                .Include(po => po.Lines)
                .ThenInclude(pol => pol.Site)
                .FirstOrDefaultAsync(po => po.Id == id);
        }

        public async Task<List<PurchaseOrder>> GetPurchaseOrdersByVendorAsync(string vendorId)
        {
            return await _context.PurchaseOrders
                .Include(po => po.Lines)
                .Where(po => po.VendorId == vendorId)
                .ToListAsync();
        }

        public async Task<List<PurchaseOrder>> GetAllPurchaseOrdersAsync()
        {
            return await _context.PurchaseOrders
                .Include(po => po.Vendor)
                .Include(po => po.Lines)
                .ToListAsync();
        }

        public async Task<PurchaseOrder> CreatePurchaseOrderAsync(PurchaseOrder po)
        {
            po.Id = Guid.NewGuid().ToString();
            if (string.IsNullOrEmpty(po.PoNumber))
                po.PoNumber = GeneratePoNumber();

            _context.PurchaseOrders.Add(po);
            await _context.SaveChangesAsync();
            return po;
        }

        public async Task<PurchaseOrder?> UpdatePurchaseOrderAsync(string id, PurchaseOrder po)
        {
            var existing = await _context.PurchaseOrders.FindAsync(id);
            if (existing == null) return null;

            existing.Status = po.Status;
            existing.UpdatedAt = DateTime.UtcNow;

            _context.PurchaseOrders.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeletePurchaseOrderAsync(string id)
        {
            var po = await _context.PurchaseOrders.FindAsync(id);
            if (po == null) return false;

            _context.PurchaseOrders.Remove(po);
            await _context.SaveChangesAsync();
            return true;
        }

        private string GeneratePoNumber()
        {
            var lastPo = _context.PurchaseOrders
                .OrderByDescending(po => po.CreatedAt)
                .FirstOrDefault();

            int nextNumber = 1;
            if (lastPo?.PoNumber != null && int.TryParse(lastPo.PoNumber.Replace("PO", ""), out int lastNumber))
            {
                nextNumber = lastNumber + 1;
            }

            return $"PO{nextNumber:D5}";
        }
    }
}
