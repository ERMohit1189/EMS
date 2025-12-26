using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VendorsController : ControllerBase
    {
        private readonly IVendorService _vendorService;
        private readonly IPurchaseOrderService _purchaseOrderService;

        public VendorsController(IVendorService vendorService, IPurchaseOrderService purchaseOrderService)
        {
            _vendorService = vendorService;
            _purchaseOrderService = purchaseOrderService;
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> CreateVendor([FromBody] CreateVendorDto dto)
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
        [Authorize]
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
        [Authorize]
        public async Task<IActionResult> UpdateVendor(string id, [FromBody] UpdateVendorDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var vendor = await _vendorService.UpdateVendorAsync(id, dto);
            if (vendor == null)
                return NotFound(new { message = "Vendor not found" });

            return Ok(new { message = "Vendor updated successfully" });
        }

        [HttpPatch("{id}/status")]
        [Authorize]
        public async Task<IActionResult> UpdateVendorStatus(string id, [FromBody] dynamic request)
        {
            try
            {
                string status = request.status;
                if (string.IsNullOrEmpty(status))
                    return BadRequest(new { message = "Status is required" });

                var success = await _vendorService.UpdateVendorStatusAsync(id, status);
                if (!success)
                    return NotFound(new { message = "Vendor not found" });

                return Ok(new { message = "Vendor status updated successfully" });
            }
            catch
            {
                return BadRequest(new { message = "Invalid request" });
            }
        }

        [HttpPost("{id}/change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword(string id, [FromBody] dynamic request)
        {
            string oldPassword = request.oldPassword;
            string newPassword = request.newPassword;

            if (string.IsNullOrEmpty(oldPassword) || string.IsNullOrEmpty(newPassword))
                return BadRequest(new { message = "Old and new passwords are required" });

            var success = await _vendorService.ChangePasswordAsync(id, oldPassword, newPassword);
            if (!success)
                return BadRequest(new { message = "Invalid old password or vendor not found" });

            return Ok(new { message = "Password changed successfully" });
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
        public async Task<IActionResult> GetVendorSavedPOs(string vendorId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
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
                        Lines = po.Lines?.Select(l => new
                        {
                            l.Id,
                            l.PoId,
                            l.SiteId,
                            l.Description,
                            l.Quantity,
                            l.UnitPrice,
                            l.TotalAmount,
                            SiteName = l.Site?.Name ?? string.Empty
                        }).ToList() ?? new List<object>()
                    })
                    .ToList();

                return Ok(new { data = (IEnumerable<object>)data, totalCount });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, details = ex.InnerException?.Message });
            }
        }
    }
}
