using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;

namespace VendorRegistrationBackend.Services
{
    public class ReportsService : IReportsService
    {
        private readonly AppDbContext _context;

        public ReportsService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<object>> GetAttendanceReportAsync(int month, int year)
        {
            var attendanceRecords = await _context.Attendances
                .Where(a => a.Month == month && a.Year == year)
                .Include(a => a.Employee)
                .ThenInclude(e => e.Department)
                .Include(a => a.Employee)
                .ThenInclude(e => e.Designation)
                .ToListAsync();

            System.Diagnostics.Debug.WriteLine($"[ReportsService] Found {attendanceRecords.Count} attendance records for {month}/{year}");

            // Get holidays for this month
            var holidays = await _context.Holidays
                .Where(h => h.Date.Month == month && h.Date.Year == year && h.IsActive)
                .ToListAsync();
            var holidayDates = new HashSet<int>(holidays.Select(h => h.Date.Day));
            System.Diagnostics.Debug.WriteLine($"[ReportsService] Found {holidays.Count} holidays: {string.Join(",", holidayDates)}");

            // Get Sundays for this month
            var daysInMonth = DateTime.DaysInMonth(year, month);
            var sundays = new HashSet<int>();
            for (int day = 1; day <= daysInMonth; day++)
            {
                var date = new DateTime(year, month, day);
                if (date.DayOfWeek == DayOfWeek.Sunday)
                {
                    sundays.Add(day);
                }
            }
            System.Diagnostics.Debug.WriteLine($"[ReportsService] Found {sundays.Count} Sundays: {string.Join(",", sundays)}");

            // Parse attendance data to count statuses
            var details = attendanceRecords.Select(a => {
                int present = 0, firstHalf = 0, secondHalf = 0, absent = 0, leave = 0, holiday = 0, sunday = 0;

                if (string.IsNullOrEmpty(a.AttendanceData))
                {
                    System.Diagnostics.Debug.WriteLine($"[ReportsService] Employee {a.Employee?.Name ?? a.EmployeeId}: AttendanceData is null/empty");
                }
                else
                {
                    try
                    {
                        System.Diagnostics.Debug.WriteLine($"[ReportsService] Parsing AttendanceData for {a.Employee?.Name ?? a.EmployeeId}: {a.AttendanceData.Substring(0, Math.Min(100, a.AttendanceData.Length))}...");
                        var json = System.Text.Json.JsonDocument.Parse(a.AttendanceData);
                        int dayCount = 0;
                        foreach (var property in json.RootElement.EnumerateObject())
                        {
                            dayCount++;
                            if (int.TryParse(property.Name, out int day))
                            {
                                // Check if it's a Sunday
                                if (sundays.Contains(day))
                                {
                                    sunday++;
                                    continue;
                                }

                                // Check if it's a configured holiday
                                if (holidayDates.Contains(day))
                                {
                                    holiday++;
                                    continue;
                                }

                                var dayData = property.Value;
                                if (dayData.TryGetProperty("status", out var statusEl))
                                {
                                    var status = statusEl.GetString();
                                    switch(status)
                                    {
                                        case "present":
                                            present++;
                                            break;
                                        case "firstHalf":
                                            firstHalf++;
                                            break;
                                        case "secondHalf":
                                            secondHalf++;
                                            break;
                                        case "absent":
                                            absent++;
                                            break;
                                        case "leave":
                                            leave++;
                                            break;
                                    }
                                }
                            }
                        }
                        System.Diagnostics.Debug.WriteLine($"[ReportsService] {a.Employee?.Name ?? a.EmployeeId}: Parsed {dayCount} days - present:{present}, absent:{absent}, leave:{leave}, firstHalf:{firstHalf}, secondHalf:{secondHalf}, holiday:{holiday}, sunday:{sunday}");
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine($"[ReportsService] Error parsing AttendanceData for {a.Employee?.Name ?? a.EmployeeId}: {ex.Message}");
                    }
                }

                // Format: "10+2+1+3+5(s)" where (s) means sunday holidays
                string formattedCount = $"{present}+{firstHalf}+{secondHalf}+{absent}+{leave}";
                if (sunday > 0)
                {
                    formattedCount += $"+{sunday}(s)";
                }

                return new
                {
                    employeeId = a.EmployeeId,
                    employeeCode = a.Employee?.EmpCode ?? "",
                    employeeName = a.Employee?.Name ?? "",
                    department = a.Employee?.Department?.Name ?? "",
                    designation = a.Employee?.Designation?.Name ?? "",
                    present = present,
                    firstHalf = firstHalf,
                    secondHalf = secondHalf,
                    absent = absent,
                    leave = leave,
                    holiday = holiday,
                    sunday = sunday,
                    formattedCount = formattedCount,
                    total = daysInMonth,  // Total days in the month (30 or 31)
                    locked = a.Locked
                } as object;
            }).ToList();

            System.Diagnostics.Debug.WriteLine($"[ReportsService] Returning {details.Count} attendance report details");
            return details;
        }

