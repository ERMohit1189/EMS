using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InvoicesController : ControllerBase
    {
        private readonly IInvoiceService _invoiceService;
        private readonly AppDbContext _context;

        public InvoicesController(IInvoiceService invoiceService, AppDbContext context)
        {
            _invoiceService = invoiceService;
            _context = context;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetInvoice(string id)
        {
            var invoice = await _invoiceService.GetInvoiceByIdAsync(id);
            if (invoice == null)
                return NotFound(new { message = "Invoice not found" });

            return Ok(invoice);
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllInvoices([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] bool withDetails = false)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1) pageSize = 50;
                if (pageSize > 500) pageSize = 500;

                // Get all invoices with vendor details
                var allInvoices = await _invoiceService.GetAllInvoicesAsync();
                var totalCount = allInvoices.Count;

                // If withDetails requested, enrich the response with PO and Site data
                if (withDetails)
                {
                    var enrichedInvoices = new List<dynamic>();

                    foreach (var invoice in allInvoices)
                    {
                        // Parse PoIds from JSON string
                        var poIds = new List<string>();
                        if (!string.IsNullOrEmpty(invoice.PoIds))
                        {
                            try
                            {
                                if (invoice.PoIds.StartsWith("["))
                                {
                                    poIds = System.Text.Json.JsonSerializer.Deserialize<List<string>>(invoice.PoIds) ?? new List<string>();
                                }
                                else
                                {
                                    poIds = invoice.PoIds.Split(',').Select(id => id.Trim()).ToList();
                                }
                            }
                            catch
                            {
                                poIds = new List<string> { invoice.PoIds };
                            }
                        }

                        // Fetch PO details for this invoice
                        var poDetails = new List<dynamic>();
                        var allSiteNames = new List<string>();
                        var invoiceSites = new List<dynamic>();

                        // Fetch all PaymentMasters for vendor to get vendor amounts
                        var paymentMasters = new List<PaymentMaster>();
                        try
                        {
                            if (!string.IsNullOrEmpty(invoice.VendorId))
                            {
                                paymentMasters = await _context.PaymentMasters
                                    .Where(pm => pm.VendorId == invoice.VendorId)
                                    .ToListAsync() ?? new List<PaymentMaster>();
                            }
                        }
                        catch
                        {
                            // If query fails, continue with empty list
                            paymentMasters = new List<PaymentMaster>();
                        }

                        foreach (var poId in poIds)
                        {
                            var po = await _invoiceService.GetPurchaseOrderByIdAsync(poId);
                            if (po != null)
                            {
                                poDetails.Add(new
                                {
                                    poId = po.Id,
                                    poNumber = po.PoNumber,
                                    vendorName = po.Vendor?.Name ?? string.Empty,
                                    vendorCode = po.Vendor?.VendorCode ?? string.Empty,
                                    poDate = po.PODate,
                                    dueDate = po.DueDate,
                                    amount = po.TotalAmount,
                                    totalSites = po.Lines?.Count ?? 0
                                });

                                // Collect site names from PO lines
                                if (po.Lines != null)
                                {
                                    foreach (var line in po.Lines)
                                    {
                                        var siteName = line.Site?.Name ?? line.Site?.HopAB ?? line.SiteId ?? "Unknown";
                                        if (!allSiteNames.Contains(siteName))
                                        {
                                            allSiteNames.Add(siteName);
                                        }

                                        // Get vendor amount from PaymentMasters
                                        var vendorAmount = paymentMasters
                                            .Where(pm => pm.SiteId == line.SiteId)
                                            .Select(pm => pm.VendorAmount)
                                            .FirstOrDefault();

                                        invoiceSites.Add(new
                                        {
                                            poId = po.Id,
                                            poNumber = po.PoNumber,
                                            poDate = po.PODate,
                                            siteName = siteName,
                                            planId = line.Site?.PlanId,
                                            maxAntennaSize = line.Site?.MaxAntSize,
                                            siteAInstallationDate = line.Site?.SiteAInstallationDate,
                                            vendorAmount = vendorAmount
                                        });
                                    }
                                }
                            }
                        }

                        enrichedInvoices.Add(new
                        {
                            id = invoice.Id,
                            invoiceNumber = invoice.InvoiceNumber,
                            vendorId = invoice.VendorId,
                            vendorName = invoice.Vendor?.Name ?? string.Empty,
                            vendorCode = invoice.Vendor?.VendorCode ?? string.Empty,
                            vendorEmail = invoice.Vendor?.Email ?? string.Empty,
                            poIds = poIds,
                            poDetails = poDetails,
                            allSiteNames = allSiteNames,
                            invoiceSites = invoiceSites,
                            amount = invoice.Amount,
                            gst = invoice.GST,
                            totalAmount = invoice.TotalAmount,
                            invoiceDate = invoice.InvoiceDate,
                            dueDate = invoice.DueDate,
                            status = invoice.Status,
                            createdAt = invoice.CreatedAt,
                            updatedAt = invoice.UpdatedAt
                        });
                    }

                    var paginatedData = enrichedInvoices
                        .Skip((page - 1) * pageSize)
                        .Take(pageSize)
                        .ToList();

                    return Ok(new { data = paginatedData, totalCount, page, pageSize });
                }
                else
                {
                    var paginatedData = allInvoices
                        .Skip((page - 1) * pageSize)
                        .Take(pageSize)
                        .Select(i => new
                        {
                            i.Id,
                            i.InvoiceNumber,
                            i.VendorId,
                            VendorName = i.Vendor?.Name ?? string.Empty,
                            i.Amount,
                            i.GST,
                            i.TotalAmount,
                            i.InvoiceDate,
                            i.DueDate,
                            i.Status
                        })
                        .ToList();

                    return Ok(new { data = paginatedData, totalCount, page, pageSize });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("vendor/{vendorId}")]
        public async Task<IActionResult> GetInvoicesByVendor(string vendorId)
        {
            var invoices = await _invoiceService.GetInvoicesByVendorAsync(vendorId);
            return Ok(invoices);
        }

        [HttpPost]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceDto dto)
        {
            try
            {
                // Validate required fields
                if (string.IsNullOrEmpty(dto.VendorId))
                    return BadRequest(new { error = "VendorId is required" });

                // Convert poIds array to JSON string format
                string poIdsJson = "[]";
                if (dto.PoIds != null && dto.PoIds.Count > 0)
                {
                    poIdsJson = System.Text.Json.JsonSerializer.Serialize(dto.PoIds);
                }
                else if (!string.IsNullOrEmpty(dto.PoId))
                {
                    // Handle single poId (backward compatibility)
                    poIdsJson = System.Text.Json.JsonSerializer.Serialize(new List<string> { dto.PoId });
                }

                // Create invoice object from DTO
                var invoice = new Invoice
                {
                    VendorId = dto.VendorId,
                    InvoiceNumber = dto.InvoiceNumber ?? $"INV-{DateTime.UtcNow.Ticks}",
                    PoIds = poIdsJson,
                    InvoiceDate = !string.IsNullOrEmpty(dto.InvoiceDate) ? DateTime.Parse(dto.InvoiceDate) : DateTime.UtcNow,
                    DueDate = !string.IsNullOrEmpty(dto.DueDate) ? DateTime.Parse(dto.DueDate) : DateTime.UtcNow.AddDays(30),
                    Amount = string.IsNullOrEmpty(dto.Amount) ? 0 : decimal.Parse(dto.Amount),
                    GST = string.IsNullOrEmpty(dto.Gst) ? 0 : decimal.Parse(dto.Gst),
                    TotalAmount = string.IsNullOrEmpty(dto.TotalAmount) ? 0 : decimal.Parse(dto.TotalAmount),
                    Status = dto.Status ?? "Draft"
                };

                // Check authorization - allow vendors to create invoices for their own vendor ID
                var userRole = User.FindFirst("role")?.Value;
                var vendorId = User.FindFirst("vendorId")?.Value;

                // Allow admin/superadmin to create for any vendor, or vendors to create for themselves
                if (userRole == "vendor" && invoice.VendorId != vendorId)
                {
                    return Forbid();
                }

                var createdInvoice = await _invoiceService.CreateInvoiceAsync(invoice);

                // Fetch and enrich the created invoice with PO and Site details
                var poIds = new List<string>();
                if (!string.IsNullOrEmpty(createdInvoice.PoIds))
                {
                    try
                    {
                        if (createdInvoice.PoIds.StartsWith("["))
                        {
                            poIds = System.Text.Json.JsonSerializer.Deserialize<List<string>>(createdInvoice.PoIds) ?? new List<string>();
                        }
                        else
                        {
                            poIds = createdInvoice.PoIds.Split(',').Select(id => id.Trim()).ToList();
                        }
                    }
                    catch
                    {
                        poIds = new List<string> { createdInvoice.PoIds };
                    }
                }

                // Fetch PO details for this invoice
                var poDetails = new List<dynamic>();
                var allSiteNames = new List<string>();
                var invoiceSites = new List<dynamic>();

                // Fetch all PaymentMasters for vendor to get vendor amounts
                var paymentMasters = new List<PaymentMaster>();
                try
                {
                    if (!string.IsNullOrEmpty(createdInvoice.VendorId))
                    {
                        paymentMasters = await _context.PaymentMasters
                            .Where(pm => pm.VendorId == createdInvoice.VendorId)
                            .ToListAsync() ?? new List<PaymentMaster>();
                    }
                }
                catch
                {
                    // If query fails, continue with empty list
                    paymentMasters = new List<PaymentMaster>();
                }

                foreach (var poId in poIds)
                {
                    var po = await _invoiceService.GetPurchaseOrderByIdAsync(poId);
                    if (po != null)
                    {
                        poDetails.Add(new
                        {
                            poId = po.Id,
                            poNumber = po.PoNumber,
                            vendorName = po.Vendor?.Name ?? string.Empty,
                            vendorCode = po.Vendor?.VendorCode ?? string.Empty,
                            poDate = po.PODate,
                            dueDate = po.DueDate,
                            amount = po.TotalAmount,
                            totalSites = po.Lines?.Count ?? 0
                        });

                        // Collect site names from PO lines
                        if (po.Lines != null)
                        {
                            foreach (var line in po.Lines)
                            {
                                var siteName = line.Site?.Name ?? line.Site?.HopAB ?? line.SiteId ?? "Unknown";
                                if (!allSiteNames.Contains(siteName))
                                {
                                    allSiteNames.Add(siteName);
                                }

                                // Get vendor amount from PaymentMasters
                                decimal vendorAmount = 0;
                                if (paymentMasters?.Count > 0 && !string.IsNullOrEmpty(line.SiteId))
                                {
                                    vendorAmount = paymentMasters
                                        .Where(pm => pm.SiteId == line.SiteId)
                                        .Select(pm => pm.VendorAmount)
                                        .FirstOrDefault();
                                }

                                invoiceSites.Add(new
                                {
                                    poId = po.Id,
                                    poNumber = po.PoNumber,
                                    poDate = po.PODate,
                                    siteName = siteName,
                                    planId = line.Site?.PlanId,
                                    maxAntennaSize = line.Site?.MaxAntSize,
                                    siteAInstallationDate = line.Site?.SiteAInstallationDate,
                                    vendorAmount = vendorAmount
                                });
                            }
                        }
                    }
                }

                var enrichedInvoice = new
                {
                    id = createdInvoice.Id,
                    invoiceNumber = createdInvoice.InvoiceNumber,
                    vendorId = createdInvoice.VendorId,
                    vendorName = createdInvoice.Vendor?.Name ?? string.Empty,
                    vendorCode = createdInvoice.Vendor?.VendorCode ?? string.Empty,
                    vendorEmail = createdInvoice.Vendor?.Email ?? string.Empty,
                    poIds = poIds,
                    poDetails = poDetails,
                    allSiteNames = allSiteNames,
                    invoiceSites = invoiceSites,
                    amount = createdInvoice.Amount,
                    gst = createdInvoice.GST,
                    totalAmount = createdInvoice.TotalAmount,
                    invoiceDate = createdInvoice.InvoiceDate,
                    dueDate = createdInvoice.DueDate,
                    status = createdInvoice.Status,
                    createdAt = createdInvoice.CreatedAt,
                    updatedAt = createdInvoice.UpdatedAt
                };

                return Created($"/api/invoices/{createdInvoice.Id}", enrichedInvoice);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,superadmin,vendor")]
        public async Task<IActionResult> UpdateInvoice(string id, [FromBody] Invoice invoice)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var updatedInvoice = await _invoiceService.UpdateInvoiceAsync(id, invoice);
            if (updatedInvoice == null)
                return NotFound(new { message = "Invoice not found" });

            return Ok(new { message = "Invoice updated successfully" });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin,vendor")]
        public async Task<IActionResult> DeleteInvoice(string id)
        {
            try
            {
                var invoice = await _invoiceService.GetInvoiceByIdAsync(id);
                if (invoice == null)
                    return NotFound(new { message = "Invoice not found" });

                // Check if user is vendor and can only delete their own invoices
                var userRole = User.FindFirst("role")?.Value;
                if (userRole == "vendor")
                {
                    var vendorId = User.FindFirst("vendorId")?.Value;
                    if (invoice.VendorId != vendorId)
                        return Forbid();
                }

                var success = await _invoiceService.DeleteInvoiceAsync(id);
                if (!success)
                    return NotFound(new { message = "Invoice not found" });

                return Ok(new { message = "Invoice deleted successfully", success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    // DTO for creating invoices - accepts poIds as array
    public class CreateInvoiceDto
    {
        public string? VendorId { get; set; }
        public string? InvoiceNumber { get; set; }
        public string? PoId { get; set; } // Single PO (backward compatibility)
        public List<string>? PoIds { get; set; } // Multiple POs
        public string? InvoiceDate { get; set; }
        public string? DueDate { get; set; }
        public string? Amount { get; set; }
        public string? Gst { get; set; }
        public string? TotalAmount { get; set; }
        public string? Status { get; set; }
    }
}
