using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.Services;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "admin,superadmin")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportsService _reportsService;
        private readonly AppDbContext _context;
        private readonly ReportPdfService _pdfService;

        public ReportsController(IReportsService reportsService, AppDbContext context, ReportPdfService pdfService)
        {
            _reportsService = reportsService;
            _context = context;
            _pdfService = pdfService;
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

        // ==================== TEMPLATE MANAGEMENT ====================

        [HttpPost("templates/save")]
        public async Task<IActionResult> SaveTemplate([FromBody] ReportTemplate template)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(template.Name))
                    return BadRequest(new { message = "Template name is required" });

                if (string.IsNullOrWhiteSpace(template.Type))
                    return BadRequest(new { message = "Template type is required" });

                template.Id = Guid.NewGuid().ToString();
                template.CreatedAt = DateTime.UtcNow;
                template.UpdatedAt = DateTime.UtcNow;

                _context.ReportTemplates.Add(template);
                await _context.SaveChangesAsync();

                return Ok(new { id = template.Id, message = "Template saved successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to save template: " + ex.Message });
            }
        }

        [HttpGet("templates")]
        public async Task<IActionResult> GetTemplates([FromQuery] string? type = null)
        {
            try
            {
                var query = _context.ReportTemplates.AsQueryable();

                if (!string.IsNullOrWhiteSpace(type))
                {
                    query = query.Where(t => t.Type == type);
                }

                var templates = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
                return Ok(templates);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to retrieve templates: " + ex.Message });
            }
        }

        [HttpGet("templates/{id}")]
        public async Task<IActionResult> GetTemplate(string id)
        {
            try
            {
                var template = await _context.ReportTemplates.FirstOrDefaultAsync(t => t.Id == id);

                if (template == null)
                    return NotFound(new { message = "Template not found" });

                return Ok(template);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to retrieve template: " + ex.Message });
            }
        }

        [HttpPut("templates/{id}")]
        public async Task<IActionResult> UpdateTemplate(string id, [FromBody] ReportTemplate updatedTemplate)
        {
            try
            {
                var template = await _context.ReportTemplates.FirstOrDefaultAsync(t => t.Id == id);

                if (template == null)
                    return NotFound(new { message = "Template not found" });

                if (string.IsNullOrWhiteSpace(updatedTemplate.Name))
                    return BadRequest(new { message = "Template name is required" });

                template.Name = updatedTemplate.Name;
                template.Type = updatedTemplate.Type;
                template.DesignJson = updatedTemplate.DesignJson ?? template.DesignJson;
                template.QueriesJson = updatedTemplate.QueriesJson ?? template.QueriesJson;
                template.LeftMargin = updatedTemplate.LeftMargin;
                template.RightMargin = updatedTemplate.RightMargin;
                template.TopMargin = updatedTemplate.TopMargin;
                template.BottomMargin = updatedTemplate.BottomMargin;
                template.UpdatedAt = DateTime.UtcNow;

                _context.ReportTemplates.Update(template);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Template updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to update template: " + ex.Message });
            }
        }

        [HttpDelete("templates/{id}")]
        public async Task<IActionResult> DeleteTemplate(string id)
        {
            try
            {
                var template = await _context.ReportTemplates.FirstOrDefaultAsync(t => t.Id == id);

                if (template == null)
                    return NotFound(new { message = "Template not found" });

                _context.ReportTemplates.Remove(template);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Template deleted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to delete template: " + ex.Message });
            }
        }

        // ==================== QUERY TESTING ====================

        [AllowAnonymous]
        [HttpPost("test-query")]
        public async Task<IActionResult> TestQuery([FromBody] QueryTestRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Query))
                    return BadRequest(new { message = "Query cannot be empty" });

                var connection = _context.Database.GetDbConnection();
                await connection.OpenAsync();

                var columns = new List<string>();
                var results = new List<Dictionary<string, object>>();

                try
                {
                    using (var command = connection.CreateCommand())
                    {
                        command.CommandText = request.Query;
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            // Get column names
                            for (int i = 0; i < reader.FieldCount; i++)
                            {
                                columns.Add(reader.GetName(i));
                            }

                            // Get first row of results (for preview)
                            int rowCount = 0;
                            while (await reader.ReadAsync() && rowCount < 5) // Limit to 5 rows
                            {
                                var row = new Dictionary<string, object>();
                                for (int i = 0; i < reader.FieldCount; i++)
                                {
                                    row[columns[i]] = reader.GetValue(i) ?? "";
                                }
                                results.Add(row);
                                rowCount++;
                            }
                        }
                    }
                }
                finally
                {
                    await connection.CloseAsync();
                }

                return Ok(new { columns, results });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Query execution failed: " + ex.Message });
            }
        }

        // ==================== TEMPLATE EXPORT ====================

        [AllowAnonymous]
        [HttpPost("templates/export-html/{templateId}")]
        public async Task<IActionResult> ExportTemplateAsHtml(string templateId, [FromBody] ExportRequest request)
        {
            try
            {
                // Fetch template from database to get its margin values
                var template = await _context.ReportTemplates.FirstOrDefaultAsync(t => t.Id == templateId);

                // Use template's margins from database (default to 0 if not set)
                int leftMargin = template?.LeftMargin ?? 0;
                int rightMargin = template?.RightMargin ?? 0;
                int topMargin = template?.TopMargin ?? 0;
                int bottomMargin = template?.BottomMargin ?? 0;

                var html = await _pdfService.GenerateHtmlFromTemplateAsync(
                    templateId,
                    request.Parameters ?? new Dictionary<string, object>(),
                    request.DesignJson,
                    request.QueriesJson,
                    leftMargin,
                    rightMargin,
                    topMargin,
                    bottomMargin
                );
                return Ok(new { html = html });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to export template: " + ex.Message });
            }
        }

        [AllowAnonymous]
        [HttpPost("templates/export-pdf/{templateId}")]
        public async Task<IActionResult> ExportTemplateAsPdf(string templateId, [FromBody] ExportRequest request)
        {
            try
            {
                // Fetch template from database to get its margin values
                var template = await _context.ReportTemplates.FirstOrDefaultAsync(t => t.Id == templateId);

                // Use template's margins from database (default to 0 if not set)
                int leftMargin = template?.LeftMargin ?? 0;
                int rightMargin = template?.RightMargin ?? 0;
                int topMargin = template?.TopMargin ?? 0;
                int bottomMargin = template?.BottomMargin ?? 0;

                var html = await _pdfService.GenerateHtmlFromTemplateAsync(
                    templateId,
                    request.Parameters ?? new Dictionary<string, object>(),
                    request.DesignJson,
                    request.QueriesJson,
                    leftMargin,
                    rightMargin,
                    topMargin,
                    bottomMargin
                );
                return Ok(new {
                    html = html,
                    fileName = $"report_{DateTime.Now:yyyyMMdd_HHmmss}.pdf"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to export template: " + ex.Message });
            }
        }
    }

    public class ExportRequest
    {
        public Dictionary<string, object>? Parameters { get; set; }
        public string? DesignJson { get; set; }
        public string? QueriesJson { get; set; }

        [System.Text.Json.Serialization.JsonConverter(typeof(VendorRegistrationBackend.Models.IntJsonConverter))]
        public int LeftMargin { get; set; } = 0;

        [System.Text.Json.Serialization.JsonConverter(typeof(VendorRegistrationBackend.Models.IntJsonConverter))]
        public int RightMargin { get; set; } = 0;

        [System.Text.Json.Serialization.JsonConverter(typeof(VendorRegistrationBackend.Models.IntJsonConverter))]
        public int TopMargin { get; set; } = 0;

        [System.Text.Json.Serialization.JsonConverter(typeof(VendorRegistrationBackend.Models.IntJsonConverter))]
        public int BottomMargin { get; set; } = 0;
    }

    public class QueryTestRequest
    {
        public string? Query { get; set; }
        public string? SectionName { get; set; }
    }
}