        public async Task<Dictionary<string, object>> GetSalaryReportAsync(int month, int year)
        {
            var salaryStructures = await _context.SalaryStructures
                .Include(ss => ss.Employee)
                .ToListAsync();

            var totalGross = 0m;
            var totalDeductions = 0m;

            foreach (var salary in salaryStructures)
            {
                decimal gross = salary.BasicSalary + salary.HRA + salary.DA +
                               salary.Medical + salary.Conveyance + salary.OtherBenefits +
                               salary.LTA + salary.Bonuses;
                decimal deductions = salary.PF + salary.ProfessionalTax + salary.IncomeTax +
                                   salary.EPF + salary.ESIC;

                totalGross += gross;
                totalDeductions += deductions;
            }

            var report = new Dictionary<string, object>
            {
                { "month", month },
                { "year", year },
                { "totalEmployees", salaryStructures.Count },
                { "totalGross", totalGross },
                { "totalDeductions", totalDeductions },
                { "totalNet", totalGross - totalDeductions },
                { "details", salaryStructures }
            };

            return report;
        }

        public async Task<Dictionary<string, object>> GetInvoiceReportAsync(int month, int year)
        {
            var invoices = await _context.Invoices
                .Where(i => i.CreatedAt.Month == month && i.CreatedAt.Year == year)
                .Include(i => i.Vendor)
                .ToListAsync();

            var totalAmount = invoices.Sum(i => i.Amount);

            var report = new Dictionary<string, object>
            {
                { "month", month },
                { "year", year },
                { "totalInvoices", invoices.Count },
                { "totalAmount", totalAmount },
                { "paidInvoices", invoices.Count(i => i.Status == "paid") },
                { "pendingInvoices", invoices.Count(i => i.Status == "pending") },
                { "details", invoices }
            };

            return report;
        }

        public async Task<Dictionary<string, object>> GetPurchaseOrderReportAsync(int month, int year)
        {
            var purchaseOrders = await _context.PurchaseOrders
                .Where(po => po.CreatedAt.Month == month && po.CreatedAt.Year == year)
                .Include(po => po.Vendor)
                .Include(po => po.Lines)
                .ToListAsync();

            var totalValue = purchaseOrders.Sum(po => po.Lines.Sum(l => l.Quantity * l.UnitPrice));

            var report = new Dictionary<string, object>
            {
                { "month", month },
                { "year", year },
                { "totalPOs", purchaseOrders.Count },
                { "totalValue", totalValue },
                { "activePOs", purchaseOrders.Count(po => po.Status == "active") },
                { "completedPOs", purchaseOrders.Count(po => po.Status == "completed") },
                { "details", purchaseOrders }
            };

            return report;
        }

        public async Task<Dictionary<string, object>> GetLeaveReportAsync(int month, int year)
        {
            var leaveRequests = await _context.LeaveRequests
                .Where(lr => lr.StartDate.Month == month && lr.StartDate.Year == year)
                .Include(lr => lr.Employee)
                .ToListAsync();

            var report = new Dictionary<string, object>
            {
                { "month", month },
                { "year", year },
                { "totalRequests", leaveRequests.Count },
                { "approvedLeaves", leaveRequests.Count(lr => lr.Status == "approved") },
                { "pendingLeaves", leaveRequests.Count(lr => lr.Status == "pending") },
                { "rejectedLeaves", leaveRequests.Count(lr => lr.Status == "rejected") },
                { "elLeaves", leaveRequests.Count(lr => lr.LeaveType == "EL") },
                { "plLeaves", leaveRequests.Count(lr => lr.LeaveType == "PL") },
                { "slLeaves", leaveRequests.Count(lr => lr.LeaveType == "SL") },
                { "clLeaves", leaveRequests.Count(lr => lr.LeaveType == "CL") },
                { "details", leaveRequests }
            };

            return report;
        }

