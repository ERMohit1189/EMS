namespace VendorRegistrationBackend.Services
{
    public interface IReportsService
    {
        Task<Dictionary<string, object>> GetAttendanceReportAsync(int month, int year);
        Task<Dictionary<string, object>> GetSalaryReportAsync(int month, int year);
        Task<Dictionary<string, object>> GetInvoiceReportAsync(int month, int year);
        Task<Dictionary<string, object>> GetPurchaseOrderReportAsync(int month, int year);
        Task<Dictionary<string, object>> GetLeaveReportAsync(int month, int year);
        Task<Dictionary<string, object>> GetVendorSummaryAsync();
        Task<Dictionary<string, object>> GetEmployeeSummaryAsync();
        Task<List<dynamic>> GetSalaryGeneratedSummariesAsync();
        Task<List<dynamic>> GetSalaryGeneratedDetailsAsync(int year, int month);
    }
}
