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
import { createColorfulExcel } from '@/lib/exportUtils';
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [bulkPhyAtStatus, setBulkPhyAtStatus] = useState('');
  const [bulkSoftAtStatus, setBulkSoftAtStatus] = useState('');
  const [cardStatusFilter, setCardStatusFilter] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedSingleSite, setSelectedSingleSite] = useState<SiteStatusData | null>(null);
  const [singleSiteSearchText, setSingleSiteSearchText] = useState('');

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/api/sites`);
      if (response.ok) {
        const { data } = await response.json();
        setSites(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSites = sites.filter(site => {
    const matchesSearch = 
      site.planId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.circle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.district.toLowerCase().includes(searchTerm.toLowerCase());
    
    // If card filter is set, use it; otherwise use status filter
    const matchesStatus = cardStatusFilter ? site.status === cardStatusFilter : (selectedStatus === 'All' || site.status === selectedStatus);
    
    // Exclude approved sites from the grid (cannot be manually updated) unless cardStatusFilter is Approved
    const isNotApproved = cardStatusFilter === 'Approved' || site.status !== 'Approved';
    
    return matchesSearch && matchesStatus && isNotApproved;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Inactive':
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

  const statusOptions = ['All', ...Array.from(new Set(sites.filter(s => s.status !== 'Approved').map(s => s.status)))];

  const calculatePhyAtStatusCounts = () => {
    return {
      pending: sites.filter(s => s.phyAtStatus === 'Pending').length,
      approved: sites.filter(s => s.phyAtStatus === 'Approved').length,
      rejected: sites.filter(s => s.phyAtStatus === 'Rejected').length,
      raised: sites.filter(s => s.phyAtStatus === 'Raised').length,
    };
  };

  const calculateSoftAtStatusCounts = () => {
    return {
      pending: sites.filter(s => s.softAtStatus === 'Pending').length,
      approved: sites.filter(s => s.softAtStatus === 'Approved').length,
      rejected: sites.filter(s => s.softAtStatus === 'Rejected').length,
      raised: sites.filter(s => s.softAtStatus === 'Raised').length,
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

    try {
      // Fetch export header settings
      const headerResponse = await fetch(`${getApiBaseUrl()}/api/export-headers`);
      const headerSettings = headerResponse.ok ? await headerResponse.json() : {};

      const excelData = filteredSites.map(site => ({
      'ID': site.id || '-',
      'Site ID': site.siteId || '-',
      'Vendor ID': site.vendorId || '-',
      'Zone ID': site.zoneId || '-',
      'Plan ID': site.planId || '-',
      'Site Amount': site.siteAmount || '-',
      'Vendor Amount': site.vendorAmount || '-',
      'S.No': site.sno || '-',
      'Circle': site.circle || '-',
      'Nominal AOP': site.nominalAop || '-',
      'HOP Type': site.hopType || '-',
      'HOP A-B': site.hopAB || '-',
      'HOP B-A': site.hopBA || '-',
      'District': site.district || '-',
      'Project': site.project || '-',
      'Site A Ant Dia': site.siteAAntDia || '-',
      'Site B Ant Dia': site.siteBAntDia || '-',
      'Max Ant Size': site.maxAntSize || '-',
      'Site A Name': site.siteAName || '-',
      'TOCO Vendor A': site.tocoVendorA || '-',
      'TOCO ID A': site.tocoIdA || '-',
      'Site B Name': site.siteBName || '-',
      'TOCO Vendor B': site.tocoVendorB || '-',
      'TOCO ID B': site.tocoIdB || '-',
      'Media Availability Status': site.mediaAvailabilityStatus || '-',
      'SR No Site A': site.srNoSiteA || '-',
      'SR Date Site A': site.srDateSiteA || '-',
      'SR No Site B': site.srNoSiteB || '-',
      'SR Date Site B': site.srDateSiteB || '-',
      'HOP SR Date': site.hopSrDate || '-',
      'SP Date Site A': site.spDateSiteA || '-',
      'SP Date Site B': site.spDateSiteB || '-',
      'HOP SP Date': site.hopSpDate || '-',
      'SO Released Date Site A': site.soReleasedDateSiteA || '-',
      'SO Released Date Site B': site.soReleasedDateSiteB || '-',
      'HOP SO Date': site.hopSoDate || '-',
      'RFAI Offered Date Site A': site.rfaiOfferedDateSiteA || '-',
      'RFAI Offered Date Site B': site.rfaiOfferedDateSiteB || '-',
      'Actual HOP RFAI Offered Date': site.actualHopRfaiOfferedDate || '-',
      'Partner Name': site.partnerName || '-',
      'RFAI Survey Completion Date': site.rfaiSurveyCompletionDate || '-',
      'MO Number Site A': site.moNumberSiteA || '-',
      'Material Type Site A': site.materialTypeSiteA || '-',
      'MO Date Site A': site.moDateSiteA || '-',
      'MO Number Site B': site.moNumberSiteB || '-',
      'Material Type Site B': site.materialTypeSiteB || '-',
      'MO Date Site B': site.moDateSiteB || '-',
      'SRN RMO Number': site.srnRmoNumber || '-',
      'SRN RMO Date': site.srnRmoDate || '-',
      'HOP MO Date': site.hopMoDate || '-',
      'HOP Material Dispatch Date': site.hopMaterialDispatchDate || '-',
      'HOP Material Delivery Date': site.hopMaterialDeliveryDate || '-',
      'Material Delivery Status': site.materialDeliveryStatus || '-',
      'Site A Installation Date': site.siteAInstallationDate || '-',
      'PTW Number Site A': site.ptwNumberSiteA || '-',
      'PTW Status A': site.ptwStatusA || '-',
      'Site B Installation Date': site.siteBInstallationDate || '-',
      'PTW Number Site B': site.ptwNumberSiteB || '-',
      'PTW Status B': site.ptwStatusB || '-',
      'HOP IC Date': site.hopIcDate || '-',
      'Alignment Date': site.alignmentDate || '-',
      'HOP Installation Remarks': site.hopInstallationRemarks || '-',
      'Visible in NMS': site.visibleInNms || '-',
      'NMS Visible Date': site.nmsVisibleDate || '-',
      'Soft AT Offer Date': site.softAtOfferDate || '-',
      'Soft AT Acceptance Date': site.softAtAcceptanceDate || '-',
      'Soft AT Status': site.softAtStatus || '-',
      'Phy AT Offer Date': site.phyAtOfferDate || '-',
      'Phy AT Acceptance Date': site.phyAtAcceptanceDate || '-',
      'Phy AT Status': site.phyAtStatus || '-',
      'Both AT Status': site.bothAtStatus || '-',
      'PRI Issue Category': site.priIssueCategory || '-',
      'PRI Site ID': site.priSiteId || '-',
      'PRI Open Date': site.priOpenDate || '-',
      'PRI Close Date': site.priCloseDate || '-',
      'PRI History': site.priHistory || '-',
      'RFI Survey Allocation Date': site.rfiSurveyAllocationDate || '-',
      'Descope': site.descope || '-',
      'Reason of Extra Visit': site.reasonOfExtraVisit || '-',
      'WCC Received 80%': site.wccReceived80Percent || '-',
      'WCC Received Date 80%': site.wccReceivedDate80Percent || '-',
      'WCC Received 20%': site.wccReceived20Percent || '-',
      'WCC Received Date 20%': site.wccReceivedDate20Percent || '-',
      'WCC Received Date 100%': site.wccReceivedDate100Percent || '-',
      'Survey': site.survey || '-',
      'Final Partner Survey': site.finalPartnerSurvey || '-',
      'Survey Date': site.surveyDate || '-',
      'Status': site.status,
      'Created At': site.createdAt || '-',
      'Updated At': site.updatedAt || '-',
    }));

      const workbook = XLSX.utils.book_new();

      // Create header sheet if settings exist
      if (headerSettings.companyName || headerSettings.reportTitle) {
        const headerData = [];
        if (headerSettings.companyName) headerData.push(['Company:', headerSettings.companyName]);
        if (headerSettings.reportTitle) headerData.push(['Report:', headerSettings.reportTitle]);
        headerData.push(['']);
        headerData.push(['Generated:', new Date().toLocaleString()]);
        headerData.push(['']);
        
        const headerSheet = XLSX.utils.aoa_to_sheet(headerData);
        XLSX.utils.book_append_sheet(workbook, headerSheet, 'Header');
      }

      // Add data sheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const numColumns = Object.keys(excelData[0] || {}).length;
      worksheet['!cols'] = Array(numColumns).fill({ wch: 18 });
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Site Status');
      
      XLSX.writeFile(workbook, `site-status-${new Date().getTime()}.xlsx`);
      toast({ title: 'Success', description: 'Data exported to Excel' });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({ title: 'Error', description: 'Failed to export Excel', variant: 'destructive' });
    }
  };

  const exportSingleSitePDF = async (site: SiteStatusData) => {
    if (!site) {
      toast({ title: 'Error', description: 'No site selected', variant: 'destructive' });
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (2 * margin);

      // Fetch export header settings
      const headerResponse = await fetch(`${getApiBaseUrl()}/api/export-headers`);
      const headerSettings = headerResponse.ok ? await headerResponse.json() : {};

      let yPosition = margin;

      // Add header section if settings exist
      if (headerSettings.companyName || headerSettings.reportTitle) {
        pdf.setFillColor(41, 128, 185);
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(12);
        pdf.rect(margin, yPosition, contentWidth, 8, 'F');
        const headerText = [headerSettings.companyName, headerSettings.reportTitle].filter(Boolean).join(' | ');
        pdf.text(headerText, margin + 5, yPosition + 5);
        yPosition += 10;
      }

      // All 81 fields in label-value pairs
      const fields = [
        { label: 'Site ID', value: site.siteId },
        { label: 'Plan ID', value: site.planId },
        { label: 'Vendor ID', value: site.vendorId },
        { label: 'Zone ID', value: site.zoneId },
        { label: 'Site Amount', value: site.siteAmount },
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
        { label: 'Status', value: site.status },
      ];

      // Site header
      pdf.setFillColor(100, 149, 237);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.rect(margin, yPosition, contentWidth, 8, 'F');
      pdf.text(`SITE REPORT - ${site.siteId} | Plan: ${site.planId}`, margin + 5, yPosition + 5);
      yPosition += 8;
      
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(8);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin + 2, yPosition + 2);
      yPosition += 5;
      const lineHeight = 6;
      const labelWidth = contentWidth * 0.35;
      const valueWidth = contentWidth * 0.65;
      const fieldsPerPage = 28; // Approximate fields that fit per page
      let fieldCount = 0;

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);

      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const displayValue = field.value ? String(field.value) : '-';

        // Add page break if needed
        if (yPosition + lineHeight > pageHeight - margin - 5) {
          pdf.addPage();
          yPosition = margin;
          // Add header on new page
          pdf.setFillColor(41, 128, 185);
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(10);
          pdf.rect(margin, yPosition, contentWidth, 8, 'F');
          pdf.text(`SITE REPORT (Continued) - ${site.siteId}`, margin + 5, yPosition + 5);
          yPosition += 10;
          pdf.setTextColor(0, 0, 0);
        }

        // Alternate row colors
        if (i % 2 === 0) {
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, yPosition, contentWidth, lineHeight, 'F');
        }

        // Draw field label
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'bold');
        pdf.text(field.label + ':', margin + 2, yPosition + 4);

        // Draw field value
        pdf.setFont(undefined, 'normal');
        const wrappedText = pdf.splitTextToSize(displayValue, valueWidth - 2);
        pdf.text(wrappedText, margin + labelWidth + 2, yPosition + 4);

        yPosition += lineHeight;
      }

      pdf.save(`site-${site.siteId}-${site.planId}-${new Date().getTime()}.pdf`);
      toast({ title: 'Success', description: `PDF exported for ${site.siteId}` });
      setSelectedSingleSite(null);
      setSingleSiteSearchText('');
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ title: 'Error', description: 'Failed to export PDF', variant: 'destructive' });
    }
  };

  const exportToPDF = async () => {
    if (filteredSites.length === 0) {
      toast({ title: 'Error', description: 'No sites to export', variant: 'destructive' });
      return;
    }

    try {
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

      // Field definitions for all 81 fields
      const getFieldsForSite = (site: SiteStatusData) => [
        { label: 'Site ID', value: site.siteId },
        { label: 'Plan ID', value: site.planId },
        { label: 'Vendor ID', value: site.vendorId },
        { label: 'Zone ID', value: site.zoneId },
        { label: 'Site Amount', value: site.siteAmount },
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
        { label: 'Status', value: site.status },
      ];

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
          pdf.setFont(undefined, 'bold');
          pdf.text(field.label + ':', margin + 2, yPosition + 3.5);

          // Draw field value
          pdf.setFont(undefined, 'normal');
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
      
      // Fetch fresh data in background (non-blocking)
      fetchSites();
    } catch (error: any) {
      console.error('[SiteStatus] Bulk update error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to update sites', variant: 'destructive' });
    }
  };

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
            {['Pending', 'Approved', 'Rejected', 'Raised'].map(status => {
              const counts = calculatePhyAtStatusCounts();
              const statusKey = status.toLowerCase() as keyof typeof counts;
              const count = counts[statusKey];
              
              return (
                <Card 
                  key={`phy-${status}`} 
                  className={`shadow-md border-2 ${getStatusCountColor(status)} cursor-pointer hover:shadow-lg transition-shadow p-3`}
                  onClick={() => setCardStatusFilter(status)}
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
            {['Pending', 'Approved', 'Rejected', 'Raised'].map(status => {
              const counts = calculateSoftAtStatusCounts();
              const statusKey = status.toLowerCase() as keyof typeof counts;
              const count = counts[statusKey];
              
              return (
                <Card 
                  key={`soft-${status}`} 
                  className={`shadow-md border-2 ${getStatusCountColor(status)} cursor-pointer hover:shadow-lg transition-shadow p-3`}
                  onClick={() => setCardStatusFilter(status)}
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
            Showing {filteredSites.length} of {sites.filter(s => s.status !== 'Approved').length} updatable sites {selectedSites.size > 0 && `(${selectedSites.size} selected)`}
          </div>
          {filteredSites.length > 0 && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={exportToExcel}
                data-testid="button-download-excel"
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportToPDF}
                data-testid="button-download-pdf"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          )}
        </div>
        {sites.some(s => s.status === 'Approved') && (
          <div className="text-sm bg-blue-50 border border-blue-200 rounded p-3 text-blue-800">
            ℹ️ {sites.filter(s => s.status === 'Approved').length} approved site(s) are not shown - Approved sites cannot be manually updated
          </div>
        )}
      </div>

      {/* Single Site PDF Export */}
      <Card className="bg-green-50 border-green-300">
        <CardHeader>
          <CardTitle className="text-lg">Export Single Site (One Page PDF)</CardTitle>
          <CardDescription>Search and export one site with all 81 fields on a single page</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end">
            <div className="flex-1 min-w-xs">
              <label className="text-sm font-medium mb-2 block">Search by Plan ID or Site ID</label>
              <Input
                placeholder="Enter Plan ID or Site ID..."
                value={singleSiteSearchText}
                onChange={(e) => setSingleSiteSearchText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const found = sites.find(s => 
                      s.planId.toLowerCase().includes(singleSiteSearchText.toLowerCase()) ||
                      s.siteId.toLowerCase().includes(singleSiteSearchText.toLowerCase())
                    );
                    if (found) {
                      setSelectedSingleSite(found);
                    } else {
                      toast({ title: 'Not Found', description: 'No site found with that ID', variant: 'destructive' });
                    }
                  }
                }}
                data-testid="input-single-site-search"
              />
            </div>
            <Button
              onClick={() => {
                const found = sites.find(s => 
                  s.planId.toLowerCase().includes(singleSiteSearchText.toLowerCase()) ||
                  s.siteId.toLowerCase().includes(singleSiteSearchText.toLowerCase())
                );
                if (found) {
                  setSelectedSingleSite(found);
                } else {
                  toast({ title: 'Not Found', description: 'No site found with that ID', variant: 'destructive' });
                }
              }}
              size="sm"
              data-testid="button-search-single"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            {selectedSingleSite && (
              <Button
                onClick={() => exportSingleSitePDF(selectedSingleSite)}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-export-single-pdf"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            )}
          </div>
          {selectedSingleSite && (
            <div className="mt-3 text-sm text-green-700 bg-white border border-green-300 p-2 rounded">
              Selected: <span className="font-semibold">{selectedSingleSite.siteId}</span> | Plan: <span className="font-semibold">{selectedSingleSite.planId}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Update Section */}
      {filteredSites.length > 0 && cardStatusFilter !== 'Approved' && (
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
              onClick={handleBulkUpdate} 
              disabled={selectedSites.size === 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="button-bulk-update"
            >
              Update {selectedSites.size > 0 ? `${selectedSites.size} Sites` : 'Sites'}
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
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
                  {filteredSites.map((site) => (
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {filteredSites.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Active', 'Pending', 'Inactive'].map(status => {
                const count = filteredSites.filter(s => s.status === status).length;
                return (
                  <div key={status} className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">{status}</p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                );
              })}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">With ATP Remarks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredSites.filter(s => s.atpRemark).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
