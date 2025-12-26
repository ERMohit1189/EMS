using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api")]
    public class ExportController : ControllerBase
    {
        private readonly IExportHeaderService _exportHeaderService;

        public ExportController(IExportHeaderService exportHeaderService)
        {
            _exportHeaderService = exportHeaderService;
        }

        [HttpGet("export-headers")]
        [AllowAnonymous]
        public async Task<IActionResult> GetExportHeaders()
        {
            try
            {
                var header = await _exportHeaderService.GetExportHeaderAsync();

                if (header == null)
                {
                    // Return empty DTO if no header exists
                    return Ok(new ExportHeaderDto());
                }

                // Map model to DTO
                var dto = new ExportHeaderDto
                {
                    Id = header.Id,
                    CompanyName = header.CompanyName,
                    ReportTitle = header.ReportTitle,
                    FooterText = header.FooterText,
                    ContactPhone = header.ContactPhone,
                    ContactEmail = header.ContactEmail,
                    Website = header.Website,
                    Gstin = header.Gstin,
                    Address = header.Address,
                    State = header.State,
                    City = header.City,
                    ShowGeneratedDate = header.ShowGeneratedDate
                };

                return Ok(dto);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("export-headers")]
        [AllowAnonymous]
        public async Task<IActionResult> SaveExportHeaders([FromBody] ExportHeaderDto headerDto)
        {
            try
            {
                if (headerDto == null)
                    return BadRequest(new { error = "Header data is required" });

                // Map DTO to model
                var header = new ExportHeader
                {
                    Id = headerDto.Id ?? Guid.NewGuid().ToString(),
                    CompanyName = headerDto.CompanyName,
                    ReportTitle = headerDto.ReportTitle,
                    FooterText = headerDto.FooterText,
                    ContactPhone = headerDto.ContactPhone,
                    ContactEmail = headerDto.ContactEmail,
                    Website = headerDto.Website,
                    Gstin = headerDto.Gstin,
                    Address = headerDto.Address,
                    State = headerDto.State,
                    City = headerDto.City,
                    ShowGeneratedDate = headerDto.ShowGeneratedDate
                };

                var savedHeader = await _exportHeaderService.SaveExportHeaderAsync(header);

                // Map back to DTO for response
                var responseDto = new ExportHeaderDto
                {
                    Id = savedHeader.Id,
                    CompanyName = savedHeader.CompanyName,
                    ReportTitle = savedHeader.ReportTitle,
                    FooterText = savedHeader.FooterText,
                    ContactPhone = savedHeader.ContactPhone,
                    ContactEmail = savedHeader.ContactEmail,
                    Website = savedHeader.Website,
                    Gstin = savedHeader.Gstin,
                    Address = savedHeader.Address,
                    State = savedHeader.State,
                    City = savedHeader.City,
                    ShowGeneratedDate = savedHeader.ShowGeneratedDate
                };

                return Ok(responseDto);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
