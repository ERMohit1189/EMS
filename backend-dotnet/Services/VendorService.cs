using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class VendorService : IVendorService
    {
        private readonly AppDbContext _context;

        public VendorService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<VendorDto?> GetVendorByIdAsync(string id)
        {
            var vendor = await _context.Vendors
                .Include(v => v.PurchaseOrders)
                .Include(v => v.Invoices)
                .Include(v => v.Sites)
                .FirstOrDefaultAsync(v => v.Id == id);

            if (vendor == null) return null;

            return new VendorDto
            {
                Id = vendor.Id,
                VendorCode = vendor.VendorCode,
                Name = vendor.Name,
                Email = vendor.Email,
                Mobile = vendor.Mobile,
                Address = vendor.Address,
                City = vendor.City,
                State = vendor.State,
                Pincode = vendor.Pincode,
                Country = vendor.Country,
                Category = vendor.Category,
                Status = vendor.Status,
                Aadhar = vendor.Aadhar,
                AadharDoc = vendor.AadharDoc,
                PAN = vendor.PAN,
                PANDoc = vendor.PANDoc,
                GSTIN = vendor.GSTIN,
                GSTINDoc = vendor.GSTINDoc,
                MOA = vendor.MOA,
                MOADoc = vendor.MOADoc,
                IsUsed = vendor.PurchaseOrders.Any() || vendor.Invoices.Any() || vendor.Sites.Any()
            };
        }

        public async Task<List<VendorDto>> GetAllVendorsAsync()
        {
            var vendors = await _context.Vendors.ToListAsync();

            return vendors.Select(v => new VendorDto
            {
                Id = v.Id,
                VendorCode = v.VendorCode,
                Name = v.Name,
                Email = v.Email,
                Mobile = v.Mobile,
                Address = v.Address,
                City = v.City,
                State = v.State,
                Pincode = v.Pincode,
                Country = v.Country,
                Category = v.Category,
                Status = v.Status,
                Aadhar = v.Aadhar,
                AadharDoc = v.AadharDoc,
                PAN = v.PAN,
                PANDoc = v.PANDoc,
                GSTIN = v.GSTIN,
                GSTINDoc = v.GSTINDoc,
                MOA = v.MOA,
                MOADoc = v.MOADoc,
                IsUsed = v.Sites.Any() || v.PurchaseOrders.Any() || v.Invoices.Any()
            }).ToList();
        }

        public async Task<(List<VendorDto> vendors, int totalCount)> GetVendorsPagedAsync(int page, int pageSize, string? status = null)
        {
            var query = _context.Vendors.AsQueryable();

            if (!string.IsNullOrEmpty(status) && status != "All")
            {
                query = query.Where(v => v.Status == status);
            }

            var totalCount = await query.CountAsync();

            var vendors = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var vendorDtos = vendors.Select(v => new VendorDto
            {
                Id = v.Id,
                VendorCode = v.VendorCode,
                Name = v.Name,
                Email = v.Email,
                Mobile = v.Mobile,
                City = v.City,
                State = v.State,
                Category = v.Category,
                Status = v.Status,
                Aadhar = v.Aadhar,
                AadharDoc = v.AadharDoc,
                PAN = v.PAN,
                PANDoc = v.PANDoc,
                GSTIN = v.GSTIN,
                GSTINDoc = v.GSTINDoc,
                MOA = v.MOA,
                MOADoc = v.MOADoc,
                IsUsed = v.Sites.Any() || v.PurchaseOrders.Any() || v.Invoices.Any()
            }).ToList();

            return (vendorDtos, totalCount);
        }

        public async Task<bool> UpdateVendorStatusAsync(string id, string status)
        {
            var vendor = await _context.Vendors.FindAsync(id);
            if (vendor == null) return false;

            vendor.Status = status;
            vendor.UpdatedAt = DateTime.UtcNow;
            _context.Vendors.Update(vendor);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<Vendor> CreateVendorAsync(CreateVendorDto dto, Microsoft.AspNetCore.Http.IFormCollection? form = null)
        {
            System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Starting vendor creation");
            System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Name: {dto.Name}");
            System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Email: {dto.Email}");
            System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Mobile: {dto.Mobile}");
            System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Address: {dto.Address}");
            System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] City: {dto.City}");
            System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] State: {dto.State}");
            System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Category: {dto.Category}");

            // Validate duplicate email
            if (!string.IsNullOrWhiteSpace(dto.Email))
            {
                var existingEmailVendor = await _context.Vendors
                    .FirstOrDefaultAsync(v => v.Email.ToLower() == dto.Email.ToLower());

                if (existingEmailVendor != null)
                {
                    System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Email already exists: {dto.Email}");
                    throw new Exception($"Email '{dto.Email}' already exists in the system. Please use a different email address.");
                }
            }

            // Validate duplicate mobile
            if (!string.IsNullOrWhiteSpace(dto.Mobile))
            {
                var existingMobileVendor = await _context.Vendors
                    .FirstOrDefaultAsync(v => v.Mobile != null && v.Mobile == dto.Mobile);

                if (existingMobileVendor != null)
                {
                    System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Mobile already exists: {dto.Mobile}");
                    throw new Exception($"Mobile number '{dto.Mobile}' is already registered with another vendor. Please use a different mobile number.");
                }
            }

            // Generate incremental VendorCode starting from 1001
            int nextVendorCodeNumber = 1001;

            // Get the highest numeric vendor code from database
            var existingVendors = await _context.Vendors
                .Where(v => !string.IsNullOrEmpty(v.VendorCode))
                .ToListAsync();

            if (existingVendors.Count > 0)
            {
                // Extract numeric codes and find the maximum
                var numericCodes = existingVendors
                    .Where(v => int.TryParse(v.VendorCode, out _))
                    .Select(v => int.Parse(v.VendorCode))
                    .OrderByDescending(x => x)
                    .FirstOrDefault();

                if (numericCodes > 0)
                {
                    nextVendorCodeNumber = numericCodes + 1;
                }
                else
                {
                    nextVendorCodeNumber = 1001;
                }
            }

            string vendorCode = nextVendorCodeNumber.ToString();

            System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Generated VendorCode: {vendorCode}");

            var vendor = new Vendor
            {
                VendorCode = vendorCode,
                Name = dto.Name,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Mobile = dto.Mobile,
                Address = dto.Address,
                City = dto.City,
                State = dto.State,
                Pincode = dto.Pincode,
                Aadhar = dto.Aadhar,
                PAN = dto.Pan,
                GSTIN = dto.GSTIN,
                MOA = dto.MOA,
                Category = dto.Category ?? "Individual",
                Country = dto.Country ?? "India"
            };

            System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Vendor object created with ID: {vendor.Id}, VendorCode: {vendor.VendorCode}");

            // Handle file uploads if form data is provided
            if (form != null && form.Files.Count > 0)
            {
                System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Processing {form.Files.Count} files");

                var aadharFile = form.Files["aadharFile"];
                if (aadharFile != null && aadharFile.Length > 0)
                {
                    System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Processing aadharFile: {aadharFile.FileName} ({aadharFile.Length} bytes)");
                    var savedPath = await SaveFileAsync(aadharFile, null);
                    if (savedPath != null)
                    {
                        vendor.AadharDoc = savedPath;
                        System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Aadhar file saved: {savedPath}");
                    }
                    else
                    {
                        System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Failed to save aadhar file");
                    }
                }

                var panFile = form.Files["panFile"];
                if (panFile != null && panFile.Length > 0)
                {
                    System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Processing panFile: {panFile.FileName} ({panFile.Length} bytes)");
                    var savedPath = await SaveFileAsync(panFile, null);
                    if (savedPath != null)
                    {
                        vendor.PANDoc = savedPath;
                        System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] PAN file saved: {savedPath}");
                    }
                    else
                    {
                        System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Failed to save PAN file");
                    }
                }

                var gstinFile = form.Files["gstinFile"];
                if (gstinFile != null && gstinFile.Length > 0)
                {
                    System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Processing gstinFile: {gstinFile.FileName} ({gstinFile.Length} bytes)");
                    var savedPath = await SaveFileAsync(gstinFile, null);
                    if (savedPath != null)
                    {
                        vendor.GSTINDoc = savedPath;
                        System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] GSTIN file saved: {savedPath}");
                    }
                    else
                    {
                        System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Failed to save GSTIN file");
                    }
                }
            }
            else
            {
                System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] No files to process. Form is {(form == null ? "null" : "not null")}, Files count: {form?.Files.Count ?? 0}");
            }

            _context.Vendors.Add(vendor);
            try
            {
                await _context.SaveChangesAsync();
                System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Vendor saved to database successfully. ID: {vendor.Id}");
                return vendor;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Database save error: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Inner exception: {ex.InnerException?.Message}");
                System.Diagnostics.Debug.WriteLine($"[CreateVendorAsync] Stack trace: {ex.StackTrace}");
                throw new Exception($"Failed to create vendor: {ex.Message} - {ex.InnerException?.Message}", ex);
            }
        }

        public async Task<Vendor?> UpdateVendorAsync(string id, UpdateVendorDto dto, Microsoft.AspNetCore.Http.IFormCollection? form = null)
        {
            var vendor = await _context.Vendors.FindAsync(id);
            if (vendor == null) return null;

            // Validate duplicate email (only if email is being changed)
            if (!string.IsNullOrWhiteSpace(dto.Name) && dto.Name != vendor.Name)
            {
                // Check if any other vendor has the same email (case-insensitive)
                var existingEmailVendor = await _context.Vendors
                    .FirstOrDefaultAsync(v => v.Id != id && v.Email.ToLower() == vendor.Email.ToLower());

                if (existingEmailVendor != null)
                {
                    System.Diagnostics.Debug.WriteLine($"[UpdateVendorAsync] Email already exists: {vendor.Email}");
                    throw new Exception($"Email '{vendor.Email}' is already registered with another vendor.");
                }
            }

            // Validate duplicate mobile (only if mobile is being changed)
            if (!string.IsNullOrWhiteSpace(dto.Mobile) && dto.Mobile != vendor.Mobile)
            {
                var existingMobileVendor = await _context.Vendors
                    .FirstOrDefaultAsync(v => v.Id != id && v.Mobile != null && v.Mobile == dto.Mobile);

                if (existingMobileVendor != null)
                {
                    System.Diagnostics.Debug.WriteLine($"[UpdateVendorAsync] Mobile already exists: {dto.Mobile}");
                    throw new Exception($"Mobile number '{dto.Mobile}' is already registered with another vendor. Please use a different mobile number.");
                }
            }

            vendor.Name = dto.Name ?? vendor.Name;
            vendor.Mobile = dto.Mobile ?? vendor.Mobile;
            vendor.Address = dto.Address ?? vendor.Address;
            vendor.City = dto.City ?? vendor.City;
            vendor.State = dto.State ?? vendor.State;
            vendor.Pincode = dto.Pincode ?? vendor.Pincode;
            vendor.Country = dto.Country ?? vendor.Country;
            vendor.Aadhar = dto.Aadhar ?? vendor.Aadhar;
            vendor.PAN = dto.Pan ?? vendor.PAN;
            vendor.GSTIN = dto.Gstin ?? vendor.GSTIN;
            vendor.MOA = dto.Moa ?? vendor.MOA;
            vendor.Category = dto.Category ?? vendor.Category;

            // Handle file uploads if form data is provided
            if (form != null && form.Files.Count > 0)
            {
                var aadharFile = form.Files["aadharFile"];
                if (aadharFile != null && aadharFile.Length > 0)
                {
                    var savedPath = await SaveFileAsync(aadharFile, vendor.AadharDoc);
                    if (savedPath != null) vendor.AadharDoc = savedPath;
                }

                var panFile = form.Files["panFile"];
                if (panFile != null && panFile.Length > 0)
                {
                    var savedPath = await SaveFileAsync(panFile, vendor.PANDoc);
                    if (savedPath != null) vendor.PANDoc = savedPath;
                }

                var gstinFile = form.Files["gstinFile"];
                if (gstinFile != null && gstinFile.Length > 0)
                {
                    var savedPath = await SaveFileAsync(gstinFile, vendor.GSTINDoc);
                    if (savedPath != null) vendor.GSTINDoc = savedPath;
                }

                var moaFile = form.Files["moaFile"];
                if (moaFile != null && moaFile.Length > 0)
                {
                    var savedPath = await SaveFileAsync(moaFile, vendor.MOADoc);
                    if (savedPath != null) vendor.MOADoc = savedPath;
                }
            }

            vendor.UpdatedAt = DateTime.UtcNow;

            _context.Vendors.Update(vendor);
            await _context.SaveChangesAsync();
            return vendor;
        }

        private async Task<string?> SaveFileAsync(Microsoft.AspNetCore.Http.IFormFile? file, string? existingPath)
        {
            if (file == null || file.Length == 0)
            {
                System.Diagnostics.Debug.WriteLine("SaveFileAsync: File is null or empty");
                return null;
            }

            try
            {
                // Create uploads directory if it doesn't exist
                string uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                if (!Directory.Exists(uploadsDir))
                {
                    Directory.CreateDirectory(uploadsDir);
                    System.Diagnostics.Debug.WriteLine($"Created uploads directory: {uploadsDir}");
                }

                // Sanitize filename and generate unique name
                string fileExtension = Path.GetExtension(file.FileName);
                string fileName = $"{Guid.NewGuid()}{fileExtension}";
                string filePath = Path.Combine(uploadsDir, fileName);

                System.Diagnostics.Debug.WriteLine($"Saving file: {file.FileName} as {fileName} to {filePath}");

                // Save file
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Verify file was saved
                if (File.Exists(filePath))
                {
                    System.Diagnostics.Debug.WriteLine($"File saved successfully: {fileName}");
                    return fileName;
                }

                System.Diagnostics.Debug.WriteLine($"File was not saved to disk: {filePath}");
                return null;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error saving file {file.FileName}: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack trace: {ex.StackTrace}");
                return null;
            }
        }

        public async Task<bool> DeleteVendorAsync(string id)
        {
            var vendor = await _context.Vendors.FindAsync(id);
            if (vendor == null) return false;

            _context.Vendors.Remove(vendor);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ChangePasswordAsync(string id, string oldPassword, string newPassword)
        {
            var vendor = await _context.Vendors.FindAsync(id);
            if (vendor == null) return false;

            if (!BCrypt.Net.BCrypt.Verify(oldPassword, vendor.PasswordHash))
                return false;

            vendor.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            _context.Vendors.Update(vendor);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> CheckEmailExistsAsync(string email)
        {
            return await _context.Vendors.AnyAsync(v => v.Email == email);
        }

        public async Task<List<string>> CheckMissingVendorsAsync(List<string> vendorCodes)
        {
            if (vendorCodes == null || vendorCodes.Count == 0)
                return new List<string>();

            var existingVendors = await _context.Vendors
                .Where(v => vendorCodes.Contains(v.VendorCode))
                .Select(v => v.VendorCode)
                .ToListAsync();

            var missing = vendorCodes
                .Where(code => !existingVendors.Contains(code))
                .ToList();

            return missing;
        }

        public async Task<List<VendorRegistrationBackend.DTOs.BatchCreateVendorResultDto>> BatchCreateVendorsAsync(List<VendorRegistrationBackend.DTOs.VendorCodeInfo> vendors)
        {
            if (vendors == null || vendors.Count == 0)
                return new List<VendorRegistrationBackend.DTOs.BatchCreateVendorResultDto>();

            // Prepare vendor records with placeholder data
            var vendorRecords = vendors
                .Where(v => !string.IsNullOrEmpty(v.Code))
                .Select(v => new Vendor
                {
                    Id = Guid.NewGuid().ToString(),
                    VendorCode = v.Code,
                    Name = v.Name ?? v.Code,  // Use provided name, fallback to code
                    Email = $"{v.Code.Replace(" ", "").ToLower()}{Guid.NewGuid().ToString().Substring(0, 6)}@vendor.local",
                    Mobile = v.Code,
                    Address = "Pending Registration",
                    City = "N/A",
                    State = "N/A",
                    Pincode = string.Empty,
                    Country = "India",
                    Category = "Individual",
                    Status = "Pending",
                    Role = "Vendor",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(v.Code) // Use code as temporary password
                })
                .ToList();

            if (vendorRecords.Count == 0)
                return new List<VendorRegistrationBackend.DTOs.BatchCreateVendorResultDto>();

            // Add all vendors in single batch insert
            _context.Vendors.AddRange(vendorRecords);
            await _context.SaveChangesAsync();

            // Return the created vendors
            var results = vendorRecords.Select(v => new VendorRegistrationBackend.DTOs.BatchCreateVendorResultDto
            {
                Code = v.VendorCode,
                Id = v.Id,
                Name = v.Name
            }).ToList();

            return results;
        }

        public async Task<Dictionary<string, string>> GetVendorCodeMappingAsync(List<VendorRegistrationBackend.DTOs.VendorCodeInfo> vendors)
        {
            var mapping = new Dictionary<string, string>();

            if (vendors == null || vendors.Count == 0)
                return mapping;

            // Extract codes
            var codes = vendors
                .Where(v => !string.IsNullOrEmpty(v.Code))
                .Select(v => v.Code)
                .ToList();

            if (codes.Count == 0)
                return mapping;

            // Get all vendors with these codes in single batch query
            var vendorRecords = await _context.Vendors
                .Where(v => codes.Contains(v.VendorCode))
                .Select(v => new { v.VendorCode, v.Id })
                .ToListAsync();

            // Build mapping object
            foreach (var vendor in vendorRecords)
            {
                if (!string.IsNullOrEmpty(vendor.VendorCode))
                {
                    mapping[vendor.VendorCode] = vendor.Id;
                }
            }

            return mapping;
        }

        public async Task<List<VendorRegistrationBackend.DTOs.BatchCreateVendorResultDto>> BatchFindOrCreateVendorsAsync(List<VendorRegistrationBackend.DTOs.VendorCodeInfo> vendors)
        {
            var results = new List<VendorRegistrationBackend.DTOs.BatchCreateVendorResultDto>();

            if (vendors == null || vendors.Count == 0)
                return results;

            // Extract codes and filter out empty ones
            var vendorCodes = vendors
                .Where(v => !string.IsNullOrEmpty(v.Code))
                .Select(v => v.Code)
                .ToList();

            if (vendorCodes.Count == 0)
                return results;

            // Find all existing vendors by code (single query)
            var existingVendors = await _context.Vendors
                .Where(v => vendorCodes.Contains(v.VendorCode))
                .ToListAsync();

            // Determine which vendors need to be created
            var existingCodes = new HashSet<string>(existingVendors.Select(v => v.VendorCode));
            var vendorsToCreate = vendors
                .Where(v => !string.IsNullOrEmpty(v.Code) && !existingCodes.Contains(v.Code))
                .Select(v => new Vendor
                {
                    Id = Guid.NewGuid().ToString(),
                    VendorCode = v.Code,
                    Name = v.Name ?? v.Code,
                    Email = $"{v.Code.Replace(" ", "").ToLower()}{Guid.NewGuid().ToString().Substring(0, 6)}@vendor.local",
                    Mobile = v.Code,
                    Address = "Pending Registration",
                    City = "N/A",
                    State = "N/A",
                    Pincode = string.Empty,
                    Country = "India",
                    Category = "Individual",
                    Status = "Pending",
                    Role = "Vendor",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(v.Code)
                })
                .ToList();

            // Create missing vendors if any
            if (vendorsToCreate.Count > 0)
            {
                _context.Vendors.AddRange(vendorsToCreate);
                await _context.SaveChangesAsync();
            }

            // Combine results from existing + newly created vendors
            var allVendors = new List<Vendor>();
            allVendors.AddRange(existingVendors);
            allVendors.AddRange(vendorsToCreate);

            // Return results
            results = allVendors.Select(v => new VendorRegistrationBackend.DTOs.BatchCreateVendorResultDto
            {
                Code = v.VendorCode,
                Id = v.Id,
                Name = v.Name
            }).ToList();

            return results;
        }

        public async Task<List<VendorRateDto>> GetVendorRatesAsync(string vendorId)
        {
            try
            {
                var rates = await _context.VendorRates
                    .Where(r => r.VendorId == vendorId)
                    .OrderBy(r => r.AntennaSize)
                    .ToListAsync();

                return rates.Select(r => new VendorRateDto
                {
                    AntennaSize = r.AntennaSize,
                    VendorAmount = r.Rate
                }).ToList();
            }
            catch (Exception)
            {
                return new List<VendorRateDto>();
            }
        }

        public async Task<VendorRateDto> AddVendorRateAsync(string vendorId, string antennaSize, decimal vendorAmount)
        {
            try
            {
                // Check if vendor exists
                var vendor = await _context.Vendors.FindAsync(vendorId);
                if (vendor == null)
                    throw new Exception("Vendor not found");

                // Delete existing rate with same antenna size
                var existingRate = await _context.VendorRates
                    .FirstOrDefaultAsync(r => r.VendorId == vendorId && r.AntennaSize == antennaSize);

                if (existingRate != null)
                {
                    _context.VendorRates.Remove(existingRate);
                    await _context.SaveChangesAsync();
                }

                // Create new rate
                var newRate = new VendorRate
                {
                    Id = Guid.NewGuid().ToString(),
                    VendorId = vendorId,
                    AntennaSize = antennaSize,
                    Rate = vendorAmount,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.VendorRates.Add(newRate);
                await _context.SaveChangesAsync();

                return new VendorRateDto
                {
                    AntennaSize = newRate.AntennaSize,
                    VendorAmount = newRate.Rate
                };
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to add vendor rate: {ex.Message}");
            }
        }

        public async Task<bool> DeleteVendorRateAsync(string vendorId, string antennaSize)
        {
            try
            {
                var rate = await _context.VendorRates
                    .FirstOrDefaultAsync(r => r.VendorId == vendorId && r.AntennaSize == antennaSize);

                if (rate == null)
                    return false;

                _context.VendorRates.Remove(rate);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public async Task<(string Password, string Message)> GenerateVendorPasswordAsync(string vendorId)
        {
            try
            {
                var vendor = await _context.Vendors.FindAsync(vendorId);
                if (vendor == null)
                    throw new Exception("Vendor not found");

                // Generate random temporary password
                var tempPassword = GenerateRandomPassword();

                // Hash and update password
                vendor.PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword);
                vendor.UpdatedAt = DateTime.UtcNow;

                _context.Vendors.Update(vendor);
                await _context.SaveChangesAsync();

                return (tempPassword, $"Password generated successfully for {vendor.Name}");
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to generate password: {ex.Message}");
            }
        }

        private string GenerateRandomPassword(int length = 12)
        {
            const string validChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
            var random = new Random();
            var password = new System.Text.StringBuilder();

            for (int i = 0; i < length; i++)
            {
                password.Append(validChars[random.Next(validChars.Length)]);
            }

            return password.ToString();
        }
    }
}
