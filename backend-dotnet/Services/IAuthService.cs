using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services;

public interface IAuthService {
    Task<Employee?> AuthenticateAsync(string email, string password);
    Task<Vendor?> AuthenticateVendorAsync(string email, string password);
    Task<string> CreateSessionAsync(Employee employee);
    Task<string> CreateVendorSessionAsync(Vendor vendor);
    Task DestroySessionAsync(string sid);
    string GenerateJwtToken(Employee employee, bool isReportingPerson = false, List<string>? reportingTeamIds = null);
    string GenerateVendorJwtToken(Vendor vendor);
}
