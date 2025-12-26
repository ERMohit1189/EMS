using System.ComponentModel.DataAnnotations.Schema;

namespace VendorRegistrationBackend.Models
{
    public class Site
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();

        // Basic Info
        [Column("plan_id")]
        public string? PlanId { get; set; }
        [Column("name")]
        public string Name { get; set; } = string.Empty;
        [Column("sno")]
        public int? Sno { get; set; }
        [Column("address")]
        public string? Address { get; set; }
        [Column("city")]
        public string? City { get; set; }
        [Column("state")]
        public string? State { get; set; }
        [Column("partner_code")]
        public string? PartnerCode { get; set; }
        [Column("partner_name")]
        public string? PartnerName { get; set; }
        [Column("vendor_id")]
        public string VendorId { get; set; } = string.Empty;
        [Column("zone_id")]
        public string? ZoneId { get; set; }
        [Column("status")]
        public string Status { get; set; } = "Pending";
        [Column("circle")]
        public string? Circle { get; set; }

        // HOP Information
        [Column("hop_type")]
        public string? HopType { get; set; }
        [Column("hop_ab")]
        public string? HopAB { get; set; }
        [Column("hop_ba")]
        public string? HopBA { get; set; }
        [Column("district")]
        public string? District { get; set; }
        [Column("project")]
        public string? Project { get; set; }

        // Antenna Information
        [Column("site_a_ant_dia")]
        public string? SiteAAntDia { get; set; }
        [Column("site_b_ant_dia")]
        public string? SiteBAntDia { get; set; }
        [Column("max_ant_size")]
        public string? MaxAntSize { get; set; }

        // Site Names
        [Column("site_a_name")]
        public string? SiteAName { get; set; }
        [Column("site_b_name")]
        public string? SiteBName { get; set; }

        // TOCO Information
        [Column("toco_vendor_a")]
        public string? TocoVendorA { get; set; }
        [Column("toco_id_a")]
        public string? TocoIdA { get; set; }
        [Column("toco_vendor_b")]
        public string? TocoVendorB { get; set; }
        [Column("toco_id_b")]
        public string? TocoIdB { get; set; }

        // Media and Status
        [Column("media_availability_status")]
        public string? MediaAvailabilityStatus { get; set; }

        // SR Information
        [Column("sr_no_site_a")]
        public string? SrNoSiteA { get; set; }
        [Column("sr_date_site_a")]
        public DateTime? SrDateSiteA { get; set; }
        [Column("sr_no_site_b")]
        public string? SrNoSiteB { get; set; }
        [Column("sr_date_site_b")]
        public DateTime? SrDateSiteB { get; set; }
        [Column("hop_sr_date")]
        public DateTime? HopSrDate { get; set; }

        // SP Information
        [Column("sp_date_site_a")]
        public DateTime? SpDateSiteA { get; set; }
        [Column("sp_date_site_b")]
        public DateTime? SpDateSiteB { get; set; }
        [Column("hop_sp_date")]
        public DateTime? HopSpDate { get; set; }

        // SO Information
        [Column("so_released_date_site_a")]
        public DateTime? SoReleasedDateSiteA { get; set; }
        [Column("so_released_date_site_b")]
        public DateTime? SoReleasedDateSiteB { get; set; }
        [Column("hop_so_date")]
        public DateTime? HopSoDate { get; set; }

        // RFAI Information
        [Column("rfai_offered_date_site_a")]
        public DateTime? RfaiOfferedDateSiteA { get; set; }
        [Column("rfai_offered_date_site_b")]
        public DateTime? RfaiOfferedDateSiteB { get; set; }
        [Column("actual_hop_rfai_offered_date")]
        public DateTime? ActualHopRfaiOfferedDate { get; set; }
        [Column("rfai_survey_completion_date")]
        public DateTime? RfaiSurveyCompletionDate { get; set; }

        // MO Information
        [Column("mo_number_site_a")]
        public string? MoNumberSiteA { get; set; }
        [Column("material_type_site_a")]
        public string? MaterialTypeSiteA { get; set; }
        [Column("mo_date_site_a")]
        public DateTime? MoDateSiteA { get; set; }
        [Column("mo_number_site_b")]
        public string? MoNumberSiteB { get; set; }
        [Column("material_type_site_b")]
        public string? MaterialTypeSiteB { get; set; }
        [Column("mo_date_site_b")]
        public DateTime? MoDateSiteB { get; set; }

