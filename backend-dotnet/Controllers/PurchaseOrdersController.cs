using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/purchase-orders")]
    [Route("api/[controller]")]
    public class PurchaseOrdersController : ControllerBase
    {
        private readonly IPurchaseOrderService _purchaseOrderService;
        private readonly AppDbContext _context;

        public PurchaseOrdersController(IPurchaseOrderService purchaseOrderService, AppDbContext context)
        {
            _purchaseOrderService = purchaseOrderService;
            _context = context;
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> GetPurchaseOrder(string id, [FromQuery] bool withLines = false)
        {
            try
            {
                var purchaseOrder = await _purchaseOrderService.GetPurchaseOrderByIdAsync(id);
                if (purchaseOrder == null)
                    return NotFound(new { message = "Purchase order not found" });

                // If withLines is true, include line details; otherwise return minimal data
                if (withLines)
                {
                    var linesList = new List<dynamic>();
                    if (purchaseOrder.Lines != null)
                    {
                        foreach (var line in purchaseOrder.Lines)
                        {
                            linesList.Add(new
                            {
                                line.Id,
                                line.PoId,
                                line.SiteId,
                                line.Description,
                                line.Quantity,
                                line.UnitPrice,
                                line.TotalAmount,
                                SiteName = line.Site?.Name ?? string.Empty,
                                SitePlanId = line.Site?.PlanId ?? string.Empty,
                                SiteHopAB = line.Site?.HopAB ?? string.Empty
                            });
                        }
                    }

                    return Ok(new
                    {
                        purchaseOrder.Id,
                        purchaseOrder.PoNumber,
                        purchaseOrder.VendorId,
                        purchaseOrder.Description,
                        purchaseOrder.Quantity,
                        purchaseOrder.UnitPrice,
                        purchaseOrder.TotalAmount,
                        purchaseOrder.GSTType,
                        purchaseOrder.GSTApply,
                        purchaseOrder.IGSTPercentage,
                        purchaseOrder.IGSTAmount,
                        purchaseOrder.CGSTPercentage,
                        purchaseOrder.CGSTAmount,
                        purchaseOrder.SGSTPercentage,
                        purchaseOrder.SGSTAmount,
                        purchaseOrder.PODate,
                        purchaseOrder.DueDate,
                        purchaseOrder.Status,
                        purchaseOrder.CreatedAt,
                        purchaseOrder.UpdatedAt,
                        VendorName = purchaseOrder.Vendor?.Name ?? string.Empty,
                        Lines = linesList
                    });
                }
                else
                {
                    return Ok(purchaseOrder);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, details = ex.InnerException?.Message });
            }
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllPurchaseOrders([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] bool withDetails = false, [FromQuery] bool availableOnly = false)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1) pageSize = 50;
                if (pageSize > 500) pageSize = 500;

                var purchaseOrders = await _purchaseOrderService.GetAllPurchaseOrdersAsync();

                // Filter out POs that are already invoiced if availableOnly is true
                if (availableOnly)
                {
                    // Get all invoiced PO IDs from invoices
                    var invoicedPOIds = new HashSet<string>();
                    var invoices = await _context.Invoices.ToListAsync();
                    foreach (var invoice in invoices)
                    {
                        if (!string.IsNullOrEmpty(invoice.PoIds))
                        {
                            try
                            {
                                List<string> poIds;
                                if (invoice.PoIds.StartsWith("["))
                                {
                                    poIds = System.Text.Json.JsonSerializer.Deserialize<List<string>>(invoice.PoIds) ?? new List<string>();
                                }
                                else
                                {
                                    poIds = invoice.PoIds.Split(',').Select(id => id.Trim()).ToList();
                                }
                                foreach (var poId in poIds)
                                {
                                    invoicedPOIds.Add(poId);
                                }
                            }
                            catch { }
                        }
                    }

                    purchaseOrders = purchaseOrders.Where(po => !invoicedPOIds.Contains(po.Id)).ToList();
                }

                var totalCount = purchaseOrders.Count;

                var data = purchaseOrders
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(po => new
                    {
                        po.Id,
                        po.PoNumber,
                        po.VendorId,
                        po.Description,
                        po.Quantity,
                        po.UnitPrice,
                        po.TotalAmount,
                        po.Status,
                        po.PODate,
                        po.DueDate,
                        VendorName = po.Vendor?.Name ?? string.Empty,
                        VendorCode = po.Vendor?.VendorCode ?? string.Empty,
                        VendorEmail = po.Vendor?.Email ?? string.Empty,
                        LineCount = po.Lines?.Count ?? 0,
                        // Add site-related fields for displaying in invoice generation UI
                        SiteName = po.Lines?.FirstOrDefault()?.Site?.Name ?? string.Empty,
                        SiteId2 = po.Lines?.FirstOrDefault()?.Site?.PlanId ?? string.Empty,
                        MaxAntennaSize = po.Lines?.FirstOrDefault()?.Site?.MaxAntSize ?? string.Empty,
                        CGSTAmount = po.CGSTAmount,
                        SGSTAmount = po.SGSTAmount,
                        IGSTAmount = po.IGSTAmount,
                        Lines = po.Lines?.Select(l => (object)new
                        {
                            l.Id,
                            l.PoId,
                            l.SiteId,
                            l.Description,
                            l.Quantity,
                            l.UnitPrice,
                            l.TotalAmount,
                            SiteName = l.Site?.Name ?? string.Empty,
                            SitePlanId = l.Site?.PlanId ?? string.Empty,
                            SiteHopAB = l.Site?.HopAB ?? string.Empty
                        }).ToList() ?? new List<object>()
                    })
                    .ToList();

                return Ok(new { data, totalCount, page, pageSize });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, details = ex.InnerException?.Message });
            }
        }

        [HttpGet("vendor/{vendorId}")]
        [Authorize]
        public async Task<IActionResult> GetPurchaseOrdersByVendor(string vendorId)
        {
            var purchaseOrders = await _purchaseOrderService.GetPurchaseOrdersByVendorAsync(vendorId);
            return Ok(purchaseOrders);
        }

        [HttpPost("generate")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GenerateGroupedPurchaseOrders([FromBody] GenerateGroupedPOsRequest request)
        {
            try
            {
                if (request?.Pos == null || request.Pos.Count == 0)
                    return BadRequest(new { error = "No POs provided" });

                var created = new List<object>();
                var errors = new List<object>();

                foreach (var poPayload in request.Pos)
                {
                    try
                    {
                        if (string.IsNullOrEmpty(poPayload.VendorId) || poPayload.Lines?.Count == 0)
                        {
                            errors.Add(new { poPayload, error = "Invalid PO payload" });
                            continue;
                        }

                        var poId = Guid.NewGuid().ToString();
                        var po = new PurchaseOrder
                        {
                            Id = poId,
                            VendorId = poPayload.VendorId,
                            PoNumber = poPayload.PoNumber ?? $"PO-{DateTime.UtcNow.Ticks}",
                            PODate = !string.IsNullOrEmpty(poPayload.PoDate) ? DateTime.Parse(poPayload.PoDate) : DateTime.UtcNow,
                            DueDate = !string.IsNullOrEmpty(poPayload.DueDate) ? DateTime.Parse(poPayload.DueDate) : DateTime.UtcNow.AddDays(30),
                            TotalAmount = poPayload.TotalAmount ?? 0,
                            GSTType = poPayload.GstType ?? "cgstsgst",
                            GSTApply = poPayload.GstApply ?? false,
                            Status = "Draft",
                            Lines = poPayload.Lines?.Select(line => new PurchaseOrderLine
                            {
                                Id = Guid.NewGuid().ToString(),
                                PoId = poId,
                                SiteId = line.SiteId,
                                Description = line.Description,
                                Quantity = line.Quantity ?? 1,
                                UnitPrice = string.IsNullOrEmpty(line.UnitPrice) ? 0 : decimal.Parse(line.UnitPrice),
                                TotalAmount = string.IsNullOrEmpty(line.TotalAmount) ? 0 : decimal.Parse(line.TotalAmount)
                            }).ToList() ?? new List<PurchaseOrderLine>()
                        };

                        var createdPo = await _purchaseOrderService.CreatePurchaseOrderAsync(po);

                        created.Add(new
                        {
                            id = createdPo.Id,
                            poNumber = createdPo.PoNumber,
                            totalAmount = createdPo.TotalAmount,
                            status = createdPo.Status
                        });
                    }
                    catch (Exception ex)
                    {
                        errors.Add(new { poPayload, error = ex.Message });
                    }
                }

                return Ok(new { created, errors });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> CreatePurchaseOrder([FromBody] CreatePurchaseOrderDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var purchaseOrder = new PurchaseOrder
                {
                    PoNumber = dto.PoNumber ?? $"PO-{DateTime.UtcNow.Ticks}",
                    VendorId = dto.VendorId,
                    Description = dto.Description,
                    Quantity = dto.Quantity,
                    UnitPrice = string.IsNullOrEmpty(dto.UnitPrice) ? 0 : decimal.Parse(dto.UnitPrice),
                    TotalAmount = decimal.Parse(dto.TotalAmount ?? "0"),
                    GSTType = dto.GstType ?? "cgstsgst",
                    GSTApply = dto.GstApply ?? false,
                    IGSTPercentage = string.IsNullOrEmpty(dto.IgstPercentage) ? 0 : decimal.Parse(dto.IgstPercentage),
                    IGSTAmount = string.IsNullOrEmpty(dto.IgstAmount) ? 0 : decimal.Parse(dto.IgstAmount),
                    CGSTPercentage = string.IsNullOrEmpty(dto.CgstPercentage) ? 0 : decimal.Parse(dto.CgstPercentage),
                    CGSTAmount = string.IsNullOrEmpty(dto.CgstAmount) ? 0 : decimal.Parse(dto.CgstAmount),
                    SGSTPercentage = string.IsNullOrEmpty(dto.SgstPercentage) ? 0 : decimal.Parse(dto.SgstPercentage),
                    SGSTAmount = string.IsNullOrEmpty(dto.SgstAmount) ? 0 : decimal.Parse(dto.SgstAmount),
                    PODate = !string.IsNullOrEmpty(dto.PoDate) ? DateTime.Parse(dto.PoDate) : DateTime.UtcNow,
                    DueDate = !string.IsNullOrEmpty(dto.DueDate) ? DateTime.Parse(dto.DueDate) : DateTime.UtcNow.AddDays(30),
                    Status = dto.Status ?? "Draft"
                    // Note: siteId from frontend is ignored as Id field represents the PO ID
                };

                var createdPo = await _purchaseOrderService.CreatePurchaseOrderAsync(purchaseOrder);
                return Created($"/api/purchaseorders/{createdPo.Id}", new
                {
                    id = createdPo.Id,
                    poNumber = createdPo.PoNumber,
                    totalAmount = createdPo.TotalAmount,
                    status = createdPo.Status
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdatePurchaseOrder(string id, [FromBody] PurchaseOrder purchaseOrder)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var updatedPo = await _purchaseOrderService.UpdatePurchaseOrderAsync(id, purchaseOrder);
            if (updatedPo == null)
                return NotFound(new { message = "Purchase order not found" });

            return Ok(new { message = "Purchase order updated successfully" });
        }

        [HttpDelete("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> DeletePurchaseOrder(string id)
        {
            try
            {
                var success = await _purchaseOrderService.DeletePurchaseOrderAsync(id);
                if (!success)
                    return NotFound(new { message = "Purchase order not found" });

                return Ok(new { message = "Purchase order deleted successfully", success = true });
            }
            catch (Exception ex)
            {
                // Check if it's a business logic error (invoiced PO)
                if (ex.Message != null && ex.Message.Contains("invoiced"))
                    return BadRequest(new { error = ex.Message, success = false });

                return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message });
            }
        }

        [HttpGet("/api/saved-pos")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSavedPOs([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1) pageSize = 50;
                if (pageSize > 500) pageSize = 500;

                var purchaseOrders = await _purchaseOrderService.GetAllPurchaseOrdersAsync();
                var totalCount = purchaseOrders.Count;

                var data = purchaseOrders
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(po => new
                    {
                        po.Id,
                        po.PoNumber,
                        po.VendorId,
                        po.Description,
                        po.TotalAmount,
                        po.Status,
                        po.PODate,
                        po.DueDate,
                        VendorName = po.Vendor?.Name ?? string.Empty,
                        LineCount = po.Lines?.Count ?? 0,
                        Lines = po.Lines?.Select(l => (object)new
                        {
                            l.Id,
                            l.PoId,
                            l.SiteId,
                            l.Description,
                            l.Quantity,
                            l.UnitPrice,
                            l.TotalAmount,
                            SiteName = l.Site?.Name ?? string.Empty,
                            SitePlanId = l.Site?.PlanId ?? string.Empty,
                            SiteHopAB = l.Site?.HopAB ?? string.Empty
                        }).ToList() ?? new List<object>()
                    })
                    .ToList();

                return Ok(new { data, totalCount });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, details = ex.InnerException?.Message });
            }
        }
    }

    // DTOs for creating single PO (accepts siteId from frontend but ignores it)
    public class CreatePurchaseOrderDto
    {
        public string? PoNumber { get; set; }
        public string? VendorId { get; set; }
        public string? SiteId { get; set; } // Ignored - accepted but not stored
        public string? Description { get; set; }
        public int? Quantity { get; set; }
        public string? UnitPrice { get; set; }
        public string? TotalAmount { get; set; }
        public string? GstType { get; set; }
        public bool? GstApply { get; set; }
        public string? IgstPercentage { get; set; }
        public string? IgstAmount { get; set; }
        public string? CgstPercentage { get; set; }
        public string? CgstAmount { get; set; }
        public string? SgstPercentage { get; set; }
        public string? SgstAmount { get; set; }
        public string? PoDate { get; set; }
        public string? DueDate { get; set; }
        public string? Status { get; set; }
    }

    // DTOs for grouped PO generation
    public class GenerateGroupedPOsRequest
    {
        public List<GroupedPOPayload> Pos { get; set; } = new();
    }

    public class GroupedPOPayload
    {
        public string? VendorId { get; set; }
        public string? PoNumber { get; set; }
        public string? PoDate { get; set; }
        public string? DueDate { get; set; }
        public decimal? TotalAmount { get; set; }
        public string? GstType { get; set; }
        public bool? GstApply { get; set; }
        public List<POLinePayload> Lines { get; set; } = new();
    }

    public class POLinePayload
    {
        public string? SiteId { get; set; }
        public string? Description { get; set; }
        public int? Quantity { get; set; }
        public string? UnitPrice { get; set; }
        public string? TotalAmount { get; set; }
    }
}
