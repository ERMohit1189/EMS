using Microsoft.EntityFrameworkCore;
using Serilog;
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
                .Include(po => po.Vendor)
                .Include(po => po.Lines)
                .ThenInclude(pol => pol.Site)
                .Where(po => po.VendorId == vendorId)
                .ToListAsync();
        }

        public async Task<List<PurchaseOrder>> GetAllPurchaseOrdersAsync()
        {
            try
            {
                return await _context.PurchaseOrders
                    .Include(po => po.Vendor)
                    .Include(po => po.Lines)
                    .ThenInclude(pol => pol.Site)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                // Log the error for debugging
                Log.Error(ex, "[PurchaseOrderService] GetAllPurchaseOrdersAsync failed with eager loading. Falling back to manual loading. Error: {Message}", ex.Message);

                // Fallback: Load without relationships if eager loading fails
                var poList = await _context.PurchaseOrders.ToListAsync();

                // Manually load vendor and lines for each PO
                foreach (var po in poList)
                {
                    if (!string.IsNullOrEmpty(po.VendorId))
                    {
                        po.Vendor = await _context.Vendors.FindAsync(po.VendorId);
                    }

                    po.Lines = await _context.PurchaseOrderLines
                        .Where(l => l.PoId == po.Id)
                        .ToListAsync();

                    // Load Site for each line
                    foreach (var line in po.Lines ?? new List<PurchaseOrderLine>())
                    {
                        if (!string.IsNullOrEmpty(line.SiteId))
                        {
                            line.Site = await _context.Sites.FindAsync(line.SiteId);
                        }
                    }
                }

                return poList;
            }
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
