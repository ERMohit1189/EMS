using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public interface IVendorService
    {
        Task<VendorDto?> GetVendorByIdAsync(string id);
        Task<List<VendorDto>> GetAllVendorsAsync();
        Task<(List<VendorDto> vendors, int totalCount)> GetVendorsPagedAsync(int page, int pageSize, string? status = null);
        Task<Vendor> CreateVendorAsync(CreateVendorDto dto);
        Task<Vendor?> UpdateVendorAsync(string id, UpdateVendorDto dto);
        Task<bool> UpdateVendorStatusAsync(string id, string status);
        Task<bool> DeleteVendorAsync(string id);
        Task<bool> ChangePasswordAsync(string id, string oldPassword, string newPassword);
        Task<bool> CheckEmailExistsAsync(string email);
        Task<List<string>> CheckMissingVendorsAsync(List<string> vendorCodes);
        Task<List<VendorRegistrationBackend.DTOs.BatchCreateVendorResultDto>> BatchCreateVendorsAsync(List<VendorRegistrationBackend.DTOs.VendorCodeInfo> vendors);
        Task<Dictionary<string, string>> GetVendorCodeMappingAsync(List<VendorRegistrationBackend.DTOs.VendorCodeInfo> vendors);
        Task<List<VendorRegistrationBackend.DTOs.BatchCreateVendorResultDto>> BatchFindOrCreateVendorsAsync(List<VendorRegistrationBackend.DTOs.VendorCodeInfo> vendors);
        Task<List<VendorRegistrationBackend.DTOs.VendorRateDto>> GetVendorRatesAsync(string vendorId);
        Task<VendorRegistrationBackend.DTOs.VendorRateDto> AddVendorRateAsync(string vendorId, string antennaSize, decimal vendorAmount);
        Task<bool> DeleteVendorRateAsync(string vendorId, string antennaSize);
        Task<(string Password, string Message)> GenerateVendorPasswordAsync(string vendorId);
    }
}
