using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class SalaryService : ISalaryService
    {
        private readonly AppDbContext _context;

        public SalaryService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<SalaryStructure?> GetSalaryStructureByIdAsync(string id)
        {
            return await _context.SalaryStructures
                .Include(ss => ss.Employee)
                .FirstOrDefaultAsync(ss => ss.Id == id);
        }

        public async Task<SalaryStructure?> GetSalaryStructureByEmployeeAsync(string employeeId)
        {
            return await _context.SalaryStructures
                .FirstOrDefaultAsync(ss => ss.EmployeeId == employeeId);
        }

        public async Task<List<SalaryStructure>> GetAllSalaryStructuresAsync()
        {
            return await _context.SalaryStructures
                .Include(ss => ss.Employee)
                .ToListAsync();
        }

        public async Task<SalaryStructure> CreateSalaryStructureAsync(SalaryStructure salaryStructure)
        {
            salaryStructure.Id = Guid.NewGuid().ToString();
            salaryStructure.CreatedAt = DateTime.UtcNow;
            salaryStructure.UpdatedAt = DateTime.UtcNow;

            _context.SalaryStructures.Add(salaryStructure);
            await _context.SaveChangesAsync();
            return salaryStructure;
        }

        public async Task<SalaryStructure?> UpdateSalaryStructureAsync(string id, SalaryStructure salaryStructure)
        {
            var existing = await _context.SalaryStructures.FindAsync(id);
            if (existing == null) return null;

            existing.BasicSalary = salaryStructure.BasicSalary;
            existing.HRA = salaryStructure.HRA;
            existing.DA = salaryStructure.DA;
            existing.LTA = salaryStructure.LTA;
            existing.Conveyance = salaryStructure.Conveyance;
            existing.Medical = salaryStructure.Medical;
            existing.Bonuses = salaryStructure.Bonuses;
            existing.OtherBenefits = salaryStructure.OtherBenefits;
            existing.PF = salaryStructure.PF;
            existing.ProfessionalTax = salaryStructure.ProfessionalTax;
            existing.IncomeTax = salaryStructure.IncomeTax;
            existing.EPF = salaryStructure.EPF;
            existing.ESIC = salaryStructure.ESIC;
            existing.WantDeduction = salaryStructure.WantDeduction;
            existing.UpdatedAt = DateTime.UtcNow;

            _context.SalaryStructures.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteSalaryStructureAsync(string id)
        {
            var salaryStructure = await _context.SalaryStructures.FindAsync(id);
            if (salaryStructure == null) return false;

            _context.SalaryStructures.Remove(salaryStructure);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<decimal> CalculateGrossAsync(string employeeId)
        {
            var salaryStructure = await _context.SalaryStructures
                .FirstOrDefaultAsync(ss => ss.EmployeeId == employeeId);

            if (salaryStructure == null)
                return 0;

            decimal gross = salaryStructure.BasicSalary +
                           salaryStructure.HRA +
                           salaryStructure.DA +
                           salaryStructure.LTA +
                           salaryStructure.Conveyance +
                           salaryStructure.Medical +
                           salaryStructure.Bonuses +
                           salaryStructure.OtherBenefits;

            return gross;
        }

        public async Task<decimal> CalculateNetAsync(string employeeId)
        {
            var salaryStructure = await _context.SalaryStructures
                .FirstOrDefaultAsync(ss => ss.EmployeeId == employeeId);

            if (salaryStructure == null)
                return 0;

            decimal gross = await CalculateGrossAsync(employeeId);
            decimal deductions = salaryStructure.PF +
                                salaryStructure.ProfessionalTax +
                                salaryStructure.IncomeTax +
                                salaryStructure.EPF +
                                salaryStructure.ESIC;

            return gross - deductions;
        }

        public async Task<int> GetSalaryStructureCountAsync()
        {
            return await _context.SalaryStructures.CountAsync();
        }

        public async Task<List<dynamic>> GenerateSalariesAsync(int month, int year, bool missingOnly = false)
        {
            var salaryStructures = await _context.SalaryStructures
                .Include(ss => ss.Employee)
                .ThenInclude(e => e.Department)
                .Include(ss => ss.Employee)
                .ThenInclude(e => e.Designation)
                .ToListAsync();

            // Get holidays for this month
            var holidays = await _context.Holidays
                .Where(h => h.Date.Month == month && h.Date.Year == year && h.IsActive)
                .ToListAsync();
            var holidayDates = new HashSet<int>(holidays.Select(h => h.Date.Day));

            var daysInMonth = DateTime.DaysInMonth(year, month);
            var generatedSalaries = new List<dynamic>();

            foreach (var ss in salaryStructures)
            {
                if (ss.Employee == null) continue;

                // Get attendance record for this employee and month
                var attendance = await _context.Attendances
                    .FirstOrDefaultAsync(a => a.EmployeeId == ss.EmployeeId && a.Month == month && a.Year == year);

                // Parse attendance data and calculate working days
                int presentDays = 0, halfDays = 0, absentDays = 0, leaveDays = 0, holidayDays = 0;

                if (attendance != null && !string.IsNullOrEmpty(attendance.AttendanceData))
                {
                    try
                    {
                        var json = System.Text.Json.JsonDocument.Parse(attendance.AttendanceData);
                        foreach (var property in json.RootElement.EnumerateObject())
                        {
                            if (int.TryParse(property.Name, out int day))
                            {
                                var dayData = property.Value;
                                if (dayData.TryGetProperty("status", out var statusEl))
                                {
                                    var status = statusEl.GetString();
                                    switch (status)
                                    {
                                        case "present":
                                            presentDays++;
                                            break;
                                        case "firstHalf":
                                        case "secondHalf":
                                            halfDays++;
                                            break;
                                        case "absent":
                                            absentDays++;
                                            break;
                                        case "leave":
                                            leaveDays++;
                                            break;
                                    }
                                }
                            }
                        }
                    }
                    catch { /* ignore parse errors */ }
                }

                // Count holiday days
                holidayDays = holidayDates.Count;

                // Calculate number of Sundays in the month
                int sundays = 0;
                var firstDay = new DateTime(year, month, 1);
                for (int day = 1; day <= daysInMonth; day++)
                {
                    var date = new DateTime(year, month, day);
                    if (date.DayOfWeek == DayOfWeek.Sunday)
                    {
                        sundays++;
                    }
                }

                // Calculate working days: Present + Half (0.5 each) + Leave
                decimal workingDays = presentDays + (halfDays * 0.5m) + leaveDays;

                // Calculate salary days: Working Days + Sundays + Holidays
                // Sundays and Holidays are paid days
                decimal salaryDays = workingDays + sundays + holidayDays;

                // Calculate per-day and earned salary
                var gross = await CalculateGrossAsync(ss.EmployeeId);
                var perDaySalary = gross > 0 ? gross / daysInMonth : 0m;
                var earnedSalary = perDaySalary * salaryDays;

                // Calculate deductions
                var fixedDeductions = ss.PF + ss.ProfessionalTax + ss.IncomeTax + ss.EPF + ss.ESIC;
                var absentDaysDeduction = absentDays > 0 ? perDaySalary * absentDays : 0m;
                var totalDeductions = fixedDeductions + absentDaysDeduction;
                var net = earnedSalary - totalDeductions;

                generatedSalaries.Add(new
                {
                    id = Guid.NewGuid().ToString(),
                    employeeId = ss.EmployeeId,
                    employeeName = ss.Employee.Name,
                    employeeCode = ss.Employee.EmpCode,
                    department = ss.Employee.Department?.Name ?? "N/A",
                    designation = ss.Employee.Designation?.Name ?? "N/A",
                    totalDays = daysInMonth,
                    presentDays = presentDays,
                    halfDays = halfDays,
                    absentDays = absentDays,
                    leaveDays = leaveDays,
                    sundays = sundays,
                    holidays = holidayDays,
                    workingDays = Math.Round(workingDays, 2),
                    salaryDays = Math.Round(salaryDays, 2),
                    basicSalary = ss.BasicSalary,
                    hra = ss.HRA,
                    da = ss.DA,
                    lta = ss.LTA,
                    conveyance = ss.Conveyance,
                    medical = ss.Medical,
                    bonuses = ss.Bonuses,
                    otherBenefits = ss.OtherBenefits,
                    grossSalary = Math.Round(gross, 2),
                    perDaySalary = Math.Round(perDaySalary, 2),
                    earnedSalary = Math.Round(earnedSalary, 2),
                    pf = ss.PF,
                    professionalTax = ss.ProfessionalTax,
                    incomeTax = ss.IncomeTax,
                    epf = ss.EPF,
                    esic = ss.ESIC,
                    fixedDeductions = Math.Round(fixedDeductions, 2),
                    absentDaysDeduction = Math.Round(absentDaysDeduction, 2),
                    totalDeductions = Math.Round(totalDeductions, 2),
                    netSalary = Math.Round(net, 2),
                    month = month,
                    year = year,
                    createdAt = DateTime.UtcNow
                });
            }

            return generatedSalaries;
        }

        public async Task<List<dynamic>> GetSalaryReportAsync()
        {
            // Get the latest month/year that has generated salaries
            var latestGenerated = await _context.GeneratedSalaries
                .OrderByDescending(gs => gs.Year)
                .ThenByDescending(gs => gs.Month)
                .FirstOrDefaultAsync();

            // If no generated salaries exist, return empty list
            if (latestGenerated == null)
                return new List<dynamic>();

            int latestMonth = latestGenerated.Month;
            int latestYear = latestGenerated.Year;

            // Get all generated salaries for the latest month, with employee details
            var generatedSalaries = await _context.GeneratedSalaries
                .Where(gs => gs.Year == latestYear && gs.Month == latestMonth)
                .Include(gs => gs.Employee)
                .ThenInclude(e => e.Department)
                .Include(gs => gs.Employee)
                .ThenInclude(e => e.Designation)
                .OrderBy(gs => gs.Employee!.Name)
                .ToListAsync();

            var reportData = new List<dynamic>();

            foreach (var gs in generatedSalaries)
            {
                if (gs.Employee == null) continue;

                reportData.Add(new
                {
                    id = gs.Id,
                    employeeId = gs.EmployeeId,
                    employeeName = gs.Employee.Name,
                    employeeCode = gs.Employee.EmpCode,
                    department = gs.Employee.Department?.Name ?? "N/A",
                    designation = gs.Employee.Designation?.Name ?? "N/A",
                    basicSalary = gs.BasicSalary,
                    hra = gs.HRA,
                    da = gs.DA,
                    lta = gs.LTA,
                    conveyance = gs.Conveyance,
                    medical = gs.Medical,
                    bonuses = gs.Bonuses,
                    otherBenefits = gs.OtherBenefits,
                    gross = gs.GrossSalary,
                    pf = gs.PF,
                    professionalTax = gs.ProfessionalTax,
                    incomeTax = gs.IncomeTax,
                    epf = gs.EPF,
                    esic = gs.ESIC,
                    deductions = gs.TotalDeductions,  // Use saved deductions from GeneratedSalary
                    net = gs.NetSalary,
                    wantDeduction = false,
                    month = gs.Month,
                    year = gs.Year
                });
            }

            return reportData;
        }

        // Generated Salary Methods (matches Node.js API)

        public async Task<DTOs.SaveGeneratedSalariesResultDto?> SaveGeneratedSalariesAsync(int month, int year, List<DTOs.GeneratedSalaryItemDto> salaries, string? generatedBy = null)
        {
            try
            {
                // Check if salaries already exist for this month/year
                var existingCount = await _context.GeneratedSalaries
                    .Where(gs => gs.Month == month && gs.Year == year)
                    .CountAsync();

                if (existingCount > 0)
                {
                    throw new Exception($"Salaries already saved for {month}/{year}. Delete saved salaries to regenerate.");
                }

                int count = 0;
                foreach (var s in salaries)
                {
                    var generatedSalary = new GeneratedSalary
                    {
                        Id = Guid.NewGuid().ToString(),
                        EmployeeId = s.EmployeeId ?? string.Empty,
                        Month = month,
                        Year = year,
                        TotalDays = s.TotalDays,
                        PresentDays = s.PresentDays,
                        HalfDays = s.HalfDays,
                        AbsentDays = s.AbsentDays,
                        LeaveDays = s.LeaveDays,
                        Sundays = s.Sundays,
                        Holidays = s.Holidays,
                        WorkingDays = s.WorkingDays,
                        SalaryDays = s.SalaryDays,
                        BasicSalary = s.BasicSalary,
                        HRA = s.HRA,
                        DA = s.DA,
                        LTA = s.LTA,
                        Conveyance = s.Conveyance,
                        Medical = s.Medical,
                        Bonuses = s.Bonuses,
                        OtherBenefits = s.OtherBenefits,
                        GrossSalary = s.GrossSalary,
                        PerDaySalary = s.PerDaySalary,
                        EarnedSalary = s.EarnedSalary,
                        PF = s.PF,
                        ProfessionalTax = s.ProfessionalTax,
                        IncomeTax = s.IncomeTax,
                        EPF = s.EPF,
                        ESIC = s.ESIC,
                        FixedDeductions = s.FixedDeductions,
                        AbsentDaysDeduction = s.AbsentDaysDeduction,
                        TotalDeductions = s.TotalDeductions,
                        NetSalary = s.NetSalary,
                        GeneratedBy = generatedBy,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.GeneratedSalaries.Add(generatedSalary);
                    count++;
                }

                await _context.SaveChangesAsync();

                // Lock attendance for this month/year (similar to Node.js behavior)
                await LockAttendanceForMonthAsync(month, year);

                return new DTOs.SaveGeneratedSalariesResultDto { Success = true, Count = count, Message = $"Saved {count} salaries." };
            }
            catch (Exception ex)
            {
                throw new Exception($"Error saving salaries: {ex.Message}");
            }
        }

        public async Task<List<dynamic>> GetGeneratedSalariesAsync(int year, int month, int page = 1, int pageSize = 20, string? search = null)
        {
            var query = _context.GeneratedSalaries
                .Where(gs => gs.Year == year && gs.Month == month)
                .Include(gs => gs.Employee)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                search = search.ToLower();
                query = query.Where(gs => gs.Employee != null && gs.Employee.Name != null && gs.Employee.Name.ToLower().Contains(search));
            }

            var total = await query.CountAsync();
            var salaries = await query
                .OrderBy(gs => gs.Employee!.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new List<dynamic>();
            foreach (var salary in salaries)
            {
                result.Add(new
                {
                    id = salary.Id,
                    employeeId = salary.EmployeeId,
                    employeeCode = salary.Employee?.EmpCode ?? "",
                    employeeName = salary.Employee?.Name ?? "",
                    netSalary = salary.NetSalary,
                    grossSalary = salary.GrossSalary,
                    totalDeductions = salary.TotalDeductions,
                    createdAt = salary.CreatedAt
                });
            }

            return result;
        }

        public async Task<GeneratedSalary?> GetGeneratedSalaryAsync(string id)
        {
            return await _context.GeneratedSalaries
                .Include(gs => gs.Employee)
                .FirstOrDefaultAsync(gs => gs.Id == id);
        }

        public async Task<bool> DeleteGeneratedSalaryAsync(string id)
        {
            var salary = await _context.GeneratedSalaries.FindAsync(id);
            if (salary == null) return false;

            _context.GeneratedSalaries.Remove(salary);
            await _context.SaveChangesAsync();

            // Unlock attendance for this month/year
            await UnlockAttendanceForMonthAsync(salary.Month, salary.Year);

            return true;
        }

        public async Task<bool> SalaryExistsAsync(string employeeId, int month, int year)
        {
            return await _context.GeneratedSalaries
                .AnyAsync(gs => gs.EmployeeId == employeeId && gs.Month == month && gs.Year == year);
        }

        public async Task<List<dynamic>> GetSalaryGeneratedSummariesAsync()
        {
            var summaries = await _context.GeneratedSalaries
                .GroupBy(gs => new { gs.Month, gs.Year })
                .OrderByDescending(g => g.Key.Year)
                .ThenByDescending(g => g.Key.Month)
                .Select(g => new
                {
                    month = g.Key.Month,
                    year = g.Key.Year,
                    recordCount = g.Count(),
                    totalAmount = g.Sum(gs => gs.NetSalary),
                    generatedAt = g.Max(gs => gs.CreatedAt)
                })
                .ToListAsync();

            return summaries.Cast<dynamic>().ToList();
        }

        private async Task LockAttendanceForMonthAsync(int month, int year)
        {
            var attendanceRecords = await _context.Attendances
                .Where(a => a.Month == month && a.Year == year)
                .ToListAsync();

            foreach (var record in attendanceRecords)
            {
                record.Locked = true;
                record.UpdatedAt = DateTime.UtcNow;
                _context.Attendances.Update(record);
            }

            await _context.SaveChangesAsync();
        }

        private async Task UnlockAttendanceForMonthAsync(int month, int year)
        {
            var attendanceRecords = await _context.Attendances
                .Where(a => a.Month == month && a.Year == year)
                .ToListAsync();

            foreach (var record in attendanceRecords)
            {
                record.Locked = false;
                record.UpdatedAt = DateTime.UtcNow;
                _context.Attendances.Update(record);
            }

            await _context.SaveChangesAsync();
        }

        // Helper methods for type conversion
        private int ConvertToInt(dynamic value)
        {
            if (value == null) return 0;
            if (value is int i) return i;
            if (value is long l) return (int)l;
            if (value is string s && int.TryParse(s, out int result)) return result;
            if (decimal.TryParse(value.ToString(), out decimal d)) return (int)d;
            return 0;
        }

        private decimal ConvertToDecimal(dynamic value)
        {
            if (value == null) return 0m;
            if (value is decimal dec) return dec;
            if (value is int i) return (decimal)i;
            if (value is long l) return (decimal)l;
            if (value is double dbl) return (decimal)dbl;
            if (value is string s && decimal.TryParse(s, out decimal result)) return result;
            if (decimal.TryParse(value.ToString(), out decimal d)) return d;
            return 0m;
        }
    }
}
