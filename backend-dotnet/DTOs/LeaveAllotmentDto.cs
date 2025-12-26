namespace VendorRegistrationBackend.DTOs
{
    public class CreateLeaveAllotmentDto
    {
        public string EmployeeId { get; set; } = string.Empty;
        public int Year { get; set; }
        public int MedicalLeave { get; set; } = 0;
        public int CasualLeave { get; set; } = 0;
        public int EarnedLeave { get; set; } = 0;
        public int SickLeave { get; set; } = 0;
        public int PersonalLeave { get; set; } = 0;
        public int UnpaidLeave { get; set; } = 0;
        public int LeaveWithoutPay { get; set; } = 0;
        public bool CarryForwardEarned { get; set; } = false;
        public bool CarryForwardPersonal { get; set; } = false;
        public bool ForceOverride { get; set; } = false;
        public string? ForceReason { get; set; }
    }

    public class UpdateLeaveAllotmentDto
    {
        public string? EmployeeId { get; set; }
        public int Year { get; set; }
        public int MedicalLeave { get; set; }
        public int CasualLeave { get; set; }
        public int EarnedLeave { get; set; }
        public int SickLeave { get; set; }
        public int PersonalLeave { get; set; }
        public int UnpaidLeave { get; set; }
        public int LeaveWithoutPay { get; set; }
        public bool CarryForwardEarned { get; set; }
        public bool CarryForwardPersonal { get; set; }
        public int UsedMedicalLeave { get; set; } = 0;
        public int UsedCasualLeave { get; set; } = 0;
        public int UsedEarnedLeave { get; set; } = 0;
        public int UsedSickLeave { get; set; } = 0;
        public int UsedPersonalLeave { get; set; } = 0;
        public int UsedUnpaidLeave { get; set; } = 0;
        public int UsedLeaveWithoutPay { get; set; } = 0;
        public bool ForceOverride { get; set; } = false;
        public string? ForceReason { get; set; }
    }

    public class LeaveAllotmentDto
    {
        public string Id { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public int Year { get; set; }
        public int MedicalLeave { get; set; }
        public int CasualLeave { get; set; }
        public int EarnedLeave { get; set; }
        public int SickLeave { get; set; }
        public int PersonalLeave { get; set; }
        public int UnpaidLeave { get; set; }
        public int LeaveWithoutPay { get; set; }
    }

    public class EmployeeLeaveAllotmentDto
    {
        public string Id { get; set; } = string.Empty;
        public int Year { get; set; }
        public int MedicalLeave { get; set; }
        public int CasualLeave { get; set; }
        public int EarnedLeave { get; set; }
        public int SickLeave { get; set; }
        public int PersonalLeave { get; set; }
        public int UnpaidLeave { get; set; }
        public int LeaveWithoutPay { get; set; }
        public bool CarryForwardEarned { get; set; }
        public bool CarryForwardPersonal { get; set; }
        public int UsedMedicalLeave { get; set; } = 0;
        public int UsedCasualLeave { get; set; } = 0;
        public int UsedEarnedLeave { get; set; } = 0;
        public int UsedSickLeave { get; set; } = 0;
        public int UsedPersonalLeave { get; set; } = 0;
        public int UsedUnpaidLeave { get; set; } = 0;
        public int UsedLeaveWithoutPay { get; set; } = 0;
        // Carried forward amounts from previous year
        public int CarriedMedicalLeave { get; set; } = 0;
        public int CarriedCasualLeave { get; set; } = 0;
        public int CarriedEarnedLeave { get; set; } = 0;
        public int CarriedSickLeave { get; set; } = 0;
        public int CarriedPersonalLeave { get; set; } = 0;
        public int CarriedUnpaidLeave { get; set; } = 0;
        public int CarriedLeaveWithoutPay { get; set; } = 0;
    }

    public class BulkLeaveAllotmentDto
    {
        public int Year { get; set; }
        public int MedicalLeave { get; set; } = 0;
        public int CasualLeave { get; set; } = 0;
        public int EarnedLeave { get; set; } = 0;
        public int SickLeave { get; set; } = 0;
        public int PersonalLeave { get; set; } = 0;
        public int UnpaidLeave { get; set; } = 0;
        public int LeaveWithoutPay { get; set; } = 0;
        public bool CarryForwardEarned { get; set; } = false;
        public bool CarryForwardPersonal { get; set; } = false;
        public bool ForceOverride { get; set; } = false;
        public string? ForceReason { get; set; }
    }
}
