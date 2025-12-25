import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SmartSearchTextbox from "@/components/SmartSearchTextbox";
import { getApiBaseUrl } from "@/lib/api";
import { fetchWithLoader } from "@/lib/fetchWithLoader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { truncateId } from "@/lib/utils";
import * as XLSX from "xlsx";
import { createColorfulExcel, fetchExportHeader, type ExportHeader } from "@/lib/exportUtils";

export default function SiteList() {
  const [sites, setSites] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorTotalCount, setVendorTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [siteDetails, setSiteDetails] = useState<Record<string, any>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [exportHeader, setExportHeader] = useState<ExportHeader | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSites, setTotalSites] = useState(0);

  // Table filter and sorting state
  const [tableFilter, setTableFilter] = useState(''); // Text filter for table footer
  const [debouncedTableFilter, setDebouncedTableFilter] = useState(tableFilter);
  const [showSearchableColumns, setShowSearchableColumns] = useState(false); // Toggle searchable columns visibility
  const [installFrom, setInstallFrom] = useState('');
  const [installTo, setInstallTo] = useState('');
  const [installYear, setInstallYear] = useState('');
  const [vendorFilter, setVendorFilter] = useState(''); // Vendor-specific smart filter (name or code)
  const [vendorIdFilter, setVendorIdFilter] = useState<string | null>(null); // track vendor id when a suggestion is selected
  const [vendorLoading, setVendorLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Helper: list of years for the Install Year select (descending)
  const years = React.useMemo(() => {
    const cur = new Date().getFullYear();
    const arr: string[] = [];
    for (let y = cur; y >= 2000; y--) arr.push(String(y));
    return arr;
  }, []);

  // Pagination size (user controllable)
  const [pageSize, setPageSize] = useState(50);

  // Sorting state
  const [sortBy, setSortBy] = useState<'planId' | 'circle' | 'vendorName' | 'maxAntSize' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch site details lazily
  const loadSiteDetails = async (id: string) => {
    if (!id) return;
    if (siteDetails[id]) return siteDetails[id];
    try {
      setLoadingDetailId(id);
      const res = await fetch(`${getApiBaseUrl()}/api/sites/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSiteDetails((prev) => ({ ...prev, [id]: data }));
        return data;
      } else {
        console.error('Failed to load site details', res.statusText);
      }
    } catch (err) {
      console.error('Error fetching site details', err);
    } finally {
      setLoadingDetailId(null);
    }
    return null;
  };

  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoading(true); // Always show loader instantly

        // Scroll to top if the table is off-screen to avoid a sudden jump on page change
        const tableElement = document.querySelector('[data-sitelist-table]') as HTMLElement | null;
        if (tableElement) {
          const rect = tableElement.getBoundingClientRect();
          const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
          // Only scroll if the table is not fully visible in the viewport
          const isFullyVisible = rect.top >= 0 && rect.bottom <= viewportHeight;
          if (!isFullyVisible) {
            try {
              // Adjust scroll to account for a sticky header so the top rows aren't hidden
              const headerEl = document.querySelector('header');
              const headerOffset = headerEl ? (headerEl.getBoundingClientRect().height || (headerEl as any).offsetHeight || 0) : 0;
              // Set scroll-margin-top so other anchor scrolls use the same offset
              try { (tableElement.style as any).scrollMarginTop = `${headerOffset + 8}px`; } catch (e) {}
              const targetY = Math.max(0, window.scrollY + rect.top - headerOffset - 8);
              window.scrollTo({ top: targetY, behavior: 'smooth' });
            } catch (err) {
              // Fallback to basic scrollIntoView if anything goes wrong
              try { tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
            }
          }
        }

        // Build pagination parameters
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('pageSize', pageSize.toString());
        if (installFrom) params.append('siteAInstallFrom', installFrom);
        if (installTo) params.append('siteAInstallTo', installTo);
        // If vendor selected by id, pass vendorId; otherwise if vendor text present use it as search
        if (vendorIdFilter) params.append('vendorId', vendorIdFilter);
        else if (vendorFilter) params.append('search', vendorFilter);
        // Table quick-search overrides generic search (debounced)
        if (debouncedTableFilter) params.append('search', debouncedTableFilter);

        const sitesResponse = await fetch(`${getApiBaseUrl()}/api/sites?${params.toString()}`);
        if (sitesResponse.ok) {
          const { data, totalCount } = await sitesResponse.json();
          setSites(data || []);
          setTotalSites(totalCount || 0);
        } else {
          console.error('[SiteList] API error:', sitesResponse.status);
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

    // clear selections when vendor or table filters change
    // (selection and inline amount editing removed from this view) 
  }, [currentPage, pageSize, installFrom, installTo, debouncedTableFilter, vendorIdFilter]);



  // Debounce the tableFilter so we don't fire requests on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTableFilter(tableFilter), 300);
    return () => clearTimeout(t);
  }, [tableFilter]);

  // When an install year is selected, set installFrom/installTo to the year's range
  useEffect(() => {
    if (!installYear) return;
    const from = `${installYear}-01-01`;
    const to = `${installYear}-12-31`;
    setInstallFrom(from);
    setInstallTo(to);
    setCurrentPage(1);
  }, [installYear]);

  // Fetch vendors for the vendor smart search (load a large page so datalist can scroll)
  useEffect(() => {
        const fetchVendors = async () => {
      try {
        setVendorLoading(true);
        const vendorsResponse = await fetch(`${getApiBaseUrl()}/api/vendors/all?minimal=true`);
        if (vendorsResponse.ok) {
          const json = await vendorsResponse.json();
          const data = json.data || [];
          const totalCount = typeof json.totalCount === 'number' ? json.totalCount : (json.total || null);
          setVendorTotalCount(totalCount ?? null);
          const sorted = (data || []).slice().sort((a: any, b: any) => {
            const ca = (a.vendorCode || '').toString();
            const cb = (b.vendorCode || '').toString();
            return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: 'base' });
          });
          setVendors(sorted);
        }
      } catch (error) {
        console.error('Failed to fetch vendors for suggestions:', error);
      } finally {
        setVendorLoading(false);
      }
    };

    // Defer non-blocking vendor fetch slightly to not block initial render
    const timer = setTimeout(fetchVendors, 200);
    return () => clearTimeout(timer);
  }, []); // keep fetching vendors, component will consume suggestions from `vendors` and `sites`

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

  // Calculate pagination info
  const totalPages = Math.ceil(totalSites / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalSites);

  // Create vendor lookup maps for O(1) performance (vs O(n) with find)
  const vendorMap = React.useMemo(() => {
    const map = new Map();
    // Prefer vendor info included in site rows (single-query) to avoid separate vendor fetch latency
    sites.forEach((s: any) => {
      if (s.vendorId) {
        map.set(s.vendorId, { name: s.vendorName || s.partnerName || null, code: s.vendorCode || s.partnerCode || null });
      }
    });

    // Merge deferred vendor list as fallback (kept for completeness)
    vendors.forEach((v: any) => {
      if (!map.has(v.id)) {
        map.set(v.id, { name: v.name, code: v.vendorCode });
      }
    });

    return map;
  }, [vendors, sites]);

  // Typeahead suggestions derived from sites + vendor DB list
  const filteredSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const normalize = (s: string) => s.trim();

    const all = [
      ...sites.map(s => ({ name: s.vendorName || s.partnerName || '', code: s.vendorCode || s.partnerCode || '' })),
      ...vendors.map(v => ({ name: v.name || '', code: v.vendorCode || '' }))
    ].filter(x => x.name || x.code)
      .map(x => ({ name: normalize(x.name || ''), code: normalize(x.code || '') }))
      .map(x => ({ label: `${x.name}${x.code ? ` — ${x.code}` : ''}`, name: x.name, code: x.code }));

    for (const item of all) {
      if (!seen.has(item.label)) {
        seen.add(item.label);
      }
    }

    const list = Array.from(seen).map(l => {
      const [namePart, codePart] = l.split('—').map(p => p.trim());
      return { label: l, name: namePart, code: (codePart || '') };
    });

    const q = vendorFilter.trim().toLowerCase();
    if (!q) return list.slice(0, 200);

    return list.filter(item => item.label.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)).slice(0, 200);
  }, [sites, vendors, vendorFilter]);

  const getVendorName = React.useCallback((vendorId: string) => {
    return vendorMap.get(vendorId)?.name || "N/A";
  }, [vendorMap]);

  const getVendorCode = React.useCallback((vendorId: string) => {
    return vendorMap.get(vendorId)?.code || "N/A";
  }, [vendorMap]);

  // Dropdown outside-click handling is handled by the `SmartSearchTextbox` component.

  const columnHeaders = {
    id: "Site ID",
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
      // Export ALL columns and values returned by the DB rows (use the actual keys present in response)
      let dataWithHeaders: any[];
      let columnWidths: number[];
      if (data && data.length > 0) {
        const allColumnKeys = Object.keys(data[0]);
        const headerRow = allColumnKeys;
        const transformedData = data.map((site: any) => allColumnKeys.map(key => site[key] ?? ""));
        dataWithHeaders = [headerRow, ...transformedData];
        columnWidths = allColumnKeys.map(() => 18);
      } else {
        const allColumnKeys = Object.keys(columnHeaders);
        const headerRow = allColumnKeys.map(key => (columnHeaders as any)[key]);
        const transformedData = data.map((site: any) => allColumnKeys.map(key => site[key] ?? ""));
        dataWithHeaders = [headerRow, ...transformedData];
        columnWidths = allColumnKeys.map(() => 18);
      }

      // Create colorful Excel export
      createColorfulExcel(dataWithHeaders, columnWidths, `sites_export_${startDate}_to_${endDate}.xlsx`, "Site List", exportHeader || undefined, "SITE LIST EXPORT");
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export sites");
    }
  };

  // Export either the current page or all results respecting filters
  const handleExport = async (all: boolean) => {
    try {
      // For large exports, use server-side streaming CSV to avoid pulling huge JSON into the browser
      if (all && (totalSites || 0) > 2000) {
        const params = new URLSearchParams();
        if (vendorIdFilter) params.append('vendorId', vendorIdFilter);
        if (installFrom) params.append('siteAInstallFrom', installFrom);
        if (installTo) params.append('siteAInstallTo', installTo);
        if (tableFilter) params.append('search', tableFilter);
        params.append('format', 'csv');
        // Prefer using the server-side template headers if available, otherwise export raw DB columns
        try {
          const template = await fetchTemplateColumns();
          if (template && template.length > 0) params.append('useTemplate', 'true');
          else params.append('allColumns', 'true');
        } catch (e) {
          params.append('allColumns', 'true');
        }
        const url = `${getApiBaseUrl()}/api/sites/export/stream?${params.toString()}`;
        // Trigger a download
        window.location.assign(url);
        return;
      }

      setExportLoading(true);
      const params = new URLSearchParams();
      if (vendorIdFilter) params.append('vendorId', vendorIdFilter);
      if (installFrom) params.append('siteAInstallFrom', installFrom);
      if (installTo) params.append('siteAInstallTo', installTo);
      if (tableFilter) params.append('search', tableFilter);

      if (all) {
        params.append('page', '1');
        params.append('pageSize', String(totalSites || 10000));
      } else {
        params.append('page', String(currentPage));
        params.append('pageSize', String(pageSize));
      }

      const url = `${getApiBaseUrl()}/api/sites?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Export fetch failed');
      const { data } = await res.json();

      if (!data || data.length === 0) {
        alert('No sites found for the selected filters');
        return;
      }

      // Columns to exclude from export
      const excludedColumns = [
        'id',
        'siteId',
        'vendorId',
        'siteAmount',
        'zoneId',
        'vendorAmount',
        'createdAt',
        'updatedAt',
        'vendorCode',
        'vendorName',
        'vendorEmail',
        'paymentSiteAmount',
        'paymentAntennaSize'
      ];

      // Define column mapping: Excel header -> database column name
      // EXACT headers from template file generated_from_prev_full.xlsx
      const headerToDbColumnMap: Record<string, string> = {
        'S.No.': 'sno',
        'Circle': 'circle',
        'PLAN ID': 'planId',
        'Nominal Aop': 'nominalAop',
        'HOP TYPE': 'hopType',
        'HOP A-B': 'hopAB',
        'HOP B-A': 'hopBA',
        'District': 'district',
        'PROJECT': 'project',
        'SITE A ANT DIA': 'siteAAntDia',
        'SITE B ANT DIA': 'siteBAntDia',
        'Max Ant Size': 'maxAntSize',
        'SITE A NAME': 'siteAName',
        'TOCO VENDOR A': 'tocoVendorA',
        'TOCO ID A': 'tocoIdA',
        'SITE B NAME': 'siteBName',
        'TOCO VENDOR B': 'tocoVendorB',
        'TOCO ID B': 'tocoIdB',
        'MEDIA AVAILABILITY STATUS': 'mediaAvailabilityStatus',
        'SR NO SITE A': 'srNoSiteA',
        'SR DATE SITE A': 'srDateSiteA',
        'SR NO SITE B': 'srNoSiteB',
        'SR DATE SITE B': 'srDateSiteB',
        'HOP SR DATE': 'hopSrDate',
        'SP DATE SITE A': 'spDateSiteA',
        'SP DATE SITE B': 'spDateSiteB',
        'HOP SP DATE': 'hopSpDate',
        'SO RELEASED DATE SITE A': 'soReleasedDateSiteA',
        'SO RELEASED DATE SITE B': 'soReleasedDateSiteB',
        'HOP SO DATE': 'hopSoDate',
        'RFAI OFFERED DATE SITE A': 'rfaiOfferedDateSiteA',
        'RFAI OFFERED DATE SITE B': 'rfaiOfferedDateSiteB',
        'ACTUAL HOP RFAI OFFERED DATE': 'actualHopRfaiOfferedDate',
        'PARTNER CODE': 'partnerCode',
        'PARTNER NAME': 'partnerName',
        'RFAI SURVEY COMPLETION DATE': 'rfaiSurveyCompletionDate',
        'MO NUMBER SITE A': 'moNumberSiteA',
        'MATERIAL TYPE SITE A(SRN, FRESH, FRESH+SRN)': 'materialTypeSiteA',
        'MO DATE SITE A': 'moDateSiteA',
        'MO NUMBER SITE B': 'moNumberSiteB',
        'MATERIAL TYPE SITE B(SRN, FRESH, FRESH+SRN)': 'materialTypeSiteB',
        'MO DATE SITE B': 'moDateSiteB',
        'SRN/RMO NUMBER': 'srnRmoNumber',
        'SRN/RMO DATE': 'srnRmoDate',
        'HOP MO DATE': 'hopMoDate',
        'HOP MATERIAL DISPATCH DATE': 'hopMaterialDispatchDate',
        'HOP MATERIAL DELIVERY DATE': 'hopMaterialDeliveryDate',
        'MATERIAL DELIVERY STATUS': 'materialDeliveryStatus',
        'SITE A INSTALLATION DATE': 'siteAInstallationDate',
        'PTW Number(Site A)': 'ptwNumberSiteA',
        'PTW Status A': 'ptwStatusA',
        'SITE B INSTALLATION DATE': 'siteBInstallationDate',
        'PTW Number(Site B)': 'ptwNumberSiteB',
        'PTW Status B': 'ptwStatusB',
        'HOP I&C DATE': 'hopIcDate',
        'Alignment Date': 'alignmentDate',
        'HOP Installation Remarks': 'hopInstallationRemarks',
        'VISIBLE IN NMS': 'visibleInNms',
        'NMS VISIBLE DATE': 'nmsVisibleDate',
        'SOFT AT OFFER DATE': 'softAtOfferDate',
        'SOFT AT ACCEPTANCE DATE': 'softAtAcceptanceDate',
        'SOFT-AT STATUS': 'softAtStatus',
        'PHY-AT OFFER DATE': 'phyAtOfferDate',
        'PHY-AT ACCEPTANCE DATE': 'phyAtAcceptanceDate',
        'PHY-AT STATUS': 'phyAtStatus',
        'BOTH AT STATUS': 'bothAtStatus',
        'PRI ISSUE CATEGORY': 'priIssueCategory',
        'PRI SITE ID': 'priSiteId',
        'PRI OPEN DATE': 'priOpenDate',
        'PRI CLOSE DATE': 'priCloseDate',
        'PRI HISTORY': 'priHistory',
        'RFI Survey Allocation Date': 'rfiSurveyAllocationDate',
        'Descope': 'descope',
        'Reason of Extra Visit': 'reasonOfExtraVisit',
        'WCC Received 80%': 'wccReceived80Percent',
        'WCC Received Date 80%': 'wccReceivedDate80Percent',
        'WCC Received 20%': 'wccReceived20Percent',
        'WCC Received Date 20%': 'wccReceivedDate20Percent',
        'WCC Received Date 100%': 'wccReceivedDate100Percent',
        'Survey': 'survey',
        'Final Partner Survey': 'finalPartnerSurvey',
        'Survey Date': 'surveyDate',
        'PAYMENT VENDOR AMOUNT': 'paymentVendorAmount'
      };

      // Define exact column order as per template
      const templateColumnOrder = [
        'S.No.',
        'Circle',
        'PLAN ID',
        'Nominal Aop',
        'HOP TYPE',
        'HOP A-B',
        'HOP B-A',
        'District',
        'PROJECT',
        'SITE A ANT DIA',
        'SITE B ANT DIA',
        'Max Ant Size',
        'SITE A NAME',
        'TOCO VENDOR A',
        'TOCO ID A',
        'SITE B NAME',
        'TOCO VENDOR B',
        'TOCO ID B',
        'MEDIA AVAILABILITY STATUS',
        'SR NO SITE A',
        'SR DATE SITE A',
        'SR NO SITE B',
        'SR DATE SITE B',
        'HOP SR DATE',
        'SP DATE SITE A',
        'SP DATE SITE B',
        'HOP SP DATE',
        'SO RELEASED DATE SITE A',
        'SO RELEASED DATE SITE B',
        'HOP SO DATE',
        'RFAI OFFERED DATE SITE A',
        'RFAI OFFERED DATE SITE B',
        'ACTUAL HOP RFAI OFFERED DATE',
        'PARTNER CODE',
        'PARTNER NAME',
        'RFAI SURVEY COMPLETION DATE',
        'MO NUMBER SITE A',
        'MATERIAL TYPE SITE A(SRN, FRESH, FRESH+SRN)',
        'MO DATE SITE A',
        'MO NUMBER SITE B',
        'MATERIAL TYPE SITE B(SRN, FRESH, FRESH+SRN)',
        'MO DATE SITE B',
        'SRN/RMO NUMBER',
        'SRN/RMO DATE',
        'HOP MO DATE',
        'HOP MATERIAL DISPATCH DATE',
        'HOP MATERIAL DELIVERY DATE',
        'MATERIAL DELIVERY STATUS',
        'SITE A INSTALLATION DATE',
        'PTW Number(Site A)',
        'PTW Status A',
        'SITE B INSTALLATION DATE',
        'PTW Number(Site B)',
        'PTW Status B',
        'HOP I&C DATE',
        'Alignment Date',
        'HOP Installation Remarks',
        'VISIBLE IN NMS',
        'NMS VISIBLE DATE',
        'SOFT AT OFFER DATE',
        'SOFT AT ACCEPTANCE DATE',
        'SOFT-AT STATUS',
        'PHY-AT OFFER DATE',
        'PHY-AT ACCEPTANCE DATE',
        'PHY-AT STATUS',
        'BOTH AT STATUS',
        'PRI ISSUE CATEGORY',
        'PRI SITE ID',
        'PRI OPEN DATE',
        'PRI CLOSE DATE',
        'PRI HISTORY',
        'RFI Survey Allocation Date',
        'Descope',
        'Reason of Extra Visit',
        'WCC Received 80%',
        'WCC Received Date 80%',
        'WCC Received 20%',
        'WCC Received Date 20%',
        'WCC Received Date 100%',
        'Survey',
        'Final Partner Survey',
        'Survey Date'
      ];

      // Use the predefined column order and filter out excluded columns
      const orderedHeaders = templateColumnOrder.filter(header => {
        const dbCol = headerToDbColumnMap[header];
        return dbCol && !excludedColumns.includes(dbCol);
      });

      const orderedDbColumns = orderedHeaders.map(header => headerToDbColumnMap[header]);

      // Helper function to sanitize cell values for Excel
      const sanitizeValue = (value: any): any => {
        // Handle null/undefined
        if (value === null || value === undefined) return '';

        // Handle booleans
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';

        // Handle numbers - ensure they're valid
        if (typeof value === 'number') {
          if (isNaN(value) || !isFinite(value)) return '';
          return value;
        }

        // Handle dates
        if (value instanceof Date) {
          try {
            const dateStr = value.toISOString().split('T')[0];
            return dateStr;
          } catch (e) {
            return '';
          }
        }

        // Handle strings - aggressive cleaning for Excel compatibility
        if (typeof value === 'string') {
          let cleaned = value;

          // Remove all control characters and special characters that break Excel XML
          cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

          // Remove any remaining problematic characters
          cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

          // Replace common problematic characters
          cleaned = cleaned.replace(/[^\x20-\x7E\u00A0-\uD7FF\uE000-\uFFFD]/g, '');

          // Trim whitespace
          cleaned = cleaned.trim();

          // Limit length to prevent Excel issues (32,767 characters max per cell)
          if (cleaned.length > 32000) {
            cleaned = cleaned.substring(0, 32000) + '...';
          }

          return cleaned || '';
        }

        // Handle objects (shouldn't happen, but just in case)
        if (typeof value === 'object') {
          try {
            const jsonStr = JSON.stringify(value);
            return sanitizeValue(jsonStr); // Recursively clean the JSON string
          } catch (e) {
            return '';
          }
        }

        // Default: convert to string and clean
        try {
          return sanitizeValue(String(value));
        } catch (e) {
          return '';
        }
      };

      // Create data array with ordered columns and sanitized values
      const dataArray = [
        orderedHeaders,
        ...data.map(site =>
          orderedDbColumns.map(col => {
            const value = (site as Record<string, any>)[col];
            return sanitizeValue(value);
          })
        )
      ];

      // Validate data before export
      console.log('Export Headers Count:', orderedHeaders.length);
      console.log('Export Data Rows:', dataArray.length - 1);
      console.log('First Row Sample:', dataArray[1]?.slice(0, 5));

      // Ensure all rows have the same number of columns
      const headerCount = orderedHeaders.length;
      const validatedData = dataArray.map((row, idx) => {
        if (idx === 0) return row; // Header row

        // Ensure data row has same length as headers
        if (Array.isArray(row)) {
          if (row.length < headerCount) {
            // Pad with empty strings if too short
            return [...row, ...Array(headerCount - row.length).fill('')];
          } else if (row.length > headerCount) {
            // Truncate if too long
            return row.slice(0, headerCount);
          }
          return row;
        }
        // Fallback: create empty row
        return Array(headerCount).fill('');
      });

      const columnWidths = Array(orderedHeaders.length).fill(18);

      const filename = all ? `sites_export_all_${new Date().toISOString().slice(0,10)}.xlsx` : `sites_export_page_${currentPage}.xlsx`;

      try {
        // Use colorful Excel export with validated and sanitized data
        createColorfulExcel(
          validatedData,
          columnWidths,
          filename,
          "Site List",
          exportHeader || undefined,
          all ? "SITE LIST EXPORT - ALL" : `SITE LIST EXPORT - PAGE ${currentPage}`
        );
        console.log('✓ Excel export completed successfully');
      } catch (excelError) {
        console.error('Excel creation error:', excelError);
        // Fallback to basic export if styled version fails
        try {
          console.log('Attempting fallback to basic export...');
          const worksheet = XLSX.utils.aoa_to_sheet(validatedData);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Site List");
          worksheet['!cols'] = columnWidths.map(w => ({ wch: w }));
          XLSX.writeFile(workbook, filename);
          alert('Excel exported successfully (basic format)');
        } catch (fallbackError) {
          console.error('Fallback export also failed:', fallbackError);
          alert('Failed to create Excel file. Please check console for details.');
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export sites');
    } finally {
      setExportLoading(false);
    }
  };

  // Don't show full page skeleton - only show loading on the table area
  const showEmptyState = !loading && sites.length === 0 && totalSites === 0;

  if (showEmptyState) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
              <h2 className="text-3xl font-bold tracking-tight">Site List</h2>
              <p className="text-muted-foreground">List of registered sites.</p>
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
          <h2 className="text-3xl font-bold tracking-tight">Site List</h2>
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


      {/* Table View */}
      <div className="rounded-md border bg-card overflow-visible relative" data-sitelist-table>
            <div className="px-4 py-3 border-b bg-white dark:bg-slate-900">
              <div className="space-y-3">
                {/* Date Filters row (date comes first) */}
                <div className="flex items-center gap-3 border-b pb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Install From</label>
                    <input
                      type="date"
                      value={installFrom}
                      onChange={(e) => { setInstallFrom(e.target.value); setInstallYear(''); setCurrentPage(1); }}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                      data-testid="install-from"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Install To</label>
                    <input
                      type="date"
                      value={installTo}
                      onChange={(e) => { setInstallTo(e.target.value); setInstallYear(''); setCurrentPage(1); }}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                      data-testid="install-to"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Install Year (Site A Installation Date)</label>
                    <select
                      value={installYear}
                      onChange={(e) => { const y = e.target.value; setInstallYear(y); if (!y) { setInstallFrom(''); setInstallTo(''); } setCurrentPage(1); }}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                      data-testid="install-year"
                    >
                      <option value="">Year</option>
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => { setTableFilter(''); setInstallFrom(''); setInstallTo(''); setInstallYear(''); setVendorFilter(''); setVendorIdFilter(null); setCurrentPage(1); }}
                    className="px-2 py-1 text-sm border rounded-md hover:bg-gray-100"
                  >
                    Clear
                  </button>

                  {/* Vendor smart search (datalist suggestions from visible sites and vendor list) */}
                  <div className="flex items-center gap-2">
                    <label className="sr-only">Vendor</label>

                    {/* SmartSearchTextbox component - reusable */}
                    <SmartSearchTextbox
                      value={vendorFilter}
                      onChange={(v) => {
                        const value = typeof v === 'string' ? v : v.target.value;
                        setVendorFilter(value);
                        setVendorIdFilter(null);
                        setCurrentPage(1);
                      }}
                      loading={vendorLoading}
                      maxSuggestions={5000}
                      onSelect={(s) => {
                        if ('label' in s) {
                          setVendorFilter(s.label);
                          setVendorIdFilter((s as any).id || (vendors.find(v => `${(v.name||'').trim()} — ${(v.vendorCode||'').trim()}` === s.label)?.id) || null);
                        }
                        setCurrentPage(1);
                      }}
                      suggestions={(() => {
                        // Build suggestions from sites + vendors, dedupe by label and sort by vendor code
                        const map = new Map<string, { id?: string; label: string }>();
                        const add = (label: string, id?: string) => {
                          const key = label.trim();
                          if (!map.has(key)) map.set(key, { id, label: key });
                        };
                        sites.forEach(s => add(`${(s.vendorName || s.partnerName || '').trim()} — ${(s.vendorCode || s.partnerCode || '').trim()}`, s.vendorId || undefined));
                        vendors.forEach(v => add(`${(v.name || '').trim()} — ${(v.vendorCode || '').trim()}`, v.id));
                        const arr = Array.from(map.values()).map(x => ({ id: x.id, label: x.label, name: (x.label.split('—')[0] || '').trim(), code: (x.label.split('—')[1] || '').trim() }));
                        arr.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
                        return arr;
                      })()}
                      placeholder="Vendor..."
                    />
                    {vendorTotalCount !== null && (
                      <div className="text-xs text-muted-foreground ml-2">Vendors: {vendorTotalCount}</div>
                    )}

                    <div className="flex items-center gap-2 ml-3">

                      <button
                        onClick={() => handleExport(true)}
                        disabled={exportLoading}
                        className="hidden md:inline-flex items-center gap-2 px-3 py-1 border rounded-md text-sm hover:bg-muted"
                        title="Export All"
                      >
                        {exportLoading ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle></svg>
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span>Export All</span>
                      </button>

                      <button
                        onClick={() => handleExport(false)}
                        disabled={exportLoading}
                        className="hidden md:inline-flex items-center gap-2 px-3 py-1 border rounded-md text-sm hover:bg-muted"
                        title="Export Current Page"
                      >
                        {exportLoading ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle></svg>
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span>Export Page</span>
                      </button>

                      <button
                        onClick={() => handleExport(true)}
                        disabled={exportLoading}
                        className="inline-flex md:hidden items-center gap-2 p-2 border rounded-md text-sm hover:bg-muted"
                        title="Export All"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleExport(false)}
                        disabled={exportLoading}
                        className="inline-flex md:hidden items-center gap-2 p-2 border rounded-md text-sm hover:bg-muted"
                        title="Export Page"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Paging + Search row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-muted-foreground">entries per page</label>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
                      className="px-2 py-1 border rounded-md text-sm"
                      data-testid="entries-per-page"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>

                    {/* Compact pagination controls (top) */}
                    <nav aria-label="Top pagination">
                      <ul className="inline-flex items-center gap-1">
                        <li>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage(1); }}
                            disabled={loading || currentPage === 1}
                            className="px-2 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
                            aria-label="First"
                          >
                            «
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (currentPage > 1) setCurrentPage(currentPage - 1); }}
                            disabled={loading || currentPage === 1}
                            className="px-2 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
                            aria-label="Previous"
                          >
                            ‹
                          </button>
                        </li>

                        <li>
                          <span className="px-3 text-sm">{currentPage}</span>
                        </li>

                        <li>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
                            disabled={loading || currentPage === totalPages}
                            className="px-2 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
                            aria-label="Next"
                          >
                            ›
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage(totalPages); }}
                            disabled={loading || currentPage === totalPages}
                            className="px-2 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
                            aria-label="Last"
                          >
                            »
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Search:</label>
                    <input
                      type="text"
                      placeholder="Quick search..."
                      value={tableFilter}
                      onChange={(e) => { setTableFilter(e.target.value); setCurrentPage(1); }}
                      className="w-44 md:w-64 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      data-testid="quick-search-top"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="min-h-[40vh] overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="w-full text-sm">
            <thead className="bg-primary text-primary-foreground">
              <tr>

                <th className="p-3 text-left font-semibold w-12 sticky top-0 z-20 bg-primary text-primary-foreground">#</th>
                <th
                  className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    if (sortBy === 'planId') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('planId');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Plan ID {sortBy === 'planId' && (sortOrder === 'asc' ? <ChevronUp className="inline-block h-3 w-3 ml-1" /> : <ChevronDown className="inline-block h-3 w-3 ml-1" />)}
                </th>
                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Vendor Code</th>
                <th
                  className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    if (sortBy === 'vendorName') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('vendorName');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Vendor {sortBy === 'vendorName' && (sortOrder === 'asc' ? <ChevronUp className="inline-block h-3 w-3 ml-1" /> : <ChevronDown className="inline-block h-3 w-3 ml-1" />)}
                </th>
                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Circle</th>
                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Site Name</th>
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
                // Filtering is performed by the server for whole-dataset searches; rely on the fetched `sites` page
                (() => {
                  let displaySites = [...sites];

                  // Apply sorting
                  displaySites.sort((a, b) => {
                    let aVal = '';
                    let bVal = '';

                    switch (sortBy) {
                      case 'planId':
                        aVal = (a.planId || '').toString();
                        bVal = (b.planId || '').toString();
                        break;
                      case 'vendorName':
                        aVal = (a.vendorName || '').toString();
                        bVal = (b.vendorName || '').toString();
                        break;
                      case 'circle':
                        aVal = (a.circle || '').toString();
                        bVal = (b.circle || '').toString();
                        break;
                      case 'maxAntSize':
                        aVal = (a.maxAntSize || '').toString();
                        bVal = (b.maxAntSize || '').toString();
                        break;
                      case 'createdAt':
                      default:
                        aVal = (a.createdAt || '').toString();
                        bVal = (b.createdAt || '').toString();
                    }

                    const comparison = aVal.localeCompare(bVal, undefined, { numeric: true });
                    return sortOrder === 'asc' ? comparison : -comparison;
                  });

                  return displaySites.map((site, idx) => (
                  <React.Fragment key={site.id}>
                    <tr
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={async () => {
                        if (expandedSite === site.id) {
                          setExpandedSite(null);
                          return;
                        }

                        // Load details lazily and then expand
                        await loadSiteDetails(site.id);
                        setExpandedSite(site.id);
                      }}
                    >

                      <td className="p-3 text-muted-foreground">{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td className="p-3 font-medium text-primary">{site.planId || "—"}</td>
                      <td className="p-3 font-mono text-xs font-bold">{getVendorCode(site.vendorId)}</td>
                      <td className="p-3">{getVendorName(site.vendorId)}</td>
                      <td className="p-3">{site.circle || "—"}</td>
                      <td className="p-3 font-medium text-blue-600">{site.hopAB || "—"}</td>
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

                      <td className="p-3 text-right font-mono">{site.vendorAmount ? `Rs ${parseFloat(site.vendorAmount).toFixed(2)}` : (site.paymentVendorAmount ? `Rs ${parseFloat(site.paymentVendorAmount).toFixed(2)}` : "—")}</td>

                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (expandedSite === site.id) {
                                setExpandedSite(null);
                                return;
                              }
                              await loadSiteDetails(site.id);
                              setExpandedSite(site.id);
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
                        <td colSpan={10} className="p-0">
                          <div className="p-6 space-y-6">
                            {loadingDetailId === site.id ? (
                              <div className="p-6">
                                <SkeletonLoader />
                              </div>
                            ) : (
                              (() => {
                                const fullSite = siteDetails[site.id] || site;
                                return (
                                  <>
                                    {/* Basic Information */}
                                    <div>
                                      <h3 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                                        <span className="h-1 w-1 rounded-full bg-primary"></span>
                                        Basic Information
                                      </h3>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-card p-3 rounded-md border">
                                          <label className="text-xs font-medium text-muted-foreground">Plan ID</label>
                                          <p className="text-sm font-mono font-semibold mt-1">{fullSite.planId || "—"}</p>
                                        </div>
                                        <div className="bg-card p-3 rounded-md border">
                                          <label className="text-xs font-medium text-muted-foreground">HOP A-B</label>
                                          <p className="text-sm font-semibold mt-1">{fullSite.hopAB || "—"}</p>
                                        </div>
                                        <div className="bg-card p-3 rounded-md border">
                                          <label className="text-xs font-medium text-muted-foreground">HOP B-A</label>
                                          <p className="text-sm font-semibold mt-1">{fullSite.hopBA || "—"}</p>
                                        </div>
                                        <div className="bg-card p-3 rounded-md border">
                                          <label className="text-xs font-medium text-muted-foreground">HOP Type</label>
                                          <p className="text-sm font-semibold mt-1">{fullSite.hopType || "—"}</p>
                                        </div>
                                        <div className="bg-card p-3 rounded-md border">
                                          <label className="text-xs font-medium text-muted-foreground">HOP Type</label>
                                          <p className="text-sm font-semibold mt-1">{fullSite.hopType || "—"}</p>
                                        </div>
                                        <div className="bg-card p-3 rounded-md border">
                                          <label className="text-xs font-medium text-muted-foreground">Project</label>
                                          <p className="text-sm font-semibold mt-1">{fullSite.project || "—"}</p>
                                        </div>
                                        <div className="bg-card p-3 rounded-md border">
                                          <label className="text-xs font-medium text-muted-foreground">District</label>
                                          <p className="text-sm font-semibold mt-1">{fullSite.district || "—"}</p>
                                        </div>
                                        <div className="bg-card p-3 rounded-md border">
                                          <label className="text-xs font-medium text-muted-foreground">Circle</label>
                                          <p className="text-sm font-semibold mt-1">{fullSite.circle || "—"}</p>
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
                                          <p className="text-sm font-semibold mt-1">{fullSite.siteAName || "—"}</p>
                                        </div>
                                        <div className="bg-card p-3 rounded-md border">
                                          <label className="text-xs font-medium text-muted-foreground">Site B Name</label>
                                          <p className="text-sm font-semibold mt-1">{fullSite.siteBName || "—"}</p>
                                        </div>
                                        <div className="bg-card p-3 rounded-md border">
                                          <label className="text-xs font-medium text-muted-foreground">Partner Name</label>
                                          <p className="text-sm font-semibold mt-1">{fullSite.partnerName || "—"}</p>
                                        </div>
                                        <div className="bg-card p-3 rounded-md border">
                                          <label className="text-xs font-medium text-muted-foreground">Installation Type</label>
                                          <p className="text-sm font-semibold mt-1">{fullSite.inside ? "Inside" : "Outside"}</p>
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
                                          <p className="text-sm font-semibold mt-1">{fullSite.softAtOfferDate || "—"}</p>
                                        </div>
                                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200">
                                          <label className="text-xs font-medium text-blue-700">Soft AT Acceptance Date</label>
                                          <p className="text-sm font-semibold mt-1">{fullSite.softAtAcceptanceDate || "—"}</p>
                                        </div>
                                        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md border border-green-200">
                                          <label className="text-xs font-medium text-green-700">Phy AT Offer Date</label>
                                          <p className="text-sm font-semibold mt-1">{fullSite.phyAtOfferDate || "—"}</p>
                                        </div>
                                        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md border border-green-200">
                                          <label className="text-xs font-medium text-green-700">Phy AT Acceptance Date</label>
                                          <p className="text-sm font-semibold mt-1">{fullSite.phyAtAcceptanceDate || "—"}</p>
                                        </div>
                                        <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-md border border-purple-200">
                                          <label className="text-xs font-medium text-purple-700">Both AT Status</label>
                                          <p className="text-sm font-semibold mt-1">{fullSite.bothAtStatus || "—"}</p>
                                        </div>
                                        <div className="bg-card p-3 rounded-md border">
                                          <label className="text-xs font-medium text-muted-foreground">NMS Visible</label>
                                          <p className="text-sm font-semibold mt-1">{fullSite.visibleInNms || "—"}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Financial Details (Vendor amount only) */}
                                    <div>
                                      <h3 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                                        <span className="h-1 w-1 rounded-full bg-amber-500"></span>
                                        Financial Details
                                      </h3>
                                      <div className="grid grid-cols-1 gap-3">
                                        <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-md border-2 border-amber-300">
                                          <label className="text-xs font-medium text-amber-700">Vendor Amount</label>
                                          <p className="text-lg font-mono font-bold mt-1 text-amber-900">{fullSite.vendorAmount ? `Rs ${parseFloat(fullSite.vendorAmount.toString()).toFixed(2)}` : "N/A"}</p>
                                          {!fullSite.vendorAmount && !fullSite.paymentVendorAmount && (
                                            <p className="text-xs text-muted-foreground mt-1">Vendor amount not configured for this site. Configure via Payment Master or set on site record.</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Remarks */}
                                    {(fullSite.softAtRemark || fullSite.phyAtRemark || fullSite.atpRemark) && (
                                      <div>
                                        <h3 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                                          <span className="h-1 w-1 rounded-full bg-primary"></span>
                                          Remarks
                                        </h3>
                                        <div className="space-y-2">
                                          {fullSite.softAtRemark && (
                                            <div className="bg-card p-3 rounded-md border">
                                              <label className="text-xs font-medium text-muted-foreground">Soft AT Remark</label>
                                              <p className="text-sm mt-1">{fullSite.softAtRemark}</p>
                                            </div>
                                          )}
                                          {fullSite.phyAtRemark && (
                                            <div className="bg-card p-3 rounded-md border">
                                              <label className="text-xs font-medium text-muted-foreground">Physical AT Remark</label>
                                              <p className="text-sm mt-1">{fullSite.phyAtRemark}</p>
                                            </div>
                                          )}
                                          {fullSite.atpRemark && (
                                            <div className="bg-card p-3 rounded-md border">
                                              <label className="text-xs font-medium text-muted-foreground">ATP Remark</label>
                                              <p className="text-sm mt-1">{fullSite.atpRemark}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  ));
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalSites > 0 && (
        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/40 dark:to-gray-900/60">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              {/* Left: Showing X to Y of Z entries */}
              <div className="text-sm text-muted-foreground">
                Showing {totalSites === 0 ? 0 : startIndex} to {endIndex} of {totalSites.toLocaleString()} entries
              </div>

              {/* Right: Compact Pagination */}
              <nav aria-label="Pagination">
                <ul className="inline-flex items-center gap-1">
                  <li>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage(1); }}
                      disabled={loading || currentPage === 1}
                      className="px-2 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
                      aria-label="First"
                    >
                      «
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (currentPage > 1) setCurrentPage(currentPage - 1); }}
                      disabled={loading || currentPage === 1}
                      className="px-2 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
                      aria-label="Previous"
                    >
                      ‹
                    </button>
                  </li>

                  {/* Page Numbers (compact) */}
                  {totalPages <= 7 ? (
                    Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <li key={page}>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage(page); }}
                          disabled={loading}
                          className={`px-3 py-1 text-sm border rounded-md ${currentPage === page ? 'bg-primary text-white border-primary' : 'hover:bg-muted'} disabled:opacity-50`}
                        >
                          {page}
                        </button>
                      </li>
                    ))
                  ) : (
                    <>
                      <li>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage(1); }}
                          disabled={loading}
                          className={`px-3 py-1 text-sm border rounded-md ${currentPage === 1 ? 'bg-primary text-white border-primary' : 'hover:bg-muted'}`}
                        >
                          1
                        </button>
                      </li>

                      {currentPage > 4 && (
                        <li><span className="px-2 text-sm text-muted-foreground">...</span></li>
                      )}

                      {Array.from({ length: 3 }, (_, i) => currentPage - 1 + i)
                        .filter((p) => p > 1 && p < totalPages)
                        .map((page) => (
                          <li key={page}>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage(page); }}
                              disabled={loading}
                              className={`px-3 py-1 text-sm border rounded-md ${currentPage === page ? 'bg-primary text-white border-primary' : 'hover:bg-muted'} disabled:opacity-50`}
                            >
                              {page}
                            </button>
                          </li>
                        ))}

                      {currentPage < totalPages - 3 && (
                        <li><span className="px-2 text-sm text-muted-foreground">...</span></li>
                      )}

                      <li>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage(totalPages); }}
                          disabled={loading}
                          className={`px-3 py-1 text-sm border rounded-md ${currentPage === totalPages ? 'bg-primary text-white border-primary' : 'hover:bg-muted'}`}
                        >
                          {totalPages}
                        </button>
                      </li>
                    </>
                  )}

                  <li>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
                      disabled={loading || currentPage === totalPages}
                      className="px-2 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
                      aria-label="Next"
                    >
                      ›
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage(totalPages); }}
                      disabled={loading || currentPage === totalPages}
                      className="px-2 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
                      aria-label="Last"
                    >
                      »
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </CardContent>
        </Card>
      )}
  </div>
  );
}
