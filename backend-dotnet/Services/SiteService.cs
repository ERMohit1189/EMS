using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.DTOs;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class SiteService : ISiteService
    {
        private readonly AppDbContext _context;

        public SiteService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Site?> GetSiteByIdAsync(string id)
        {
            // Return site without navigation properties to avoid circular references
            return await _context.Sites
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task<List<Site>> GetSitesByVendorAsync(string vendorId)
        {
            // Return sites without navigation properties to avoid circular references
            return await _context.Sites
                .AsNoTracking()
                .Where(s => s.VendorId == vendorId)
                .ToListAsync();
        }

        public async Task<List<Site>> GetAllSitesAsync()
        {
            // Return sites without navigation properties to avoid circular references
            return await _context.Sites
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<Site> CreateSiteAsync(Site site)
        {
            site.Id = Guid.NewGuid().ToString();
            _context.Sites.Add(site);
            await _context.SaveChangesAsync();
            return site;
        }

        public async Task<Site?> UpdateSiteAsync(string id, Site site)
        {
            var existing = await _context.Sites.FindAsync(id);
            if (existing == null) return null;

            existing.Name = site.Name;
            existing.Address = site.Address;
            existing.City = site.City;
            existing.State = site.State;
            existing.PartnerCode = site.PartnerCode;
            existing.ZoneId = site.ZoneId;
            existing.Status = site.Status;
            existing.UpdatedAt = DateTime.UtcNow;

            _context.Sites.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<Site?> UpdateSiteAsync(string id, UpdateSiteDto dto)
        {
            var existing = await _context.Sites.FindAsync(id);
            if (existing == null) return null;

            // Basic Info
            if (!string.IsNullOrEmpty(dto.PlanId)) existing.PlanId = dto.PlanId;
            if (!string.IsNullOrEmpty(dto.Name)) existing.Name = dto.Name;
            if (!string.IsNullOrEmpty(dto.SiteId)) existing.SiteId = dto.SiteId;
            if (dto.Sno.HasValue) existing.Sno = dto.Sno;
            if (!string.IsNullOrEmpty(dto.Address)) existing.Address = dto.Address;
            if (!string.IsNullOrEmpty(dto.City)) existing.City = dto.City;
            if (!string.IsNullOrEmpty(dto.State)) existing.State = dto.State;
            if (!string.IsNullOrEmpty(dto.PartnerCode)) existing.PartnerCode = dto.PartnerCode;
            if (!string.IsNullOrEmpty(dto.PartnerName)) existing.PartnerName = dto.PartnerName;
            if (!string.IsNullOrEmpty(dto.ZoneId)) existing.ZoneId = dto.ZoneId;
            if (!string.IsNullOrEmpty(dto.Status)) existing.Status = dto.Status;
            if (!string.IsNullOrEmpty(dto.Circle)) existing.Circle = dto.Circle;

            // HOP Information
            if (!string.IsNullOrEmpty(dto.HopType)) existing.HopType = dto.HopType;
            if (!string.IsNullOrEmpty(dto.HopAB)) existing.HopAB = dto.HopAB;
            if (!string.IsNullOrEmpty(dto.HopBA)) existing.HopBA = dto.HopBA;
            if (!string.IsNullOrEmpty(dto.District)) existing.District = dto.District;
            if (!string.IsNullOrEmpty(dto.Project)) existing.Project = dto.Project;

            // Antenna Information
            if (!string.IsNullOrEmpty(dto.SiteAAntDia)) existing.SiteAAntDia = dto.SiteAAntDia;
            if (!string.IsNullOrEmpty(dto.SiteBAntDia)) existing.SiteBAntDia = dto.SiteBAntDia;
            if (!string.IsNullOrEmpty(dto.MaxAntSize)) existing.MaxAntSize = dto.MaxAntSize;

            // Site Names
            if (!string.IsNullOrEmpty(dto.SiteAName)) existing.SiteAName = dto.SiteAName;
            if (!string.IsNullOrEmpty(dto.SiteBName)) existing.SiteBName = dto.SiteBName;

            // TOCO Information
            if (!string.IsNullOrEmpty(dto.TocoVendorA)) existing.TocoVendorA = dto.TocoVendorA;
            if (!string.IsNullOrEmpty(dto.TocoIdA)) existing.TocoIdA = dto.TocoIdA;
            if (!string.IsNullOrEmpty(dto.TocoVendorB)) existing.TocoVendorB = dto.TocoVendorB;
            if (!string.IsNullOrEmpty(dto.TocoIdB)) existing.TocoIdB = dto.TocoIdB;

            // Media and Status
            if (!string.IsNullOrEmpty(dto.MediaAvailabilityStatus)) existing.MediaAvailabilityStatus = dto.MediaAvailabilityStatus;

            // SR Information
            if (!string.IsNullOrEmpty(dto.SrNoSiteA)) existing.SrNoSiteA = dto.SrNoSiteA;
            if (dto.SrDateSiteA.HasValue) existing.SrDateSiteA = dto.SrDateSiteA;
            if (!string.IsNullOrEmpty(dto.SrNoSiteB)) existing.SrNoSiteB = dto.SrNoSiteB;
            if (dto.SrDateSiteB.HasValue) existing.SrDateSiteB = dto.SrDateSiteB;
            if (dto.HopSrDate.HasValue) existing.HopSrDate = dto.HopSrDate;

            // SP Information
            if (dto.SpDateSiteA.HasValue) existing.SpDateSiteA = dto.SpDateSiteA;
            if (dto.SpDateSiteB.HasValue) existing.SpDateSiteB = dto.SpDateSiteB;
            if (dto.HopSpDate.HasValue) existing.HopSpDate = dto.HopSpDate;

            // SO Information
            if (dto.SoReleasedDateSiteA.HasValue) existing.SoReleasedDateSiteA = dto.SoReleasedDateSiteA;
            if (dto.SoReleasedDateSiteB.HasValue) existing.SoReleasedDateSiteB = dto.SoReleasedDateSiteB;
            if (dto.HopSoDate.HasValue) existing.HopSoDate = dto.HopSoDate;

            // RFAI Information
            if (dto.RfaiOfferedDateSiteA.HasValue) existing.RfaiOfferedDateSiteA = dto.RfaiOfferedDateSiteA;
            if (dto.RfaiOfferedDateSiteB.HasValue) existing.RfaiOfferedDateSiteB = dto.RfaiOfferedDateSiteB;
            if (dto.ActualHopRfaiOfferedDate.HasValue) existing.ActualHopRfaiOfferedDate = dto.ActualHopRfaiOfferedDate;
            if (dto.RfaiSurveyCompletionDate.HasValue) existing.RfaiSurveyCompletionDate = dto.RfaiSurveyCompletionDate;

            // MO Information
            if (!string.IsNullOrEmpty(dto.MoNumberSiteA)) existing.MoNumberSiteA = dto.MoNumberSiteA;
            if (!string.IsNullOrEmpty(dto.MaterialTypeSiteA)) existing.MaterialTypeSiteA = dto.MaterialTypeSiteA;
            if (dto.MoDateSiteA.HasValue) existing.MoDateSiteA = dto.MoDateSiteA;
            if (!string.IsNullOrEmpty(dto.MoNumberSiteB)) existing.MoNumberSiteB = dto.MoNumberSiteB;
            if (!string.IsNullOrEmpty(dto.MaterialTypeSiteB)) existing.MaterialTypeSiteB = dto.MaterialTypeSiteB;
            if (dto.MoDateSiteB.HasValue) existing.MoDateSiteB = dto.MoDateSiteB;

            // SRN/RMO Information
            if (!string.IsNullOrEmpty(dto.SrnRmoNumber)) existing.SrnRmoNumber = dto.SrnRmoNumber;
            if (dto.SrnRmoDate.HasValue) existing.SrnRmoDate = dto.SrnRmoDate;
            if (dto.HopMoDate.HasValue) existing.HopMoDate = dto.HopMoDate;
            if (dto.HopMaterialDispatchDate.HasValue) existing.HopMaterialDispatchDate = dto.HopMaterialDispatchDate;
            if (dto.HopMaterialDeliveryDate.HasValue) existing.HopMaterialDeliveryDate = dto.HopMaterialDeliveryDate;
            if (!string.IsNullOrEmpty(dto.MaterialDeliveryStatus)) existing.MaterialDeliveryStatus = dto.MaterialDeliveryStatus;

            // Installation Information
            if (dto.SiteAInstallationDate.HasValue) existing.SiteAInstallationDate = dto.SiteAInstallationDate;
            if (!string.IsNullOrEmpty(dto.PtwNumberSiteA)) existing.PtwNumberSiteA = dto.PtwNumberSiteA;
            if (!string.IsNullOrEmpty(dto.PtwStatusA)) existing.PtwStatusA = dto.PtwStatusA;
            if (dto.SiteBInstallationDate.HasValue) existing.SiteBInstallationDate = dto.SiteBInstallationDate;
            if (!string.IsNullOrEmpty(dto.PtwNumberSiteB)) existing.PtwNumberSiteB = dto.PtwNumberSiteB;
            if (!string.IsNullOrEmpty(dto.PtwStatusB)) existing.PtwStatusB = dto.PtwStatusB;
            if (dto.HopIcDate.HasValue) existing.HopIcDate = dto.HopIcDate;
            if (dto.AlignmentDate.HasValue) existing.AlignmentDate = dto.AlignmentDate;
            if (!string.IsNullOrEmpty(dto.HopInstallationRemarks)) existing.HopInstallationRemarks = dto.HopInstallationRemarks;

            // NMS Information
            if (!string.IsNullOrEmpty(dto.VisibleInNms)) existing.VisibleInNms = dto.VisibleInNms;
            if (dto.NmsVisibleDate.HasValue) existing.NmsVisibleDate = dto.NmsVisibleDate;

            // AT Information
            if (dto.SoftAtOfferDate.HasValue) existing.SoftAtOfferDate = dto.SoftAtOfferDate;
            if (dto.SoftAtAcceptanceDate.HasValue) existing.SoftAtAcceptanceDate = dto.SoftAtAcceptanceDate;
            if (!string.IsNullOrEmpty(dto.SoftAtStatus)) existing.SoftAtStatus = dto.SoftAtStatus;
            if (dto.PhyAtOfferDate.HasValue) existing.PhyAtOfferDate = dto.PhyAtOfferDate;
            if (dto.PhyAtAcceptanceDate.HasValue) existing.PhyAtAcceptanceDate = dto.PhyAtAcceptanceDate;
            if (!string.IsNullOrEmpty(dto.PhyAtStatus)) existing.PhyAtStatus = dto.PhyAtStatus;
            if (!string.IsNullOrEmpty(dto.BothAtStatus)) existing.BothAtStatus = dto.BothAtStatus;

            // PRI Information
            if (!string.IsNullOrEmpty(dto.PriIssueCategory)) existing.PriIssueCategory = dto.PriIssueCategory;
            if (!string.IsNullOrEmpty(dto.PriSiteId)) existing.PriSiteId = dto.PriSiteId;
            if (dto.PriOpenDate.HasValue) existing.PriOpenDate = dto.PriOpenDate;
            if (dto.PriCloseDate.HasValue) existing.PriCloseDate = dto.PriCloseDate;
            if (!string.IsNullOrEmpty(dto.PriHistory)) existing.PriHistory = dto.PriHistory;

            // Survey Information
            if (dto.RfiSurveyAllocationDate.HasValue) existing.RfiSurveyAllocationDate = dto.RfiSurveyAllocationDate;
            if (!string.IsNullOrEmpty(dto.Descope)) existing.Descope = dto.Descope;
            if (!string.IsNullOrEmpty(dto.ReasonOfExtraVisit)) existing.ReasonOfExtraVisit = dto.ReasonOfExtraVisit;

            // WCC Information
            if (!string.IsNullOrEmpty(dto.WccReceived80Percent)) existing.WccReceived80Percent = dto.WccReceived80Percent;
            if (dto.WccReceivedDate80Percent.HasValue) existing.WccReceivedDate80Percent = dto.WccReceivedDate80Percent;
            if (!string.IsNullOrEmpty(dto.WccReceived20Percent)) existing.WccReceived20Percent = dto.WccReceived20Percent;
            if (dto.WccReceivedDate20Percent.HasValue) existing.WccReceivedDate20Percent = dto.WccReceivedDate20Percent;
            if (dto.WccReceivedDate100Percent.HasValue) existing.WccReceivedDate100Percent = dto.WccReceivedDate100Percent;

            // Final Survey
            if (!string.IsNullOrEmpty(dto.Survey)) existing.Survey = dto.Survey;
            if (!string.IsNullOrEmpty(dto.FinalPartnerSurvey)) existing.FinalPartnerSurvey = dto.FinalPartnerSurvey;
            if (dto.SurveyDate.HasValue) existing.SurveyDate = dto.SurveyDate;

            existing.UpdatedAt = DateTime.UtcNow;
            _context.Sites.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteSiteAsync(string id)
        {
            var site = await _context.Sites.FindAsync(id);
            if (site == null) return false;

            _context.Sites.Remove(site);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<BatchUpsertResult> BatchUpsertSitesAsync(List<dynamic> sites)
        {
            var result = new BatchUpsertResult { Successful = 0, Failed = 0, Errors = new List<UpsertError>() };

            if (sites == null || sites.Count == 0)
                return result;

            try
            {
                // Step 1: Extract planIds and find existing ones
                var planIds = new List<string>();
                var planIdMap = new Dictionary<string, dynamic>(); // Map planId to site object

                foreach (var site in sites)
                {
                    try
                    {
                        string planId = GetDynamicProperty(site, "planId")?.ToString() ?? string.Empty;
                        if (!string.IsNullOrEmpty(planId))
                        {
                            planIds.Add(planId);
                            if (!planIdMap.ContainsKey(planId))
                                planIdMap[planId] = site;
                        }
                    }
                    catch { }
                }

                // Get existing plan IDs from database
                var existingPlanIds = await _context.Sites
                    .Where(s => planIds.Contains(s.PlanId))
                    .Select(s => s.PlanId)
                    .ToListAsync();
                var existingPlanIdSet = new HashSet<string>(existingPlanIds);

                // Step 2: Split into INSERT and UPDATE groups
                var insertSites = new List<Site>();
                var updateSites = new List<(string planId, Site site)>();

                foreach (var site in sites)
                {
                    try
                    {
                        var mappedSite = MapDynamicToSite(site);
                        string planId = GetDynamicProperty(site, "planId")?.ToString() ?? string.Empty;

                        if (existingPlanIdSet.Contains(planId))
                        {
                            updateSites.Add((planId, mappedSite));
                        }
                        else
                        {
                            insertSites.Add(mappedSite);
                        }
                    }
                    catch (Exception ex)
                    {
                        result.Failed++;
                        result.Errors.Add(new UpsertError
                        {
                            PlanId = GetDynamicProperty(site, "planId")?.ToString() ?? "-",
                            SiteId = GetDynamicProperty(site, "siteId")?.ToString() ?? "-",
                            Error = $"Mapping error: {ex.Message}"
                        });
                    }
                }

                // Step 3: Perform INSERTs
                const int batchSize = 100;
                for (int i = 0; i < insertSites.Count; i += batchSize)
                {
                    var batch = insertSites.Skip(i).Take(batchSize).ToList();
                    try
                    {
                        _context.Sites.AddRange(batch);
                        await _context.SaveChangesAsync();
                        result.Successful += batch.Count;
                    }
                    catch (Exception ex)
                    {
                        result.Failed += batch.Count;
                        foreach (var site in batch)
                        {
                            result.Errors.Add(new UpsertError
                            {
                                PlanId = site.Name ?? "-",
                                SiteId = site.Id ?? "-",
                                Error = $"Insert failed: {ex.Message}"
                            });
                        }
                    }
                }

                // Step 4: Perform UPDATEs with all 80+ fields
                foreach (var (planId, site) in updateSites)
                {
                    try
                    {
                        var existing = await _context.Sites.FirstOrDefaultAsync(s => s.PlanId == planId);
                        if (existing != null)
                        {
                            // Basic Info
                            existing.PlanId = site.PlanId;
                            existing.Name = site.Name;
                            existing.SiteId = site.SiteId;
                            existing.Sno = site.Sno;
                            existing.Address = site.Address;
                            existing.City = site.City;
                            existing.State = site.State;
                            existing.PartnerCode = site.PartnerCode;
                            existing.PartnerName = site.PartnerName;
                            existing.VendorId = site.VendorId;
                            existing.ZoneId = site.ZoneId;
                            existing.Status = site.Status;
                            existing.Circle = site.Circle;

                            // HOP Information
                            existing.HopType = site.HopType;
                            existing.HopAB = site.HopAB;
                            existing.HopBA = site.HopBA;
                            existing.District = site.District;
                            existing.Project = site.Project;

                            // Antenna Information
                            existing.SiteAAntDia = site.SiteAAntDia;
                            existing.SiteBAntDia = site.SiteBAntDia;
                            existing.MaxAntSize = site.MaxAntSize;

                            // Site Names
                            existing.SiteAName = site.SiteAName;
                            existing.SiteBName = site.SiteBName;

                            // TOCO Information
                            existing.TocoVendorA = site.TocoVendorA;
                            existing.TocoIdA = site.TocoIdA;
                            existing.TocoVendorB = site.TocoVendorB;
                            existing.TocoIdB = site.TocoIdB;

                            // Media and Status
                            existing.MediaAvailabilityStatus = site.MediaAvailabilityStatus;

                            // SR Information
                            existing.SrNoSiteA = site.SrNoSiteA;
                            existing.SrDateSiteA = site.SrDateSiteA;
                            existing.SrNoSiteB = site.SrNoSiteB;
                            existing.SrDateSiteB = site.SrDateSiteB;
                            existing.HopSrDate = site.HopSrDate;

                            // SP Information
                            existing.SpDateSiteA = site.SpDateSiteA;
                            existing.SpDateSiteB = site.SpDateSiteB;
                            existing.HopSpDate = site.HopSpDate;

                            // SO Information
                            existing.SoReleasedDateSiteA = site.SoReleasedDateSiteA;
                            existing.SoReleasedDateSiteB = site.SoReleasedDateSiteB;
                            existing.HopSoDate = site.HopSoDate;

                            // RFAI Information
                            existing.RfaiOfferedDateSiteA = site.RfaiOfferedDateSiteA;
                            existing.RfaiOfferedDateSiteB = site.RfaiOfferedDateSiteB;
                            existing.ActualHopRfaiOfferedDate = site.ActualHopRfaiOfferedDate;
                            existing.RfaiSurveyCompletionDate = site.RfaiSurveyCompletionDate;

                            // MO Information
                            existing.MoNumberSiteA = site.MoNumberSiteA;
                            existing.MaterialTypeSiteA = site.MaterialTypeSiteA;
                            existing.MoDateSiteA = site.MoDateSiteA;
                            existing.MoNumberSiteB = site.MoNumberSiteB;
                            existing.MaterialTypeSiteB = site.MaterialTypeSiteB;
                            existing.MoDateSiteB = site.MoDateSiteB;

                            // SRN/RMO Information
                            existing.SrnRmoNumber = site.SrnRmoNumber;
                            existing.SrnRmoDate = site.SrnRmoDate;
                            existing.HopMoDate = site.HopMoDate;
                            existing.HopMaterialDispatchDate = site.HopMaterialDispatchDate;
                            existing.HopMaterialDeliveryDate = site.HopMaterialDeliveryDate;
                            existing.MaterialDeliveryStatus = site.MaterialDeliveryStatus;

                            // Installation Information
                            existing.SiteAInstallationDate = site.SiteAInstallationDate;
                            existing.PtwNumberSiteA = site.PtwNumberSiteA;
                            existing.PtwStatusA = site.PtwStatusA;
                            existing.SiteBInstallationDate = site.SiteBInstallationDate;
                            existing.PtwNumberSiteB = site.PtwNumberSiteB;
                            existing.PtwStatusB = site.PtwStatusB;
                            existing.HopIcDate = site.HopIcDate;
                            existing.AlignmentDate = site.AlignmentDate;
                            existing.HopInstallationRemarks = site.HopInstallationRemarks;

                            // NMS Information
                            existing.VisibleInNms = site.VisibleInNms;
                            existing.NmsVisibleDate = site.NmsVisibleDate;

                            // AT Information
                            existing.SoftAtOfferDate = site.SoftAtOfferDate;
                            existing.SoftAtAcceptanceDate = site.SoftAtAcceptanceDate;
                            existing.SoftAtStatus = site.SoftAtStatus;
                            existing.PhyAtOfferDate = site.PhyAtOfferDate;
                            existing.PhyAtAcceptanceDate = site.PhyAtAcceptanceDate;
                            existing.PhyAtStatus = site.PhyAtStatus;
                            existing.BothAtStatus = site.BothAtStatus;

                            // PRI Information
                            existing.PriIssueCategory = site.PriIssueCategory;
                            existing.PriSiteId = site.PriSiteId;
                            existing.PriOpenDate = site.PriOpenDate;
                            existing.PriCloseDate = site.PriCloseDate;
                            existing.PriHistory = site.PriHistory;

                            // Survey Information
                            existing.RfiSurveyAllocationDate = site.RfiSurveyAllocationDate;
                            existing.Descope = site.Descope;
                            existing.ReasonOfExtraVisit = site.ReasonOfExtraVisit;

                            // WCC Information
                            existing.WccReceived80Percent = site.WccReceived80Percent;
                            existing.WccReceivedDate80Percent = site.WccReceivedDate80Percent;
                            existing.WccReceived20Percent = site.WccReceived20Percent;
                            existing.WccReceivedDate20Percent = site.WccReceivedDate20Percent;
                            existing.WccReceivedDate100Percent = site.WccReceivedDate100Percent;

                            // Final Survey
                            existing.Survey = site.Survey;
                            existing.FinalPartnerSurvey = site.FinalPartnerSurvey;
                            existing.SurveyDate = site.SurveyDate;

                            existing.UpdatedAt = DateTime.UtcNow;

                            _context.Sites.Update(existing);
                            await _context.SaveChangesAsync();
                            result.Successful++;
                        }
                        else
                        {
                            result.Failed++;
                            result.Errors.Add(new UpsertError
                            {
                                PlanId = planId,
                                SiteId = "-",
                                Error = "Site not found for update"
                            });
                        }
                    }
                    catch (Exception ex)
                    {
                        result.Failed++;
                        result.Errors.Add(new UpsertError
                        {
                            PlanId = planId,
                            SiteId = "-",
                            Error = $"Update failed: {ex.Message}"
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                result.Failed = sites.Count;
                result.Errors.Add(new UpsertError
                {
                    PlanId = "-",
                    SiteId = "-",
                    Error = $"Batch operation failed: {ex.Message}"
                });
            }

            return result;
        }

        public async Task<Dictionary<string, object>> GetAtpCountsAsync()
        {
            try
            {
                var totalCount = await _context.Sites.CountAsync();

                // Get all sites with their AT status fields
                var sites = await _context.Sites
                    .AsNoTracking()
                    .Select(s => new
                    {
                        PhyAtStatus = s.PhyAtStatus,
                        SoftAtStatus = s.SoftAtStatus
                    })
                    .ToListAsync();

                // Count PHY AT Status
                var phy = sites
                    .Where(s => !string.IsNullOrEmpty(s.PhyAtStatus))
                    .GroupBy(s => s.PhyAtStatus)
                    .ToDictionary(g => g.Key, g => g.Count());

                // Count SOFT AT Status
                var soft = sites
                    .Where(s => !string.IsNullOrEmpty(s.SoftAtStatus))
                    .GroupBy(s => s.SoftAtStatus)
                    .ToDictionary(g => g.Key, g => g.Count());

                return new Dictionary<string, object>
                {
                    { "phy", phy },
                    { "soft", soft },
                    { "totalCount", totalCount }
                };
            }
            catch (Exception)
            {
                return new Dictionary<string, object>
                {
                    { "phy", new Dictionary<string, int>() },
                    { "soft", new Dictionary<string, int>() },
                    { "totalCount", 0 }
                };
            }
        }

        public async Task<BulkUpdateStatusResult> BulkUpdateStatusByPlanAsync(List<string> planIds, string? phyAtStatus, string? softAtStatus, bool shouldApproveStatus)
        {
            var result = new BulkUpdateStatusResult { Successful = 0, Failed = 0 };

            try
            {
                // Find all sites matching the plan IDs
                var sitesToUpdate = await _context.Sites
                    .Where(s => planIds.Contains(s.PlanId))
                    .ToListAsync();

                if (sitesToUpdate.Count == 0)
                    return result;

                // Update each site
                foreach (var site in sitesToUpdate)
                {
                    try
                    {
                        // Update AT statuses if provided
                        if (!string.IsNullOrEmpty(phyAtStatus))
                            site.PhyAtStatus = phyAtStatus;

                        if (!string.IsNullOrEmpty(softAtStatus))
                            site.SoftAtStatus = softAtStatus;

                        // If both are Approved, update site status
                        if (shouldApproveStatus && phyAtStatus == "Approved" && softAtStatus == "Approved")
                        {
                            site.Status = "Approved";
                        }

                        site.UpdatedAt = DateTime.UtcNow;
                        _context.Sites.Update(site);
                        result.Successful++;
                    }
                    catch (Exception ex)
                    {
                        result.Failed++;
                    }
                }

                // Save all changes in one go
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                result.Failed = planIds.Count - result.Successful;
            }

            return result;
        }

        private Site MapDynamicToSite(dynamic siteData)
        {
            return new Site
            {
                Id = Guid.NewGuid().ToString(),
                PlanId = GetDynamicProperty(siteData, "planId")?.ToString(),
                Name = GetDynamicProperty(siteData, "name")?.ToString() ?? GetDynamicProperty(siteData, "siteName")?.ToString() ?? Guid.NewGuid().ToString(),
                SiteId = GetDynamicProperty(siteData, "siteId")?.ToString(),
                Sno = TryParseInt(GetDynamicProperty(siteData, "sno")),
                Address = GetDynamicProperty(siteData, "address")?.ToString(),
                City = GetDynamicProperty(siteData, "city")?.ToString(),
                State = GetDynamicProperty(siteData, "state")?.ToString(),
                PartnerCode = GetDynamicProperty(siteData, "partnerCode")?.ToString(),
                PartnerName = GetDynamicProperty(siteData, "partnerName")?.ToString(),
                VendorId = GetDynamicProperty(siteData, "vendorId")?.ToString() ?? string.Empty,
                ZoneId = GetDynamicProperty(siteData, "zoneId")?.ToString(),
                Status = GetDynamicProperty(siteData, "status")?.ToString() ?? "Pending",
                Circle = GetDynamicProperty(siteData, "circle")?.ToString(),

                // HOP Information
                HopType = GetDynamicProperty(siteData, "hopType")?.ToString(),
                HopAB = GetDynamicProperty(siteData, "hopAB")?.ToString(),
                HopBA = GetDynamicProperty(siteData, "hopBA")?.ToString(),
                District = GetDynamicProperty(siteData, "district")?.ToString(),
                Project = GetDynamicProperty(siteData, "project")?.ToString(),

                // Antenna Information
                SiteAAntDia = GetDynamicProperty(siteData, "siteAAntDia")?.ToString(),
                SiteBAntDia = GetDynamicProperty(siteData, "siteBAntDia")?.ToString(),
                MaxAntSize = GetDynamicProperty(siteData, "maxAntSize")?.ToString(),

                // Site Names
                SiteAName = GetDynamicProperty(siteData, "siteAName")?.ToString(),
                SiteBName = GetDynamicProperty(siteData, "siteBName")?.ToString(),

                // TOCO Information
                TocoVendorA = GetDynamicProperty(siteData, "tocoVendorA")?.ToString(),
                TocoIdA = GetDynamicProperty(siteData, "tocoIdA")?.ToString(),
                TocoVendorB = GetDynamicProperty(siteData, "tocoVendorB")?.ToString(),
                TocoIdB = GetDynamicProperty(siteData, "tocoIdB")?.ToString(),

                // Media and Status
                MediaAvailabilityStatus = GetDynamicProperty(siteData, "mediaAvailabilityStatus")?.ToString(),

                // SR Information
                SrNoSiteA = GetDynamicProperty(siteData, "srNoSiteA")?.ToString(),
                SrDateSiteA = TryParseDate(GetDynamicProperty(siteData, "srDateSiteA")),
                SrNoSiteB = GetDynamicProperty(siteData, "srNoSiteB")?.ToString(),
                SrDateSiteB = TryParseDate(GetDynamicProperty(siteData, "srDateSiteB")),
                HopSrDate = TryParseDate(GetDynamicProperty(siteData, "hopSrDate")),

                // SP Information
                SpDateSiteA = TryParseDate(GetDynamicProperty(siteData, "spDateSiteA")),
                SpDateSiteB = TryParseDate(GetDynamicProperty(siteData, "spDateSiteB")),
                HopSpDate = TryParseDate(GetDynamicProperty(siteData, "hopSpDate")),

                // SO Information
                SoReleasedDateSiteA = TryParseDate(GetDynamicProperty(siteData, "soReleasedDateSiteA")),
                SoReleasedDateSiteB = TryParseDate(GetDynamicProperty(siteData, "soReleasedDateSiteB")),
                HopSoDate = TryParseDate(GetDynamicProperty(siteData, "hopSoDate")),

                // RFAI Information
                RfaiOfferedDateSiteA = TryParseDate(GetDynamicProperty(siteData, "rfaiOfferedDateSiteA")),
                RfaiOfferedDateSiteB = TryParseDate(GetDynamicProperty(siteData, "rfaiOfferedDateSiteB")),
                ActualHopRfaiOfferedDate = TryParseDate(GetDynamicProperty(siteData, "actualHopRfaiOfferedDate")),
                RfaiSurveyCompletionDate = TryParseDate(GetDynamicProperty(siteData, "rfaiSurveyCompletionDate")),

                // MO Information
                MoNumberSiteA = GetDynamicProperty(siteData, "moNumberSiteA")?.ToString(),
                MaterialTypeSiteA = GetDynamicProperty(siteData, "materialTypeSiteA")?.ToString(),
                MoDateSiteA = TryParseDate(GetDynamicProperty(siteData, "moDateSiteA")),
                MoNumberSiteB = GetDynamicProperty(siteData, "moNumberSiteB")?.ToString(),
                MaterialTypeSiteB = GetDynamicProperty(siteData, "materialTypeSiteB")?.ToString(),
                MoDateSiteB = TryParseDate(GetDynamicProperty(siteData, "moDateSiteB")),

                // SRN/RMO Information
                SrnRmoNumber = GetDynamicProperty(siteData, "srnRmoNumber")?.ToString(),
                SrnRmoDate = TryParseDate(GetDynamicProperty(siteData, "srnRmoDate")),
                HopMoDate = TryParseDate(GetDynamicProperty(siteData, "hopMoDate")),
                HopMaterialDispatchDate = TryParseDate(GetDynamicProperty(siteData, "hopMaterialDispatchDate")),
                HopMaterialDeliveryDate = TryParseDate(GetDynamicProperty(siteData, "hopMaterialDeliveryDate")),
                MaterialDeliveryStatus = GetDynamicProperty(siteData, "materialDeliveryStatus")?.ToString(),

                // Installation Information
                SiteAInstallationDate = TryParseDate(GetDynamicProperty(siteData, "siteAInstallationDate")),
                PtwNumberSiteA = GetDynamicProperty(siteData, "ptwNumberSiteA")?.ToString(),
                PtwStatusA = GetDynamicProperty(siteData, "ptwStatusA")?.ToString(),
                SiteBInstallationDate = TryParseDate(GetDynamicProperty(siteData, "siteBInstallationDate")),
                PtwNumberSiteB = GetDynamicProperty(siteData, "ptwNumberSiteB")?.ToString(),
                PtwStatusB = GetDynamicProperty(siteData, "ptwStatusB")?.ToString(),
                HopIcDate = TryParseDate(GetDynamicProperty(siteData, "hopIcDate")),
                AlignmentDate = TryParseDate(GetDynamicProperty(siteData, "alignmentDate")),
                HopInstallationRemarks = GetDynamicProperty(siteData, "hopInstallationRemarks")?.ToString(),

                // NMS Information
                VisibleInNms = GetDynamicProperty(siteData, "visibleInNms")?.ToString(),
                NmsVisibleDate = TryParseDate(GetDynamicProperty(siteData, "nmsVisibleDate")),

                // AT Information
                SoftAtOfferDate = TryParseDate(GetDynamicProperty(siteData, "softAtOfferDate")),
                SoftAtAcceptanceDate = TryParseDate(GetDynamicProperty(siteData, "softAtAcceptanceDate")),
                SoftAtStatus = GetDynamicProperty(siteData, "softAtStatus")?.ToString() ?? "Pending",
                PhyAtOfferDate = TryParseDate(GetDynamicProperty(siteData, "phyAtOfferDate")),
                PhyAtAcceptanceDate = TryParseDate(GetDynamicProperty(siteData, "phyAtAcceptanceDate")),
                PhyAtStatus = GetDynamicProperty(siteData, "phyAtStatus")?.ToString() ?? "Pending",
                BothAtStatus = GetDynamicProperty(siteData, "bothAtStatus")?.ToString(),

                // PRI Information
                PriIssueCategory = GetDynamicProperty(siteData, "priIssueCategory")?.ToString(),
                PriSiteId = GetDynamicProperty(siteData, "priSiteId")?.ToString(),
                PriOpenDate = TryParseDate(GetDynamicProperty(siteData, "priOpenDate")),
                PriCloseDate = TryParseDate(GetDynamicProperty(siteData, "priCloseDate")),
                PriHistory = GetDynamicProperty(siteData, "priHistory")?.ToString(),

                // Survey Information
                RfiSurveyAllocationDate = TryParseDate(GetDynamicProperty(siteData, "rfiSurveyAllocationDate")),
                Descope = GetDynamicProperty(siteData, "descope")?.ToString(),
                ReasonOfExtraVisit = GetDynamicProperty(siteData, "reasonOfExtraVisit")?.ToString(),

                // WCC Information
                WccReceived80Percent = GetDynamicProperty(siteData, "wccReceived80Percent")?.ToString(),
                WccReceivedDate80Percent = TryParseDate(GetDynamicProperty(siteData, "wccReceivedDate80Percent")),
                WccReceived20Percent = GetDynamicProperty(siteData, "wccReceived20Percent")?.ToString(),
                WccReceivedDate20Percent = TryParseDate(GetDynamicProperty(siteData, "wccReceivedDate20Percent")),
                WccReceivedDate100Percent = TryParseDate(GetDynamicProperty(siteData, "wccReceivedDate100Percent")),

                // Final Survey
                Survey = GetDynamicProperty(siteData, "survey")?.ToString(),
                FinalPartnerSurvey = GetDynamicProperty(siteData, "finalPartnerSurvey")?.ToString(),
                SurveyDate = TryParseDate(GetDynamicProperty(siteData, "surveyDate")),

                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
        }

        private DateTime? TryParseDate(object? value)
        {
            if (value == null) return null;
            if (value is DateTime dt) return dt;

            var str = value.ToString()?.Trim();
            if (string.IsNullOrEmpty(str)) return null;

            if (DateTime.TryParse(str, out var result))
                return result;

            return null;
        }

        private int? TryParseInt(object? value)
        {
            if (value == null) return null;
            if (value is int i) return i;

            var str = value.ToString()?.Trim();
            if (string.IsNullOrEmpty(str)) return null;

            if (int.TryParse(str, out var result))
                return result;

            return null;
        }

        private object? GetDynamicProperty(dynamic obj, string propertyName)
        {
            try
            {
                if (obj is JsonElement jsonElement)
                {
                    if (jsonElement.TryGetProperty(propertyName, out var result))
                        return result;
                }
                else if (obj is Dictionary<string, object> dict)
                {
                    if (dict.TryGetValue(propertyName, out var value))
                        return value;
                }
                else
                {
                    var property = obj.GetType().GetProperty(propertyName,
                        System.Reflection.BindingFlags.IgnoreCase | System.Reflection.BindingFlags.Public);
                    if (property != null)
                        return property.GetValue(obj);
                }
            }
            catch { }
            return null;
        }
    }
}
