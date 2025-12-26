using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/salary")]
    [Route("api/salary-structures")]
    [Route("api/salary-history")]
    [Route("api/salary-slip")]
    [Route("api/[controller]")]
    [Authorize]
    public class SalaryController : ControllerBase
    {
        private readonly ISalaryService _salaryService;

        public SalaryController(ISalaryService salaryService)
        {
            _salaryService = salaryService;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetSalaryStructure(string id)
        {
            var salaryStructure = await _salaryService.GetSalaryStructureByIdAsync(id);
            if (salaryStructure == null)
                return NotFound(new { message = "Salary structure not found" });

            return Ok(salaryStructure);
        }

        [HttpGet("employee/{employeeId}")]
        public async Task<IActionResult> GetEmployeeSalaryStructure(string employeeId)
        {
            var salaryStructure = await _salaryService.GetSalaryStructureByEmployeeAsync(employeeId);
            if (salaryStructure == null)
                return NotFound(new { message = "Salary structure not found for employee" });

            return Ok(salaryStructure);
        }

        [HttpGet]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GetAllSalaryStructures()
        {
            var salaryStructures = await _salaryService.GetAllSalaryStructuresAsync();
            return Ok(salaryStructures);
        }

        [HttpPost]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> CreateSalaryStructure([FromBody] SalaryStructure salaryStructure)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var createdStructure = await _salaryService.CreateSalaryStructureAsync(salaryStructure);
                return Created($"/api/salary/{createdStructure.Id}", new
                {
                    id = createdStructure.Id,
                    employeeId = createdStructure.EmployeeId
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> UpdateSalaryStructure(string id, [FromBody] SalaryStructure salaryStructure)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var updatedStructure = await _salaryService.UpdateSalaryStructureAsync(id, salaryStructure);
            if (updatedStructure == null)
                return NotFound(new { message = "Salary structure not found" });

            return Ok(new { message = "Salary structure updated successfully" });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> DeleteSalaryStructure(string id)
        {
            var success = await _salaryService.DeleteSalaryStructureAsync(id);
            if (!success)
                return NotFound(new { message = "Salary structure not found" });

            return Ok(new { message = "Salary structure deleted successfully" });
        }

        [HttpGet("employee/{employeeId}/gross")]
        public async Task<IActionResult> GetGrossSalary(string employeeId)
        {
            var gross = await _salaryService.CalculateGrossAsync(employeeId);
            return Ok(new { employeeId, gross });
        }

        [HttpGet("employee/{employeeId}/net")]
        public async Task<IActionResult> GetNetSalary(string employeeId)
        {
            var net = await _salaryService.CalculateNetAsync(employeeId);
            return Ok(new { employeeId, net });
        }

        [HttpGet("count")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSalaryStructureCount()
        {
            var count = await _salaryService.GetSalaryStructureCountAsync();
            return Ok(new { count });
        }

        [HttpPost("generate")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GenerateSalaries([FromQuery] int month, [FromQuery] int year, [FromQuery] bool missingOnly = false)
        {
            if (month < 1 || month > 12)
                return BadRequest(new { error = "Month must be between 1 and 12" });

            try
            {
                var salaries = await _salaryService.GenerateSalariesAsync(month, year, missingOnly);

                if (missingOnly)
                {
                    return Ok(new {
                        generated = salaries,
                        generatedCount = salaries?.Count ?? 0,
                        skippedCount = 0
                    });
                }

                return Ok(salaries);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("report")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSalaryReport()
        {
            try
            {
                var report = await _salaryService.GetSalaryReportAsync();
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
