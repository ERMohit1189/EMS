using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "admin,superadmin")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportsService _reportsService;

        public ReportsController(IReportsService reportsService)
        {
            _reportsService = reportsService;
        }

        [HttpGet("attendance")]
        public async Task<IActionResult> GetAttendanceReport([FromQuery] int month, [FromQuery] int year)
        {
            if (month < 1 || month > 12)
                return BadRequest(new { message = "Month must be between 1 and 12" });

            try
            {
                var report = await _reportsService.GetAttendanceReportAsync(month, year);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("salary/{month}/{year}")]
        public async Task<IActionResult> GetSalaryReport(int month, int year)
        {
            if (month < 1 || month > 12)
                return BadRequest(new { message = "Month must be between 1 and 12" });

            try
            {
                var report = await _reportsService.GetSalaryReportAsync(month, year);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("invoices/{month}/{year}")]
        public async Task<IActionResult> GetInvoiceReport(int month, int year)
        {
            if (month < 1 || month > 12)
                return BadRequest(new { message = "Month must be between 1 and 12" });

            try
            {
                var report = await _reportsService.GetInvoiceReportAsync(month, year);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("purchase-orders/{month}/{year}")]
        public async Task<IActionResult> GetPurchaseOrderReport(int month, int year)
        {
            if (month < 1 || month > 12)
                return BadRequest(new { message = "Month must be between 1 and 12" });

            try
            {
                var report = await _reportsService.GetPurchaseOrderReportAsync(month, year);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("leave/{month}/{year}")]
        public async Task<IActionResult> GetLeaveReport(int month, int year)
        {
            if (month < 1 || month > 12)
                return BadRequest(new { message = "Month must be between 1 and 12" });

            try
            {
                var report = await _reportsService.GetLeaveReportAsync(month, year);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("vendor-summary")]
        public async Task<IActionResult> GetVendorSummary()
        {
            try
            {
                var report = await _reportsService.GetVendorSummaryAsync();
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("employee-summary")]
        public async Task<IActionResult> GetEmployeeSummary()
        {
            try
            {
                var report = await _reportsService.GetEmployeeSummaryAsync();
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
