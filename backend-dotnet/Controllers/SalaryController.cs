using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/salary-structures")]
    [Authorize]
    public class SalaryController : ControllerBase
    {
        private readonly ISalaryService _salaryService;

        public SalaryController(ISalaryService salaryService)
        {
            _salaryService = salaryService;
        }

        // GET /api/salary-structures - Get all with pagination (matches Node.js)
        [HttpGet]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GetAllSalaryStructures([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            var salaryStructures = await _salaryService.GetAllSalaryStructuresAsResponseAsync();
            var total = salaryStructures.Count;
            var data = salaryStructures.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return Ok(new
            {
                data = data,
                page = page,
                pageSize = pageSize,
                total = total
            });
        }

        // GET /api/salary-structures/{id} - Get by ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetSalaryStructure(string id)
        {
            var salaryStructure = await _salaryService.GetSalaryStructureByIdAsResponseAsync(id);
            if (salaryStructure == null)
                return NotFound(new { message = "Salary structure not found" });

            return Ok(salaryStructure);
        }

        // GET /api/employees/{employeeId}/salary - Get employee salary structure (matches Node.js path)
        [HttpGet]
        [Route("/api/employees/{employeeId}/salary")]
        public async Task<IActionResult> GetEmployeeSalaryStructure(string employeeId)
        {
            var salaryStructure = await _salaryService.GetSalaryStructureByEmployeeAsResponseAsync(employeeId);
            if (salaryStructure == null)
                return NotFound(new { message = "Salary structure not found for employee" });

            return Ok(salaryStructure);
        }

        // POST /api/salary-structures - Create salary structure
        [HttpPost]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> CreateSalaryStructure([FromBody] SalaryStructure salaryStructure)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { error = "Invalid salary structure data" });

            try
            {
                var createdStructure = await _salaryService.CreateSalaryStructureAsync(salaryStructure);
                return Created($"/api/salary-structures/{createdStructure.Id}", createdStructure);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // PUT /api/salary-structures/{id} - Update salary structure
        [HttpPut("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> UpdateSalaryStructure(string id, [FromBody] SalaryStructure salaryStructure)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { error = "Invalid salary structure data" });

            var updatedStructure = await _salaryService.UpdateSalaryStructureAsync(id, salaryStructure);
            if (updatedStructure == null)
                return NotFound(new { error = "Salary structure not found" });

            return Ok(updatedStructure);
        }

        // DELETE /api/salary-structures/{id} - Delete salary structure
        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> DeleteSalaryStructure(string id)
        {
            var success = await _salaryService.DeleteSalaryStructureAsync(id);
            if (!success)
                return NotFound(new { error = "Salary structure not found" });

            return Ok(new { message = "Salary structure deleted successfully" });
        }

        // GET /api/salary-structures/count - Get total count
        [HttpGet("count")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSalaryStructureCount()
        {
            var count = await _salaryService.GetSalaryStructureCountAsync();
            return Ok(new { count });
        }

        // POST /api/salary/generate - Generate salaries for a month/year
        [HttpPost]
        [Route("/api/salary/generate")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GenerateSalaries([FromQuery] int month, [FromQuery] int year, [FromQuery] bool missingOnly = false)
        {
            if (month < 1 || month > 12)
                return BadRequest(new { error = "Month must be between 1 and 12" });

            try
            {
                var salaries = await _salaryService.GenerateSalariesAsync(month, year, missingOnly);

                // Always return in consistent format (matches Node.js)
                var response = new
                {
                    generated = salaries,
                    generatedCount = salaries?.Count ?? 0
                };

                if (missingOnly)
                {
                    return Ok(new
                    {
                        generated = salaries,
                        generatedCount = salaries?.Count ?? 0,
                        skippedCount = 0
                    });
                }

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // GET /api/salary-report - Get salary report
        [HttpGet]
        [Route("/api/salary-report")]
        [Authorize]
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

        // POST /api/salary/save - Save generated salaries to database
        [HttpPost]
        [Route("/api/salary/save")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> SaveGeneratedSalaries([FromBody] DTOs.SaveGeneratedSalariesRequestDto request)
        {
            try
            {
                if (request is null || request.Salaries is null)
                    return BadRequest(new { error = "Request body is required" });

                int month = request.Month;
                int year = request.Year;

                if (month < 1 || month > 12 || year < 2000)
                    return BadRequest(new { error = "Invalid month or year" });

                if (request.Salaries.Count == 0)
                    return BadRequest(new { error = "No valid salaries provided" });

                var userId = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var result = await _salaryService.SaveGeneratedSalariesAsync(month, year, request.Salaries, userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // GET /api/salary/check/{employeeId}/{month}/{year} - Check if salary exists
        [HttpGet]
        [Route("/api/salary/check/{employeeId}/{month}/{year}")]
        [Authorize]
        public async Task<IActionResult> CheckSalaryExists(string employeeId, int month, int year)
        {
            try
            {
                if (month < 1 || month > 12)
                    return BadRequest(new { error = "Invalid month" });

                var exists = await _salaryService.SalaryExistsAsync(employeeId, month, year);
                return Ok(new { exists = exists });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // GET /api/reports/salary-generated - Get summary of generated salaries
        [HttpGet]
        [Route("/api/reports/salary-generated")]
        [Authorize]
        public async Task<IActionResult> GetSalaryGeneratedSummaries()
        {
            try
            {
                var summaries = await _salaryService.GetSalaryGeneratedSummariesAsync();
                return Ok(summaries);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // GET /api/reports/salary-generated/{year}/{month} - Get generated salaries for a month with pagination
        [HttpGet]
        [Route("/api/reports/salary-generated/{year}/{month}")]
        [Authorize]
        public async Task<IActionResult> GetGeneratedSalaries(int year, int month, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null)
        {
            try
            {
                if (month < 1 || month > 12 || year < 2000)
                    return BadRequest(new { error = "Invalid year or month" });

                if (page < 1) page = 1;
                if (pageSize < 1 || pageSize > 100) pageSize = 20;

                var salaries = await _salaryService.GetGeneratedSalariesAsync(year, month, page, pageSize, search);
                var total = salaries.Count; // Note: In production, should get total count separately

                return Ok(new
                {
                    data = salaries,
                    total = total,
                    page = page,
                    pageSize = pageSize
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // DELETE /api/reports/salary-generated/{id} - Delete a generated salary record
        [HttpDelete]
        [Route("/api/reports/salary-generated/{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> DeleteGeneratedSalary(string id)
        {
            try
            {
                if (string.IsNullOrEmpty(id))
                    return BadRequest(new { error = "ID is required" });

                var success = await _salaryService.DeleteGeneratedSalaryAsync(id);
                if (!success)
                    return NotFound(new { error = "Generated salary not found" });

                return Ok(new
                {
                    success = true,
                    message = "Generated salary deleted and attendance unlocked"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // GET /api/employee/salary-slip - Get latest salary slip for employee
        [HttpGet]
        [Route("/api/employee/salary-slip")]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> GetEmployeeSalarySlip([FromQuery] string employeeId)
        {
            try
            {
                if (string.IsNullOrEmpty(employeeId))
                    return BadRequest(new { error = "Employee ID is required" });

                // Verify employee is requesting their own salary slip
                var loggedInEmployeeId = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (loggedInEmployeeId != employeeId)
                    return Forbid(); // 403 Forbidden - cannot access other employee's salary slip

                var salarySlip = await _salaryService.GetGeneratedSalariesAsync(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 1, employeeId);

                if (salarySlip == null || salarySlip.Count == 0)
                    return NotFound(new { error = "No salary slip found for this employee" });

                return Ok(salarySlip[0]);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // GET /api/salary-slip/{id} - Get specific salary slip by ID
        [HttpGet]
        [Route("/api/salary-slip/{id}")]
        [Authorize]
        public async Task<IActionResult> GetSalarySlipById(string id)
        {
            try
            {
                if (string.IsNullOrEmpty(id))
                    return BadRequest(new { error = "Salary slip ID is required" });

                // Get logged-in employee ID
                var loggedInEmployeeId = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

                // Fetch the salary slip and verify it belongs to the logged-in employee
                var salarySlip = await _salaryService.GetGeneratedSalaryAsync(id);

                if (salarySlip == null)
                    return NotFound(new { error = "Salary slip not found" });

                // Verify employee owns this salary slip
                if (salarySlip.EmployeeId != loggedInEmployeeId)
                    return Forbid(); // 403 Forbidden - cannot access other employee's salary slip

                // Return formatted response matching Node.js
                return Ok(new
                {
                    id = salarySlip.Id,
                    month = salarySlip.Month,
                    year = salarySlip.Year,
                    basicSalary = salarySlip.BasicSalary,
                    hra = salarySlip.HRA,
                    da = salarySlip.DA,
                    lta = salarySlip.LTA,
                    conveyance = salarySlip.Conveyance,
                    medical = salarySlip.Medical,
                    bonuses = salarySlip.Bonuses,
                    otherBenefits = salarySlip.OtherBenefits,
                    grossSalary = salarySlip.GrossSalary,
                    perDaySalary = salarySlip.PerDaySalary,
                    earnedSalary = salarySlip.EarnedSalary,
                    pf = salarySlip.PF,
                    professionalTax = salarySlip.ProfessionalTax,
                    incomeTax = salarySlip.IncomeTax,
                    epf = salarySlip.EPF,
                    esic = salarySlip.ESIC,
                    totalDeductions = salarySlip.TotalDeductions,
                    netSalary = salarySlip.NetSalary
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // GET /api/salary-history - Get all salary history for logged-in employee
        [HttpGet]
        [Route("/api/salary-history")]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> GetEmployeeSalaryHistory()
        {
            try
            {
                var loggedInEmployeeId = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(loggedInEmployeeId))
                    return Unauthorized(new { error = "Employee ID not found in token" });

                Console.WriteLine($"[SalaryController] Fetching salary history for employee {loggedInEmployeeId}");

                // Fetch ALL salary records for this employee in ONE query (not 60 queries!)
                var salaryHistory = await _salaryService.GetEmployeeSalaryHistoryAsync(loggedInEmployeeId);

                Console.WriteLine($"[SalaryController] Found {salaryHistory.Count} salary records");

                return Ok(salaryHistory);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SalaryController] Error fetching salary history: {ex.Message}");
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
