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

        public async Task<Dictionary<string, object>> GetAttendanceReportAsync(int month, int year)
        {
            var attendanceRecords = await _context.Attendances
                .Where(a => a.Month == month && a.Year == year)
                .Include(a => a.Employee)
                .ToListAsync();

            var report = new Dictionary<string, object>
            {
                { "month", month },
                { "year", year },
                { "totalRecords", attendanceRecords.Count },
                { "submittedRecords", attendanceRecords.Count(a => a.Submitted) },
                { "pendingRecords", attendanceRecords.Count(a => !a.Submitted) },
                { "lockedRecords", attendanceRecords.Count(a => a.Locked) },
                { "details", attendanceRecords }
            };

            return report;
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
    }
}
