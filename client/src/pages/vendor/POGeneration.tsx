import { getApiBaseUrl } from "@/lib/api";
import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, Eye, Printer, Trash2, FileText } from "lucide-react";
import { fetchWithLoader } from "@/lib/fetchWithLoader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SmartSearchTextbox, { Suggestion } from "@/components/SmartSearchTextbox";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { truncateId } from "@/lib/utils";
import type { Site, Vendor } from "@shared/schema";
import jsPDF from 'jspdf';

interface PORecord {
  id: string;
  siteId: string;
  vendorId: string;
  siteName: string;
  vendorName: string;
  vendorCode?: string;
  planId: string;
  poNumber: string;
  description: string;
  quantity: number;
  unitPrice: string;
  maxAntennaSize?: number;
  gstType?: string;
  gstApply?: boolean;
  vendorState?: string;
  siteState?: string;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  // PO lines when fetched withLines=true
  lines?: Array<{ id?: string; poId?: string; siteId?: string; description?: string; quantity?: number; unitPrice?: string; totalAmount?: string; siteHopAB?: string; sitePlanId?: string }>;
}

export default function POGeneration() {
  const topRef = useRef<HTMLDivElement>(null);
  const poNumberRef = useRef<HTMLInputElement>(null);
  const [approvedSites, setApprovedSites] = useState<Site[]>([]);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [sitesWithPOs, setSitesWithPOs] = useState<Set<string>>(new Set());
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const formatPoDate = (d?: string | null) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    const day = String(dt.getDate()).padStart(2, '0');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mon = months[dt.getMonth()];
    const yr = dt.getFullYear();
    return `${day}-${mon}-${yr}`;
  };
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [poRecords, setPoRecords] = useState<PORecord[]>([]);
  const [allPOs, setAllPOs] = useState<PORecord[]>([]);
  const [poInvoices, setPoInvoices] = useState<{ [key: string]: any[] }>({});
  const [applyGstToAll, setApplyGstToAll] = useState(false);
  const [showGstInput, setShowGstInput] = useState(false);
  const [showRawAllPOs, setShowRawAllPOs] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [isEmployeeAdmin, setIsEmployeeAdmin] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [vendorId, setVendorId] = useState<string>("");
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>("");
  const [poGenerationDate, setPoGenerationDate] = useState<number>(1);
  const [showAllMode, setShowAllMode] = useState(false);
  // New: grouping option - when true generate one PO per vendor (grouped)
  const [groupByVendor, setGroupByVendor] = useState<boolean>(false);
  const [vendorSuggestions, setVendorSuggestions] = useState<Suggestion[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const { toast } = useToast();
  // Ensure activeVendorId is a string (avoid boolean true/false from other sources)
  const activeVendorId = (typeof vendorId === 'string' && vendorId) ? vendorId : (localStorage.getItem('vendorId') || '');
  // Pagination for available sites table
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSizeOptions = [10, 25, 50, 100];

  const normalizeVendorId = (val: any) => {
    if (!val) return null;
    if (typeof val === 'string' && val.trim().length > 0) return val;
    if (typeof val === 'object') return String(val.id || val._id || val.vendorId || '');
    return null;
  };

  const getPOVendorId = (po: any) => String(po.vendorId || (po.vendor && (po.vendor.id || po.vendor._id)) || po.vendor_id || '');
  const getSiteVendorId = (site: any) => String(site.vendorId || (site.vendor && (site.vendor.id || site.vendor._id)) || site.vendor_id || site.vendorIdString || '');

  // Modal state for listing sites in a PO
  const [sitesModalOpen, setSitesModalOpen] = useState(false);
  const [modalSites, setModalSites] = useState<any[]>([]);

  const refreshSitesAndPOs = async (useStoredVendor?: string | null) => {
    try {
      const baseUrl = getApiBaseUrl();
      const sitesRes = await fetch(`${baseUrl}/api/sites/for-po-generation?withVendors=true`, { credentials: 'include' });
      const sitesResJson = sitesRes.ok ? await sitesRes.json() : [];
      // Normalize site payloads to an array of valid site objects
      const rawSitesArray: any[] = Array.isArray(sitesResJson)
        ? sitesResJson
        : (sitesResJson && typeof sitesResJson === 'object')
          ? (sitesResJson.sites || sitesResJson.data || Object.values(sitesResJson).find(v => Array.isArray(v)) || [sitesResJson])
          : [];
      let sites: Site[] = rawSitesArray.map((s: any) => {
        if (!s || typeof s !== 'object') return null;
        const site: any = { ...s };
        if (!site.id && site._id) site.id = site._id;
        if (!site.vendorId && (site.vendorIdString || (site.vendor && (site.vendor.id || site.vendor._id)))) {
          site.vendorId = site.vendorIdString || (site.vendor.id || site.vendor._id);
        }
        return site;
      }).filter(Boolean);
      console.debug('[POGeneration][REFRESH] rawSitesArray length, normalized sites length:', rawSitesArray.length, sites.length);
      // Normalize the vendor id param (accept string or object); fallback to localStorage
      const candidateVendorId = (typeof useStoredVendor !== 'undefined' && useStoredVendor !== null) ? useStoredVendor : localStorage.getItem('vendorId');
      const storedVendorId = normalizeVendorId(candidateVendorId);
      console.debug('[POGeneration][REFRESH] storedVendorId used for sites/PO fetch:', storedVendorId);
      if (storedVendorId) {
        sites = sites.filter(site => String((site as any).vendorId) === String(storedVendorId));
      }

      let posRes: Response;
      // Use the same `storedVendorId` (computed above) to decide whether to fetch vendor-specific POs
      const apiUrl = storedVendorId
        ? `${baseUrl}/api/vendors/${storedVendorId}/saved-pos`
        : `${baseUrl}/api/saved-pos?pageSize=10000`;

      console.debug('[POGeneration][REFRESH] Fetching saved POs from:', apiUrl, 'for vendor:', storedVendorId || 'all (employee)');

      posRes = await fetch(apiUrl, { credentials: 'include' });

      let allPOsData: PORecord[] = [];
      if (posRes.ok) {
        const allPOsDataRes = await posRes.json();
        console.debug('[POGeneration][REFRESH] Raw PO response:', {
          url: apiUrl,
          isArray: Array.isArray(allPOsDataRes),
          hasData: !!allPOsDataRes?.data,
          keys: typeof allPOsDataRes === 'object' ? Object.keys(allPOsDataRes) : [],
          dataLength: allPOsDataRes?.data?.length || (Array.isArray(allPOsDataRes) ? allPOsDataRes.length : 0),
          rawResponse: allPOsDataRes
        });
        // Handle both array response and paginated response with { data: [...] }
        const rawPOsArray = Array.isArray(allPOsDataRes)
          ? allPOsDataRes
          : (allPOsDataRes && typeof allPOsDataRes === 'object'
            ? (allPOsDataRes.data || allPOsDataRes.items || [allPOsDataRes])
            : []);
        console.debug('[POGeneration][REFRESH] Extracted raw POs array length:', rawPOsArray.length);
        allPOsData = rawPOsArray.map((p: any) => {
          const po: any = { ...p };
          if (!po.id && po._id) po.id = po._id;
          if (!po.siteId && po.site && (po.site.id || po.site._id)) po.siteId = po.site.id || po.site._id;
          // Vendor might be nested or present as vendorId; normalize
          if (!po.vendorId && po.vendor && (po.vendor.id || po.vendor._id)) po.vendorId = po.vendor.id || po.vendor._id;
          // Some responses may already contain vendorId as `vendorId` or `vendor_id`
          if (!po.vendorId && (po.vendorIdString || po.vendor_id)) po.vendorId = po.vendorIdString || po.vendor_id;
          return po;
        });
        console.debug('[POGeneration][REFRESH] rawPOs length, normalized allPOsData length:', rawPOsArray.length, allPOsData.length);
        // Log a sample of normalized POs for debugging
        console.debug('[POGeneration][REFRESH] sample normalized POs:', allPOsData.slice(0, 5).map((p:any) => ({ id: p.id, vendorId: p.vendorId, siteId: p.siteId })));
      }

      // If a vendor id was provided to the refresh call, filter allPOsData to only show POs for that vendor
      // if (storedVendorId) {
      //   allPOsData = allPOsData.filter((po: any) => String(po.vendorId || (po.vendor && (po.vendor.id || po.vendor._id) || po.vendor_id || '')) === String(storedVendorId));
      // }
      // Normalize to strings to avoid filter mismatch
          // Build set of site IDs that already have POs by looking at PO lines first (preferred)
      const poLineSiteIds = new Set<string>();
      for (const po of allPOsData) {
        if (Array.isArray(po.lines) && po.lines.length > 0) {
          for (const ln of po.lines) {
            if (ln && ln.siteId) poLineSiteIds.add(String(ln.siteId));
          }
        } else if (po.siteId) {
          // Fallback to header siteId if lines are not present
          poLineSiteIds.add(String(po.siteId));
        }
      }

      // Store for use in UI counts and filters
      setSitesWithPOs(poLineSiteIds);

      const available = Array.isArray(sites) ? sites.filter((site: any) => !poLineSiteIds.has(String(site.id))) : [];

      setApprovedSites(sites as Site[]);
      setAllPOs(allPOsData);
      console.debug('[POGeneration][REFRESH] allPOs sample:', (allPOsData || []).slice(0, 5).map((p:any) => ({ id: p.id, vendorId: p.vendorId })));
      setAvailableSites(available);

      console.debug('[POGeneration][REFRESH] sites:', sites.length, 'POs:', allPOsData.length, 'available:', available.length);
      return { sites, allPOsData, available };
    } catch (error) {
      console.error('[POGeneration][REFRESH] Failed to refresh sites & POs:', error);
      throw error;
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load GST visibility setting from localStorage
        const gstSetting = localStorage.getItem('showGstInputInPO') === 'true';
        setShowGstInput(gstSetting);

        const baseUrl = getApiBaseUrl(); // ensure baseUrl is available for subsequent fetches

        // Determine user role: prefer server-side session; fallback to localStorage
        const sessionRes = await fetch(`${baseUrl}/api/session`, { credentials: 'include' });
        let sessionJson: any = null;
        if (sessionRes.ok) {
          sessionJson = await sessionRes.json();
        }

        // Get session data with fallbacks
        const storedVendorIdRaw = sessionJson?.vendorId || sessionJson?.vendor || localStorage.getItem('vendorId');
        const storedEmployeeId = sessionJson?.employeeId || localStorage.getItem('employeeId');
        const storedEmployeeRole = sessionJson?.employeeRole || localStorage.getItem('employeeRole');
        const employeeIsAdminFlag = (sessionJson?.employeeRole || storedEmployeeRole) === 'admin' || (sessionJson?.employeeRole || storedEmployeeRole) === 'superadmin';

        // Determine user type based on session
        const vendorSession = !!sessionJson?.isVendor;
        const employeeSession = !!sessionJson?.isEmployee;
        const normalizedStoredVendorId = normalizeVendorId(storedVendorIdRaw) || null;

        // Set user role flags
        // IMPORTANT: Employee takes precedence - if logged in as employee, show all POs
        let vendorOnly = false;
        let employeeOnly = false;

        if (employeeSession) {
          employeeOnly = true;
          vendorOnly = false;
          if (localStorage.getItem('vendorId')) {
            localStorage.removeItem('vendorId');
          }
        } else if (vendorSession) {
          vendorOnly = true;
          employeeOnly = false;
          if (localStorage.getItem('employeeId')) {
            localStorage.removeItem('employeeId');
            localStorage.removeItem('employeeRole');
          }
        } else {
          // Fallback to localStorage for backward compatibility
          if (storedEmployeeId && !normalizedStoredVendorId) {
            employeeOnly = true;
          } else if (normalizedStoredVendorId && !storedEmployeeId) {
            vendorOnly = true;
          }
        }

        setIsVendor(vendorOnly);
        setIsEmployee(employeeOnly);
        setIsEmployeeAdmin(employeeIsAdminFlag);

        if (vendorOnly && normalizedStoredVendorId) {
          setVendorId(String(normalizedStoredVendorId));
        }

        // Parallelize API calls: sites/POs and settings FIRST (most critical)
        const [refreshResult, settingsRes] = await Promise.all([
          refreshSitesAndPOs(vendorOnly ? normalizedStoredVendorId : null),
          fetch(`${baseUrl}/api/app-settings`, { credentials: 'include' })
        ]);
        const { sites: refreshedSites } = refreshResult;

        // Process settings
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setPoGenerationDate(settingsData.poGenerationDate || 1);
        }

        // Load vendors asynchronously AFTER initial render (lazy load for admins only)
        if (employeeIsAdminFlag) {
          // Defer vendor loading to NOT block initial page render
          setTimeout(async () => {
            setVendorLoading(true);
            try {
              // Load ALL vendors (1003+) using minimal=true for lightweight data
              // pageSize=10000 ensures we get all vendors with one request
              const vendorsRes = await fetch(`${baseUrl}/api/vendors/all?minimal=true`, { credentials: 'include' });
              if (!vendorsRes.ok) return;
              const vendorsResJson = await vendorsRes.json();
              const rawVendorsArray: any[] = Array.isArray(vendorsResJson) ? vendorsResJson : (vendorsResJson && typeof vendorsResJson === 'object' ? (vendorsResJson.items || vendorsResJson.data || [vendorsResJson]) : []);
              let vendorsData = rawVendorsArray.map((v: any) => {
                const vendor: any = { ...v };
                if (!vendor.id && vendor._id) vendor.id = vendor._id;
                return vendor;
              });

              // Remove duplicates by id (keep first occurrence)
              vendorsData = vendorsData.filter((v, idx, arr) => arr.findIndex(x => String(x.id) === String(v.id)) === idx);

              // Sort vendors alphabetically by name
              vendorsData = vendorsData.sort((a: any, b: any) => {
                const an = (a.name || a.vendorCode || a.id || '').toString().toLowerCase();
                const bn = (b.name || b.vendorCode || b.id || '').toString().toLowerCase();
                return an.localeCompare(bn);
              });

              // Build SmartSearch suggestions from vendors table
              const map = new Map<string, { id: string; name: string; code: string }>();

              vendorsData.forEach(v => {
                if (v.id) {
                  map.set(String(v.id), {
                    id: String(v.id),
                    name: (v.name || '').trim(),
                    code: (v.vendorCode || '').trim()
                  });
                }
              });

              // Convert to array with proper label format
              const arr = Array.from(map.values())
                .filter(v => v.name || v.code)
                .map(v => ({
                  id: v.id,
                  label: `${v.name} — ${v.code}`.trim(),
                  name: v.name,
                  code: v.code
                }));

              arr.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
              setVendorSuggestions(arr);
              setVendors(vendorsData);
            } catch (err) {
              console.error('[POGeneration] Failed to load vendors:', err);
            } finally {
              setVendorLoading(false);
            }
          }, 0);
        }
      } catch (error) {
        toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to load data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Debug: log types & lengths of key arrays to identify type mismatch issues
  useEffect(() => {
    console.debug('[POGeneration][DEBUG] Arrays state:', {
      approvedSitesIsArray: Array.isArray(approvedSites), approvedSitesLen: Array.isArray(approvedSites) ? approvedSites.length : 'N/A',
      availableSitesIsArray: Array.isArray(availableSites), availableSitesLen: Array.isArray(availableSites) ? availableSites.length : 'N/A',
      allPOsIsArray: Array.isArray(allPOs), allPOsLen: Array.isArray(allPOs) ? allPOs.length : 'N/A',
      poRecordsIsArray: Array.isArray(poRecords), poRecordsLen: Array.isArray(poRecords) ? poRecords.length : 'N/A',
    });
  }, [approvedSites, availableSites, allPOs]);

  // Clamp current page when pagination inputs or available list changes
  useEffect(() => {
    const filteredAvailableCount = Array.isArray(availableSites)
      ? availableSites.filter(site => (!isVendor || getSiteVendorId(site) === String(activeVendorId)) && (!selectedVendorFilter || String(site.vendorId) === String(selectedVendorFilter))).length
      : 0;
    const totalPages = Math.max(1, Math.ceil(filteredAvailableCount / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [availableSites, selectedVendorFilter, pageSize, isVendor, activeVendorId, currentPage]);

  // Reset page when user picks a vendor from smart search
  useEffect(() => {
    if (selectedVendorFilter) setCurrentPage(1);
  }, [selectedVendorFilter]);

  // Log changes to poRecords separately to track why created POs might not display
  useEffect(() => {
    console.debug('[POGeneration][DEBUG] poRecords updated:', (poRecords || []).map(p => ({ id: p.id, poNumber: p.poNumber, vendorId: p.vendorId })));
  }, [poRecords]);

  const handleSiteSelection = (siteId: string) => {
    const newSet = new Set(selectedSites);
    if (newSet.has(siteId)) {
      newSet.delete(siteId);
    } else {
      newSet.add(siteId);
    }
    setSelectedSites(newSet);
  };

  // Compute filtered/paginated sites for reuse and add select-all helpers
  const pagination = useMemo(() => {
    const filteredAvailable = Array.isArray(availableSites)
      ? availableSites.filter(site => (!isVendor || getSiteVendorId(site) === String(activeVendorId)) && (!selectedVendorFilter || String(site.vendorId) === String(selectedVendorFilter)))
      : [];
    const totalAvailable = filteredAvailable.length;
    const totalPages = Math.max(1, Math.ceil(totalAvailable / pageSize));
    const displayedPage = Math.min(currentPage, totalPages);
    const startIndex = (displayedPage - 1) * pageSize;
    const paginated = filteredAvailable.slice(startIndex, startIndex + pageSize);
    const selectableIds = paginated.filter(s => Boolean((s as any).vendorAmount)).map(s => s.id);
    const allSelected = !showAllMode && selectableIds.length > 0 && selectableIds.every(id => selectedSites.has(id));
    return { filteredAvailable, totalAvailable, totalPages, displayedPage, startIndex, paginated, selectableIds, allSelected };
  }, [availableSites, selectedVendorFilter, isVendor, activeVendorId, pageSize, currentPage, selectedSites, showAllMode]);

  const toggleSelectAllOnPage = () => {
    if (showAllMode) return;
    const ids = pagination.selectableIds || [];
    const newSet = new Set(selectedSites);
    if (ids.length === 0) return;
    const shouldSelect = !pagination.allSelected;
    if (shouldSelect) {
      ids.forEach((id) => newSet.add(id));
    } else {
      ids.forEach((id) => newSet.delete(id));
    }
    setSelectedSites(newSet);
  };

  // Compute filtered POs based on user role (employee sees all, vendor sees only their POs)
  const filteredPOs = useMemo(() => {
    try {
      // Ensure allPOs is an array
      const list = Array.isArray(allPOs) ? allPOs : [];

      console.debug('[POGeneration][filteredPOs] Computing filtered list', {
        isEmployee,
        isVendor,
        vendorId,
        totalPOs: list.length
      });

      // If employee (not vendor), return all POs - EMPLOYEES SEE EVERYTHING
      if (isEmployee && !isVendor) {
        console.debug('[POGeneration][filteredPOs] Employee mode - showing all POs:', list.length);
        return list;
      }

      // If vendor, normalize vendor id and filter to only their POs
      if (isVendor) {
        const vid = normalizeVendorId(vendorId) || normalizeVendorId(localStorage.getItem('vendorId')) || '';
        if (!vid) {
          console.debug('[POGeneration][filteredPOs] Vendor mode but no vendorId found');
          return [];
        }
        const filtered = list.filter((p: any) => String(getPOVendorId(p)) === String(vid));
        console.debug('[POGeneration][filteredPOs] Vendor mode - filtered to vendor POs:', {
          vendorId: vid,
          filteredCount: filtered.length,
          totalCount: list.length
        });
        return filtered;
      }

      // default: show all for safety (shouldn't reach here)
      console.debug('[POGeneration][filteredPOs] Default mode - showing all POs:', list.length);
      return list;
    } catch (err) {
      console.error('[POGeneration][filteredPOs] error computing filtered list', err);
      return [];
    }
  }, [isEmployee, isVendor, allPOs, vendorId]);

  const getVendorNameForPO = (po: PORecord) => {
    // First try po.vendorName (from backend)
    if (po.vendorName && po.vendorName !== 'Unknown Vendor' && !po.vendorName.startsWith('Vendor #')) {
      return po.vendorName;
    }
    // Then try to find in vendors list
    const vendorObj = vendors.find(v => String(v.id) === String(po.vendorId));
    if (vendorObj?.name) {
      return vendorObj.name;
    }
    // Fallback to the vendorName from backend if it exists
    if (po.vendorName) {
      return po.vendorName;
    }
    // Final fallback
    return 'Unknown Vendor';
  };

  const getTotalAmount = (po: PORecord) => {
    // Prefer the saved totalAmount column if present (comes from DB)
    const saved = parseFloat(String(po.totalAmount ?? '0')) || 0;
    if (saved > 0) return saved;

    // Fallback to previous computation when totalAmount is not available
    const baseAmount = parseFloat(po.unitPrice || '0') || 0;
    const cgst = parseFloat(String(po.cgstAmount || '0')) || 0;
    const sgst = parseFloat(String(po.sgstAmount || '0')) || 0;
    const igst = parseFloat(String(po.igstAmount || '0')) || 0;
    return baseAmount + cgst + sgst + igst;
  };

  const getGSTAmount = (po: PORecord) => {
    const cgst = parseFloat(String(po.cgstAmount || '0')) || 0;
    const sgst = parseFloat(String(po.sgstAmount || '0')) || 0;
    const igst = parseFloat(String(po.igstAmount || '0')) || 0;
    return cgst + sgst + igst;
  };

  const generatePOs = async () => {
    if (selectedSites.size === 0) {
      toast({ title: "Alert", description: "Please select at least one site", variant: "destructive" });
      return;
    }

    // Check date restriction for vendors
    if (isVendor) {
      const today = new Date().getDate();
      const allowedDate = poGenerationDate;

      if (today !== allowedDate) {
        toast({
          title: "Access Restricted",
          description: `Vendors can only generate POs on day ${allowedDate} of each month. Today is day ${today}.`,
          variant: "destructive"
        });
        return;
      }
    }

    setGenerating(true);
    try {
      const selectedSiteIds = Array.from(selectedSites);
      const sitesData = Array.isArray(approvedSites) ? approvedSites.filter(s => selectedSiteIds.includes(s.id)) : [];
      console.log('[POGeneration][DEBUG] generatePOs selectedSiteIds:', selectedSiteIds);
      console.log('[POGeneration][DEBUG] generatePOs sitesData:', sitesData);
      console.log('[POGeneration][DEBUG] generatePOs vendorId:', vendorId, 'isVendor:', isVendor);
      // If this is a vendor user, ensure they are only selecting their own sites
      if (isVendor) {
        const illegalSelections = Array.isArray(sitesData) ? sitesData.filter(s => String(s.vendorId) !== String(vendorId)) : [];
        if (illegalSelections.length > 0) {
          console.error('[POGeneration][ERROR] Vendor trying to create PO for another vendor site', illegalSelections);
          toast({ title: 'Error', description: 'You cannot generate POs for sites that do not belong to you.', variant: 'destructive' });
          return;
        }
      }
      
      // Get export header state for GST determination
      const exportHeaderState = localStorage.getItem('exportHeaderState');

      const records: PORecord[] = sitesData.map((site: any, index: number) => {
        const vendor = vendors.find((v: any) => String(v.id) === String(site.vendorId));
        // Calculate maxAntennaSize from antenna A and B sizes
        const maxAntennaSize = Math.max(
          parseFloat(site.siteAAntDia) || 0,
          parseFloat(site.siteBAntDia) || 0
        ) || parseFloat(site.maxAntSize) || 0;
        // Auto-determine GST type: IGST if vendor state != export state, CGST+SGST if same state
        const gstType = (vendor?.state && exportHeaderState && vendor.state !== exportHeaderState) ? 'igst' : 'cgstsgst';
        return {
          id: `PO-TEMP-${Date.now()}-${index + 1}`,
          siteId: site.id || "",
          vendorId: String(site.vendorId || ""),
          siteName: site.hopAB || site.siteId || "",
          vendorName: vendor?.name || site.partnerName || "Unknown",
          vendorCode: vendor?.vendorCode || site.partnerCode,
          planId: site.planId || "",
          poNumber: `PO-${Date.now()}-${index + 1}`,
          description: `Installation and commissioning for ${site.hopAB || site.siteId}`,
          quantity: 1,
          unitPrice: site.vendorAmount?.toString() || "0",
          maxAntennaSize,
          gstType,
          gstApply: false,
          vendorState: vendor?.state || undefined,
          siteState: site.state || undefined,
        };
      });

      const baseUrl = getApiBaseUrl();

      // If groupByVendor is true, group records by vendor and call grouped endpoint
      if (groupByVendor) {
        const byVendor: Record<string, PORecord[]> = {};
        records.forEach(r => {
          byVendor[r.vendorId] = byVendor[r.vendorId] || [];
          byVendor[r.vendorId].push(r);
        });

        const posPayload = Object.keys(byVendor).map(vendorIdKey => {
          const lines = byVendor[vendorIdKey].map((r, i) => ({
            siteId: r.siteId,
            description: r.description,
            quantity: r.quantity,
            unitPrice: r.unitPrice,
            totalAmount: (r.quantity * parseFloat(r.unitPrice)).toString()
          }));
          const totalAmount = lines.reduce((s, l) => s + (parseFloat(l.totalAmount) || 0), 0).toFixed(2);
          return {
            vendorId: vendorIdKey,
            poNumber: `PO-${Date.now()}-${vendorIdKey.slice(0,6)}-${Math.floor(Math.random()*999)}`,
            poDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            totalAmount: totalAmount,
            gstType: 'cgstsgst',
            gstApply: applyGstToAll,
            lines
          };
        });

        try {
          const resp = await fetch(`${baseUrl}/api/purchase-orders/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ pos: posPayload })
          });

          if (!resp.ok) throw new Error('Grouped PO generation failed');
          const json = await resp.json();
          const created = json.created || [];
          const errs = json.errors || [];
          if (created.length) toast({ title: 'Success', description: `${created.length} grouped PO(s) created` });
          if (errs.length) toast({ title: 'Partial', description: `${errs.length} groups failed`, variant: 'destructive' });

          // Refresh
          await refreshSitesAndPOs();
        } catch (err) {
          console.error('[POGeneration][ERROR] grouped create failed', err);
          toast({ title: 'Error', description: 'Failed to create grouped POs', variant: 'destructive' });
        } finally {
          setGenerating(false);
        }

        return; // done with grouped flow
      }

      // Default: create POs per site (existing behavior)
      const createdPOs: PORecord[] = [];
      const failedPOs: { record: PORecord; error: any }[] = [];
      for (const record of records) {
        console.log('[POGeneration][DEBUG] Creating PO payload:', record);
        // If logged-in user is a vendor, ensure the vendorId in payload matches logged-in vendorId
        if (isVendor && vendorId) {
          console.debug('[POGeneration][DEBUG] Overriding record.vendorId with session vendorId for vendor session', vendorId);
          record.vendorId = String(vendorId);
        }
        const totalAmount = record.quantity * parseFloat(record.unitPrice);
        
        // Calculate GST amounts if enabled
        let igstPercentage = 0, igstAmount = 0;
        let cgstPercentage = 0, cgstAmount = 0;
        let sgstPercentage = 0, sgstAmount = 0;
        
        if (applyGstToAll) {
          if (record.gstType === 'igst') {
            igstPercentage = 18;
            igstAmount = Math.round(totalAmount * 0.18 * 100) / 100;
          } else if (record.gstType === 'cgstsgst') {
            cgstPercentage = 9;
            sgstPercentage = 9;
            cgstAmount = Math.round(totalAmount * 0.09 * 100) / 100;
            sgstAmount = Math.round(totalAmount * 0.09 * 100) / 100;
          }
        }
        
        const response = await fetch(`${baseUrl}/api/purchase-orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify({
            poNumber: record.poNumber,
            vendorId: record.vendorId,
            siteId: record.siteId,
            description: record.description,
            quantity: record.quantity,
            unitPrice: record.unitPrice,
            totalAmount: totalAmount.toString(),
            gstType: record.gstType,
            gstApply: applyGstToAll,
            igstPercentage: igstPercentage.toString(),
            igstAmount: igstAmount.toString(),
            cgstPercentage: cgstPercentage.toString(),
            cgstAmount: cgstAmount.toString(),
            sgstPercentage: sgstPercentage.toString(),
            sgstAmount: sgstAmount.toString(),
            poDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: "Draft",
          }),
        });
        if (response.ok) {
          try {
            const createdPO = await response.json();
            // Normalize returned PO (ensure vendorId exists)
            const normalizedPO: any = { ...createdPO };
            if (!normalizedPO.vendorId && normalizedPO.vendor && (normalizedPO.vendor.id || normalizedPO.vendor._id)) normalizedPO.vendorId = normalizedPO.vendor.id || normalizedPO.vendor._id;
            if (!normalizedPO.vendorId && (normalizedPO.vendor_id || normalizedPO.vendorIdString)) normalizedPO.vendorId = normalizedPO.vendor_id || normalizedPO.vendorIdString;
            // Ensure created record contains vendorId and other fields
            createdPOs.push({ 
              ...record, 
              id: normalizedPO.id || record.id, 
              vendorId: String(normalizedPO.vendorId || record.vendorId || ''),
              gstApply: applyGstToAll,
              cgstAmount,
              sgstAmount,
              igstAmount
            });
            console.debug('[POGeneration][DEBUG] Created PO normalized:', normalizedPO);
          } catch (err) {
            console.error('[POGeneration][ERROR] Created PO but failed to parse JSON', err, record);
            failedPOs.push({ record, error: err });
          }
        } else {
          const contentType = response.headers.get('Content-Type') || '';
          let errorData: any;
          if (contentType.includes('application/json')) {
            errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          } else {
            const text = await response.text().catch(() => 'Unknown error');
            errorData = { error: text };
          }
          console.error('[POGeneration][ERROR] Failed to create PO', {
            status: response.status,
            statusText: response.statusText,
            body: errorData,
            payload: record
          });
          failedPOs.push({ record, error: errorData });
        }
      }

      // Append newly created POs to the `poRecords` list so they remain visible even after refresh
      setPoRecords(prev => {
        const existing = Array.isArray(prev) ? prev : [];
        const merged = existing.concat(createdPOs.filter(c => !existing.find(e => String(e.id) === String(c.id) || String(e.poNumber) === String(c.poNumber))));
        console.debug('[POGeneration][DEBUG] setPoRecords merged:', merged.map(p => ({ id: p.id, poNumber: p.poNumber, vendorId: p.vendorId })));
        return merged;
      });
      setSelectedSites(new Set());

      // Remove sites that now have POs from available list (only the successfully created ones)
      const createdSiteIds = new Set(createdPOs.map((po) => po.siteId));
      const updatedAvailable = Array.isArray(availableSites) ? availableSites.filter((site) => !createdSiteIds.has(site.id)) : [];
      setAvailableSites(updatedAvailable);
      setAllPOs(prev => {
        const existing = Array.isArray(prev) ? prev : [];
        // Merge created POs while avoiding duplicates
        const merged = existing.concat(createdPOs.filter(c => !existing.find(e => String(e.id) === String(c.id))));
        return merged;
      });
      console.debug('[POGeneration][DEBUG] After setAllPOs merged, allPOs sample:', (Array.isArray(allPOs) ? allPOs : []).slice(-6).map((p:any) => ({ id: p.id, vendorId: p.vendorId })));
      console.debug('[POGeneration][DEBUG] after appending createdPOs, allPOs sample:', (Array.isArray(allPOs) ? allPOs : []).slice(-6).map((p:any) => ({ id: p.id, vendorId: p.vendorId })));

      console.log('[PO Generation] Created POs:', createdPOs.length, createdPOs);
      console.log('[PO Generation] Total POs after creation:', [...allPOs, ...createdPOs].length);

      if (createdPOs.length > 0) {
        toast({
          title: "Success",
          description: `${createdPOs.length} PO(s) generated successfully`,
        });
      }
      if (failedPOs.length > 0) {
        console.error('[POGeneration][ERROR] Some POs failed to create', failedPOs);
        toast({
          title: "Partial Failure",
          description: `${failedPOs.length} PO(s) failed to generate. Check console for details.`,
          variant: 'destructive'
        });
      }
      // Refresh lists after creation so UI reflects the server state
      try {
        await refreshSitesAndPOs(isVendor ? vendorId : null);
      } catch (e) {
        console.error('[POGeneration][ERROR] refresh failed after creating POs', e);
      }

      topRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate POs";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const deletePO = async (poId: string, poNumber: string) => {
    if (!confirm(`Delete PO ${poNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/purchase-orders/${poId}`, {
        method: "DELETE",
        credentials: 'include',
      });

      if (response.ok) {
          setAllPOs(Array.isArray(allPOs) ? allPOs.filter(po => po.id !== poId) : []);
          setPoRecords(Array.isArray(poRecords) ? poRecords.filter(po => po.id !== poId) : []);
          // Refresh after delete
          try {
            await refreshSitesAndPOs(isVendor ? vendorId : null);
          } catch (e) {
            console.error('[POGeneration][ERROR] refresh failed after deleting PO', e);
          }
        toast({
          title: "Success",
          description: `PO ${poNumber} has been deleted.`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete PO");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete PO",
        variant: "destructive",
      });
    }
  };

  const exportPOToPDF = async (poId: string, poNumber: string) => {
    try {
      const baseUrl = getApiBaseUrl();
      let po: any;
      let lines: any[] = [];

      // First try to get PO data from sessionStorage
      const cachedPOData = sessionStorage.getItem(`po_${poId}`);
      if (cachedPOData) {
        try {
          const cachedPO = JSON.parse(cachedPOData);
          po = cachedPO;
          lines = cachedPO.lines || [];
        } catch (e) {
          console.warn('[PDF Export] Error parsing cached data, falling back to API');
        }
      }

      // If no cached data, fetch from API with withLines=true
      if (!po) {
        const poRes = await fetch(`${baseUrl}/api/purchase-orders/${poId}?withLines=true`, { credentials: 'include' });
        if (!poRes.ok) throw new Error("Failed to fetch PO");
        const poResult = await poRes.json();

        // Extract po and lines from response
        po = poResult.po || poResult;
        lines = poResult.lines || [];
      }

      // Get first site for header info (if available)
      const firstSiteId = po.siteId || (lines.length > 0 ? lines[0].siteId : null);
      const siteRes = firstSiteId ? await fetch(`${baseUrl}/api/sites/${firstSiteId}`, { credentials: 'include' }) : null;
      const site = siteRes?.ok ? await siteRes.json() : null;

      const vendorRes = await fetch(`${baseUrl}/api/vendors/${po.vendorId}`, { credentials: 'include' });
      const vendor = vendorRes.ok ? await vendorRes.json() : null;

      const headerRes = await fetch(`${baseUrl}/api/export-headers`, { credentials: 'include' });
      const exportHeaderSettings = headerRes.ok ? await headerRes.json() : {};

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const m = 12;
      let y = 20;

      // Calculate GST amounts based on PO gstApply flag and gstType
      const subtotal = Number(po.totalAmount || 0);
      let igstAmt = 0, cgstAmt = 0, sgstAmt = 0;

      if (po.gstApply) {
        if (po.gstType === 'igst') {
          igstAmt = Math.round(subtotal * 0.18 * 100) / 100;
        } else if (po.gstType === 'cgstsgst') {
          cgstAmt = Math.round(subtotal * 0.09 * 100) / 100;
          sgstAmt = Math.round(subtotal * 0.09 * 100) / 100;
        }
      }
      const finalTotal = subtotal + igstAmt + cgstAmt + sgstAmt;

      // ===== HEADER =====
      pdf.setFont('Arial', 'bold');
      pdf.setFontSize(26);
      pdf.setTextColor(44, 62, 80);
      pdf.text('PURCHASE ORDER', m, y);

      pdf.setFontSize(11);
      pdf.setTextColor(153, 153, 153);
      pdf.setFont('Arial', 'normal');
      pdf.text(exportHeaderSettings.companyName || 'Company Name', m, y + 7);

      // Right side info
      const rX = pageW - m - 60;
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('Arial', 'bold');
      pdf.text('PO No.:', rX, y);
      pdf.setFont('Arial', 'normal');
      pdf.text(String(poNumber), rX + 25, y);

      y += 7;
      pdf.setFont('Arial', 'bold');
      pdf.text('PO Date:', rX, y);
      pdf.setFont('Arial', 'normal');
      pdf.text(String(po.poDate || ''), rX + 25, y);

      y += 7;
      pdf.setFont('Arial', 'bold');
      pdf.text('Due Date:', rX, y);
      pdf.setFont('Arial', 'normal');
      pdf.text(String(po.dueDate || ''), rX + 25, y);

      y += 18;

      // ===== COMPANY INFO =====
      pdf.setFontSize(9);
      pdf.setFont('Arial', 'normal');
      pdf.setTextColor(0, 0, 0);
      if (exportHeaderSettings.companyName) {
        pdf.text(exportHeaderSettings.companyName, m, y);
        y += 4;
      }
      if (exportHeaderSettings.address) {
        pdf.text(exportHeaderSettings.address, m, y);
        y += 4;
      }
      if (exportHeaderSettings.contactPhone) {
        pdf.text(`Phone: ${exportHeaderSettings.contactPhone}`, m, y);
        y += 4;
      }
      if (exportHeaderSettings.website) {
        pdf.text(`Website: ${exportHeaderSettings.website}`, m, y);
        y += 4;
      }

      y += 6;

      // Determine items to display: lines if available, otherwise single PO item
      const itemsToDisplay = lines && lines.length > 0 ? lines : [{
        siteHopAB: site?.hopAB || po.siteName || 'Item',
        description: po.description || 'Installation and commissioning',
        quantity: po.quantity || 1,
        unitPrice: po.unitPrice || 0,
        totalAmount: po.totalAmount || 0
      }];

      // ===== BILL TO & SITE INFO =====
      pdf.setFontSize(11);
      pdf.setFont('Arial', 'bold');
      pdf.text('Bill To', m, y);
      pdf.text('Site Information', 105, y);

      y += 5;

      // Separators
      pdf.setDrawColor(221, 221, 221);
      pdf.line(m, y, 100, y);
      pdf.line(105, y, pageW - m, y);

      y += 4;

      // Vendor & Site content
      pdf.setFontSize(9);
      pdf.setFont('Arial', 'normal');
      pdf.setTextColor(0, 0, 0);

      const vn = vendor?.name || '[Vendor Name]';
      const ve = vendor?.email || '';
      const va = vendor?.address || '';
      const vc = vendor?.city || '';
      const vst = vendor?.state || '';
      const vp = vendor?.pincode || '';
      const vg = vendor?.gstin || '';

      // Vendor left column
      let vy = y;
      pdf.setFont('Arial', 'bold');
      pdf.setFontSize(10);
      pdf.text(vn, m, vy);
      vy += 4;

      pdf.setFont('Arial', 'normal');
      pdf.setFontSize(9);
      if (ve) { pdf.text(ve, m, vy); vy += 4; }
      pdf.text(va, m, vy);
      vy += 4;
      if (vc || vst || vp) {
        pdf.text(`${vc}, ${vst} ${vp}`.trim(), m, vy);
        vy += 4;
      }
      if (vg) { pdf.text(`GSTIN: ${vg}`, m, vy); vy += 4; }
      if (vendor?.phone) { pdf.text(`Phone: ${vendor.phone}`, m, vy); }

      // Site right column
      let sy = y;
      pdf.setFont('Arial', 'bold');
      pdf.setFontSize(10);

      // Check if PO has multiple sites
      const hasMultipleSites = itemsToDisplay && itemsToDisplay.length > 1;

      if (hasMultipleSites) {
        // Show first 5 sites
        const sitesToShow = itemsToDisplay.slice(0, 5);
        const remainingCount = itemsToDisplay.length - 5;

        pdf.text('Sites:', 105, sy);
        sy += 4;

        pdf.setFont('Arial', 'normal');
        pdf.setFontSize(8);
        sitesToShow.forEach((item: any) => {
          const siteName = item.siteHopAB || item.siteId || 'Site';
          pdf.text(`• ${siteName}`, 105, sy);
          sy += 3;
        });

        if (remainingCount > 0) {
          pdf.setFont('Arial', 'bold');
          pdf.text(`+ ${remainingCount} more sites`, 105, sy);
        }
      } else {
        // Single site - show full details
        const sn = site?.hopAB || '[Site Name]';
        pdf.text(sn, 105, sy);
        sy += 4;

        pdf.setFont('Arial', 'normal');
        pdf.setFontSize(9);
        pdf.text(`Site ID: ${po.siteId}`, 105, sy);
        sy += 4;
        if (site?.planId) { pdf.text(`Plan ID: ${site.planId}`, 105, sy); sy += 4; }
        if (site?.circle) { pdf.text(`Circle: ${site.circle}`, 105, sy); sy += 4; }
        if (site?.district) { pdf.text(`District: ${site.district}`, 105, sy); sy += 4; }
        if (site?.state) { pdf.text(`State: ${site.state}`, 105, sy); }
      }

      y += 26;

      // ===== ITEMS TABLE =====
      pdf.setFontSize(9);
      pdf.setFont('Arial', 'bold');
      pdf.setFillColor(44, 62, 80);
      pdf.setTextColor(255, 255, 255);

      const col1X = m;
      const col2X = m + 80;
      const col3X = m + 110;
      const col4X = m + 135;

      // TABLE HEADER ROW
      pdf.setFillColor(44, 62, 80);
      pdf.rect(col1X, y, 80, 7, 'F');
      pdf.text('Site/Description', col1X + 2, y + 4.5);

      pdf.setFillColor(44, 62, 80);
      pdf.rect(col2X, y, 30, 7, 'F');
      pdf.text('Quantity', col2X + 5, y + 4.5);

      pdf.setFillColor(44, 62, 80);
      pdf.rect(col3X, y, 25, 7, 'F');
      pdf.text('Unit Price', col3X - 3, y + 4.5);

      pdf.setFillColor(44, 62, 80);
      pdf.rect(col4X, y, 30, 7, 'F');
      pdf.text('Amount', col4X + 3, y + 4.5);

      y += 8;

      // ITEM DATA ROWS - Display all lines if available, otherwise single item
      pdf.setFont('Arial', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.setDrawColor(221, 221, 221);
      pdf.setFontSize(10);

      let subtotalAmount = 0;

      // Display each item/line as a row
      for (const item of itemsToDisplay) {
        // Use description as-is (already contains site name)
        const siteName = String(item.siteHopAB || item.siteId || '');
        const baseDescription = String(item.description || 'Installation and commissioning');
        const description = baseDescription;

        const itemQty = String(item.quantity || 1);
        const itemRate = Number(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const itemTotal = Number(item.totalAmount || 0);
        const itemTotalDisplay = itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        subtotalAmount += itemTotal;

        // Check if we need a new page (leave room for totals)
        if (y > 250) {
          // Add new page
          pdf.addPage();
          y = 20;

          // Re-draw table header on new page
          pdf.setFontSize(9);
          pdf.setFont('Arial', 'bold');
          pdf.setTextColor(255, 255, 255);

          pdf.setFillColor(44, 62, 80);
          pdf.rect(col1X, y, 80, 7, 'F');
          pdf.text('Site/Description', col1X + 2, y + 4.5);

          pdf.setFillColor(44, 62, 80);
          pdf.rect(col2X, y, 30, 7, 'F');
          pdf.text('Quantity', col2X + 5, y + 4.5);

          pdf.setFillColor(44, 62, 80);
          pdf.rect(col3X, y, 25, 7, 'F');
          pdf.text('Unit Price', col3X - 3, y + 4.5);

          pdf.setFillColor(44, 62, 80);
          pdf.rect(col4X, y, 30, 7, 'F');
          pdf.text('Amount', col4X + 3, y + 4.5);

          y += 8;

          // Reset formatting for item rows
          pdf.setFont('Arial', 'normal');
          pdf.setTextColor(0, 0, 0);
          pdf.setDrawColor(221, 221, 221);
          pdf.setFontSize(10);
        }

        // Description value - show description with site name
        pdf.rect(col1X, y, 80, 8);
        pdf.setFontSize(8);
        pdf.setFont('Arial', 'normal');
        pdf.text(description, col1X + 2, y + 4.5);

        // Quantity value
        pdf.rect(col2X, y, 30, 8);
        pdf.text(itemQty, col2X + 12, y + 4.5);

        // Unit Price value
        pdf.rect(col3X, y, 25, 8);
        pdf.text(`Rs. ${itemRate}`, col3X + 1, y + 4.5);

        // Amount value
        pdf.rect(col4X, y, 30, 8);
        pdf.text(`Rs. ${itemTotalDisplay}`, col4X + 2, y + 4.5);

        y += 8;
      }

      y += 6;

      // Check if totals section needs a new page (leave room for totals: ~35 units)
      if (y > 260) {
        pdf.addPage();
        y = 20;
      }

      // ===== TOTALS =====
      const tX = col3X;
      pdf.setFontSize(9);
      pdf.setFont('Arial', 'normal');

      const subtotalDisplay = subtotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      pdf.text('Subtotal:', tX, y);
      pdf.text(`Rs. ${subtotalDisplay}`, col4X + 2, y);
      y += 6;

      // Recalculate GST based on actual subtotalAmount from all lines
      let recalcIgstAmt = 0, recalcCgstAmt = 0, recalcSgstAmt = 0;
      if (po.gstApply) {
        if (po.gstType === 'igst') {
          recalcIgstAmt = Math.round(subtotalAmount * 0.18 * 100) / 100;
        } else if (po.gstType === 'cgstsgst') {
          recalcCgstAmt = Math.round(subtotalAmount * 0.09 * 100) / 100;
          recalcSgstAmt = Math.round(subtotalAmount * 0.09 * 100) / 100;
        }
      }

      // Show GST lines if applied
      if (po.gstApply) {
        if (po.gstType === 'igst') {
          const igstDisplay = recalcIgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          pdf.text('IGST (18%):', tX, y);
          pdf.text(`Rs. ${igstDisplay}`, col4X + 2, y);
          y += 6;
        } else if (po.gstType === 'cgstsgst') {
          const cgstDisplay = recalcCgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const sgstDisplay = recalcSgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          pdf.text('CGST (9%):', tX, y);
          pdf.text(`Rs. ${cgstDisplay}`, col4X + 2, y);
          y += 6;
          pdf.text('SGST (9%):', tX, y);
          pdf.text(`Rs. ${sgstDisplay}`, col4X + 2, y);
          y += 6;
        }
      }

      pdf.text('Shipping:', tX, y);
      pdf.text('Rs. 0', col4X + 2, y);
      y += 7;

      // Total box - recalculate with correct GST
      pdf.setFont('Arial', 'bold');
      pdf.setFontSize(11);
      pdf.setFillColor(44, 62, 80);
      pdf.setTextColor(255, 255, 255);
      pdf.rect(tX, y, 60, 7, 'F');
      pdf.text('TOTAL:', tX + 2, y + 5);
      const recalcFinalTotal = subtotalAmount + recalcIgstAmt + recalcCgstAmt + recalcSgstAmt;
      const finalDisplay = recalcFinalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      pdf.text(`Rs. ${finalDisplay}`, col4X + 2, y + 5);

      y += 14;

      // ===== REMARKS =====
      if (po.remarks) {
        pdf.setFontSize(9);
        pdf.setFont('Arial', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Remarks:', m, y);
        y += 5;
        pdf.setFont('Arial', 'normal');
        pdf.setFontSize(8);
        pdf.text(po.remarks.substring(0, 100), m, y);
      }

      // ===== FOOTER =====
      pdf.setFontSize(8);
      pdf.setFont('Arial', 'normal');
      pdf.setTextColor(102, 102, 102);
      pdf.text('This is a system-generated Purchase Order. No signature required.', 105, 278, { align: 'center' });
      pdf.text(`Status: ${po.status}`, 105, 283, { align: 'center' });

      pdf.save(`PO-${poNumber}.pdf`);
      toast({ title: 'Success', description: `PDF exported for ${poNumber}` });
    } catch (error: any) {
      console.error('PDF export error:', error?.message || error);
      toast({ title: 'Error', description: error?.message || 'Failed to export PDF', variant: 'destructive' });
    }
  };

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  const countAvailableForActiveVendor = isVendor ? (Array.isArray(availableSites) ? availableSites.filter(site => getSiteVendorId(site) === String(activeVendorId)).length : 0) : (Array.isArray(availableSites) ? availableSites.length : 0);
  // Use filteredPOs count instead of re-filtering allPOs
  const countAllPOsForActiveVendor = filteredPOs.length;

// ...existing code...

  return (
    <div className="space-y-6" ref={topRef}>
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Generate Purchase Orders</h2>
        <p className="text-muted-foreground">Auto-generate POs for sites with approved SOFT-AT and PHY-AT status.</p>
        {isEmployee && (
          <div className="mt-2 flex gap-4 text-sm">
            {(() => {
              const totalApproved = Array.isArray(approvedSites) ? (isVendor ? approvedSites.filter(s => getSiteVendorId(s) === String(activeVendorId)).length : approvedSites.length) : 0;
              const availCount = Array.isArray(availableSites) ? (isVendor ? availableSites.filter(s => getSiteVendorId(s) === String(activeVendorId)).length : availableSites.length) : 0;
              return (
                <>
                  <span className="text-blue-600 font-semibold">📊 Total Approved Sites: {totalApproved}</span>
                  <span className="text-green-600 font-semibold">✅ Available (No PO): {availCount}</span>
                  <span className="text-orange-600 font-semibold">📋 Already Have POs: {Array.isArray(approvedSites) ? (isVendor ? approvedSites.filter(s => getSiteVendorId(s) === String(activeVendorId) && sitesWithPOs.has(s.id)).length : approvedSites.filter(s => sitesWithPOs.has(s.id)).length) : 0}</span>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {countAvailableForActiveVendor === 0 && countAllPOsForActiveVendor === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">No sites available with approved SOFT-AT and PHY-AT status.</p>
          </CardContent>
        </Card>
      )}

      {countAvailableForActiveVendor === 0 && countAllPOsForActiveVendor > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-green-600 text-center font-semibold">
              ✅ All approved sites already have POs! Check "All Generated Purchase Orders" section below.
            </p>
          </CardContent>
        </Card>
      )}



      {true && (
        <>
            <Card>
              <CardHeader>
                <CardTitle>Available Sites for PO Generation</CardTitle>
                <CardDescription>Choose one or more sites to generate purchase orders ({Array.isArray(availableSites) ? availableSites.filter(s => (!isVendor || getSiteVendorId(s) === String(activeVendorId)) && (!selectedVendorFilter || String(s.vendorId) === String(selectedVendorFilter))).length : 0} available)</CardDescription>
              </CardHeader>
              <CardContent>
                {/* SmartSearch for vendor filtering (admins only) */}
                {isEmployeeAdmin && (
                  <div className="mb-4 flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Filter by Vendor:</label>
                    <SmartSearchTextbox
                      value={selectedVendorFilter ? (vendorSuggestions.find(v => v.id === selectedVendorFilter)?.label || '') : ''}
                      onChange={(v) => {
                        if (!v) setSelectedVendorFilter('');
                      }}
                      onSelect={(s) => {
                        if ('id' in s) {
                          setSelectedVendorFilter(s.id || '');
                        }
                        setShowAllMode(false);
                      }}
                      suggestions={vendorSuggestions}
                      loading={vendorLoading}
                      placeholder="Search vendor by name or code..."
                      maxSuggestions={100000}
                      className="flex-1"
                    />
                    {selectedVendorFilter && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedVendorFilter('')}
                        className="whitespace-nowrap"
                      >
                        Clear Filter
                      </Button>
                    )}
                  </div>
                )}
                {showAllMode && (
                  <div className="mb-3 p-2 rounded bg-yellow-50 border border-yellow-100 text-sm text-yellow-800">Viewing all sites (read-only). Generation is disabled. To enable, select a vendor.</div>
                )}

                {(() => {
                    const filteredAvailable = Array.isArray(availableSites) ? availableSites.filter(site => (!isVendor || getSiteVendorId(site) === String(activeVendorId)) && (!selectedVendorFilter || String(site.vendorId) === String(selectedVendorFilter))) : [];
                    const totalAvailable = filteredAvailable.length;
                    const totalPages = Math.max(1, Math.ceil(totalAvailable / pageSize));
                    const displayedPage = Math.min(currentPage, totalPages);
                    const startIndex = (displayedPage - 1) * pageSize;
                    const paginated = filteredAvailable.slice(startIndex, startIndex + pageSize);

                    if (totalAvailable === 0) {
                      return (
                        <div className="overflow-x-auto max-h-96">
                          <p className="text-center text-muted-foreground py-8">
                            {selectedVendorFilter ? 'No sites available for selected vendor' : 'No sites available'}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <>
                        {/* Desktop grid layout (All Vendors style) */}
                        <div className="hidden md:block rounded-md border bg-card overflow-x-auto max-h-96">
                          <div className="sticky top-0 z-20 grid grid-cols-12 gap-3 p-3 font-medium border-b bg-primary text-primary-foreground text-xs min-w-[900px]">
                            <div className="col-span-1">
                              <label className="inline-flex items-center">
                                <input type="checkbox" checked={pagination.allSelected} onChange={toggleSelectAllOnPage} disabled={showAllMode || pagination.selectableIds.length === 0} className="w-4 h-4 mr-2" />
                                <span className="sr-only">Select all on page</span>
                              </label>
                            </div>
                            <div className="col-span-3">Plan ID</div>
                            <div className="col-span-4">Vendor</div>
                            <div className="col-span-1 text-center">Max Antenna</div>
                            <div className="col-span-2 text-right">Amount</div>
                            <div className="col-span-1">Status</div>
                          </div>

                          {paginated.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground">No sites available</div>
                          ) : (
                            paginated.map(site => {
                              const s: any = site;
                              // Vendor details come from database join - no lookup needed
                              const vendorName = s.vendorName || s.partnerName || '';
                              const vendorCode = s.vendorCode || s.partnerCode || '';
                              // Prefer vendor name; fallback to a friendly ID when name is missing. Avoid showing raw vendor codes/colors as the primary name.
                              const vendorFallback = vendorName || (s.vendorId ? `Vendor #${String(s.vendorId).slice(0,6)}` : 'Unknown Vendor');
                              const vendorCodeVisible = vendorName ? vendorCode : '';
                              const isDisabled = showAllMode || !site.vendorAmount;
                              // Calculate antenna size from A and B, fallback to maxAntSize field
                              const maxAntenna = Math.max(parseFloat((site.siteAAntDia as string) || "0") || 0, parseFloat((site.siteBAntDia as string) || "0") || 0) || parseFloat(site.maxAntSize as string) || 0;

                              return (
                                <div key={site.id} className={`grid grid-cols-12 gap-3 p-3 border-b last:border-0 items-center hover:bg-muted/50 transition-colors min-w-[900px] ${isDisabled ? 'opacity-60' : ''}`}>
                                  <div className="col-span-1">
                                    <input
                                      type="checkbox"
                                      checked={selectedSites.has(site.id)}
                                      onChange={() => !isDisabled && handleSiteSelection(site.id)}
                                      disabled={isDisabled}
                                      className="w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <div className="font-mono font-semibold text-sm truncate">{truncateId(site.planId || '')}</div>
                                    <div className="text-xs text-muted-foreground md:hidden truncate">{vendorFallback}{vendorCodeVisible ? ` (${vendorCodeVisible})` : ''}</div>
                                  </div>
                                  <div className="col-span-4 text-xs truncate">{vendorFallback}{vendorCodeVisible ? ` (${vendorCodeVisible})` : ''}</div>
                                  <div className="col-span-1 text-center text-xs">{maxAntenna || '-'}</div>
                                  <div className="col-span-2 text-right text-sm whitespace-nowrap">{site.vendorAmount ? `Rs ${site.vendorAmount}` : 'Not Set'}</div>
                                  <div className="col-span-1 text-xs">
                                    {isDisabled ? <span className="text-xs text-red-600">⚠ Vendor Amount required</span> : <span className="text-xs text-green-600">Available</span>}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Mobile list (compact) */}
                        <div className="md:hidden space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <label className="inline-flex items-center">
                              <input type="checkbox" checked={pagination.allSelected} onChange={toggleSelectAllOnPage} disabled={showAllMode || pagination.selectableIds.length === 0} className="w-4 h-4 mr-2" />
                              <span className="text-sm">Select all on page</span>
                            </label>
                          </div>
                          {paginated.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No sites available</div>
                          ) : (
                            paginated.map(site => {
                              const s: any = site;
                              // Vendor details come from database join - no lookup needed
                              const vendorName = s.vendorName || s.partnerName || '';
                              const vendorCode = s.vendorCode || s.partnerCode || '';
                              // Prefer vendor name; fallback to a friendly ID when name is missing. Avoid showing raw vendor codes/colors as the primary name.
                              const vendorFallback = vendorName || (s.vendorId ? `Vendor #${String(s.vendorId).slice(0,6)}` : 'Unknown Vendor');
                              const vendorCodeVisible = vendorName ? vendorCode : '';
                              const isDisabled = showAllMode || !site.vendorAmount;
                              // Calculate antenna size from A and B, fallback to maxAntSize field
                              const maxAntenna = Math.max(parseFloat((site.siteAAntDia as string) || "0") || 0, parseFloat((site.siteBAntDia as string) || "0") || 0) || parseFloat(site.maxAntSize as string) || 0;

                              return (
                                <div key={site.id} className={`p-3 border rounded-md bg-card ${isDisabled ? 'opacity-60' : ''}`}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                      <input type="checkbox" checked={selectedSites.has(site.id)} onChange={() => !isDisabled && handleSiteSelection(site.id)} disabled={isDisabled} className="w-4 h-4" />
                                      <div>
                                        <div className="font-mono font-semibold truncate">{truncateId(site.planId || '')}</div>
                                        <div className="text-xs text-muted-foreground truncate">{vendorFallback}{vendorCodeVisible ? ` (${vendorCodeVisible})` : ''}</div>
                                      </div>
                                    </div>
                                    <div className="text-right text-sm font-semibold">{site.vendorAmount ? `Rs ${site.vendorAmount}` : 'Not Set'}</div>
                                  </div>
                                  <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
                                    <div>Max Ant: {maxAntenna || '-'}</div>
                                    <div className={`${isDisabled ? 'text-red-600' : 'text-green-600'}`}>{isDisabled ? 'Vendor Amount required' : 'Available'}</div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Pagination Controls (outside the scrollable area) */}
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="text-sm text-muted-foreground">{`Showing ${totalAvailable === 0 ? 0 : startIndex + 1} - ${Math.min(startIndex + pageSize, totalAvailable)} of ${totalAvailable}`}</div>

                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => setCurrentPage(1)} disabled={displayedPage === 1}>First</Button>
                            <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={displayedPage === 1}>Prev</Button>
                            <div className="flex items-center gap-2">
                              <input value={String(currentPage)} onChange={(e) => { const v = Number(e.target.value || 1); if (!isNaN(v)) setCurrentPage(Math.min(Math.max(1, v), Math.max(1, totalPages))); }} className="w-16 text-center form-input text-sm" />
                              <div className="px-2">of {Math.max(1, totalPages)}</div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(totalAvailable / pageSize)), p + 1))} disabled={displayedPage === Math.max(1, Math.ceil(totalAvailable / pageSize))}>Next</Button>
                            <Button size="sm" variant="outline" onClick={() => setCurrentPage(Math.max(1, Math.ceil(totalAvailable / pageSize)))} disabled={displayedPage === Math.max(1, Math.ceil(totalAvailable / pageSize))}>Last</Button>
                            <select className="form-select text-sm" value={String(pageSize)} onChange={(e) => { const v = Number(e.target.value || 50); setPageSize(v); setCurrentPage(1); }}>
                              {pageSizeOptions.map(opt => (
                                <option key={opt} value={String(opt)}>{opt} items per page</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </>
                    );
                  })()}


                {showGstInput && (
                  <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
                    applyGstToAll 
                      ? 'bg-green-50 border border-green-300' 
                      : 'bg-gray-50 border border-gray-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={applyGstToAll}
                      onChange={(e) => setApplyGstToAll(e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                      data-testid="checkbox-apply-gst-all"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">Apply GST to All POs</p>
                      <p className="text-xs text-gray-600">GST will be auto-determined based on vendor state (IGST for interstate, CGST+SGST for intrastate)</p>
                      <p className={`text-sm font-bold mt-2 ${applyGstToAll ? 'text-green-700' : 'text-gray-600'}`}>
                        Status: {applyGstToAll ? '✓ GST ENABLED' : '✗ GST DISABLED'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Grouping option */}
                <div className="mt-4 p-3 rounded border bg-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Generation Mode</p>
                    <p className="text-xs text-muted-foreground">Choose whether to create a PO per site or a single PO per vendor (auto-grouped).</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="radio" name="poMode" checked={!groupByVendor} onChange={() => setGroupByVendor(false)} />
                      <span>PO per Site</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="radio" name="poMode" checked={groupByVendor} onChange={() => setGroupByVendor(true)} />
                      <span>Single PO per Vendor</span>
                    </label>
                  </div>
                </div>

                <Button onClick={generatePOs} className="mt-4 w-full" disabled={showAllMode || selectedSites.size === 0 || generating}>
                  {generating ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating POs...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate POs ({selectedSites.size} selected)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
            </>
      )}

          {poRecords.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-700">✓ Just Generated Purchase Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2">PO Number</th>
                        <th className="text-left py-2">Sites</th>
                        <th className="text-left py-2">Vendor</th>
                        <th className="text-right py-2">GST Type</th>
                        <th className="text-right py-2">Total Amount</th>
                        <th className="text-center py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(poRecords) ? poRecords : []).map((po) => (
                        <tr key={po.poNumber} className="border-b hover:bg-green-100">
                          <td className="py-2 font-semibold">{po.poNumber}</td>
                          <td className="py-2">
                            {po.lines && Array.isArray(po.lines) ? (
                              <button onClick={() => { setModalSites(po.lines || []); setSitesModalOpen(true); }} className="text-sm font-semibold text-slate-900 hover:underline">{po.lines.length} site{po.lines.length !== 1 ? 's' : ''}</button>
                            ) : (
                              <span className="text-sm text-slate-700">{po.siteName || po.siteId || '—'}</span>
                            )}
                          </td>
                          <td className="py-2">{getVendorNameForPO(po)}{(po.vendorCode || po.partnerCode) ? ` (${po.vendorCode || po.partnerCode})` : ''}</td>
                          <td className="text-right py-2 text-orange-600 font-semibold">{po.gstApply ? (po.gstType === 'igst' ? 'IGST' : 'CGST+SGST') : 'No Tax'}</td>
                          <td className="text-right py-2 font-bold text-green-600">Rs {getTotalAmount(po).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                          <td className="text-center py-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => {
                                // Store PO data in sessionStorage for print page access
                                if (po.lines) {
                                  sessionStorage.setItem(`po_${po.id}`, JSON.stringify(po));
                                }
                                window.open(`/vendor/po/print/${po.id}`, '_blank');
                              }}
                            >
                              <Printer className="h-3 w-3" /> Print
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

      {(() => {
        // Use the filteredPOs from useMemo which already handles employee vs vendor logic
        if (filteredPOs.length > 0) return (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {isEmployee ? 'All Generated Purchase Orders' : 'My Generated Purchase Orders'}
            </CardTitle>
            <CardDescription>
              {isEmployee
                ? `Complete list of all purchase orders from all vendors (${filteredPOs.length} total)`
                : `Complete list of your generated POs (${filteredPOs.length} total)`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredPOs.map((po) => (
                <div
                  key={po.id}
                  className="border border-slate-300 rounded-lg p-3 hover:shadow-md hover:border-blue-400 transition-all duration-200 bg-white"
                  data-testid={`card-po-${po.id}`}
                >
                  <div className="space-y-2">
                    {/* Header with PO Number */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">PO</p>
                      <p className="text-xs font-bold text-slate-900 break-all">{po.poNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatPoDate(po.poDate)}</p>
                    </div>

                    {/* Site & Vendor Info */}
                    <div className="space-y-1.5 border-t border-slate-200 pt-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-0.5">Sites</p>
                        {po.lines && Array.isArray(po.lines) ? (
                          <div>
                            <button
                              onClick={() => { setModalSites(po.lines || []); setSitesModalOpen(true); }}
                              className="text-xs font-semibold text-slate-900 hover:underline"
                              title={po.lines.map((l:any)=> (l.siteHopAB || l.siteId || l.sitePlanId)).join(', ')}
                            >
                              {po.lines.length} site{po.lines.length !== 1 ? 's' : ''}
                            </button>
                            {po.lines.length === 1 && (
                              <div className="text-xs text-slate-600">{po.lines[0].siteHopAB || po.lines[0].siteId || po.siteName}</div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs font-semibold text-slate-900 truncate">{po.siteName || po.siteId || "—"}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-0.5">Vendor</p>
                        <p className="text-xs text-slate-700 truncate">{po.vendorName}{po.vendorCode ? ` (${po.vendorCode})` : 'N/A'}</p>
                      </div>

                    </div>

                    {/* Amount Section */}
                    <div className="border-t border-slate-200 pt-2 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-600 uppercase">Amount</span>
                        <span className="font-bold text-slate-700">Rs {Number(getTotalAmount(po)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {getGSTAmount(po) > 0 && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-600 uppercase">{po.gstApply ? (po.gstType === 'igst' ? 'IGST' : 'CGST+SGST') : 'Tax'}</span>
                          <span className="font-bold text-orange-600">Rs {Number(getGSTAmount(po)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center bg-green-50 p-2 rounded">
                        <span className="text-xs font-bold text-slate-700">Total</span>
                        <span className="text-sm font-bold text-green-600">Rs {Number(getTotalAmount(po)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="border-t border-slate-200 pt-2 flex gap-1">
                      <Button
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 h-auto flex-1"
                        onClick={() => {
                          // Store PO data in sessionStorage for print page access
                          if (po.lines) {
                            sessionStorage.setItem(`po_${po.id}`, JSON.stringify(po));
                          }
                          window.open(`/vendor/po/print/${po.id}`, '_blank');
                        }}
                      >
                        <Printer className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-slate-300 hover:bg-slate-50 text-xs py-1 h-auto"
                        onClick={() => {
                          // Store PO data in sessionStorage for export access
                          if (po.lines) {
                            sessionStorage.setItem(`po_${po.id}`, JSON.stringify(po));
                          }
                          exportPOToPDF(po.id, po.poNumber);
                        }}
                        data-testid={`button-export-pdf-${po.id}`}
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                      {(!poInvoices[po.id] || poInvoices[po.id].length === 0) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50 text-xs py-1 h-auto"
                          onClick={() => deletePO(po.id, po.poNumber)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
      {/* Sites modal */}
      <Dialog open={sitesModalOpen} onOpenChange={(v) => setSitesModalOpen(v)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>PO Sites</DialogTitle>
            <DialogDescription>List of sites included in the selected PO</DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            {modalSites && modalSites.length > 0 ? (
              <div className="space-y-2">
                {modalSites.map((s:any) => (
                  <div key={s.id || s.siteId || Math.random()} className="p-2 border rounded">
                    <div className="font-semibold">{s.siteHopAB || s.siteName || s.siteId || '—'}</div>
                    <div className="text-xs text-slate-600">Plan: {s.sitePlanId || s.planId || '—'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600">No sites available</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

            {/* Debug panel - visible only in development mode */}
            {import.meta.env.DEV && (
              <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-xs">
                <strong>Debug Info</strong>
                <div className="mt-2 space-y-1">
                  <div>activeVendorId: <code>{String(activeVendorId)}</code></div>
                  <div>isVendor: <code>{String(isVendor)}</code> isEmployee: <code>{String(isEmployee)}</code> isEmployeeAdmin: <code>{String(isEmployeeAdmin)}</code></div>
                  <div>Vendors loaded: <code>{vendors.length}</code> | Approved Sites: <code>{approvedSites.length}</code> | Available Sites: <code>{availableSites.length}</code></div>
                  <div>All POs: <code>{allPOs.length}</code> | Filtered POs: <code>{filteredPOs.length}</code> | Just Generated: <code>{poRecords.length}</code></div>
                  <div className="text-xs mt-2">
                    <strong>Role Logic:</strong> {isEmployee ? '✅ EMPLOYEE - Showing ALL POs' : isVendor ? '👤 VENDOR - Showing only vendor POs' : '❓ Unknown'}
                  </div>
                  <div className="text-xs mt-2">Filtered POs: {JSON.stringify(filteredPOs.slice(0, 5).map(p => ({ id: p.id, vendorId: p.vendorId, poNumber: p.poNumber })))} </div>
                  <div className="mt-2">
                    <button onClick={() => setShowRawAllPOs(s => !s)} className="px-2 py-1 bg-slate-100 border rounded text-xs">{showRawAllPOs ? 'Hide' : 'Show'} raw allPOs</button>
                  </div>
                  {showRawAllPOs && (
                    <pre className="mt-2 text-xs max-h-40 overflow-auto bg-white p-2 border">{JSON.stringify((allPOs || []).slice(0,50).map((p:any)=>({ id: p.id, vendorId: p.vendorId, poNumber: p.poNumber })), null, 2)}</pre>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      );
        // If no POs, show nothing (the message above already handles the empty state)
        return null;
      })()}

    {
      /* Debug panel - visible only in development mode */
    }
  </div>
  );
}
