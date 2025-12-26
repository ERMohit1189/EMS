namespace VendorRegistrationBackend.Services
{
    public interface IEmailService
    {
        Task<bool> SendOtpEmailAsync(string recipientEmail, string otp);
        Task<(bool success, string? messageId)> SendEmailAsync(string to, string subject, string body);
    }
}
