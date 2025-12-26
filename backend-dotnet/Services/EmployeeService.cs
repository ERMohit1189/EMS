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
                DesignationId = employee.DesignationId,
                Mobile = employee.Mobile,
                City = employee.City,
                Address = employee.Address,
                Status = employee.Status,
                FatherName = employee.FatherName,
                Doj = employee.DateOfJoining?.ToString("yyyy-MM-dd"),
                Role = employee.Role
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
                DesignationId = e.DesignationId,
                Mobile = e.Mobile,
                City = e.City,
                Address = e.Address,
                Status = e.Status,
                FatherName = e.FatherName,
                Doj = e.DateOfJoining != null ? e.DateOfJoining.Value.ToString("yyyy-MM-dd") : null,
                Role = e.Role
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
                DesignationId = e.DesignationId,
                Mobile = e.Mobile,
                City = e.City,
                Status = e.Status,
                Role = e.Role
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
                Role = "employee"
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();
            return employee;
        }

        public async Task<Employee?> UpdateEmployeeAsync(string id, UpdateEmployeeDto dto)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return null;

            employee.Name = dto.Name;
            employee.Mobile = dto.Mobile;
            employee.Address = dto.Address;
            employee.City = dto.City;
            employee.State = dto.State;
            employee.DateOfBirth = dto.DateOfBirth;
            employee.FatherName = dto.FatherName;
            employee.AlternateNo = dto.AlternateNo;
            employee.Aadhar = dto.Aadhar;
            employee.PAN = dto.PAN;
            employee.BloodGroup = dto.BloodGroup;
            employee.MaritalStatus = dto.MaritalStatus;
            employee.Nominee = dto.Nominee;
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
                Status = e.Status
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
