using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SitesController : ControllerBase
    {
        private readonly ISiteService _siteService;
        private readonly AppDbContext _context;

        public SitesController(ISiteService siteService, AppDbContext context)
        {
            _siteService = siteService;
            _context = context;
        }

        // More specific routes first
        [HttpGet("atp-counts")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAtpCounts()
        {
            try
            {
                var counts = await _siteService.GetAtpCountsAsync();
                return Ok(counts);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, phy = new Dictionary<string, int>(), soft = new Dictionary<string, int>(), totalCount = 0 });
            }
        }

        [HttpGet("vendor/{vendorId}")]
        public async Task<IActionResult> GetSitesByVendor(string vendorId)
        {
            var sites = await _siteService.GetSitesByVendorAsync(vendorId);
            return Ok(sites);
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllSites([FromQuery] int page = 1, [FromQuery] int pageSize = 50,
            [FromQuery] string? search = null, [FromQuery] string? vendorId = null, [FromQuery] string? status = null,
            [FromQuery] string? phyAtStatus = null, [FromQuery] string? softAtStatus = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 50;
            if (pageSize > 500) pageSize = 500;

            try
            {
                var allSites = await _siteService.GetAllSitesAsync();

                // Apply global search filter (search across Plan ID, Circle, District, etc.)
                if (!string.IsNullOrEmpty(search))
                {
                    var searchLower = search.ToLower().Trim();
                    allSites = allSites
                        .Where(s =>
                            (s.PlanId != null && s.PlanId.ToLower().Contains(searchLower)) ||
                            (s.Circle != null && s.Circle.ToLower().Contains(searchLower)) ||
                            (s.District != null && s.District.ToLower().Contains(searchLower)) ||
                            (s.Name != null && s.Name.ToLower().Contains(searchLower))
                        )
                        .ToList();
                }

                // Apply vendor filter
                if (!string.IsNullOrEmpty(vendorId))
                {
                    allSites = allSites
                        .Where(s => s.VendorId == vendorId)
                        .ToList();
                }

                // Apply site status filter
                if (!string.IsNullOrEmpty(status))
                {
                    allSites = allSites
                        .Where(s => s.Status.Equals(status, StringComparison.OrdinalIgnoreCase))
                        .ToList();
                }

                // Apply Phy AT status filter
                if (!string.IsNullOrEmpty(phyAtStatus))
                {
                    allSites = allSites
                        .Where(s => s.PhyAtStatus != null && s.PhyAtStatus.Equals(phyAtStatus, StringComparison.OrdinalIgnoreCase))
                        .ToList();
                }

                // Apply Soft AT status filter
                if (!string.IsNullOrEmpty(softAtStatus))
                {
                    allSites = allSites
                        .Where(s => s.SoftAtStatus != null && s.SoftAtStatus.Equals(softAtStatus, StringComparison.OrdinalIgnoreCase))
                        .ToList();
                }

                // Apply pagination
                var totalCount = allSites.Count;
                var paginatedSites = allSites
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList();

                return Ok(new { data = paginatedSites, totalCount, page, pageSize });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetSite(string id)
        {
            var site = await _siteService.GetSiteByIdAsync(id);
            if (site == null)
                return NotFound(new { message = "Site not found" });

            return Ok(site);
        }

        [HttpPost("batch")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSitesBatch([FromBody] BatchSiteRequestDto request)
        {
            if (request?.Ids == null || request.Ids.Count == 0)
                return Ok(new List<object>());

            try
            {
                // Use LEFT JOIN to get sites with vendor amounts (including sites without payment records)
                var enrichedSites = await _context.Sites
                    .Where(s => request.Ids.Contains(s.Id))
                    .GroupJoin(_context.PaymentMasters,
                          site => site.Id,
                          payment => payment.SiteId,
                          (site, payments) => new
                          {
                              site,
                              payment = payments.FirstOrDefault()
                          })
                    .Select(x => new
                    {
                        x.site.Id,
                        x.site.PlanId,
                        x.site.Name,
                        x.site.SiteAName,
                        x.site.SiteBName,
                        x.site.HopAB,
                        x.site.MaxAntSize,
                        x.site.SiteAAntDia,
                        x.site.SiteBAntDia,
                        x.site.SiteAInstallationDate,
                        x.site.SiteBInstallationDate,
                        x.site.SoftAtStatus,
                        x.site.PhyAtStatus,
                        VendorAmount = x.payment != null ? x.payment.VendorAmount : 0m
                    })
                    .Select(x => new
                    {
                        x.Id,
                        x.PlanId,
                        x.Name,
                        x.SiteAName,
                        x.SiteBName,
                        x.HopAB,
                        x.MaxAntSize,
                        x.SiteAAntDia,
                        x.SiteBAntDia,
                        SiteAInstallationDate = (x.SiteAInstallationDate ?? x.SiteBInstallationDate) != null
                            ? (x.SiteAInstallationDate ?? x.SiteBInstallationDate).Value.ToString("yyyy-MM-dd")
                            : null,
                        x.SoftAtStatus,
                        x.PhyAtStatus,
                        x.VendorAmount
                    })
                    .ToListAsync();

                return Ok(enrichedSites);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> CreateSite([FromBody] Site site)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var createdSite = await _siteService.CreateSiteAsync(site);
                return Created($"/api/sites/{createdSite.Id}", createdSite);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateSite(string id, [FromBody] UpdateSiteDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var updatedSite = await _siteService.UpdateSiteAsync(id, dto);
            if (updatedSite == null)
                return NotFound(new { message = "Site not found" });

            return Ok(new { message = "Site updated successfully", data = updatedSite });
        }

        [HttpDelete("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> DeleteSite(string id)
        {
            var success = await _siteService.DeleteSiteAsync(id);
            if (!success)
                return NotFound(new { message = "Site not found" });

            return Ok(new { message = "Site deleted successfully" });
        }

        [HttpPost("batch-upsert")]
        [AllowAnonymous]
        public async Task<IActionResult> BatchUpsertSites([FromBody] BatchUpsertSitesDto request)
        {
            try
            {
                if (request?.Sites == null || request.Sites.Count == 0)
                    return Ok(new { successful = 0, failed = 0, errors = new List<object>() });

                var result = await _siteService.BatchUpsertSitesAsync(request.Sites);
                return Ok(new { result.Successful, result.Failed, Errors = result.Errors });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, successful = 0, failed = request?.Sites?.Count ?? 0, errors = new List<object>() });
            }
        }

        [HttpPost("bulk-update-status-by-plan")]
        [AllowAnonymous]
        public async Task<IActionResult> BulkUpdateStatusByPlan([FromBody] BulkUpdateStatusDto request)
        {
            try
            {
                if (request?.PlanIds == null || request.PlanIds.Count == 0)
                    return BadRequest(new { error = "No plan IDs provided" });

                var result = await _siteService.BulkUpdateStatusByPlanAsync(request.PlanIds, request.PhyAtStatus, request.SoftAtStatus, request.ShouldApproveStatus);
                return Ok(new { successful = result.Successful, failed = result.Failed, message = $"Updated {result.Successful} sites" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("for-po-generation")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSitesForPoGeneration([FromQuery] bool withVendors = false, [FromQuery] string? vendorId = null)
        {
            try
            {
                // Return sites with status "Approved" that are eligible for PO generation
                // Optimized: Filter at database level instead of loading all sites to memory
                var approvedSitesQuery = _context.Sites
                    .AsNoTracking()
                    .Where(s => s.Status == "Approved");

                var approvedSites = await approvedSitesQuery.ToListAsync();

                // Build a dictionary of site IDs for fast O(1) lookup
                var siteIds = approvedSites.Select(s => s.Id).ToList();

                // Fetch vendor amounts from PaymentMasters table in ONE query
                // Filter by vendor if specified, use dictionary for O(1) lookups
                var paymentMastersQuery = _context.PaymentMasters
                    .AsNoTracking()
                    .Where(pm => siteIds.Contains(pm.SiteId));

                if (!string.IsNullOrEmpty(vendorId))
                {
                    paymentMastersQuery = paymentMastersQuery.Where(pm => pm.VendorId == vendorId);
                }

                var paymentMasters = await paymentMastersQuery.ToListAsync();

                // Create a dictionary: Key = SiteId, Value = VendorAmount
                var vendorAmountBysite = paymentMasters
                    .GroupBy(pm => pm.SiteId)
                    .ToDictionary(g => g.Key, g => g.First().VendorAmount);

                // Add vendorAmount to each site using O(1) dictionary lookup
                var enrichedSites = approvedSites.Select(site => new {
                    site.Id,
                    site.Name,
                    site.Address,
                    site.City,
                    site.State,
                    site.PartnerCode,
                    site.PartnerName,
                    site.VendorId,
                    site.ZoneId,
                    site.Status,
                    site.Circle,
                    site.PlanId,
                    site.HopType,
                    site.HopAB,
                    site.HopBA,
                    site.Sno,
                    site.CreatedAt,
                    site.UpdatedAt,
                    // O(1) dictionary lookup instead of O(n) LINQ-to-Objects search
                    vendorAmount = vendorAmountBysite.TryGetValue(site.Id, out var amount) ? amount : (decimal?)null
                }).ToList();

                return Ok(new { sites = enrichedSites, data = enrichedSites });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