        public async Task<Dictionary<string, object>> GetVendorSummaryAsync()
        {
            var vendors = await _context.Vendors
                .Include(v => v.Sites)
                .Include(v => v.PurchaseOrders)
                .Include(v => v.Invoices)
                .ToListAsync();

            var totalVendors = vendors.Count;
            var totalSites = vendors.Sum(v => v.Sites.Count);
            var totalPOs = vendors.Sum(v => v.PurchaseOrders.Count);
            var totalInvoices = vendors.Sum(v => v.Invoices.Count);

            var report = new Dictionary<string, object>
            {
                { "totalVendors", totalVendors },
                { "totalSites", totalSites },
                { "totalPurchaseOrders", totalPOs },
                { "totalInvoices", totalInvoices },
                { "details", vendors }
            };

            return report;
        }

        public async Task<Dictionary<string, object>> GetEmployeeSummaryAsync()
        {
            var employees = await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Designation)
                .ToListAsync();

            var activeEmployees = employees.Count(e => e.Status == "active");
            var inactiveEmployees = employees.Count(e => e.Status == "inactive");

            var report = new Dictionary<string, object>
            {
                { "totalEmployees", employees.Count },
                { "activeEmployees", activeEmployees },
                { "inactiveEmployees", inactiveEmployees },
                { "departments", employees.GroupBy(e => e.Department?.Name ?? "Unassigned")
                    .Select(g => new { department = g.Key, count = g.Count() }).ToList() },
                { "designations", employees.GroupBy(e => e.Designation?.Name ?? "Unassigned")
                    .Select(g => new { designation = g.Key, count = g.Count() }).ToList() },
                { "details", employees }
            };

            return report;
        }

        public async Task<List<dynamic>> GetSalaryGeneratedSummariesAsync()
        {
            var salaryStructures = await _context.SalaryStructures
                .Include(ss => ss.Employee)
                .ToListAsync();

            var summaries = new List<dynamic>();

            // Group by month/year (simplified - using current month/year)
            var currentMonth = DateTime.Now.Month;
            var currentYear = DateTime.Now.Year;

            decimal totalAmount = 0;
            var recordCount = salaryStructures.Count;

            foreach (var ss in salaryStructures)
            {
                var gross = ss.BasicSalary + ss.HRA + ss.DA + ss.LTA + ss.Conveyance +
                           ss.Medical + ss.Bonuses + ss.OtherBenefits;
                totalAmount += gross;
            }

            summaries.Add(new
            {
                month = currentMonth,
                year = currentYear,
                recordCount = recordCount,
                totalAmount = totalAmount,
                generatedAt = DateTime.UtcNow
            });

            return summaries;
        }

        public async Task<List<dynamic>> GetSalaryGeneratedDetailsAsync(int year, int month)
        {
            var salaryStructures = await _context.SalaryStructures
                .Include(ss => ss.Employee)
                .ToListAsync();

            var details = new List<dynamic>();

            foreach (var ss in salaryStructures)
            {
                if (ss.Employee == null) continue;

                var gross = ss.BasicSalary + ss.HRA + ss.DA + ss.LTA + ss.Conveyance +
                           ss.Medical + ss.Bonuses + ss.OtherBenefits;
                var deductions = ss.PF + ss.ProfessionalTax + ss.IncomeTax + ss.EPF + ss.ESIC;
                var net = gross - deductions;

                details.Add(new
                {
                    id = ss.Id,
                    employeeId = ss.EmployeeId,
                    employeeName = ss.Employee.Name,
                    employeeCode = ss.Employee.EmpCode,
                    department = ss.Employee.Department?.Name ?? "N/A",
                    designation = ss.Employee.Designation?.Name ?? "N/A",
                    grossSalary = gross,
                    totalDeductions = deductions,
                    netSalary = net,
                    createdAt = DateTime.UtcNow
                });
            }

            return details;
        }

