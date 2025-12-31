using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Serilog;
using System.Security.Claims;
using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VendorsController : ControllerBase
    {
        private readonly IVendorService _vendorService;
        private readonly IPurchaseOrderService _purchaseOrderService;
        private readonly IInvoiceService _invoiceService;
        private readonly ISiteService _siteService;

        public VendorsController(IVendorService vendorService, IPurchaseOrderService purchaseOrderService, IInvoiceService invoiceService, ISiteService siteService)
        {
            _vendorService = vendorService;
            _purchaseOrderService = purchaseOrderService;
            _invoiceService = invoiceService;
            _siteService = siteService;
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> CreateVendor()
        {
            try
            {
                var form = await Request.ReadFormAsync();

                System.Diagnostics.Debug.WriteLine($"[CreateVendor] Form fields count: {form.Count}");
                System.Diagnostics.Debug.WriteLine($"[CreateVendor] Form files count: {form.Files.Count}");

                foreach (var file in form.Files)
                {
                    System.Diagnostics.Debug.WriteLine($"[CreateVendor] File received: {file.Name} - {file.FileName} ({file.Length} bytes)");
                }

                // Helper function to safely get form field
                string GetFormField(string fieldName, string defaultValue = "")
                {
                    var value = form[fieldName].ToString();
                    return string.IsNullOrWhiteSpace(value) ? defaultValue : value;
                }

                var dto = new CreateVendorDto
                {
                    Name = GetFormField("name"),
                    Email = GetFormField("email"),
                    Password = GetFormField("password", Guid.NewGuid().ToString().Substring(0, 8)),
                    Mobile = GetFormField("mobile"),
                    Address = GetFormField("address"),
                    City = GetFormField("city"),
                    State = GetFormField("state"),
                    Pincode = GetFormField("pincode"),
                    Country = GetFormField("country", "India"),
                    Aadhar = GetFormField("aadhar"),
                    Pan = GetFormField("pan"),
                    GSTIN = GetFormField("gstin"),
                    MOA = GetFormField("moa"),
                    Category = GetFormField("category", "Individual")
                };

                System.Diagnostics.Debug.WriteLine($"[CreateVendor] Creating vendor: {dto.Email}");

                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var vendor = await _vendorService.CreateVendorAsync(dto, form);

                System.Diagnostics.Debug.WriteLine($"[CreateVendor] Vendor created successfully: {vendor.Id}");
                System.Diagnostics.Debug.WriteLine($"[CreateVendor] Vendor docs - Aadhar: {vendor.AadharDoc}, PAN: {vendor.PANDoc}, GSTIN: {vendor.GSTINDoc}");

                return Created($"/api/vendors/{vendor.Id}", new
                {
                    id = vendor.Id,
                    name = vendor.Name,
                    email = vendor.Email
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[CreateVendor] ERROR: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"[CreateVendor] Inner Exception: {ex.InnerException?.Message}");
                System.Diagnostics.Debug.WriteLine($"[CreateVendor] Stack: {ex.StackTrace}");

                var errorMessage = ex.Message;
                if (ex.InnerException != null)
                {
                    errorMessage += $" | {ex.InnerException.Message}";
                }

                return BadRequest(new {
                    message = errorMessage,
                    error = ex.InnerException?.Message ?? ex.Message
                });
            }
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> RegisterVendor([FromBody] CreateVendorDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var vendor = await _vendorService.CreateVendorAsync(dto);
                return Created($"/api/vendors/{vendor.Id}", new
                {
                    id = vendor.Id,
                    name = vendor.Name,
                    email = vendor.Email
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("signup")]
        [AllowAnonymous]
        public async Task<IActionResult> SignupVendor([FromBody] CreateVendorDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var vendor = await _vendorService.CreateVendorAsync(dto);
                return Created($"/api/vendors/{vendor.Id}", new
                {
                    id = vendor.Id,
                    name = vendor.Name,
                    email = vendor.Email
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("check-email")]
        [AllowAnonymous]
        public async Task<IActionResult> CheckEmailExists([FromQuery] string email)
        {
            if (string.IsNullOrEmpty(email))
                return BadRequest(new { error = "Email is required" });

            try
            {
                var exists = await _vendorService.CheckEmailExistsAsync(email);
                return Ok(new { exists });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetVendor(string id)
        {
            var vendor = await _vendorService.GetVendorByIdAsync(id);
            if (vendor == null)
                return NotFound(new { message = "Vendor not found" });

            return Ok(vendor);
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllVendors([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] string? status = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 50;
            if (pageSize > 500) pageSize = 500;

            var (vendors, totalCount) = await _vendorService.GetVendorsPagedAsync(page, pageSize, status);
            return Ok(new { data = vendors, totalCount });
        }

        [HttpGet("all")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllVendorsUnpaged([FromQuery] bool minimal = false)
        {
            try
            {
                var vendors = await _vendorService.GetAllVendorsAsync();

                if (minimal)
                {
                    // Return minimal vendor info
                    var minimalVendors = vendors.Select(v => new
                    {
                        v.Id,
                        v.Name,
                        v.Email,
                        v.VendorCode,
                        v.Status
                    }).ToList();
                    return Ok(new { data = minimalVendors, totalCount = minimalVendors.Count });
                }

                return Ok(new { data = vendors, totalCount = vendors.Count });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateVendor(string id)
        {
            try
            {
                var form = await Request.ReadFormAsync();

                var dto = new UpdateVendorDto
                {
                    Name = form["name"].ToString(),
                    Mobile = form["mobile"].ToString(),
                    Address = form["address"].ToString(),
                    City = form["city"].ToString(),
                    State = form["state"].ToString(),
                    Pincode = form["pincode"].ToString(),
                    Country = form["country"].ToString(),
                    Aadhar = form["aadhar"].ToString(),
                    Pan = form["pan"].ToString(),
                    Gstin = form["gstin"].ToString(),
                    Moa = form["moa"].ToString(),
                    Category = form["category"].ToString(),
                };

                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var vendor = await _vendorService.UpdateVendorAsync(id, dto, form);
                if (vendor == null)
                    return NotFound(new { message = "Vendor not found" });

                return Ok(new { message = "Vendor updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error updating vendor: {ex.Message}" });
            }
        }

        [HttpGet("{id}/debug-docs")]
        [AllowAnonymous]
        public async Task<IActionResult> GetVendorDocuments(string id)
        {
            try
            {
                var vendor = await _vendorService.GetVendorByIdAsync(id);
                if (vendor == null)
                    return NotFound(new { message = "Vendor not found" });

                return Ok(new
                {
                    vendorId = vendor.Id,
                    aadharDoc = vendor.AadharDoc,
                    panDoc = vendor.PANDoc,
                    gstinDoc = vendor.GSTINDoc,
                    moaDoc = vendor.MOADoc,
                    uploadDirectory = System.IO.Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads"),
                    wwwrootExists = Directory.Exists(System.IO.Path.Combine(Directory.GetCurrentDirectory(), "wwwroot")),
                    uploadsExists = Directory.Exists(System.IO.Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads"))
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> UpdateVendorStatus(
                 string id,
                 [FromBody] UpdateVendorStatusDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Status))
                return BadRequest(new { message = "Status is required" });

            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var role = User.FindFirstValue(ClaimTypes.Role);

                Log.Information(
                    "[VendorStatus] Update | VendorId={VendorId} | Status={Status} | By={UserId} | Role={Role}",
                    id, request.Status, userId, role
                );

                var success = await _vendorService.UpdateVendorStatusAsync(id, request.Status);

                if (!success)
                    return NotFound(new { message = "Vendor not found" });

                return Ok(new { message = "Vendor status updated successfully" });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "[VendorStatus] Failed | VendorId={VendorId}", id);
                return StatusCode(500, new { message = "Failed to update vendor status" });
            }
        }

        [HttpPost("{id}/change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword(string id, [FromBody] ChangePasswordDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { message = "Old password and new password are required", errors = ModelState });

            try
            {
                var success = await _vendorService.ChangePasswordAsync(id, dto.OldPassword, dto.NewPassword);
                if (!success)
                    return BadRequest(new { message = "Invalid old password or vendor not found" });

                return Ok(new { message = "Password changed successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while changing password", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteVendor(string id)
        {
            var success = await _vendorService.DeleteVendorAsync(id);
            if (!success)
                return NotFound(new { message = "Vendor not found" });

            return Ok(new { message = "Vendor deleted successfully" });
        }

        [HttpPost("check-missing")]
        [AllowAnonymous]
        public async Task<IActionResult> CheckMissingVendors([FromBody] CheckMissingVendorsDto request)
        {
            try
            {
                if (request?.Vendors == null || request.Vendors.Count == 0)
                    return BadRequest(new { message = "Vendors list is required" });

                // Extract just the codes from the vendor info objects
                var vendorCodes = request.Vendors
                    .Where(v => !string.IsNullOrEmpty(v.Code))
                    .Select(v => v.Code)
                    .ToList();

                var missing = await _vendorService.CheckMissingVendorsAsync(vendorCodes);
                return Ok(new { missing });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("batch-create")]
        [AllowAnonymous]
        public async Task<IActionResult> BatchCreateVendors([FromBody] CheckMissingVendorsDto request)
        {
            try
            {
                if (request?.Vendors == null || request.Vendors.Count == 0)
                    return Ok(new { created = 0, vendors = new List<object>() });

                var createdVendors = await _vendorService.BatchCreateVendorsAsync(request.Vendors);
                return Ok(new { created = createdVendors.Count, vendors = createdVendors });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, created = 0, vendors = new List<object>() });
            }
        }

        [HttpPost("get-mapping")]
        [AllowAnonymous]
        public async Task<IActionResult> GetVendorCodeMapping([FromBody] CheckMissingVendorsDto request)
        {
            try
            {
                if (request?.Vendors == null)
                    return Ok(new { mapping = new Dictionary<string, string>() });

                var mapping = await _vendorService.GetVendorCodeMappingAsync(request.Vendors);
                return Ok(new { mapping });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, mapping = new Dictionary<string, string>() });
            }
        }

        [HttpPost("batch-find-or-create")]
        [AllowAnonymous]
        public async Task<IActionResult> BatchFindOrCreateVendors([FromBody] CheckMissingVendorsDto request)
        {
            try
            {
                if (request?.Vendors == null || request.Vendors.Count == 0)
                    return Ok(new { vendors = new List<object>() });

                var vendors = await _vendorService.BatchFindOrCreateVendorsAsync(request.Vendors);
                return Ok(new { vendors });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, vendors = new List<object>() });
            }
        }

        [HttpGet("{vendorId}/rates")]
        [Authorize]
        public async Task<IActionResult> GetVendorRates(string vendorId)
        {
            try
            {
                var rates = await _vendorService.GetVendorRatesAsync(vendorId);
                return Ok(new { data = rates });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("{vendorId}/rates")]
        [Authorize]
        public async Task<IActionResult> AddVendorRate(string vendorId, [FromBody] AddVendorRateDto dto)
        {
            try
            {
                if (dto == null)
                    return BadRequest(new { error = "Request body is required" });

                if (string.IsNullOrEmpty(dto.AntennaSize) || dto.VendorAmount <= 0)
                    return BadRequest(new { error = "Antenna size and valid vendor amount are required" });

                var rate = await _vendorService.AddVendorRateAsync(vendorId, dto.AntennaSize, dto.VendorAmount);
                return Ok(new { data = rate, message = "Rate saved successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpDelete("{vendorId}/rates/{antennaSize}")]
        [Authorize]
        public async Task<IActionResult> DeleteVendorRate(string vendorId, string antennaSize)
        {
            try
            {
                var success = await _vendorService.DeleteVendorRateAsync(vendorId, antennaSize);
                if (!success)
                    return NotFound(new { error = "Rate not found" });

                return Ok(new { message = "Rate deleted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("{vendorId}/generate-password")]
        public async Task<IActionResult> GeneratePassword(string vendorId)
        {
            try
            {
                var result = await _vendorService.GenerateVendorPasswordAsync(vendorId);
                return Ok(new { tempPassword = result.Password, message = result.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("{vendorId}/saved-pos")]
        [Authorize]
        public async Task<IActionResult> GetVendorSavedPOs(string vendorId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] bool withLines = true)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1) pageSize = 50;
                if (pageSize > 500) pageSize = 500;

                // Get all POs for the vendor
                var purchaseOrders = await _purchaseOrderService.GetPurchaseOrdersByVendorAsync(vendorId);

                if (purchaseOrders == null)
                {
                    return Ok(new { data = new List<object>(), totalCount = 0 });
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
                        po.TotalAmount,
                        po.Status,
                        po.PODate,
                        po.DueDate,
                        LineCount = po.Lines?.Count ?? 0,
                        Lines = withLines ? (po.Lines?.Select(l => (object)new
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
                        }).ToList() ?? new List<object>()) : new List<object>()
                    })
                    .ToList();

                return Ok(new { data = (IEnumerable<object>)data, totalCount });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, details = ex.InnerException?.Message });
            }
        }

        [HttpGet("{vendorId}/purchase-orders")]
        [AllowAnonymous]
        public async Task<IActionResult> GetVendorPurchaseOrders(string vendorId)
        {
            try
            {
                var purchaseOrders = await _purchaseOrderService.GetPurchaseOrdersByVendorAsync(vendorId);

                // Flatten response - include all PO fields except Vendor navigation (to avoid circular refs)
                var flattenedPos = (purchaseOrders ?? new List<PurchaseOrder>()).Select(po => new
                {
                    po.Id,
                    po.PoNumber,
                    po.VendorId,
                    po.Description,
                    po.Quantity,
                    po.UnitPrice,
                    po.TotalAmount,
                    po.GSTType,
                    po.GSTApply,
                    po.IGSTPercentage,
                    po.IGSTAmount,
                    po.CGSTPercentage,
                    po.CGSTAmount,
                    po.SGSTPercentage,
                    po.SGSTAmount,
                    po.PODate,
                    po.DueDate,
                    po.Status,
                    po.ApprovedBy,
                    po.ApprovalDate,
                    po.Remarks,
                    po.CreatedAt,
                    po.UpdatedAt,
                    LineCount = po.Lines?.Count ?? 0,
                    Lines = (po.Lines ?? new List<PurchaseOrderLine>()).Select(l => new
                    {
                        l.Id,
                        l.PoId,
                        l.SiteId,
                        l.Description,
                        l.Quantity,
                        l.UnitPrice,
                        l.TotalAmount,
                        SiteName = l.Site?.Name ?? string.Empty
                    }).ToList()
                }).ToList();

                return Ok(new { data = flattenedPos });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("{vendorId}/purchase-orders/with-lines")]
        [AllowAnonymous]
        public async Task<IActionResult> GetVendorPurchaseOrdersWithLines(string vendorId, [FromQuery] int page = 1, [FromQuery] int pageSize = 100)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1) pageSize = 100;
                if (pageSize > 500) pageSize = 500;

                var purchaseOrders = await _purchaseOrderService.GetPurchaseOrdersByVendorAsync(vendorId);

                if (purchaseOrders == null)
                {
                    return Ok(new { data = new List<object>(), totalCount = 0, pageNumber = page, pageSize });
                }

                var totalCount = purchaseOrders.Count;
                var offset = (page - 1) * pageSize;

                // Flatten response with lines - include all PO fields except Vendor navigation
                var flattenedPos = purchaseOrders
                    .Skip(offset)
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
                        po.GSTType,
                        po.GSTApply,
                        po.IGSTPercentage,
                        po.IGSTAmount,
                        po.CGSTPercentage,
                        po.CGSTAmount,
                        po.SGSTPercentage,
                        po.SGSTAmount,
                        po.PODate,
                        po.DueDate,
                        po.Status,
                        po.ApprovedBy,
                        po.ApprovalDate,
                        po.Remarks,
                        po.CreatedAt,
                        po.UpdatedAt,
                        LineCount = po.Lines?.Count ?? 0,
                        Lines = (po.Lines ?? new List<PurchaseOrderLine>()).Select(l => new
                        {
                            l.Id,
                            l.PoId,
                            l.SiteId,
                            l.Description,
                            l.Quantity,
                            l.UnitPrice,
                            l.TotalAmount,
                            SiteName = l.Site?.Name ?? string.Empty
                        }).ToList()
                    }).ToList();

                return Ok(new { data = flattenedPos, totalCount, pageNumber = page, pageSize });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("{vendorId}/invoices")]
        [AllowAnonymous]
        public async Task<IActionResult> GetVendorInvoices(string vendorId)
        {
            try
            {
                var invoices = await _invoiceService.GetInvoicesByVendorAsync(vendorId);

                // Flatten response - include all invoice fields except Vendor navigation
                var flattenedInvoices = (invoices ?? new List<Invoice>()).Select(inv => new
                {
                    inv.Id,
                    inv.InvoiceNumber,
                    inv.VendorId,
                    inv.PoIds,
                    inv.InvoiceDate,
                    inv.DueDate,
                    inv.Amount,
                    inv.GST,
                    inv.TotalAmount,
                    inv.Status,
                    inv.PaymentMethod,
                    inv.PaymentDate,
                    inv.BankDetails,
                    inv.Remarks,
                    inv.CreatedAt,
                    inv.UpdatedAt
                }).ToList();

                return Ok(new { data = flattenedInvoices });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("{vendorId}/sites")]
        [AllowAnonymous]
        public async Task<IActionResult> GetVendorSites(string vendorId)
        {
            try
            {
                var sites = await _siteService.GetSitesByVendorAsync(vendorId);

                // Return all site fields (matching Node.js API pattern)
                // Exclude Vendor and Zone navigation properties to avoid circular references
                var flattenedSites = (sites ?? new List<Site>()).Select(s => new
                {
                    s.Id,
                    s.PlanId,
                    s.Name,
                    s.Sno,
                    s.Address,
                    s.City,
                    s.State,
                    s.PartnerCode,
                    s.PartnerName,
                    s.VendorId,
                    s.ZoneId,
                    s.Status,
                    s.Circle,
                    s.HopType,
                    s.HopAB,
                    s.HopBA,
                    s.District,
                    s.Project,
                    s.SiteAAntDia,
                    s.SiteBAntDia,
                    s.MaxAntSize,
                    s.SiteAName,
                    s.SiteBName,
                    s.TocoVendorA,
                    s.TocoIdA,
                    s.TocoVendorB,
                    s.TocoIdB,
                    s.MediaAvailabilityStatus,
                    s.SrNoSiteA,
                    s.SrDateSiteA,
                    s.SrNoSiteB,
                    s.SrDateSiteB,
                    s.HopSrDate,
                    s.SpDateSiteA,
                    s.SpDateSiteB,
                    s.HopSpDate,
                    s.SoReleasedDateSiteA,
                    s.SoReleasedDateSiteB,
                    s.HopSoDate,
                    s.RfaiOfferedDateSiteA,
                    s.RfaiOfferedDateSiteB,
                    s.ActualHopRfaiOfferedDate,
                    s.RfaiSurveyCompletionDate,
                    s.PhyAtOfferDate,
                    s.PhyAtAcceptanceDate,
                    s.PhyAtStatus,
                    s.SoftAtOfferDate,
                    s.SoftAtAcceptanceDate,
                    s.SoftAtStatus,
                    s.BothAtStatus,
                    s.MoDateSiteA,
                    s.MoDateSiteB,
                    s.HopMoDate,
                    s.MoNumberSiteA,
                    s.MoNumberSiteB,
                    s.PtwNumberSiteA,
                    s.PtwNumberSiteB,
                    s.PtwStatusA,
                    s.PtwStatusB,
                    s.MaterialTypeSiteA,
                    s.MaterialTypeSiteB,
                    s.MaterialDeliveryStatus,
                    s.HopMaterialDispatchDate,
                    s.HopMaterialDeliveryDate,
                    s.NmsVisibleDate,
                    s.VisibleInNms,
                    s.SiteAInstallationDate,
                    s.SiteBInstallationDate,
                    s.HopInstallationRemarks,
                    s.SurveyDate,
                    s.RfiSurveyAllocationDate,
                    s.Survey,
                    s.FinalPartnerSurvey,
                    s.ReasonOfExtraVisit,
                    s.Descope,
                    s.PriSiteId,
                    s.PriOpenDate,
                    s.PriCloseDate,
                    s.PriHistory,
                    s.PriIssueCategory,
                    s.SrnRmoNumber,
                    s.SrnRmoDate,
                    s.AlignmentDate,
                    s.HopIcDate,
                    s.WccReceived20Percent,
                    s.WccReceived80Percent,
                    s.WccReceivedDate20Percent,
                    s.WccReceivedDate80Percent,
                    s.WccReceivedDate100Percent,
                    s.CreatedAt,
                    s.UpdatedAt
                }).ToList();

                return Ok(flattenedSites);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
