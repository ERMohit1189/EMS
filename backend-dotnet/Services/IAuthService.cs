using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services;

public interface IAuthService {
    Task<Employee?> AuthenticateAsync(string email, string password);
    Task<string> CreateSessionAsync(Employee employee);
    Task DestroySessionAsync(string sid);
}