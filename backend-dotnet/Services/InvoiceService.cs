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
            return await _context.Invoices
                .Include(i => i.Vendor)
                .FirstOrDefaultAsync(i => i.Id == id);
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
