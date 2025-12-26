using System.Net;
using System.Net.Mail;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class EmailService : IEmailService
    {
        private readonly IAppSettingsService _settingsService;
        private readonly IExportHeaderService _exportHeaderService;
        private readonly ILogger<EmailService> _logger;

        public EmailService(
            IAppSettingsService settingsService,
            IExportHeaderService exportHeaderService,
            ILogger<EmailService> logger)
        {
            _settingsService = settingsService;
            _exportHeaderService = exportHeaderService;
            _logger = logger;
        }

        public async Task<bool> SendOtpEmailAsync(string recipientEmail, string otp)
        {
            try
            {
                var settings = await _settingsService.GetAppSettingsAsync();
                if (settings == null || string.IsNullOrEmpty(settings.SmtpHost))
                {
                    _logger.LogWarning("SMTP settings not configured");
                    return false;
                }

                var exportHeader = await _exportHeaderService.GetExportHeaderAsync();
                var fromName = settings.FromName ?? exportHeader?.CompanyName ?? "Support";

                var subject = $"{fromName} — Your One‑Time Password (OTP)";
                var html = await BuildOtpEmailHtmlAsync(otp, exportHeader, fromName);

                return (await SendEmailAsync(recipientEmail, subject, html)).success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending OTP email");
                return false;
            }
        }

        private async Task<string> BuildOtpEmailHtmlAsync(string otp, ExportHeader? exportHeader, string? fromName)
        {
            return $@"
                <div style=""font-family: Arial, sans-serif; color: #111;"">
                    <div style=""max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;"">
                        <h2 style=""margin:0 0 10px 0;"">{fromName ?? "Support"}</h2>
                        <p style=""margin:0 0 20px 0;color:#555;"">You've requested a one-time password to reset your password. Use the code below within <strong>10 minutes</strong>.</p>
                        <div style=""text-align:center;margin:20px 0;"">
                            <span style=""display:inline-block;padding:14px 20px;font-size:20px;letter-spacing:4px;background:#f4f4f6;border-radius:6px;border:1px solid #e6e6ea;""><strong>{otp}</strong></span>
                        </div>
                        <p style=""color:#666;font-size:13px;line-height:1.4;"">For your security, do not share this code with anyone. If you did not request this, please ignore this message or contact us.</p>
                        <hr style=""border:none;border-top:1px solid #eee;margin:20px 0;"" />
                        <div style=""font-size:12px;color:#888;"">
                            {(exportHeader?.CompanyName != null ? $"<div><strong>{exportHeader.CompanyName}</strong></div>" : "")}
                            {(exportHeader?.Address != null ? $"<div>{exportHeader.Address}</div>" : "")}
                            {(exportHeader?.Website != null ? "<div><a href='" + exportHeader.Website + "'>" + exportHeader.Website + "</a></div>" : "")}
                            {(exportHeader?.ContactEmail != null || exportHeader?.ContactPhone != null ? "<div>" + exportHeader.ContactEmail + (exportHeader.ContactPhone != null ? " • " + exportHeader.ContactPhone : "") + "</div>" : "")}
                            <div style=""margin-top:8px;"">This message was sent from the system on behalf of {fromName ?? "Support"}.</div>
                        </div>
                    </div>
                </div>
            ";
        }

        public async Task<(bool success, string? messageId)> SendEmailAsync(string to, string subject, string body)
        {
            try
            {
                var settings = await _settingsService.GetAppSettingsAsync();
                if (settings == null || string.IsNullOrEmpty(settings.SmtpHost))
                {
                    _logger.LogWarning("SMTP settings not configured");
                    return (false, null);
                }

                using (var client = new SmtpClient())
                {
                    client.Host = settings.SmtpHost;
                    client.Port = settings.SmtpPort ?? 587;
                    client.EnableSsl = settings.SmtpSecure;
                    client.Timeout = 10000;

                    if (!string.IsNullOrEmpty(settings.SmtpUser) && !string.IsNullOrEmpty(settings.SmtpPass))
                    {
                        client.Credentials = new NetworkCredential(settings.SmtpUser, settings.SmtpPass);
                    }

                    using (var message = new MailMessage())
                    {
                        message.From = new MailAddress(settings.FromEmail ?? "noreply@example.com", settings.FromName ?? "System");
                        message.To.Add(to);
                        message.Subject = subject;
                        message.Body = body;
                        message.IsBodyHtml = true;

                        await client.SendMailAsync(message);
                        _logger.LogInformation($"Email sent to {to}");
                        return (true, Guid.NewGuid().ToString());
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending email to {to}");
                return (false, null);
            }
        }
    }
}
