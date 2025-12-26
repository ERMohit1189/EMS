using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/payment-masters")]
    public class PaymentMastersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PaymentMastersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllPaymentMasters([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1) pageSize = 50;
                if (pageSize > 500) pageSize = 500;

                var totalCount = await _context.PaymentMasters.CountAsync();

                var data = await _context.PaymentMasters
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                return Ok(new { data, totalCount });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPaymentMaster(string id)
        {
            try
            {
                var master = await _context.PaymentMasters.FirstOrDefaultAsync(m => m.Id == id);
                if (master == null)
                    return NotFound(new { message = "Payment master not found" });

                return Ok(master);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> CreatePaymentMaster([FromBody] CreatePaymentMasterDto dto)
        {
            try
            {
                if (string.IsNullOrEmpty(dto.SiteId) || string.IsNullOrEmpty(dto.VendorId) || string.IsNullOrEmpty(dto.AntennaSize))
                    return BadRequest(new { error = "SiteId, VendorId, and AntennaSize are required" });

                if (dto.VendorAmount <= 0)
                    return BadRequest(new { error = "VendorAmount must be greater than 0" });

                var master = new PaymentMaster
                {
                    Id = Guid.NewGuid().ToString(),
                    SiteId = dto.SiteId,
                    PlanId = dto.PlanId ?? string.Empty,
                    VendorId = dto.VendorId,
                    AntennaSize = dto.AntennaSize,
                    SiteAmount = dto.SiteAmount,
                    VendorAmount = dto.VendorAmount,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.PaymentMasters.Add(master);
                await _context.SaveChangesAsync();

                return Created($"/api/payment-masters/{master.Id}", master);
            }
            catch (DbUpdateException ex)
            {
                // Handle unique constraint violation
                if (ex.InnerException?.Message.Contains("UNIQUE") == true)
                    return BadRequest(new { error = "A payment master already exists for this site, vendor, antenna, and plan combination" });

                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("batch")]
        [AllowAnonymous]
        public async Task<IActionResult> BatchCreatePaymentMasters([FromBody] List<CreatePaymentMasterDto> dtos)
        {
            try
            {
                if (dtos == null || dtos.Count == 0)
                    return BadRequest(new { error = "No payment masters provided", created = 0, failed = 0 });

                int created = 0;
                int failed = 0;
                var errors = new List<string>();

                foreach (var dto in dtos)
                {
                    try
                    {
                        if (string.IsNullOrEmpty(dto.SiteId) || string.IsNullOrEmpty(dto.VendorId) || string.IsNullOrEmpty(dto.AntennaSize))
                        {
                            failed++;
                            errors.Add($"Missing required fields for site {dto.SiteId}");
                            continue;
                        }

                        if (dto.VendorAmount <= 0)
                        {
                            failed++;
                            errors.Add($"Invalid vendor amount for site {dto.SiteId}");
                            continue;
                        }

                        var master = new PaymentMaster
                        {
                            Id = Guid.NewGuid().ToString(),
                            SiteId = dto.SiteId,
                            PlanId = dto.PlanId ?? string.Empty,
                            VendorId = dto.VendorId,
                            AntennaSize = dto.AntennaSize,
                            SiteAmount = dto.SiteAmount,
                            VendorAmount = dto.VendorAmount,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        _context.PaymentMasters.Add(master);
                        created++;
                    }
                    catch (Exception ex)
                    {
                        failed++;
                        errors.Add($"Error for site {dto.SiteId}: {ex.Message}");
                    }
                }

                // Save all at once
                if (created > 0)
                {
                    await _context.SaveChangesAsync();
                }

                return Ok(new
                {
                    message = $"Batch create completed: {created} created, {failed} failed",
                    created,
                    failed,
                    errors = errors.Count > 0 ? errors : null
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, created = 0, failed = dtos?.Count ?? 0 });
            }
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdatePaymentMaster(string id, [FromBody] UpdatePaymentMasterDto dto)
        {
            try
            {
                var master = await _context.PaymentMasters.FirstOrDefaultAsync(m => m.Id == id);
                if (master == null)
                    return NotFound(new { message = "Payment master not found" });

                if (dto.VendorAmount <= 0)
                    return BadRequest(new { error = "VendorAmount must be greater than 0" });

                master.AntennaSize = dto.AntennaSize ?? master.AntennaSize;
                master.SiteAmount = dto.SiteAmount;
                master.VendorAmount = dto.VendorAmount;
                master.UpdatedAt = DateTime.UtcNow;

                _context.PaymentMasters.Update(master);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Payment master updated successfully", data = master });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeletePaymentMaster(string id)
        {
            try
            {
                var master = await _context.PaymentMasters.FirstOrDefaultAsync(m => m.Id == id);
                if (master == null)
                    return NotFound(new { message = "Payment master not found" });

                _context.PaymentMasters.Remove(master);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Payment master deleted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }

    public class CreatePaymentMasterDto
    {
        public string SiteId { get; set; } = string.Empty;
        public string? PlanId { get; set; }
        public string VendorId { get; set; } = string.Empty;
        public string AntennaSize { get; set; } = string.Empty;
        public decimal? SiteAmount { get; set; }
        public decimal VendorAmount { get; set; }
    }

    public class UpdatePaymentMasterDto
    {
        public string? AntennaSize { get; set; }
        public decimal? SiteAmount { get; set; }
        public decimal VendorAmount { get; set; }
    }
}
