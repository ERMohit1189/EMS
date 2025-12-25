import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/api";
import { fetchWithLoader } from "@/lib/fetchWithLoader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { truncateId } from "@/lib/utils";
import * as XLSX from "xlsx";
import { createColorfulExcel, fetchExportHeader, type ExportHeader } from "@/lib/exportUtils";

export default function SiteList() {
  const [sites, setSites] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [exportHeader, setExportHeader] = useState<ExportHeader | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSites, setTotalSites] = useState(0);
  const [pageSize] = useState(50); // Show 50 sites per page

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCircle, setFilterCircle] = useState('All');
  const [filterVendor, setFilterVendor] = useState('All');

  // Get unique circles and statuses for filters
  const [circles, setCircles] = useState<string[]>([]);

  // Initialize startDate to 1 year ago, endDate to today
  const today = new Date().toISOString().split('T')[0];
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(oneYearAgo);
  const [endDate, setEndDate] = useState(today);

  // Fetch sites with pagination and search/filters
  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoading(true);

        // Scroll to top smoothly
        const tableElement = document.querySelector('[data-sitelist-table]');
        if (tableElement) {
          tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Build search and filter parameters
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('pageSize', pageSize.toString());

        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }
        if (filterStatus !== 'All') {
          params.append('status', filterStatus);
        }
        if (filterCircle !== 'All') {
          params.append('circle', filterCircle);
        }
        if (filterVendor !== 'All') {
          params.append('vendorId', filterVendor);
        }

        console.log(`[SiteList] Fetching page ${currentPage} with params:`, params.toString());

        const sitesResponse = await fetch(`${getApiBaseUrl()}/api/sites?${params.toString()}`);
        if (sitesResponse.ok) {
          const { data, totalCount } = await sitesResponse.json();
          setSites(data || []);
          setTotalSites(totalCount || 0);
          console.log(`[SiteList] Loaded page ${currentPage}: ${(data || []).length} sites out of ${totalCount || 0}`);
        } else {
          console.error('[SiteList] API error:', sitesResponse.status, sitesResponse.statusText);
          setSites([]);
          setTotalSites(0);
        }
      } catch (error) {
        console.error('[SiteList] Failed to fetch sites:', error);
        setSites([]);
        setTotalSites(0);
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, [currentPage, pageSize, searchQuery, filterStatus, filterCircle, filterVendor]);

  // Fetch vendors for filter dropdown (deferred to not block initial load)
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        // Use requestIdleCallback if available for non-blocking load
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(async () => {
            const vendorsResponse = await fetch(`${getApiBaseUrl()}/api/vendors?pageSize=500`);
            if (vendorsResponse.ok) {
              const { data } = await vendorsResponse.json();
              setVendors(data || []);
            }
          }, { timeout: 3000 });
        } else {
          // Fallback: defer with setTimeout
          const timer = setTimeout(async () => {
            const vendorsResponse = await fetch(`${getApiBaseUrl()}/api/vendors?pageSize=500`);
            if (vendorsResponse.ok) {
              const { data } = await vendorsResponse.json();
              setVendors(data || []);
            }
          }, 500);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('Failed to fetch vendors:', error);
      }
    };

    fetchVendors();
  }, []);

  // Fetch export header (deferred to not block initial load)
  useEffect(() => {
    const loadExportHeader = async () => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(async () => {
          const header = await fetchExportHeader();
          setExportHeader(header);
        }, { timeout: 3000 });
      } else {
        const timer = setTimeout(async () => {
          const header = await fetchExportHeader();
          setExportHeader(header);
        }, 1000);
        return () => clearTimeout(timer);
      }
    };
    loadExportHeader();
  }, []);

  // Extract unique circles from current sites for filter options
  useEffect(() => {
    const uniqueCircles = Array.from(new Set(sites.map(s => s.circle).filter(Boolean)));
    setCircles(uniqueCircles as string[]);
  }, [sites]);

  // Calculate pagination info
  const totalPages = Math.ceil(totalSites / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalSites);

  // Create vendor lookup maps for O(1) performance (vs O(n) with find)
  const vendorMap = React.useMemo(() => {
    const map = new Map();
    vendors.forEach((v: any) => {
      map.set(v.id, { name: v.name, code: v.vendorCode });
    });
    return map;
  }, [vendors]);

  const getVendorName = React.useCallback((vendorId: string) => {
    return vendorMap.get(vendorId)?.name || "N/A";
  }, [vendorMap]);

  const getVendorCode = React.useCallback((vendorId: string) => {
    return vendorMap.get(vendorId)?.code || "N/A";
  }, [vendorMap]);

  const columnHeaders = {
    siteId: "Site ID",
    sno: "S.No",
    circle: "Circle",
    planId: "Plan ID",
    nominalAop: "Nominal AOP",
    hopType: "HOP Type",
    hopAB: "HOP A-B",
    hopBA: "HOP B-A",
    district: "District",
    project: "Project",
    state: "State",
    region: "Region",
    inside: "Inside/Outside",
    zoneName: "Zone Name",
    siteAAntDia: "Site A Antenna Dia",
    siteBAntDia: "Site B Antenna Dia",
    maxAntSize: "Max Antenna Size",
    siteAName: "Site A Name",
    tocoVendorA: "TOCO Vendor A",
    tocoIdA: "TOCO ID A",
    siteBName: "Site B Name",
    tocoVendorB: "TOCO Vendor B",
    tocoIdB: "TOCO ID B",
    mediaAvailabilityStatus: "Media Availability Status",
    srNoSiteA: "SR No Site A",
    srDateSiteA: "SR Date Site A",
    srNoSiteB: "SR No Site B",
    srDateSiteB: "SR Date Site B",
    hopSrDate: "HOP SR Date",
    spDateSiteA: "SP Date Site A",
    spDateSiteB: "SP Date Site B",
    hopSpDate: "HOP SP Date",
    soReleasedDateSiteA: "SO Released Date Site A",
    soReleasedDateSiteB: "SO Released Date Site B",
    hopSoDate: "HOP SO Date",
    rfaiOfferedDateSiteA: "RFAI Offered Date Site A",
    rfaiOfferedDateSiteB: "RFAI Offered Date Site B",
    actualHopRfaiOfferedDate: "Actual HOP RFAI Offered Date",
    partnerName: "Partner Name",
    rfaiSurveyCompletionDate: "RFAI Survey Completion Date",
    moNumberSiteA: "MO Number Site A",
    materialTypeSiteA: "Material Type Site A",
    moDateSiteA: "MO Date Site A",
    moNumberSiteB: "MO Number Site B",
    materialTypeSiteB: "Material Type Site B",
    moDateSiteB: "MO Date Site B",
    srnRmoNumber: "SRN RMO Number",
    srnRmoDate: "SRN RMO Date",
    hopMoDate: "HOP MO Date",
    hopMaterialDispatchDate: "HOP Material Dispatch Date",
    hopMaterialDeliveryDate: "HOP Material Delivery Date",
    materialDeliveryStatus: "Material Delivery Status",
    siteAInstallationDate: "Site A Installation Date",
    ptwNumberSiteA: "PTW Number Site A",
    ptwStatusA: "PTW Status A",
    siteBInstallationDate: "Site B Installation Date",
    ptwNumberSiteB: "PTW Number Site B",
    ptwStatusB: "PTW Status B",
    hopIcDate: "HOP IC Date",
    alignmentDate: "Alignment Date",
    hopInstallationRemarks: "HOP Installation Remarks",
    visibleInNms: "Visible In NMS",
    nmsVisibleDate: "NMS Visible Date",
    softAtOfferDate: "Soft AT Offer Date",
    softAtAcceptanceDate: "Soft AT Acceptance Date",
    softAtStatus: "Soft AT Status",
    softAtRemark: "Soft AT Remark",
    phyAtOfferDate: "Physical AT Offer Date",
    phyAtAcceptanceDate: "Physical AT Acceptance Date",
    phyAtStatus: "Physical AT Status",
    phyAtRemark: "Physical AT Remark",
    bothAtStatus: "Both AT Status",
    atpRemark: "ATP Remark",
    priIssueCategory: "PRI Issue Category",
    priSiteId: "PRI Site ID",
    priOpenDate: "PRI Open Date",
    priCloseDate: "PRI Close Date",
    priHistory: "PRI History",
    rfiSurveyAllocationDate: "RFI Survey Allocation Date",
    descope: "Descope",
    reasonOfExtraVisit: "Reason of Extra Visit",
    wccReceived80Percent: "WCC Received 80%",
    wccReceivedDate80Percent: "WCC Received Date 80%",
    wccReceived20Percent: "WCC Received 20%",
    wccReceivedDate20Percent: "WCC Received Date 20%",
    wccReceivedDate100Percent: "WCC Received Date 100%",
    survey: "Survey",
    finalPartnerSurvey: "Final Partner Survey",
    surveyDate: "Survey Date",
    status: "Status",
    siteAmount: "Site Amount",
    vendorAmount: "Vendor Amount",
    antennaSize: "Antenna Size",
    incDate: "Inception Date",
    formNo: "Form No",
    createdAt: "Created At",
    updatedAt: "Updated At"
  };

  const handleExportByDateRange = async () => {
    try {
      if (!startDate || !endDate) {
        alert("Please select both start and end dates");
        return;
      }
      
      const response = await fetch(`/api/sites/export/by-date-range?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error("Export failed");
      
      const { data } = await response.json();
      
      if (!data || data.length === 0) {
        alert("No sites found for the selected date range");
        return;
      }
      
      // Create all column headers with friendly names
      const allColumnKeys = Object.keys(columnHeaders);
      const headerRow = allColumnKeys.map(key => (columnHeaders as any)[key]);
      
      // Transform data to include all columns in order
      const transformedData = data.map((site: any) => {
        return allColumnKeys.map(key => site[key] ?? "");
      });
      
      // Add header row at the beginning
      const dataWithHeaders = [headerRow, ...transformedData];
      
      // Create colorful Excel export
      const columnWidths = allColumnKeys.map(() => 18);
      createColorfulExcel(dataWithHeaders, columnWidths, `sites_export_${startDate}_to_${endDate}.xlsx`, "Site List", exportHeader || undefined, "SITE LIST EXPORT");
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export sites");
    }
  };

  // Don't show full page skeleton - only show loading on the table area
  const showEmptyState = !loading && sites.length === 0 && totalSites === 0;

  if (showEmptyState) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Site Management</h2>
            <p className="text-muted-foreground">Manage all registered sites.</p>
          </div>
          <Link href="/vendor/site/register">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Register Site
            </Button>
          </Link>
        </div>
        <div className="p-8 text-center text-muted-foreground">No sites found. Register one to get started.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Site Management</h2>
          <p className="text-muted-foreground">
            Showing {totalSites === 0 ? 0 : startIndex} to {endIndex} of {totalSites.toLocaleString()} sites
          </p>
        </div>
        <Link href="/vendor/site/register">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Register Site
          </Button>
        </Link>
      </div>

      {/* Search and Filter Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Input */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Search Sites</label>
              <input
                type="text"
                placeholder="Search by Site ID, Plan ID, or Vendor Name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Circle Filter */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Filter by Circle</label>
                <select
                  value={filterCircle}
                  onChange={(e) => {
                    setFilterCircle(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="All">All Circles</option>
                  {circles.map((circle) => (
                    <option key={circle} value={circle}>
                      {circle}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vendor Filter */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Filter by Vendor</label>
                <select
                  value={filterVendor}
                  onChange={(e) => {
                    setFilterVendor(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="All">All Vendors</option>
                  {vendors.map((vendor: any) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(searchQuery || filterStatus !== 'All' || filterCircle !== 'All' || filterVendor !== 'All') && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('All');
                    setFilterCircle('All');
                    setFilterVendor('All');
                    setCurrentPage(1);
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Date Range Export Section */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Start Date</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">End Date</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <Button 
              onClick={handleExportByDateRange} 
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              data-testid="button-export-by-date"
            >
              <Download className="h-4 w-4" /> Export by Date Range
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table View */}
      <div className="rounded-md border bg-card overflow-hidden relative" data-sitelist-table>
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="p-3 text-left font-semibold w-12 sticky top-0 z-20 bg-primary text-primary-foreground">#</th>
                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Plan ID</th>
                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Vendor Code</th>
                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Vendor</th>
                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Circle</th>
                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">State</th>
                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Antenna Size</th>
                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Soft AT</th>
                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Physical AT</th>
                <th className="p-3 text-right font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Vendor Amount</th>
                <th className="p-3 text-center font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Show loading skeleton rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`loading-${idx}`} className="border-b animate-pulse">
                    <td className="p-3" colSpan={11}>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : sites.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-muted-foreground">
                    No sites found matching your filters.
                  </td>
                </tr>
              ) : (
                // Actual site rows
                sites.map((site, idx) => (
                  <React.Fragment key={site.id}>
                    <tr
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedSite(expandedSite === site.id ? null : site.id)}
                    >
                      <td className="p-3 text-muted-foreground">{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td className="p-3 font-medium text-primary">{site.planId || "—"}</td>
                      <td className="p-3 font-mono text-xs font-bold">{getVendorCode(site.vendorId)}</td>
                      <td className="p-3">{getVendorName(site.vendorId)}</td>
                      <td className="p-3">{site.circle || "—"}</td>
                      <td className="p-3">{site.state || "—"}</td>
                      <td className="p-3">{site.maxAntSize || "—"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${site.softAtStatus === 'Accepted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {site.softAtStatus || "—"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${site.phyAtStatus === 'Accepted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {site.phyAtStatus || "—"}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono">
                        {site.vendorAmount ? `Rs ${parseFloat(site.vendorAmount).toFixed(2)}` : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedSite(expandedSite === site.id ? null : site.id);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {expandedSite === site.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {expandedSite === site.id && (
                      <tr className="bg-muted/20">
                        <td colSpan={11} className="p-0">
                          <div className="p-6 space-y-6">
                            {/* Basic Information */}
                            <div>
                              <h3 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-primary"></span>
                                Basic Information
                              </h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-card p-3 rounded-md border">
                                  <label className="text-xs font-medium text-muted-foreground">Site ID</label>
                                  <p className="text-sm font-mono font-semibold mt-1">{site.siteId || "—"}</p>
                                </div>
                                <div className="bg-card p-3 rounded-md border">
                                  <label className="text-xs font-medium text-muted-foreground">Form No</label>
                                  <p className="text-sm font-mono font-semibold mt-1">{site.formNo || "—"}</p>
                                </div>
                                <div className="bg-card p-3 rounded-md border">
                                  <label className="text-xs font-medium text-muted-foreground">HOP A-B</label>
                                  <p className="text-sm font-semibold mt-1">{site.hopAB || "—"}</p>
                                </div>
                                <div className="bg-card p-3 rounded-md border">
                                  <label className="text-xs font-medium text-muted-foreground">HOP B-A</label>
                                  <p className="text-sm font-semibold mt-1">{site.hopBA || "—"}</p>
                                </div>
                                <div className="bg-card p-3 rounded-md border">
                                  <label className="text-xs font-medium text-muted-foreground">HOP Type</label>
                                  <p className="text-sm font-semibold mt-1">{site.hopType || "—"}</p>
                                </div>
                                <div className="bg-card p-3 rounded-md border">
                                  <label className="text-xs font-medium text-muted-foreground">Project</label>
                                  <p className="text-sm font-semibold mt-1">{site.project || "—"}</p>
                                </div>
                                <div className="bg-card p-3 rounded-md border">
                                  <label className="text-xs font-medium text-muted-foreground">District</label>
                                  <p className="text-sm font-semibold mt-1">{site.district || "—"}</p>
                                </div>
                                <div className="bg-card p-3 rounded-md border">
                                  <label className="text-xs font-medium text-muted-foreground">Region</label>
                                  <p className="text-sm font-semibold mt-1">{site.region || "—"}</p>
                                </div>
                              </div>
                            </div>

                            {/* Site Details */}
                            <div>
                              <h3 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-primary"></span>
                                Site Details
                              </h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-card p-3 rounded-md border">
                                  <label className="text-xs font-medium text-muted-foreground">Site A Name</label>
                                  <p className="text-sm font-semibold mt-1">{site.siteAName || "—"}</p>
                                </div>
                                <div className="bg-card p-3 rounded-md border">
                                  <label className="text-xs font-medium text-muted-foreground">Site B Name</label>
                                  <p className="text-sm font-semibold mt-1">{site.siteBName || "—"}</p>
                                </div>
                                <div className="bg-card p-3 rounded-md border">
                                  <label className="text-xs font-medium text-muted-foreground">Partner Name</label>
                                  <p className="text-sm font-semibold mt-1">{site.partnerName || "—"}</p>
                                </div>
                                <div className="bg-card p-3 rounded-md border">
                                  <label className="text-xs font-medium text-muted-foreground">Installation Type</label>
                                  <p className="text-sm font-semibold mt-1">{site.inside ? "Inside" : "Outside"}</p>
                                </div>
                              </div>
                            </div>

                            {/* AT Status */}
                            <div>
                              <h3 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-primary"></span>
                                AT Status & Dates
                              </h3>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200">
                                  <label className="text-xs font-medium text-blue-700">Soft AT Offer Date</label>
                                  <p className="text-sm font-semibold mt-1">{site.softAtOfferDate || "—"}</p>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200">
                                  <label className="text-xs font-medium text-blue-700">Soft AT Acceptance Date</label>
                                  <p className="text-sm font-semibold mt-1">{site.softAtAcceptanceDate || "—"}</p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md border border-green-200">
                                  <label className="text-xs font-medium text-green-700">Phy AT Offer Date</label>
                                  <p className="text-sm font-semibold mt-1">{site.phyAtOfferDate || "—"}</p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md border border-green-200">
                                  <label className="text-xs font-medium text-green-700">Phy AT Acceptance Date</label>
                                  <p className="text-sm font-semibold mt-1">{site.phyAtAcceptanceDate || "—"}</p>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-md border border-purple-200">
                                  <label className="text-xs font-medium text-purple-700">Both AT Status</label>
                                  <p className="text-sm font-semibold mt-1">{site.bothAtStatus || "—"}</p>
                                </div>
                                <div className="bg-card p-3 rounded-md border">
                                  <label className="text-xs font-medium text-muted-foreground">NMS Visible</label>
                                  <p className="text-sm font-semibold mt-1">{site.visibleInNms || "—"}</p>
                                </div>
                              </div>
                            </div>

                            {/* Financial Details */}
                            <div>
                              <h3 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-amber-500"></span>
                                Financial Details
                              </h3>
                              <div className="grid grid-cols-1 gap-3">
                                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-md border-2 border-amber-300">
                                  <label className="text-xs font-medium text-amber-700">Vendor Amount</label>
                                  <p className="text-lg font-mono font-bold mt-1 text-amber-900">{site.vendorAmount ? `Rs ${parseFloat(site.vendorAmount).toFixed(2)}` : "—"}</p>
                                </div>
                              </div>
                            </div>

                            {/* Remarks */}
                            {(site.softAtRemark || site.phyAtRemark || site.atpRemark) && (
                              <div>
                                <h3 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                                  <span className="h-1 w-1 rounded-full bg-primary"></span>
                                  Remarks
                                </h3>
                                <div className="space-y-2">
                                  {site.softAtRemark && (
                                    <div className="bg-card p-3 rounded-md border">
                                      <label className="text-xs font-medium text-muted-foreground">Soft AT Remark</label>
                                      <p className="text-sm mt-1">{site.softAtRemark}</p>
                                    </div>
                                  )}
                                  {site.phyAtRemark && (
                                    <div className="bg-card p-3 rounded-md border">
                                      <label className="text-xs font-medium text-muted-foreground">Physical AT Remark</label>
                                      <p className="text-sm mt-1">{site.phyAtRemark}</p>
                                    </div>
                                  )}
                                  {site.atpRemark && (
                                    <div className="bg-card p-3 rounded-md border">
                                      <label className="text-xs font-medium text-muted-foreground">ATP Remark</label>
                                      <p className="text-sm mt-1">{site.atpRemark}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalSites > 0 && (
        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/40 dark:to-gray-900/60">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Pagination Info */}
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Page {currentPage} of {totalPages}</span>
                {' '} • {' '}
                <span>Showing {startIndex} - {endIndex} of {totalSites.toLocaleString()} sites</span>
              </div>

              {/* Pagination Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  disabled={currentPage === 1 || loading}
                  className="px-3 py-2 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>

                {/* Page Numbers */}
                <div className="flex gap-1">
                  {totalPages <= 5 ? (
                    // Show all pages if 5 or less
                    Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCurrentPage(page);
                        }}
                        disabled={loading}
                        className={`px-3 py-2 text-sm border rounded-md ${
                          currentPage === page
                            ? 'bg-primary text-white border-primary'
                            : 'hover:bg-muted'
                        } disabled:opacity-50`}
                      >
                        {page}
                      </button>
                    ))
                  ) : (
                    // Show smart pagination for more than 5 pages
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCurrentPage(1);
                        }}
                        disabled={loading}
                        className={`px-3 py-2 text-sm border rounded-md ${
                          currentPage === 1 ? 'bg-primary text-white border-primary' : 'hover:bg-muted'
                        }`}
                      >
                        1
                      </button>
                      {currentPage > 3 && (
                        <span className="px-2 py-1 text-muted-foreground">...</span>
                      )}
                      {Array.from({ length: 3 }, (_, i) => currentPage - 1 + i)
                        .filter((p) => p > 1 && p < totalPages)
                        .map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCurrentPage(page);
                            }}
                            disabled={loading}
                            className={`px-3 py-2 text-sm border rounded-md ${
                              currentPage === page
                                ? 'bg-primary text-white border-primary'
                                : 'hover:bg-muted'
                            } disabled:opacity-50`}
                          >
                            {page}
                          </button>
                        ))}
                      {currentPage < totalPages - 2 && (
                        <span className="px-2 py-1 text-muted-foreground">...</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCurrentPage(totalPages);
                        }}
                        disabled={loading}
                        className={`px-3 py-2 text-sm border rounded-md ${
                          currentPage === totalPages ? 'bg-primary text-white border-primary' : 'hover:bg-muted'
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                  }}
                  disabled={currentPage === totalPages || loading}
                  className="px-3 py-2 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>

              {/* Items Per Page Info */}
              <div className="text-sm text-muted-foreground">
                {pageSize} items per page
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
