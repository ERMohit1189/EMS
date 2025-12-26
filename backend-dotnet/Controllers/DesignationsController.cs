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
    public class DesignationsController : ControllerBase
    {
        private readonly IDesignationService _designationService;
        private readonly AppDbContext _context;

        public DesignationsController(IDesignationService designationService, AppDbContext context)
        {
            _designationService = designationService;
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllDesignations()
        {
            var designations = await _designationService.GetAllDesignationsAsync();
            return Ok(designations);
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> CreateDesignation([FromBody] Designation designation)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                if (string.IsNullOrEmpty(designation.Name))
                    return BadRequest(new { error = "Designation name is required" });

                designation.Id = Guid.NewGuid().ToString();
                designation.CreatedAt = DateTime.UtcNow;
                designation.UpdatedAt = DateTime.UtcNow;

                _context.Designations.Add(designation);
                await _context.SaveChangesAsync();

                return Created($"/api/designations/{designation.Id}", new
                {
                    id = designation.Id,
                    name = designation.Name,
                    description = designation.Description,
                    createdAt = designation.CreatedAt,
                    updatedAt = designation.UpdatedAt
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