        public async Task<Dictionary<string, object>> TestQueryAsync(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
                throw new ArgumentException("Query cannot be empty");

            try
            {
                // Extract column names from the query
                var columns = ExtractColumnsFromQuery(query);

                // Get a sample execution (limit to 2 rows) - add TOP if not already present
                var limitedQuery = query;
                if (!query.Contains("TOP", StringComparison.OrdinalIgnoreCase) && !query.Contains("LIMIT", StringComparison.OrdinalIgnoreCase))
                {
                    // Find SELECT keyword and add TOP after it
                    var selectIndex = query.IndexOf("SELECT", StringComparison.OrdinalIgnoreCase);
                    if (selectIndex >= 0)
                    {
                        limitedQuery = query.Substring(0, selectIndex + 6) + " TOP 2 " + query.Substring(selectIndex + 6);
                    }
                }

                var connection = _context.Database.GetDbConnection();
                var command = connection.CreateCommand();
                command.CommandText = limitedQuery;

                if (connection.State != System.Data.ConnectionState.Open)
                    await connection.OpenAsync();

                var reader = await command.ExecuteReaderAsync();
                var results = new List<Dictionary<string, object>>();

                var fieldCount = reader.FieldCount;
                var columnNames = new List<string>();
                for (int i = 0; i < fieldCount; i++)
                {
                    columnNames.Add(reader.GetName(i));
                }

                while (await reader.ReadAsync())
                {
                    var row = new Dictionary<string, object>();
                    for (int i = 0; i < fieldCount; i++)
                    {
                        row[columnNames[i]] = reader.GetValue(i) ?? DBNull.Value;
                    }
                    results.Add(row);
                }

                reader.Close();
                connection.Close();

                // If column extraction failed, use actual columns from result
                if (columns.Count == 0 || (columns.Count == 1 && columns[0] == "result"))
                {
                    columns = columnNames;
                }

                return new Dictionary<string, object>
                {
                    { "columns", columns },
                    { "results", results },
                    { "success", true }
                };
            }
            catch (Exception ex)
            {
                throw new Exception($"Query test failed: {ex.Message}");
            }
        }

        private List<string> ExtractColumnsFromQuery(string query)
        {
            var columns = new List<string>();

            try
            {
                // Simple parser to extract column names from SELECT clause
                var selectIndex = query.IndexOf("SELECT", StringComparison.OrdinalIgnoreCase);
                var fromIndex = query.IndexOf("FROM", StringComparison.OrdinalIgnoreCase);

                if (selectIndex >= 0 && fromIndex > selectIndex)
                {
                    var selectClause = query.Substring(selectIndex + 6, fromIndex - selectIndex - 6).Trim();

                    // Split by comma and clean up
                    var parts = selectClause.Split(',');
                    foreach (var part in parts)
                    {
                        var cleaned = part.Trim();
                        // Handle aliases (AS keyword)
                        var asIndex = cleaned.IndexOf(" AS ", StringComparison.OrdinalIgnoreCase);
                        if (asIndex > 0)
                        {
                            cleaned = cleaned.Substring(asIndex + 4).Trim();
                        }
                        // Handle functions like COUNT(*) or SUM(amount)
                        if (cleaned.Contains("("))
                        {
                            cleaned = cleaned.Substring(cleaned.LastIndexOf("(") + 1).Replace(")", "").Trim();
                        }
                        // Handle table.column format
                        if (cleaned.Contains("."))
                        {
                            cleaned = cleaned.Substring(cleaned.LastIndexOf(".") + 1).Trim();
                        }

                        if (!string.IsNullOrEmpty(cleaned) && cleaned != "*")
                        {
                            columns.Add(cleaned);
                        }
                    }
                }

                // If no columns found, try to get from actual execution
                if (columns.Count == 0)
                {
                    columns.Add("result");
                }
            }
            catch
            {
                columns.Add("result");
            }

            return columns;
        }
    }
}
