using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class EmployeeService : IEmployeeService
    {
        private readonly AppDbContext _context;

        public EmployeeService(AppDbContext context)
        {
            _context = context;
        }

        private string GetFullPhotoUrl(string? photoPath)
        {
            if (string.IsNullOrEmpty(photoPath))
            {
                Console.WriteLine("[EmployeeService] Photo path is empty");
                return null;
            }

            // If already a full URL, return as is
            if (photoPath.StartsWith("http://") || photoPath.StartsWith("https://"))
            {
                Console.WriteLine($"[EmployeeService] Photo is already full URL: {photoPath}");
                return photoPath;
            }

            // Construct full URL from relative path
            var baseUrl = "https://localhost:56184";
            var fullUrl = $"{baseUrl}{photoPath}";
            Console.WriteLine($"[EmployeeService] Photo path: {photoPath}");
            Console.WriteLine($"[EmployeeService] Full photo URL: {fullUrl}");
            return fullUrl;
        }

        public async Task<EmployeeDto?> GetEmployeeByIdAsync(string id)
        {
            var employee = await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Designation)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (employee == null) return null;

            return new EmployeeDto
            {
                Id = employee.Id,
                Name = employee.Name,
                Email = employee.Email,
                EmpCode = employee.EmpCode,
                DepartmentId = employee.DepartmentId,
                Department = employee.Department?.Name,
                DesignationId = employee.DesignationId,
                Designation = employee.Designation?.Name,
                Mobile = employee.Mobile,
                City = employee.City,
                Address = employee.Address,
                Status = employee.Status,
                FatherName = employee.FatherName,
                Doj = employee.DateOfJoining?.ToString("yyyy-MM-dd"),
                Role = employee.Role,
                DateOfBirth = employee.DateOfBirth?.ToString("yyyy-MM-dd"),
                AlternateNo = employee.AlternateNo,
                Aadhar = employee.Aadhar,
                PAN = employee.PAN,
                BloodGroup = employee.BloodGroup,
                MaritalStatus = employee.MaritalStatus,
                Nominee = employee.Nominee,
                PPEKit = employee.PPEKit,
                KitNo = employee.KitNo,
                State = employee.State,
                Country = employee.Country,
                Photo = GetFullPhotoUrl(employee.Photo)
            };
        }

        public async Task<List<EmployeeDto>> GetAllEmployeesAsync()
        {
            var employees = await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Designation)
                .ToListAsync();

            return employees.Select(e => new EmployeeDto
            {
                Id = e.Id,
                Name = e.Name,
                Email = e.Email,
                EmpCode = e.EmpCode,
                DepartmentId = e.DepartmentId,
                Department = e.Department?.Name,
                DesignationId = e.DesignationId,
                Designation = e.Designation?.Name,
                Mobile = e.Mobile,
                City = e.City,
                Address = e.Address,
                Status = e.Status,
                FatherName = e.FatherName,
                Doj = e.DateOfJoining != null ? e.DateOfJoining.Value.ToString("yyyy-MM-dd") : null,
                Role = e.Role,
                Photo = GetFullPhotoUrl(e.Photo)
            }).ToList();
        }

        public async Task<(List<EmployeeDto> employees, int totalCount)> GetEmployeesPagedAsync(int page, int pageSize)
        {
            var query = _context.Employees.AsQueryable();

            var totalCount = await query.CountAsync();

            var employees = await query
                .Include(e => e.Department)
                .Include(e => e.Designation)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var employeeDtos = employees.Select(e => new EmployeeDto
            {
                Id = e.Id,
                Name = e.Name,
                Email = e.Email,
                EmpCode = e.EmpCode,
                DepartmentId = e.DepartmentId,
                Department = e.Department?.Name,
                DesignationId = e.DesignationId,
                Designation = e.Designation?.Name,
                Mobile = e.Mobile,
                City = e.City,
                Status = e.Status,
                Role = e.Role,
                Photo = GetFullPhotoUrl(e.Photo)
            }).ToList();

            return (employeeDtos, totalCount);
        }

        public async Task<Employee> CreateEmployeeAsync(CreateEmployeeDto dto)
        {
            var employee = new Employee
            {
                Name = dto.Name,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                DepartmentId = dto.DepartmentId,
                DesignationId = dto.DesignationId,
                Mobile = dto.Mobile,
                Address = dto.Address,
                City = dto.City,
                State = dto.State,
                DateOfBirth = dto.DateOfBirth,
                FatherName = dto.FatherName,
                AlternateNo = dto.AlternateNo,
                Aadhar = dto.Aadhar,
                PAN = dto.PAN,
                BloodGroup = dto.BloodGroup,
                MaritalStatus = dto.MaritalStatus,
                Nominee = dto.Nominee,
                DateOfJoining = dto.DateOfJoining,
                EmpCode = GenerateEmpCode(),
                Role = dto.Role ?? "employee"
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();
            return employee;
        }

        public async Task<Employee?> UpdateEmployeeAsync(string id, UpdateEmployeeDto dto)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return null;

            // Update editable personal information fields
            if (!string.IsNullOrEmpty(dto.Name)) employee.Name = dto.Name;
            if (!string.IsNullOrEmpty(dto.Mobile)) employee.Mobile = dto.Mobile;
            if (!string.IsNullOrEmpty(dto.Address)) employee.Address = dto.Address;
            if (!string.IsNullOrEmpty(dto.City)) employee.City = dto.City;
            if (!string.IsNullOrEmpty(dto.State)) employee.State = dto.State;
            if (!string.IsNullOrEmpty(dto.Country)) employee.Country = dto.Country;
            if (dto.DateOfBirth.HasValue) employee.DateOfBirth = dto.DateOfBirth;
            if (!string.IsNullOrEmpty(dto.FatherName)) employee.FatherName = dto.FatherName;
            if (!string.IsNullOrEmpty(dto.AlternateNo)) employee.AlternateNo = dto.AlternateNo;
            if (!string.IsNullOrEmpty(dto.Aadhar)) employee.Aadhar = dto.Aadhar;
            if (!string.IsNullOrEmpty(dto.PAN)) employee.PAN = dto.PAN;
            if (!string.IsNullOrEmpty(dto.BloodGroup)) employee.BloodGroup = dto.BloodGroup;

            // PROTECTED FIELDS - Only update if explicitly provided (admin endpoints only)
            // These should NOT be null from /profile endpoint, only from /edit endpoint with explicit values
            if (!string.IsNullOrEmpty(dto.MaritalStatus)) employee.MaritalStatus = dto.MaritalStatus;
            if (!string.IsNullOrEmpty(dto.Nominee)) employee.Nominee = dto.Nominee;
            if (!string.IsNullOrEmpty(dto.DepartmentId)) employee.DepartmentId = dto.DepartmentId;
            if (!string.IsNullOrEmpty(dto.DesignationId)) employee.DesignationId = dto.DesignationId;
            if (dto.DateOfJoining.HasValue) employee.DateOfJoining = dto.DateOfJoining;
            if (!string.IsNullOrEmpty(dto.KitNo)) employee.KitNo = dto.KitNo;

            // Update role, status, ppekit and photo only if provided (preserves existing values)
            if (!string.IsNullOrEmpty(dto.Role)) employee.Role = dto.Role;
            if (dto.PPEKit.HasValue) employee.PPEKit = dto.PPEKit.Value;
            if (!string.IsNullOrEmpty(dto.Status)) employee.Status = dto.Status;
            if (!string.IsNullOrEmpty(dto.Photo)) employee.Photo = dto.Photo;

            // Auto-generate empCode if missing
            if (string.IsNullOrEmpty(employee.EmpCode))
            {
                employee.EmpCode = GenerateEmpCode();
            }

            employee.UpdatedAt = DateTime.UtcNow;

            _context.Employees.Update(employee);
            await _context.SaveChangesAsync();
            return employee;
        }

        public async Task<bool> DeleteEmployeeAsync(string id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return false;

            _context.Employees.Remove(employee);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ChangePasswordAsync(string id, string oldPassword, string newPassword)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return false;

            if (!BCrypt.Net.BCrypt.Verify(oldPassword, employee.PasswordHash))
                return false;

            employee.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            _context.Employees.Update(employee);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SyncCredentialsAsync(string employeeId, string password)
        {
            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee == null) return false;

            employee.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
            _context.Employees.Update(employee);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<EmployeeDto>> GetEmployeesWithoutCredentialsAsync()
        {
            var employees = await _context.Employees
                .Where(e => string.IsNullOrEmpty(e.PasswordHash))
                .Take(1000)
                .ToListAsync();

            return employees.Select(e => new EmployeeDto
            {
                Id = e.Id,
                Name = e.Name,
                Email = e.Email,
                EmpCode = e.EmpCode,
                DepartmentId = e.DepartmentId,
                DesignationId = e.DesignationId,
                Mobile = e.Mobile,
                Status = e.Status,
                Photo = GetFullPhotoUrl(e.Photo)
            }).ToList();
        }



        private string GenerateEmpCode()
        {
            var lastEmp = _context.Employees
                .OrderByDescending(e => e.CreatedAt)
                .FirstOrDefault();

            int nextNumber = 1;
            if (lastEmp?.EmpCode != null && int.TryParse(lastEmp.EmpCode.Replace("EMP", ""), out int lastNumber))
            {
                nextNumber = lastNumber + 1;
            }

            return $"EMP{nextNumber:D5}";
        }
    }
}
