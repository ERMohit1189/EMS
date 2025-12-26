using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class EmailSettingsController : ControllerBase
    {
        private readonly IAppSettingsService _appSettingsService;
        private readonly IExportHeaderService _exportHeaderService;
        private readonly IEmailService _emailService;
        private readonly ILogger<EmailSettingsController> _logger;

        public EmailSettingsController(
            IAppSettingsService appSettingsService,
            IExportHeaderService exportHeaderService,
            IEmailService emailService,
            ILogger<EmailSettingsController> logger)
        {
            _appSettingsService = appSettingsService;
            _exportHeaderService = exportHeaderService;
            _emailService = emailService;
            _logger = logger;
        }

        /// <summary>
        /// GET /api/admin/email-settings - Get current email settings (Superadmin only)
        /// Returns SMTP configuration with password masked as '*****'
        /// </summary>
        [HttpGet("email-settings")]
        [Authorize]
        public async Task<IActionResult> GetEmailSettings()
        {
            try
            {
                // Debug: Log all claims
                var allClaims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();
                _logger.LogInformation($"All claims: {string.Join(", ", allClaims.Select(c => $"{c.Type}={c.Value}"))}");

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                _logger.LogInformation($"Authenticated user ID: {userId}");

                // Check if user is superadmin - try multiple claim types
                var role = User.FindFirst("Role")?.Value
                    ?? User.FindFirst(ClaimTypes.Role)?.Value
                    ?? User.FindFirstValue("role");

                _logger.LogInformation($"Role check - Found role: '{role}'");

                if (string.IsNullOrEmpty(role) || (role.ToLower() != "superadmin" && role.ToLower() != "admin"))
                {
                    _logger.LogWarning($"Unauthorized access attempt - Role: '{role}' (not superadmin/admin)");
                    return Unauthorized(new { error = $"Insufficient permissions. Role: {role}" });
                }

                var settings = await _appSettingsService.GetAppSettingsAsync();

                var response = new
                {
                    success = true,
                    settings = new
                    {
                        smtpHost = settings?.SmtpHost,
                        smtpPort = settings?.SmtpPort,
                        smtpUser = settings?.SmtpUser,
                        smtpPass = !string.IsNullOrEmpty(settings?.SmtpPass) ? "*****" : null,
                        smtpSecure = settings?.SmtpSecure ?? false,
                        fromEmail = settings?.FromEmail,
                        fromName = settings?.FromName
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching email settings");
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/admin/email-settings - Update email settings (Superadmin only)
        /// </summary>
        [HttpPost("email-settings")]
        [Authorize]
        public async Task<IActionResult> UpdateEmailSettings([FromBody] EmailSettingsDto settingsDto)
        {
            try
            {
                // Debug: Log all claims
                var allClaims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();
                _logger.LogInformation($"All claims: {string.Join(", ", allClaims.Select(c => $"{c.Type}={c.Value}"))}");

                // Check if user is superadmin - try multiple claim types
                var role = User.FindFirst("Role")?.Value
                    ?? User.FindFirst(ClaimTypes.Role)?.Value
                    ?? User.FindFirstValue("role");

                if (string.IsNullOrEmpty(role) || (role.ToLower() != "superadmin" && role.ToLower() != "admin"))
                {
                    _logger.LogWarning($"Unauthorized update attempt - Role: '{role}'");
                    return Unauthorized(new { error = "You must be logged in as a superadmin to access this resource" });
                }

                if (settingsDto == null)
                {
                    return BadRequest(new { error = "Settings data is required" });
                }

                // Get existing settings or create new
                var existing = await _appSettingsService.GetAppSettingsAsync();
                var settings = existing ?? new AppSettings();

                // Update only provided fields (empty string means null)
                if (settingsDto.SmtpHost != null)
                    settings.SmtpHost = settingsDto.SmtpHost == "" ? null : settingsDto.SmtpHost;
                if (settingsDto.SmtpPort.HasValue)
                    settings.SmtpPort = settingsDto.SmtpPort;
                if (settingsDto.SmtpUser != null)
                    settings.SmtpUser = settingsDto.SmtpUser == "" ? null : settingsDto.SmtpUser;
                // Only update password if explicitly provided and not the masked placeholder
                if (settingsDto.SmtpPass != null && settingsDto.SmtpPass != "" && settingsDto.SmtpPass != "*****")
                    settings.SmtpPass = settingsDto.SmtpPass;
                settings.SmtpSecure = settingsDto.SmtpSecure;
                if (settingsDto.FromEmail != null)
                    settings.FromEmail = settingsDto.FromEmail == "" ? null : settingsDto.FromEmail;
                if (settingsDto.FromName != null)
                    settings.FromName = settingsDto.FromName == "" ? null : settingsDto.FromName;

                var updated = await _appSettingsService.UpdateAppSettingsAsync(settings);

                var response = new
                {
                    success = true,
                    settings = new
                    {
                        smtpHost = updated.SmtpHost,
                        smtpPort = updated.SmtpPort,
                        smtpUser = updated.SmtpUser,
                        smtpPass = !string.IsNullOrEmpty(updated.SmtpPass) ? "*****" : null,
                        smtpSecure = updated.SmtpSecure,
                        fromEmail = updated.FromEmail,
                        fromName = updated.FromName
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating email settings");
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/admin/email-settings/test - Send test email (Superadmin only)
        /// </summary>
        [HttpPost("email-settings/test")]
        [Authorize]
        public async Task<IActionResult> TestEmailSettings([FromBody] EmailTestRequestDto request)
        {
            try
            {
                // Debug: Log all claims
                var allClaims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();
                _logger.LogInformation($"All claims: {string.Join(", ", allClaims.Select(c => $"{c.Type}={c.Value}"))}");

                // Check if user is superadmin - try multiple claim types
                var role = User.FindFirst("Role")?.Value
                    ?? User.FindFirst(ClaimTypes.Role)?.Value
                    ?? User.FindFirstValue("role");

                if (string.IsNullOrEmpty(role) || (role.ToLower() != "superadmin" && role.ToLower() != "admin"))
                {
                    _logger.LogWarning($"Unauthorized test attempt - Role: '{role}'");
                    return Unauthorized(new { error = "You must be logged in as a superadmin to access this resource" });
                }

                if (string.IsNullOrEmpty(request?.To))
                {
                    return BadRequest(new { error = "Recipient email (to) is required" });
                }

                // Generate test OTP
                var testOtp = Math.Floor(100000 + Random.Shared.NextDouble() * 900000).ToString("F0");

                var settings = await _appSettingsService.GetAppSettingsAsync();
                var exportHeader = await _exportHeaderService.GetExportHeaderAsync();

                var fromName = settings?.FromName ?? exportHeader?.CompanyName ?? "Support";
                var subject = $"{fromName} — Your One‑Time Password (OTP)";

                // Build HTML email with company branding from ExportHeader
                var html = $@"
                    <div style=""font-family: Arial, sans-serif; color: #111;"">
                        <div style=""max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;"">
                            <h2 style=""margin:0 0 10px 0;"">{fromName}</h2>
                            <p style=""margin:0 0 20px 0;color:#555;"">You've requested a one-time password to reset your password. Use the code below within <strong>10 minutes</strong>.</p>
                            <div style=""text-align:center;margin:20px 0;"">
                                <span style=""display:inline-block;padding:14px 20px;font-size:20px;letter-spacing:4px;background:#f4f4f6;border-radius:6px;border:1px solid #e6e6ea;""><strong>{testOtp}</strong></span>
                            </div>
                            <p style=""color:#666;font-size:13px;line-height:1.4;"">For your security, do not share this code with anyone. If you did not request this, please ignore this message or contact us.</p>
                            <hr style=""border:none;border-top:1px solid #eee;margin:20px 0;"" />
                            <div style=""font-size:12px;color:#888;"">
                                {(exportHeader?.CompanyName != null ? $"<div><strong>{exportHeader.CompanyName}</strong></div>" : "")}
                                {(exportHeader?.Address != null ? $"<div>{exportHeader.Address}</div>" : "")}
                                {(exportHeader?.Website != null ? $"<div><a href=\"{exportHeader.Website}\">{exportHeader.Website}</a></div>" : "")}
                                {(exportHeader?.ContactEmail != null || exportHeader?.ContactPhone != null ? $"<div>{exportHeader.ContactEmail}{(exportHeader.ContactPhone != null ? $" • {exportHeader.ContactPhone}" : "")}</div>" : "")}
                                <div style=""margin-top:8px;"">This message was sent from the system on behalf of {fromName}.</div>
                            </div>
                        </div>
                    </div>
                ";

                // Send test email
                var (success, messageId) = await _emailService.SendEmailAsync(request.To, subject, html);

                if (!success)
                {
                    return BadRequest(new { error = "Failed to send test email. Check SMTP settings." });
                }

                var response = new
                {
                    success = true,
                    messageId = messageId,
                    message = $"Test email sent to {request.To}",
                    settings = new
                    {
                        host = settings?.SmtpHost,
                        port = settings?.SmtpPort,
                        user = !string.IsNullOrEmpty(settings?.SmtpUser) ? $"{settings.SmtpUser[..Math.Min(3, settings.SmtpUser.Length)]}*****" : null,
                        from = settings?.FromEmail,
                        fromName = settings?.FromName,
                        secure = settings?.SmtpSecure ?? false
                    },
                    preview = new
                    {
                        subject = subject,
                        text = $"Your OTP code is: {testOtp}\nThis code is valid for 10 minutes.",
                        html = html
                    },
                    company = new
                    {
                        companyName = exportHeader?.CompanyName,
                        address = exportHeader?.Address,
                        website = exportHeader?.Website,
                        contactEmail = exportHeader?.ContactEmail,
                        contactPhone = exportHeader?.ContactPhone
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing email settings");
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