        // SRN/RMO Information
        [Column("srn_rmo_number")]
        public string? SrnRmoNumber { get; set; }
        [Column("srn_rmo_date")]
        public DateTime? SrnRmoDate { get; set; }
        [Column("hop_mo_date")]
        public DateTime? HopMoDate { get; set; }
        [Column("hop_material_dispatch_date")]
        public DateTime? HopMaterialDispatchDate { get; set; }
        [Column("hop_material_delivery_date")]
        public DateTime? HopMaterialDeliveryDate { get; set; }
        [Column("material_delivery_status")]
        public string? MaterialDeliveryStatus { get; set; }

        // Installation Information
        [Column("site_a_installation_date")]
        public DateTime? SiteAInstallationDate { get; set; }
        [Column("ptw_number_site_a")]
        public string? PtwNumberSiteA { get; set; }
        [Column("ptw_status_a")]
        public string? PtwStatusA { get; set; }
        [Column("site_b_installation_date")]
        public DateTime? SiteBInstallationDate { get; set; }
        [Column("ptw_number_site_b")]
        public string? PtwNumberSiteB { get; set; }
        [Column("ptw_status_b")]
        public string? PtwStatusB { get; set; }
        [Column("hop_ic_date")]
        public DateTime? HopIcDate { get; set; }
        [Column("alignment_date")]
        public DateTime? AlignmentDate { get; set; }
        [Column("hop_installation_remarks")]
        public string? HopInstallationRemarks { get; set; }

        // NMS Information
        [Column("visible_in_nms")]
        public string? VisibleInNms { get; set; }
        [Column("nms_visible_date")]
        public DateTime? NmsVisibleDate { get; set; }

        // AT Information
        [Column("soft_at_offer_date")]
        public DateTime? SoftAtOfferDate { get; set; }
        [Column("soft_at_acceptance_date")]
        public DateTime? SoftAtAcceptanceDate { get; set; }
        [Column("soft_at_status")]
        public string? SoftAtStatus { get; set; } = "Pending";
        [Column("phy_at_offer_date")]
        public DateTime? PhyAtOfferDate { get; set; }
        [Column("phy_at_acceptance_date")]
        public DateTime? PhyAtAcceptanceDate { get; set; }
        [Column("phy_at_status")]
        public string? PhyAtStatus { get; set; } = "Pending";
        [Column("both_at_status")]
        public string? BothAtStatus { get; set; }

        // PRI Information
        [Column("pri_issue_category")]
        public string? PriIssueCategory { get; set; }
        [Column("pri_site_id")]
        public string? PriSiteId { get; set; }
        [Column("pri_open_date")]
        public DateTime? PriOpenDate { get; set; }
        [Column("pri_close_date")]
        public DateTime? PriCloseDate { get; set; }
        [Column("pri_history")]
        public string? PriHistory { get; set; }

        // Survey Information
        [Column("rfi_survey_allocation_date")]
        public DateTime? RfiSurveyAllocationDate { get; set; }
        [Column("descope")]
        public string? Descope { get; set; }
        [Column("reason_of_extra_visit")]
        public string? ReasonOfExtraVisit { get; set; }

        // WCC Information
        [Column("wcc_received_80_percent")]
        public string? WccReceived80Percent { get; set; }
        [Column("wcc_received_date_80_percent")]
        public DateTime? WccReceivedDate80Percent { get; set; }
        [Column("wcc_received_20_percent")]
        public string? WccReceived20Percent { get; set; }
        [Column("wcc_received_date_20_percent")]
        public DateTime? WccReceivedDate20Percent { get; set; }
        [Column("wcc_received_date_100_percent")]
        public DateTime? WccReceivedDate100Percent { get; set; }

        // Final Survey
        [Column("survey")]
        public string? Survey { get; set; }
        [Column("final_partner_survey")]
        public string? FinalPartnerSurvey { get; set; }
        [Column("survey_date")]
        public DateTime? SurveyDate { get; set; }

        // Timestamps
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Vendor? Vendor { get; set; }
        public Zone? Zone { get; set; }
        public ICollection<PurchaseOrderLine> PurchaseOrderLines { get; set; } = new List<PurchaseOrderLine>();
        public ICollection<PaymentMaster> PaymentMasters { get; set; } = new List<PaymentMaster>();
    }
}
