using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class InvoiceService : IInvoiceService
    {
        private readonly AppDbContext _context;

        public InvoiceService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Invoice?> GetInvoiceByIdAsync(string id)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Vendor)
                .FirstOrDefaultAsync(i => i.Id == id);

            return invoice;
        }

        public async Task<object?> GetInvoiceWithLineItemsAsync(string id)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Vendor)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (invoice == null) return null;

            // Parse PoIds from JSON string
            var poIds = new List<string>();
            if (!string.IsNullOrEmpty(invoice.PoIds))
            {
                try
                {
                    poIds = System.Text.Json.JsonSerializer.Deserialize<List<string>>(invoice.PoIds) ?? new List<string>();
                }
                catch
                {
                    // If parsing fails, treat as single ID
                    poIds = new List<string> { invoice.PoIds };
                }
            }

            // Get all purchase order lines for this invoice's POs
            var lineItems = await _context.PurchaseOrderLines
                .Where(line => poIds.Contains(line.PoId))
                .Include(line => line.Site)
                .ToListAsync();

            // Map to response object with site details
            var invoiceWithItems = new
            {
                invoice.Id,
                invoice.InvoiceNumber,
                invoice.VendorId,
                invoice.PoIds,
                invoice.InvoiceDate,
                invoice.DueDate,
                invoice.Amount,
                invoice.GST,
                invoice.TotalAmount,
                invoice.Status,
                invoice.PaymentMethod,
                invoice.PaymentDate,
                invoice.BankDetails,
                invoice.Remarks,
                invoice.CreatedAt,
                invoice.UpdatedAt,
                Vendor = invoice.Vendor,
                LineItems = lineItems.Select((line, index) => new
                {
                    SlNo = index + 1,
                    Description = !string.IsNullOrEmpty(line.Site?.HopAB) && !string.IsNullOrEmpty(line.Site?.MaxAntSize)
                        ? $"Installation > {line.Site.HopAB} with {line.Site.MaxAntSize} Ant"
                        : line.Description ?? "Service/Product",
                    HsnSacNo = "998734", // Default HSN/SAC, can be customized later
                    Quantity = line.Quantity,
                    UnitPrice = line.UnitPrice,
                    Amount = line.TotalAmount,
                    TaxableValue = line.TotalAmount,
                    SiteId = line.SiteId,
                    Site = new
                    {
                        line.Site?.Id,
                        line.Site?.SiteId,
                        line.Site?.PlanId,
                        line.Site?.HopAB,
                        line.Site?.MaxAntSize,
                        line.Site?.District,
                        line.Site?.Circle
                    }
                }).ToList()
            };

            return invoiceWithItems;
        }

        public async Task<List<Invoice>> GetAllInvoicesAsync()
        {
            return await _context.Invoices
                .Include(i => i.Vendor)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<Invoice>> GetInvoicesByVendorAsync(string vendorId)
        {
            return await _context.Invoices
                .Where(i => i.VendorId == vendorId)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
        }

        public async Task<Invoice> CreateInvoiceAsync(Invoice invoice)
        {
            invoice.Id = Guid.NewGuid().ToString();
            if (string.IsNullOrEmpty(invoice.InvoiceNumber))
                invoice.InvoiceNumber = GenerateInvoiceNumber();

            invoice.CreatedAt = DateTime.UtcNow;
            invoice.UpdatedAt = DateTime.UtcNow;

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();
            return invoice;
        }

        public async Task<Invoice?> UpdateInvoiceAsync(string id, Invoice invoice)
        {
            var existing = await _context.Invoices.FindAsync(id);
            if (existing == null) return null;

            existing.VendorId = invoice.VendorId;
            existing.InvoiceNumber = invoice.InvoiceNumber;
            existing.Amount = invoice.Amount;
            existing.InvoiceDate = invoice.InvoiceDate;
            existing.DueDate = invoice.DueDate;
            existing.GST = invoice.GST;
            existing.TotalAmount = invoice.TotalAmount;
            existing.PoIds = invoice.PoIds;
            existing.Status = invoice.Status;
            existing.PaymentMethod = invoice.PaymentMethod;
            existing.PaymentDate = invoice.PaymentDate;
            existing.BankDetails = invoice.BankDetails;
            existing.Remarks = invoice.Remarks;
            existing.UpdatedAt = DateTime.UtcNow;

            _context.Invoices.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteInvoiceAsync(string id)
        {
            var invoice = await _context.Invoices.FindAsync(id);
            if (invoice == null) return false;

            _context.Invoices.Remove(invoice);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<PurchaseOrder?> GetPurchaseOrderByIdAsync(string id)
        {
            return await _context.PurchaseOrders
                .Include(po => po.Vendor)
                .Include(po => po.Lines)
                .ThenInclude(line => line.Site)
                .FirstOrDefaultAsync(po => po.Id == id);
        }

        private string GenerateInvoiceNumber()
        {
            var lastInvoice = _context.Invoices
                .OrderByDescending(i => i.CreatedAt)
                .FirstOrDefault();

            int nextNumber = 1;
            if (lastInvoice?.InvoiceNumber != null && int.TryParse(lastInvoice.InvoiceNumber.Replace("INV", ""), out int lastNumber))
            {
                nextNumber = lastNumber + 1;
            }

            return $"INV{nextNumber:D5}";
        }
    }
}
