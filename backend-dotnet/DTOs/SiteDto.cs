namespace VendorRegistrationBackend.DTOs
{
    public class CreateSiteDto
    {
        public string Name { get; set; } = string.Empty;
        public string VendorId { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? ZoneId { get; set; }
        public string Status { get; set; } = "Active";
    }

    public class UpdateSiteDto
    {
        public string? PlanId { get; set; }
        public string? Name { get; set; }
        public string? SiteId { get; set; }
        public int? Sno { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? PartnerCode { get; set; }
        public string? PartnerName { get; set; }
        public string? ZoneId { get; set; }
        public string? Status { get; set; }
        public string? Circle { get; set; }

        // HOP Information
        public string? HopType { get; set; }
        public string? HopAB { get; set; }
        public string? HopBA { get; set; }
        public string? District { get; set; }
        public string? Project { get; set; }

        // Antenna Information
        public string? SiteAAntDia { get; set; }
        public string? SiteBAntDia { get; set; }
        public string? MaxAntSize { get; set; }

        // Site Names
        public string? SiteAName { get; set; }
        public string? SiteBName { get; set; }

        // TOCO Information
        public string? TocoVendorA { get; set; }
        public string? TocoIdA { get; set; }
        public string? TocoVendorB { get; set; }
        public string? TocoIdB { get; set; }

        // Media and Status
        public string? MediaAvailabilityStatus { get; set; }

        // SR Information
        public string? SrNoSiteA { get; set; }
        public DateTime? SrDateSiteA { get; set; }
        public string? SrNoSiteB { get; set; }
        public DateTime? SrDateSiteB { get; set; }
        public DateTime? HopSrDate { get; set; }

        // SP Information
        public DateTime? SpDateSiteA { get; set; }
        public DateTime? SpDateSiteB { get; set; }
        public DateTime? HopSpDate { get; set; }

        // SO Information
        public DateTime? SoReleasedDateSiteA { get; set; }
        public DateTime? SoReleasedDateSiteB { get; set; }
        public DateTime? HopSoDate { get; set; }

        // RFAI Information
        public DateTime? RfaiOfferedDateSiteA { get; set; }
        public DateTime? RfaiOfferedDateSiteB { get; set; }
        public DateTime? ActualHopRfaiOfferedDate { get; set; }
        public DateTime? RfaiSurveyCompletionDate { get; set; }

        // MO Information
        public string? MoNumberSiteA { get; set; }
        public string? MaterialTypeSiteA { get; set; }
        public DateTime? MoDateSiteA { get; set; }
        public string? MoNumberSiteB { get; set; }
        public string? MaterialTypeSiteB { get; set; }
        public DateTime? MoDateSiteB { get; set; }

        // SRN/RMO Information
        public string? SrnRmoNumber { get; set; }
        public DateTime? SrnRmoDate { get; set; }
        public DateTime? HopMoDate { get; set; }
        public DateTime? HopMaterialDispatchDate { get; set; }
        public DateTime? HopMaterialDeliveryDate { get; set; }
        public string? MaterialDeliveryStatus { get; set; }

        // Installation Information
        public DateTime? SiteAInstallationDate { get; set; }
        public string? PtwNumberSiteA { get; set; }
        public string? PtwStatusA { get; set; }
        public DateTime? SiteBInstallationDate { get; set; }
        public string? PtwNumberSiteB { get; set; }
        public string? PtwStatusB { get; set; }
        public DateTime? HopIcDate { get; set; }
        public DateTime? AlignmentDate { get; set; }
        public string? HopInstallationRemarks { get; set; }

        // NMS Information
        public string? VisibleInNms { get; set; }
        public DateTime? NmsVisibleDate { get; set; }

        // AT Information
        public DateTime? SoftAtOfferDate { get; set; }
        public DateTime? SoftAtAcceptanceDate { get; set; }
        public string? SoftAtStatus { get; set; }
        public DateTime? PhyAtOfferDate { get; set; }
        public DateTime? PhyAtAcceptanceDate { get; set; }
        public string? PhyAtStatus { get; set; }
        public string? BothAtStatus { get; set; }

        // PRI Information
        public string? PriIssueCategory { get; set; }
        public string? PriSiteId { get; set; }
        public DateTime? PriOpenDate { get; set; }
        public DateTime? PriCloseDate { get; set; }
        public string? PriHistory { get; set; }

        // Survey Information
        public DateTime? RfiSurveyAllocationDate { get; set; }
        public string? Descope { get; set; }
        public string? ReasonOfExtraVisit { get; set; }

        // WCC Information
        public string? WccReceived80Percent { get; set; }
        public DateTime? WccReceivedDate80Percent { get; set; }
        public string? WccReceived20Percent { get; set; }
        public DateTime? WccReceivedDate20Percent { get; set; }
        public DateTime? WccReceivedDate100Percent { get; set; }

        // Final Survey
        public string? Survey { get; set; }
        public string? FinalPartnerSurvey { get; set; }
        public DateTime? SurveyDate { get; set; }
    }

    public class SiteDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string VendorId { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? City { get; set; }
        public string Status { get; set; } = "Active";
    }

    public class BatchUpsertSitesDto
    {
        public List<dynamic> Sites { get; set; } = new List<dynamic>();
    }

    public class BatchUpsertResult
    {
        public int Successful { get; set; }
        public int Failed { get; set; }
        public List<UpsertError> Errors { get; set; } = new List<UpsertError>();
    }

    public class UpsertError
    {
        public string PlanId { get; set; } = string.Empty;
        public string SiteId { get; set; } = string.Empty;
        public string Error { get; set; } = string.Empty;
    }

    public class BulkUpdateStatusDto
    {
        public List<string> PlanIds { get; set; } = new List<string>();
        public string? PhyAtStatus { get; set; }
        public string? SoftAtStatus { get; set; }
        public bool ShouldApproveStatus { get; set; }
    }

    public class BulkUpdateStatusResult
    {
        public int Successful { get; set; }
        public int Failed { get; set; }
    }
}
