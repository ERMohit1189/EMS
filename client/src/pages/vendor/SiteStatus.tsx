import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { X, ChevronDown, ChevronUp, Download } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getApiBaseUrl } from '@/lib/api';
import { fetchWithLoader } from '@/lib/fetchWithLoader';
import { truncateId } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { createColorfulExcel, fetchExportHeader, type ExportHeader } from '@/lib/exportUtils';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SiteStatusData {
  id: string;
  siteId: string;
  vendorId: string;
  zoneId: string | null;
  planId: string;
  siteAmount: number | null;
  vendorAmount: number | null;
  sno: number | null;
  circle: string | null;
  nominalAop: string | null;
  hopType: string | null;
  hopAB: string | null;
  hopBA: string | null;
  district: string | null;
  project: string | null;
  siteAAntDia: string | null;
  siteBAntDia: string | null;
  maxAntSize: string | null;
  siteAName: string | null;
  tocoVendorA: string | null;
  tocoIdA: string | null;
  siteBName: string | null;
  tocoVendorB: string | null;
  tocoIdB: string | null;
  mediaAvailabilityStatus: string | null;
  srNoSiteA: string | null;
  srDateSiteA: string | null;
  srNoSiteB: string | null;
  srDateSiteB: string | null;
  hopSrDate: string | null;
  spDateSiteA: string | null;
  spDateSiteB: string | null;
  hopSpDate: string | null;
  soReleasedDateSiteA: string | null;
  soReleasedDateSiteB: string | null;
  hopSoDate: string | null;
  rfaiOfferedDateSiteA: string | null;
  rfaiOfferedDateSiteB: string | null;
  actualHopRfaiOfferedDate: string | null;
  partnerName: string | null;
  rfaiSurveyCompletionDate: string | null;
  moNumberSiteA: string | null;
  materialTypeSiteA: string | null;
  moDateSiteA: string | null;
  moNumberSiteB: string | null;
  materialTypeSiteB: string | null;
  moDateSiteB: string | null;
  srnRmoNumber: string | null;
  srnRmoDate: string | null;
  hopMoDate: string | null;
  hopMaterialDispatchDate: string | null;
  hopMaterialDeliveryDate: string | null;
  materialDeliveryStatus: string | null;
  siteAInstallationDate: string | null;
  ptwNumberSiteA: string | null;
  ptwStatusA: string | null;
  siteBInstallationDate: string | null;
  ptwNumberSiteB: string | null;
  ptwStatusB: string | null;
  hopIcDate: string | null;
  alignmentDate: string | null;
  hopInstallationRemarks: string | null;
  visibleInNms: string | null;
  nmsVisibleDate: string | null;
  softAtOfferDate: string | null;
  softAtAcceptanceDate: string | null;
  softAtStatus: string | null;
  phyAtOfferDate: string | null;
  phyAtAcceptanceDate: string | null;
  phyAtStatus: string | null;
  bothAtStatus: string | null;
  priIssueCategory: string | null;
  priSiteId: string | null;
  priOpenDate: string | null;
  priCloseDate: string | null;
  priHistory: string | null;
  rfiSurveyAllocationDate: string | null;
  descope: string | null;
  reasonOfExtraVisit: string | null;
  wccReceived80Percent: string | null;
  wccReceivedDate80Percent: string | null;
  wccReceived20Percent: string | null;
  wccReceivedDate20Percent: string | null;
  wccReceivedDate100Percent: string | null;
  survey: string | null;
  finalPartnerSurvey: string | null;
  surveyDate: string | null;
  status: string;
  atpRemark?: string | null;
  phyAtRemark?: string | null;
  softAtRemark?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const updateStatusOptions = ['Pending', 'Raised', 'Approved', 'Rejected'];

export default function SiteStatus() {
  const { toast } = useToast();
  const [sites, setSites] = useState<SiteStatusData[]>([]);
  const [allSitesForCounts, setAllSitesForCounts] = useState<SiteStatusData[]>([]);
  const [atpCounts, setAtpCounts] = useState<{ phy: Record<string, number>; soft: Record<string, number>; totalCount: number }>({ phy: {}, soft: {}, totalCount: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [bulkPhyAtStatus, setBulkPhyAtStatus] = useState('');
  const [bulkSoftAtStatus, setBulkSoftAtStatus] = useState('');
  const [cardStatusFilter, setCardStatusFilter] = useState<string | null>(null);
  const [cardFilterArea, setCardFilterArea] = useState<'phy' | 'soft' | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchSites();
  }, [currentPage, pageSize, cardStatusFilter, cardFilterArea]);

  useEffect(() => {
    // Fetch aggregated ATP counts once on mount
    fetchAtpCounts();
  }, []);

  const fetchSites = async (options?: { forceRefresh?: boolean }) => {
    try {
      // Show table-level loader for subsequent loads; use page-level loader for first load
      const initialLoad = sites.length === 0;
      if (initialLoad) setLoading(true);
      setTableLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('pageSize', pageSize.toString());
      // Apply ATP card filter to server query if set
      if (cardFilterArea && cardStatusFilter) {
        if (cardFilterArea === 'phy') params.append('phyAtStatus', cardStatusFilter);
        if (cardFilterArea === 'soft') params.append('softAtStatus', cardStatusFilter);
      }
      // Optionally force server to bypass caches / Vite dev middleware caches
      if (options?.forceRefresh) {
        params.append('t', String(Date.now()));
      }

      const response = await fetch(`${getApiBaseUrl()}/api/sites?${params.toString()}`);
      if (response.ok) {
        const { data, totalCount } = await response.json();
        setSites(data || []);
        setTotalCount(totalCount || 0);
        setTotalPages(Math.ceil((totalCount || 0) / pageSize));
        // Refresh counts to keep UI in sync
        fetchAtpCounts();
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  };

  const fetchAtpCounts = async () => {
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/sites/atp-counts`);
      if (resp.ok) {
        const json = await resp.json();
        setAtpCounts({ phy: json.phy || {}, soft: json.soft || {}, totalCount: json.totalCount || 0 });
      }
    } catch (error) {
      console.error('[SiteStatus] Failed to fetch ATP counts:', error);
    }
  };

  const filteredSites = sites.filter(site => {
    const matchesSearch = 
      site.planId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.circle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.district?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // If card filter is set, use it; otherwise use status filter
    const matchesStatus = cardStatusFilter ? site.status === cardStatusFilter : (selectedStatus === 'All' || site.status === selectedStatus);

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Raised':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAtpStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-50 text-gray-600';
    switch (status.toLowerCase()) {
      case 'yes':
      case 'active':
      case 'completed':
        return 'bg-green-50 text-green-700';
      case 'no':
      case 'pending':
      case 'in progress':
        return 'bg-yellow-50 text-yellow-700';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const statusOptions = ['All', ...Array.from(new Set(sites.map(s => s.status)))].filter((s): s is string => s !== null);

  const calculatePhyAtStatusCounts = () => {
    const normalizeStatus = (status: string | null) => (status || '').toLowerCase().trim();
    return {
      pending: sites.filter(s => normalizeStatus(s.phyAtStatus) === 'pending').length,
      approved: sites.filter(s => {
        const status = normalizeStatus(s.phyAtStatus);
        return status === 'approved' || status === 'accepted';
      }).length,
      rejected: sites.filter(s => normalizeStatus(s.phyAtStatus) === 'rejected').length,
      raised: sites.filter(s => normalizeStatus(s.phyAtStatus) === 'raised').length,
    };
  };

  const calculateSoftAtStatusCounts = () => {
    const normalizeStatus = (status: string | null) => (status || '').toLowerCase().trim();
    return {
      pending: sites.filter(s => normalizeStatus(s.softAtStatus) === 'pending').length,
      approved: sites.filter(s => {
        const status = normalizeStatus(s.softAtStatus);
        return status === 'approved' || status === 'accepted';
      }).length,
      rejected: sites.filter(s => normalizeStatus(s.softAtStatus) === 'rejected').length,
      raised: sites.filter(s => normalizeStatus(s.softAtStatus) === 'raised').length,
    };
  };

  const getStatusCountColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'Approved':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'Rejected':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'Raised':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const toggleSiteSelection = (siteId: string) => {
    const newSelected = new Set(selectedSites);
    if (newSelected.has(siteId)) {
      newSelected.delete(siteId);
    } else {
      newSelected.add(siteId);
    }
    setSelectedSites(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedSites.size === filteredSites.length) {
      setSelectedSites(new Set());
    } else {
      setSelectedSites(new Set(filteredSites.map(s => s.id)));
    }
  };

  const exportToExcel = async () => {
    if (filteredSites.length === 0) {
      toast({ title: 'Error', description: 'No sites to export', variant: 'destructive' });
      return;
    }

    setIsExporting(true);
    try {
      // Check if user is super admin (only superadmin, not regular admin)
      const employeeRole = localStorage.getItem('employeeRole')?.toLowerCase() || '';
      const isSuperAdmin = employeeRole === 'superadmin';

      // Fetch export header settings
      const headerResponse = await fetch(`${getApiBaseUrl()}/api/export-headers`);
      const headerSettings = headerResponse.ok ? await headerResponse.json() : {};

      const excelData = filteredSites.map(site => {
        const data: Record<string, any> = {
          'ID': site.id || '-',
          'Site ID': site.siteId || '-',
          'Vendor ID': site.vendorId || '-',
          'Zone ID': site.zoneId || '-',
          'Plan ID': site.planId || '-',
          'Vendor': site.vendorName || site.partnerName || '-',
        };

        // Only include Site Amount for super admin
        if (isSuperAdmin) {
          data['Site Amount'] = site.siteAmount || '-';
        }

        // Continue with other fields
        data['Vendor Amount'] = site.vendorAmount || '-';
        data['S.No'] = site.sno || '-';
        data['Circle'] = site.circle || '-';
        data['Nominal AOP'] = site.nominalAop || '-';
        data['HOP Type'] = site.hopType || '-';
        data['HOP A-B'] = site.hopAB || '-';
        data['HOP B-A'] = site.hopBA || '-';
        data['District'] = site.district || '-';
        data['Project'] = site.project || '-';
        data['Site A Ant Dia'] = site.siteAAntDia || '-';
        data['Site B Ant Dia'] = site.siteBAntDia || '-';
        data['Max Ant Size'] = site.maxAntSize || '-';
        data['Site A Name'] = site.siteAName || '-';
        data['TOCO Vendor A'] = site.tocoVendorA || '-';
        data['TOCO ID A'] = site.tocoIdA || '-';
        data['Site B Name'] = site.siteBName || '-';
        data['TOCO Vendor B'] = site.tocoVendorB || '-';
        data['TOCO ID B'] = site.tocoIdB || '-';
        data['Media Availability Status'] = site.mediaAvailabilityStatus || '-';
        data['SR No Site A'] = site.srNoSiteA || '-';
        data['SR Date Site A'] = site.srDateSiteA || '-';
        data['SR No Site B'] = site.srNoSiteB || '-';
        data['SR Date Site B'] = site.srDateSiteB || '-';
        data['HOP SR Date'] = site.hopSrDate || '-';
        data['SP Date Site A'] = site.spDateSiteA || '-';
        data['SP Date Site B'] = site.spDateSiteB || '-';
        data['HOP SP Date'] = site.hopSpDate || '-';
        data['SO Released Date Site A'] = site.soReleasedDateSiteA || '-';
        data['SO Released Date Site B'] = site.soReleasedDateSiteB || '-';
        data['HOP SO Date'] = site.hopSoDate || '-';
        data['RFAI Offered Date Site A'] = site.rfaiOfferedDateSiteA || '-';
        data['RFAI Offered Date Site B'] = site.rfaiOfferedDateSiteB || '-';
        data['Actual HOP RFAI Offered Date'] = site.actualHopRfaiOfferedDate || '-';
        data['Partner Code'] = site.vendorCode || site.partnerCode || '-';
        data['Partner Name'] = site.partnerName || '-';
        data['RFAI Survey Completion Date'] = site.rfaiSurveyCompletionDate || '-';
        data['MO Number Site A'] = site.moNumberSiteA || '-';
        data['Material Type Site A'] = site.materialTypeSiteA || '-';
        data['MO Date Site A'] = site.moDateSiteA || '-';
        data['MO Date Site A'] = site.moDateSiteA || '-';
        data['MO Number Site B'] = site.moNumberSiteB || '-';
        data['Material Type Site B'] = site.materialTypeSiteB || '-';
        data['MO Date Site B'] = site.moDateSiteB || '-';
        data['SRN RMO Number'] = site.srnRmoNumber || '-';
        data['SRN RMO Date'] = site.srnRmoDate || '-';
        data['HOP MO Date'] = site.hopMoDate || '-';
        data['HOP Material Dispatch Date'] = site.hopMaterialDispatchDate || '-';
        data['HOP Material Delivery Date'] = site.hopMaterialDeliveryDate || '-';
        data['Material Delivery Status'] = site.materialDeliveryStatus || '-';
        data['Site A Installation Date'] = site.siteAInstallationDate || '-';
        data['PTW Number Site A'] = site.ptwNumberSiteA || '-';
        data['PTW Status A'] = site.ptwStatusA || '-';
        data['Site B Installation Date'] = site.siteBInstallationDate || '-';
        data['PTW Number Site B'] = site.ptwNumberSiteB || '-';
        data['PTW Status B'] = site.ptwStatusB || '-';
        data['HOP IC Date'] = site.hopIcDate || '-';
        data['Alignment Date'] = site.alignmentDate || '-';
        data['HOP Installation Remarks'] = site.hopInstallationRemarks || '-';
        data['Visible in NMS'] = site.visibleInNms || '-';
        data['NMS Visible Date'] = site.nmsVisibleDate || '-';
        data['Soft AT Offer Date'] = site.softAtOfferDate || '-';
        data['Soft AT Acceptance Date'] = site.softAtAcceptanceDate || '-';
        data['Soft AT Status'] = site.softAtStatus || '-';
        data['Phy AT Offer Date'] = site.phyAtOfferDate || '-';
        data['Phy AT Acceptance Date'] = site.phyAtAcceptanceDate || '-';
        data['Phy AT Status'] = site.phyAtStatus || '-';
        data['Both AT Status'] = site.bothAtStatus || '-';
        data['PRI Issue Category'] = site.priIssueCategory || '-';
        data['PRI Site ID'] = site.priSiteId || '-';
        data['PRI Open Date'] = site.priOpenDate || '-';
        data['PRI Close Date'] = site.priCloseDate || '-';
        data['PRI History'] = site.priHistory || '-';
        data['RFI Survey Allocation Date'] = site.rfiSurveyAllocationDate || '-';
        data['Descope'] = site.descope || '-';
        data['Reason of Extra Visit'] = site.reasonOfExtraVisit || '-';
        data['WCC Received 80%'] = site.wccReceived80Percent || '-';
        data['WCC Received Date 80%'] = site.wccReceivedDate80Percent || '-';
        data['WCC Received 20%'] = site.wccReceived20Percent || '-';
        data['WCC Received Date 20%'] = site.wccReceivedDate20Percent || '-';
        data['WCC Received Date 100%'] = site.wccReceivedDate100Percent || '-';
        data['Survey'] = site.survey || '-';
        data['Final Partner Survey'] = site.finalPartnerSurvey || '-';
        data['Survey Date'] = site.surveyDate || '-';
        data['Status'] = site.status;
        data['Created At'] = site.createdAt || '-';
        data['Updated At'] = site.updatedAt || '-';

        return data;
      });

      // Convert to array-of-arrays format for colorful export
      const headers = Object.keys(excelData[0] || {});
      const dataArray = [headers, ...excelData.map(row => headers.map(h => (row as Record<string, any>)[h]))];
      const columnWidths = Array(headers.length).fill(18);
      
      createColorfulExcel(dataArray, columnWidths, `site-status-${new Date().getTime()}.xlsx`, 'Site Status');
      toast({ title: 'Success', description: 'Data exported to Excel' });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({ title: 'Error', description: 'Failed to export Excel', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };



  const exportToPDF = async () => {
    if (filteredSites.length === 0) {
      toast({ title: 'Error', description: 'No sites to export', variant: 'destructive' });
      return;
    }

    setIsExporting(true);
    try {
      // Check if user is super admin (only superadmin, not regular admin)
      const employeeRole = localStorage.getItem('employeeRole')?.toLowerCase() || '';
      const isSuperAdmin = employeeRole === 'superadmin';

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (2 * margin);

      const lineHeight = 5.5;
      const labelWidth = contentWidth * 0.35;
      const valueWidth = contentWidth * 0.65;

      // Fetch export header settings
      const headerResponse = await fetch(`${getApiBaseUrl()}/api/export-headers`);
      const exportHeaderSettings = headerResponse.ok ? await headerResponse.json() : {};

      // Field definitions - conditionally include Site Amount
      const getFieldsForSite = (site: SiteStatusData) => {
        const fields = [
          { label: 'Site ID', value: site.siteId },
          { label: 'Plan ID', value: site.planId },
          { label: 'Vendor ID', value: site.vendorId },
          { label: 'Zone ID', value: site.zoneId },
        ];

        // Only include Site Amount for super admin
        if (isSuperAdmin) {
          fields.push({ label: 'Site Amount', value: site.siteAmount });
        }

        // Continue with other fields
        fields.push(
          { label: 'Vendor Amount', value: site.vendorAmount },
          { label: 'S.No', value: site.sno },
          { label: 'Circle', value: site.circle },
          { label: 'Nominal AOP', value: site.nominalAop },
          { label: 'HOP Type', value: site.hopType },
          { label: 'HOP A-B', value: site.hopAB },
          { label: 'HOP B-A', value: site.hopBA },
          { label: 'District', value: site.district },
          { label: 'Project', value: site.project },
          { label: 'Site A Ant Dia', value: site.siteAAntDia },
          { label: 'Site B Ant Dia', value: site.siteBAntDia },
          { label: 'Max Ant Size', value: site.maxAntSize },
          { label: 'Site A Name', value: site.siteAName },
          { label: 'TOCO Vendor A', value: site.tocoVendorA },
          { label: 'TOCO ID A', value: site.tocoIdA },
          { label: 'Site B Name', value: site.siteBName },
          { label: 'TOCO Vendor B', value: site.tocoVendorB },
          { label: 'TOCO ID B', value: site.tocoIdB },
          { label: 'Media Availability', value: site.mediaAvailabilityStatus },
          { label: 'SR No Site A', value: site.srNoSiteA },
          { label: 'SR Date Site A', value: site.srDateSiteA },
          { label: 'SR No Site B', value: site.srNoSiteB },
          { label: 'SR Date Site B', value: site.srDateSiteB },
          { label: 'HOP SR Date', value: site.hopSrDate },
          { label: 'SP Date Site A', value: site.spDateSiteA },
          { label: 'SP Date Site B', value: site.spDateSiteB },
          { label: 'HOP SP Date', value: site.hopSpDate },
          { label: 'SO Released Date A', value: site.soReleasedDateSiteA },
          { label: 'SO Released Date B', value: site.soReleasedDateSiteB },
          { label: 'HOP SO Date', value: site.hopSoDate },
          { label: 'RFAI Offered Date A', value: site.rfaiOfferedDateSiteA },
          { label: 'RFAI Offered Date B', value: site.rfaiOfferedDateSiteB },
          { label: 'HOP RFAI Date', value: site.actualHopRfaiOfferedDate },
          { label: 'Partner Name', value: site.partnerName },
          { label: 'RFAI Survey Completion', value: site.rfaiSurveyCompletionDate },
          { label: 'MO Number Site A', value: site.moNumberSiteA },
          { label: 'Material Type Site A', value: site.materialTypeSiteA },
          { label: 'MO Date Site A', value: site.moDateSiteA },
          { label: 'MO Number Site B', value: site.moNumberSiteB },
          { label: 'Material Type Site B', value: site.materialTypeSiteB },
          { label: 'MO Date Site B', value: site.moDateSiteB },
          { label: 'SRN/RMO Number', value: site.srnRmoNumber },
          { label: 'SRN/RMO Date', value: site.srnRmoDate },
          { label: 'HOP MO Date', value: site.hopMoDate },
          { label: 'Material Dispatch Date', value: site.hopMaterialDispatchDate },
          { label: 'Material Delivery Date', value: site.hopMaterialDeliveryDate },
          { label: 'Material Delivery Status', value: site.materialDeliveryStatus },
          { label: 'Site A Installation Date', value: site.siteAInstallationDate },
          { label: 'PTW Number Site A', value: site.ptwNumberSiteA },
          { label: 'PTW Status A', value: site.ptwStatusA },
          { label: 'Site B Installation Date', value: site.siteBInstallationDate },
          { label: 'PTW Number Site B', value: site.ptwNumberSiteB },
        { label: 'PTW Status B', value: site.ptwStatusB },
        { label: 'HOP I&C Date', value: site.hopIcDate },
        { label: 'Alignment Date', value: site.alignmentDate },
        { label: 'Installation Remarks', value: site.hopInstallationRemarks },
        { label: 'Visible in NMS', value: site.visibleInNms },
        { label: 'NMS Visible Date', value: site.nmsVisibleDate },
        { label: 'SOFT-AT Offer Date', value: site.softAtOfferDate },
        { label: 'SOFT-AT Acceptance Date', value: site.softAtAcceptanceDate },
        { label: 'SOFT-AT Status', value: site.softAtStatus },
        { label: 'PHY-AT Offer Date', value: site.phyAtOfferDate },
        { label: 'PHY-AT Acceptance Date', value: site.phyAtAcceptanceDate },
        { label: 'PHY-AT Status', value: site.phyAtStatus },
        { label: 'Both AT Status', value: site.bothAtStatus },
        { label: 'PRI Issue Category', value: site.priIssueCategory },
        { label: 'PRI Site ID', value: site.priSiteId },
        { label: 'PRI Open Date', value: site.priOpenDate },
        { label: 'PRI Close Date', value: site.priCloseDate },
        { label: 'PRI History', value: site.priHistory },
        { label: 'RFI Survey Allocation', value: site.rfiSurveyAllocationDate },
        { label: 'Descope', value: site.descope },
        { label: 'Reason of Extra Visit', value: site.reasonOfExtraVisit },
        { label: 'WCC 80% Received', value: site.wccReceived80Percent },
        { label: 'WCC Date 80%', value: site.wccReceivedDate80Percent },
        { label: 'WCC 20% Received', value: site.wccReceived20Percent },
        { label: 'WCC Date 20%', value: site.wccReceivedDate20Percent },
        { label: 'WCC Date 100%', value: site.wccReceivedDate100Percent },
        { label: 'Survey', value: site.survey },
        { label: 'Final Partner Survey', value: site.finalPartnerSurvey },
        { label: 'Survey Date', value: site.surveyDate },
        { label: 'Status', value: site.status }
      );

      return fields;
    };

    let yPosition = margin;
    let isFirstSite = true;

    // Add header section if settings exist
    if (exportHeaderSettings.companyName || exportHeaderSettings.reportTitle) {
      pdf.setFillColor(41, 128, 185);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.rect(margin, yPosition, contentWidth, 8, 'F');
      const headerText = [exportHeaderSettings.companyName, exportHeaderSettings.reportTitle].filter(Boolean).join(' | ');
      pdf.text(headerText, margin + 5, yPosition + 5);
      yPosition += 10;
    }

    for (const site of filteredSites) {
      const fields = getFieldsForSite(site);

      // Start each new site on a new page
      if (!isFirstSite) {
        pdf.addPage();
        yPosition = margin;

          // Add header on new pages if settings exist
          if (exportHeaderSettings.companyName || exportHeaderSettings.reportTitle) {
            pdf.setFillColor(41, 128, 185);
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(12);
            pdf.rect(margin, yPosition, contentWidth, 8, 'F');
            const headerText = [exportHeaderSettings.companyName, exportHeaderSettings.reportTitle].filter(Boolean).join(' | ');
            pdf.text(headerText, margin + 5, yPosition + 5);
            yPosition += 10;
          }
        }

        // Draw site header
        pdf.setFillColor(100, 149, 237);
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        pdf.rect(margin, yPosition, contentWidth, 8, 'F');
        pdf.text(`${site.siteId} | Plan: ${site.planId}`, margin + 5, yPosition + 5);
        yPosition += 8;
        isFirstSite = false;

        // Draw fields
        pdf.setTextColor(0, 0, 0);
        for (let i = 0; i < fields.length; i++) {
          const field = fields[i];
          const displayValue = field.value ? String(field.value) : '-';

          // Add page break if needed
          if (yPosition + lineHeight > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }

          // Alternate row colors
          if (i % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(margin, yPosition, contentWidth, lineHeight, 'F');
          }

          // Draw field label
          pdf.setFontSize(8);
          pdf.setFont('Helvetica', 'bold');
          pdf.text(field.label + ':', margin + 2, yPosition + 3.5);

          // Draw field value
          pdf.setFont('Helvetica', 'normal');
          const wrappedText = pdf.splitTextToSize(displayValue, valueWidth - 2);
          pdf.text(wrappedText, margin + labelWidth + 2, yPosition + 3.5);

          yPosition += lineHeight;
        }
      }

      pdf.save(`site-status-${new Date().getTime()}.pdf`);
      toast({ title: 'Success', description: `Exported ${filteredSites.length} sites with all 81 fields` });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ title: 'Error', description: 'Failed to export PDF', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedSites.size === 0) {
      toast({ title: 'Error', description: 'Please select at least one site', variant: 'destructive' });
      return;
    }
    if (!bulkPhyAtStatus && !bulkSoftAtStatus) {
      toast({ title: 'Error', description: 'Please select at least one status to update', variant: 'destructive' });
      return;
    }

    try {
      setIsUpdating(true);
      setTableLoading(true);
      // Get plan IDs of selected sites
      const planIds = Array.from(selectedSites)
        .map(siteId => filteredSites.find(s => s.id === siteId)?.planId)
        .filter(Boolean) as string[];

      if (planIds.length === 0) {
        throw new Error('No valid plan IDs found');
      }

      const updatePayload = {
        planIds: planIds,
        phyAtStatus: bulkPhyAtStatus || undefined,
        softAtStatus: bulkSoftAtStatus || undefined,
        // If both are Approved, also set Site status to Approved
        shouldApproveStatus: bulkPhyAtStatus === 'Approved' && bulkSoftAtStatus === 'Approved',
      };
      
      const response = await fetch(`${getApiBaseUrl()}/api/sites/bulk-update-status-by-plan`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update sites');
      }
      
      const responseData = await response.json();
      
      // Instant optimistic UI update - calculate and display result immediately
      const updatedSites = sites.map(site => {
        if (selectedSites.has(site.id)) {
          let newStatus = 'Pending';
          const finalPhyAtStatus = bulkPhyAtStatus || site.phyAtStatus;
          const finalSoftAtStatus = bulkSoftAtStatus || site.softAtStatus;
          
          if (finalPhyAtStatus === 'Approved' && finalSoftAtStatus === 'Approved') {
            newStatus = 'Approved';
          }
          
          return {
            ...site,
            phyAtStatus: bulkPhyAtStatus || site.phyAtStatus,
            softAtStatus: bulkSoftAtStatus || site.softAtStatus,
            status: newStatus
          };
        }
        return site;
      });
      
      setSites(updatedSites);
      toast({ title: 'Success', description: `Updated ${selectedSites.size} sites` });
      setSelectedSites(new Set());
      setBulkPhyAtStatus('');
      setBulkSoftAtStatus('');
      try {
        // Force a fresh fetch so Pending/Approved lists reflect server state immediately
        await fetchSites({ forceRefresh: true });
        await fetchAtpCounts();
      } finally {
        setTableLoading(false);
      }
    } catch (error: any) {
      console.error('[SiteStatus] Bulk update error:', error);
      const message = error.message || (error instanceof TypeError ? 'Network error: failed to reach server' : 'Failed to update sites');
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
      setTableLoading(false);
    }
  };

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-1">Site Status</h2>
            <p className="text-purple-100 text-sm">View all sites with ATP Remarks and status information</p>
          </div>
          <Button 
            onClick={fetchSites} 
            disabled={loading}
            className="bg-white text-purple-600 hover:bg-purple-50"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Summary Cards - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Phy AT Status Summary */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-gray-700">Phy AT Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* showing per-status counts only */}

            {['Pending', 'Approved', 'Rejected', 'Raised'].map(status => {
              const count = (() => {
                // case-insensitive lookup
                const keys = Object.keys(atpCounts.phy || {});
                const found = keys.find(k => k.toLowerCase() === status.toLowerCase());
                return found ? atpCounts.phy[found] : 0;
              })();

              return (
                <Card 
                  key={`phy-${status}`} 
                  className={`shadow-md border-2 ${getStatusCountColor(status)} cursor-pointer hover:shadow-lg transition-shadow p-3`}
                  onClick={() => {
                    setCardStatusFilter(status);
                    setCardFilterArea('phy');
                    setCurrentPage(1);
                  }}
                >
                  <div className="text-center">
                    <p className="text-xs font-medium opacity-75 mb-1">{status}</p>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs opacity-60 mt-1">sites</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Soft AT Status Summary */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-gray-700">Soft AT Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* showing per-status counts only */}

            {['Pending', 'Approved', 'Rejected', 'Raised'].map(status => {
              const count = (() => {
                const keys = Object.keys(atpCounts.soft || {});
                const found = keys.find(k => k.toLowerCase() === status.toLowerCase());
                return found ? atpCounts.soft[found] : 0;
              })();

              return (
                <Card 
                  key={`soft-${status}`} 
                  className={`shadow-md border-2 ${getStatusCountColor(status)} cursor-pointer hover:shadow-lg transition-shadow p-3`}
                  onClick={() => {
                    setCardStatusFilter(status);
                    setCardFilterArea('soft');
                    setCurrentPage(1);
                  }}
                >
                  <div className="text-center">
                    <p className="text-xs font-medium opacity-75 mb-1">{status}</p>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs opacity-60 mt-1">sites</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card Filter Active Indicator */}
      {cardStatusFilter && (
        <Card className="shadow-md border-blue-300 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Viewing: <span className="font-semibold text-lg">{cardStatusFilter}</span> Site Status</p>
                {cardStatusFilter === 'Approved' && (
                  <p className="text-xs text-gray-500 mt-1">Read-only view - Date filter applied below</p>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setCardStatusFilter(null);
+                  setCardFilterArea(null);
                  setStartDate('');
                  setEndDate('');
                }}
              >
                <X className="h-4 w-4" /> Clear Filter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Filters Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        className="mb-4"
        data-testid="button-advanced-filters"
      >
        {showAdvancedFilters ? (
          <>
            <ChevronUp className="h-4 w-4 mr-2" />
            Hide Advanced Filters
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 mr-2" />
            Show Advanced Filters
          </>
        )}
      </Button>

      {/* Filters */}
      {showAdvancedFilters && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by Plan ID, Circle, or District..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Site Status</label>
              <div className="flex gap-2 flex-wrap">
                {statusOptions.map(status => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus(status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Date Filter for Approved Sites */}
          {cardStatusFilter === 'Approved' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
          </CardContent>
        </Card>
      )}

      {/* Results Count & Download Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {sites.length} sites — page {currentPage} of {totalPages} {selectedSites.size > 0 && `(${selectedSites.size} selected)`}
          </div>
          {filteredSites.length > 0 && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={exportToExcel}
                disabled={isExporting}
                data-testid="button-download-excel"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Excel'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportToPDF}
                disabled={isExporting}
                data-testid="button-download-pdf"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'PDF'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Update Section */}
      {filteredSites.length > 0 && (
        <Card className="shadow-md border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Bulk Update AT Status</CardTitle>
            <CardDescription>Update Physical and Software AT status. Site status auto-updates to Approved when both are Approved.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Phy AT Status</label>
                <Select value={bulkPhyAtStatus} onValueChange={setBulkPhyAtStatus}>
                  <SelectTrigger data-testid="select-phy-at-status">
                    <SelectValue placeholder="Select Phy AT Status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {updateStatusOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Soft AT Status</label>
                <Select value={bulkSoftAtStatus} onValueChange={setBulkSoftAtStatus}>
                  <SelectTrigger data-testid="select-soft-at-status">
                    <SelectValue placeholder="Select Soft AT Status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {updateStatusOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              type="button"
              onClick={handleBulkUpdate} 
              disabled={selectedSites.size === 0 || isUpdating}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="button-bulk-update"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                `Update ${selectedSites.size > 0 ? `${selectedSites.size} Sites` : 'Sites'}`
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sites Table */}
      <Card className="shadow-md" id="sites-table-export">
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading site status...</p>
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No sites found</p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableRow className="bg-gray-50">
                    {cardStatusFilter !== 'Approved' && (
                      <TableHead className="font-semibold w-12">
                        <Checkbox 
                          checked={selectedSites.size === filteredSites.length && filteredSites.length > 0}
                          onCheckedChange={toggleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                    )}
                    <TableHead className="font-semibold">Plan ID</TableHead>
                    <TableHead className="font-semibold">Circle</TableHead>
                    <TableHead className="font-semibold">District</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Phy AT Status</TableHead>
                    <TableHead className="font-semibold">Soft AT Status</TableHead>
                    <TableHead className="font-semibold">Visible in NMS</TableHead>
                    <TableHead className="font-semibold">Both AT Status</TableHead>
                    <TableHead className="font-semibold">ATP Remark</TableHead>
                    <TableHead className="font-semibold">Descope</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableLoading ? (
                    // Show skeleton rows matching the page size (capped)
                    Array.from({ length: Math.min(pageSize || 10, 10) }).map((_, i) => (
                      <TableRow key={`skeleton-${i}`} className="animate-pulse">
                        {cardStatusFilter !== 'Approved' && (
                          <TableCell>
                            <div className="h-4 w-4 bg-gray-200 rounded"></div>
                          </TableCell>
                        )}
                        <TableCell className="font-medium text-blue-600 font-mono"><div className="h-4 bg-gray-200 rounded w-24" /></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded w-20" /></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded w-20" /></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded w-16" /></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded w-24" /></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded w-24" /></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded w-12" /></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded w-12" /></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded w-32" /></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded w-24" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    filteredSites.map((site) => (
                      <TableRow key={site.id} className={`hover:bg-gray-50 transition-colors ${selectedSites.has(site.id) ? 'bg-blue-100' : ''}`}>
                        {cardStatusFilter !== 'Approved' && (
                          <TableCell>
                            <Checkbox 
                              checked={selectedSites.has(site.id)}
                              onCheckedChange={() => toggleSiteSelection(site.id)}
                              data-testid={`checkbox-site-${site.id}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium text-blue-600 font-mono">{truncateId(site.planId)}</TableCell>
                        <TableCell>{site.circle || '-'}</TableCell>
                        <TableCell>{site.district || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(site.status)}>
                            {site.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(site.phyAtStatus || 'pending')}>
                            {site.phyAtStatus || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(site.softAtStatus || 'pending')}>
                            {site.softAtStatus || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getAtpStatusColor(site.visibleInNms)}>
                            {site.visibleInNms || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getAtpStatusColor(site.bothAtStatus)}>
                            {site.bothAtStatus || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {site.atpRemark ? (
                            <div className={`px-2 py-1 rounded text-xs ${getAtpStatusColor(site.atpRemark)}`}>
                              {site.atpRemark}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {site.atpRemark ? (
                            <div className={`px-2 py-1 rounded text-xs ${getAtpStatusColor(site.atpRemark)}`}>
                              {site.atpRemark}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {site.descope ? (
                            <Badge variant="destructive">{site.descope}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={(e) => { e.preventDefault(); setCurrentPage(1); }} disabled={currentPage === 1}>First</Button>
                <Button type="button" size="sm" variant="outline" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} disabled={currentPage === 1}>Prev</Button>
                <div className="px-3">Page</div>
                <Input value={String(currentPage)} onChange={(e) => { const v = Number(e.target.value || 1); if (!isNaN(v)) setCurrentPage(Math.min(Math.max(1, v), totalPages)); }} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="w-16 text-center" />
                <div className="px-3">of {totalPages}</div>
                <Button type="button" size="sm" variant="outline" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} disabled={currentPage === totalPages}>Next</Button>
                <Button type="button" size="sm" variant="outline" onClick={(e) => { e.preventDefault(); setCurrentPage(totalPages); }} disabled={currentPage === totalPages}>Last</Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600">Page size</div>
                <select className="form-select text-sm" value={String(pageSize)} onChange={(e) => { const v = Number(e.target.value || 50); setPageSize(v); setCurrentPage(1); }}>
                  {[10, 25, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                </select>
              </div>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
