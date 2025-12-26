using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/app-settings")]
    public class AppSettingsController : ControllerBase
    {
        private readonly IAppSettingsService _appSettingsService;

        public AppSettingsController(IAppSettingsService appSettingsService)
        {
            _appSettingsService = appSettingsService;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAppSettings()
        {
            try
            {
                var settings = await _appSettingsService.GetAppSettingsAsync();

                var response = new
                {
                    approvalsRequiredForAllowance = settings?.ApprovalsRequiredForAllowance ?? 1,
                    poGenerationDate = settings?.PoGenerationDate ?? 1,
                    invoiceGenerationDate = settings?.InvoiceGenerationDate ?? 1
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPut]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateAppSettings([FromBody] AppSettingsDto settingsDto)
        {
            try
            {
                if (settingsDto == null)
                    return BadRequest(new { error = "Settings data is required" });

                // Get existing settings or create new
                var existing = await _appSettingsService.GetAppSettingsAsync();
                var settings = existing ?? new AppSettings();

                // Update only provided fields
                if (settingsDto.ApprovalsRequiredForAllowance.HasValue)
                    settings.ApprovalsRequiredForAllowance = settingsDto.ApprovalsRequiredForAllowance;
                if (settingsDto.PoGenerationDate.HasValue)
                    settings.PoGenerationDate = settingsDto.PoGenerationDate;
                if (settingsDto.InvoiceGenerationDate.HasValue)
                    settings.InvoiceGenerationDate = settingsDto.InvoiceGenerationDate;

                var updated = await _appSettingsService.UpdateAppSettingsAsync(settings);

                return Ok(new
                {
                    message = "Settings updated successfully",
                    approvalsRequiredForAllowance = updated.ApprovalsRequiredForAllowance,
                    poGenerationDate = updated.PoGenerationDate,
                    invoiceGenerationDate = updated.InvoiceGenerationDate
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
