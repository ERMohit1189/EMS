import { getApiBaseUrl } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, Trash2, Printer } from "lucide-react";
import jsPDF from "jspdf";

import { fetchWithLoader, authenticatedFetch, authenticatedFetchJson } from "@/lib/fetchWithLoader";
import { fetchExportHeader } from "@/lib/exportUtils";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import SmartSearchTextbox, { Suggestion } from "@/components/SmartSearchTextbox";
import type { PurchaseOrder, Vendor } from "@shared/schema";

// Helper function to truncate site names with "and X more" format
const formatSiteNames = (siteNames: string[], maxDisplay: number = 3): string => {
  if (siteNames.length <= maxDisplay) {
    return siteNames.join(", ");
  }
  const displayed = siteNames.slice(0, maxDisplay);
  const remaining = siteNames.length - maxDisplay;
  return `${displayed.join(", ")} and ${remaining} more`;
};

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  poNumber: string;
  poCount: number;
  siteCount: number;
  poDate: string;
  poDueDate: string;
  vendorName: string;
  vendorCode?: string;
  vendorEmail?: string;
  siteName: string;
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
  gst: string;
  totalAmount: string;
  invoiceDate: string;
  invoiceDueDate: string;
  status: string;
  poIds?: string[];
  poDetails?: any[];
  invoiceSites?: any[];
}

export default function InvoiceGeneration() {
  const topRef = useRef<HTMLDivElement>(null);
  const [availablePOs, setAvailablePOs] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);
  const [printing, setPrinting] = useState<string | null>(null);
  const [selectedPOs, setSelectedPOs] = useState<Set<string>>(new Set());
  const [invoiceRecords, setInvoiceRecords] = useState<InvoiceRecord[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceRecord[]>([]);
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>("");
  // Pagination for available POs table
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSizeOptions = [10, 25, 50, 100];
  // Modal states for PO and Site details
  const [showPODetailsModal, setShowPODetailsModal] = useState(false);
  const [showSiteDetailsModal, setShowSiteDetailsModal] = useState(false);
  const [selectedPODetails, setSelectedPODetails] = useState<any[]>([]);
  const [selectedSiteDetails, setSelectedSiteDetails] = useState<any[]>([]);
  const [selectedPoForSites, setSelectedPoForSites] = useState<string | null>(null);

  // Clamp current page when filters or page size change
  useEffect(() => {
    // Ensure availablePOs is an array before filtering (defensive in case of unexpected API shapes)
    const filteredCount = (Array.isArray(availablePOs) ? availablePOs : []).filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).length;
    const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [availablePOs, selectedVendorFilter, pageSize, currentPage]);
  const [vendorSuggestions, setVendorSuggestions] = useState<Suggestion[]>([]);
  const [isVendor, setIsVendor] = useState(false);
  const [invoiceGenerationDate, setInvoiceGenerationDate] = useState<number>(-1);
  const [groupByVendor, setGroupByVendor] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Check if user is a vendor
        const vendorId = localStorage.getItem('vendorId');
        setIsVendor(!!vendorId);

        const baseUrl = getApiBaseUrl();

        // OPTIMIZED: Load critical data first in parallel
        // 1. Invoices with all details (PO, vendor, site) in one query - MUCH faster
        // 2. Settings for date restrictions
        const [invoicesRes, settingsRes] = await Promise.all([
          authenticatedFetch(`${baseUrl}/api/invoices?pageSize=10000&withDetails=true`),
          authenticatedFetch(`${baseUrl}/api/app-settings`),
        ]);

        if (!invoicesRes.ok || !settingsRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const invoicesData = await invoicesRes.json();
        const settingsData = await settingsRes.json();

        // Set invoice generation date from settings
        setInvoiceGenerationDate(settingsData.invoiceGenerationDate || -1);

        const invoices = invoicesData.data || [];

        // Invoices already have all details joined from backend - no lookups needed!
        const invoiceRecords: InvoiceRecord[] = invoices.map((invoice: any) => {
          // Handle poIds - could be array, null, or comma-separated string
          let poIds: string[] = [];
          if (Array.isArray(invoice.poIds) && invoice.poIds.length > 0) {
            poIds = invoice.poIds;
          } else if (typeof invoice.poIds === 'string' && invoice.poIds.trim()) {
            poIds = invoice.poIds.split(',').map((id: string) => id.trim()).filter(Boolean);
          } else if (invoice.poId) {
            poIds = [invoice.poId];
          }

          // Get sites from purchase_order_lines (returned by backend as allSiteNames)
          const siteNames = (Array.isArray(invoice.allSiteNames) && invoice.allSiteNames.length > 0)
            ? invoice.allSiteNames.filter((s: string) => s) // Filter out null/empty values
            : [invoice.siteName || invoice.siteId2 || "Unknown"];

          // Get first PO details for display (if multiple POs, show the first one)
          const firstPoDetail = (Array.isArray(invoice.poDetails) && invoice.poDetails.length > 0)
            ? invoice.poDetails[0]
            : null;

          return {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            poNumber: firstPoDetail?.poNumber || "Unknown",
            poCount: poIds.length,
            siteCount: siteNames.length,
            poIds: poIds,
            poDate: firstPoDetail?.poDate || "",
            poDueDate: firstPoDetail?.poDate || "", // Use poDate for both (dueDate not in poDetails)
            vendorName: firstPoDetail?.vendorName || invoice.vendorName || "Unknown",
            vendorCode: invoice.vendorCode,
            vendorEmail: invoice.vendorEmail,
            siteName: formatSiteNames(siteNames, 3), // Show first 3 sites, then "and X more"
            description: invoice.description || "N/A",
            quantity: invoice.quantity || 0,
            unitPrice: invoice.unitPrice?.toString() || "0",
            amount: invoice.amount,
            gst: invoice.gst,
            totalAmount: invoice.totalAmount,
            invoiceDate: invoice.invoiceDate,
            invoiceDueDate: invoice.dueDate,
            status: invoice.status,
            poDetails: invoice.poDetails || [],
            invoiceSites: invoice.invoiceSites || [],
          };
        });
        setAllInvoices(invoiceRecords);

        // Collect all PO IDs that are already in invoices (from po_ids column)
        const invoicedPOIds = new Set<string>();
        invoiceRecords.forEach((invoice) => {
          if (invoice.poIds && Array.isArray(invoice.poIds)) {
            invoice.poIds.forEach((poId) => {
              if (poId) invoicedPOIds.add(poId);
            });
          }
        });

        // Load available POs with all details in parallel AFTER initial render (lazy load)
        // OPTIMIZED: Single query returns POs with vendor and site details pre-joined, no loops needed!
        setTimeout(async () => {
          try {
            const posRes = await authenticatedFetch(`${baseUrl}/api/purchase-orders?pageSize=10000&withDetails=true&availableOnly=true`);

            if (posRes.ok) {
              const posData = await posRes.json();
              const pos = posData.data || [];

              // Filter out POs that are already in invoices (from po_ids column)
              const filteredPos = pos.filter((po: any) => !invoicedPOIds.has(po.id));

              // All vendor and site data already joined! No lookups needed
              setAvailablePOs(filteredPos);

              // Build vendor suggestions for SmartSearchTextbox directly from filtered available POs
              const vendorMap = new Map<string, { id: string; name: string; code: string }>();
              filteredPos.forEach((po: any) => {
                if (po.vendorId && !vendorMap.has(po.vendorId)) {
                  vendorMap.set(po.vendorId, {
                    id: po.vendorId,
                    name: po.vendorName || '',
                    code: po.vendorCode || ''
                  });
                }
              });
              const vendorsList = Array.from(vendorMap.values());
              setVendors(vendorsList);

              const sugg = vendorsList
                .map((v: any) => ({
                  id: v.id,
                  label: `${(v.name || '').trim()} — ${(v.code || '').trim()}`.trim(),
                  name: v.name || '',
                  code: v.code || ''
                }))
                .filter((s: any) => s.name || s.code)
                .sort((a: any, b: any) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
              setVendorSuggestions(sugg);
            }
          } catch (err) {
            console.error('Failed to load available POs for generation:', err);
          } finally {
            setLoadingPOs(false);
          }
        }, 0);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handlePOSelection = (poId: string) => {
    const newSet = new Set(selectedPOs);
    if (newSet.has(poId)) {
      newSet.delete(poId);
    } else {
      newSet.add(poId);
    }
    setSelectedPOs(newSet);
  };

  const deleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`Delete invoice ${invoiceNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const apiUrl = `${getApiBaseUrl()}/api/invoices/${invoiceId}`;
      console.log(`[Frontend] Deleting invoice from: ${apiUrl}`);
      const response = await authenticatedFetch(apiUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const responseData = await response.json();
      console.log(`[Frontend] Delete response:`, responseData);

      if (response.ok) {
        // Update all invoices list
        setAllInvoices(allInvoices.filter(inv => inv.id !== invoiceId));
        setInvoiceRecords(invoiceRecords.filter(inv => inv.id !== invoiceId));

        // Refetch available POs to restore any POs that were in the deleted invoice
        try {
          const posResponse = await authenticatedFetch(`${getApiBaseUrl()}/api/purchase-orders?pageSize=10000&withDetails=true&availableOnly=true`);
          if (posResponse.ok) {
            const posData = await posResponse.json();
            // API returns { data: [...] } — normalize to an array for consistency
            const posList = Array.isArray(posData) ? posData : (posData.data || []);
            console.log(`[Delete] Refetched POs. Available: ${posList.length}`);
            setAvailablePOs(posList);
          }
        } catch (error) {
          console.error('Failed to refetch available POs:', error);
        }

        toast({
          title: "Success",
          description: `Invoice ${invoiceNumber} has been deleted.`,
        });
      } else {
        throw new Error(responseData?.error || "Failed to delete invoice");
      }
    } catch (error: any) {
      console.error(`[Frontend] Delete error:`, error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const deleteAllInvoices = async () => {
    if (!confirm('Are you sure you want to delete ALL invoices? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/invoices`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAllInvoices([]);
        setInvoiceRecords([]);
        toast({
          title: "Success",
          description: "All invoices have been deleted.",
        });
      } else {
        throw new Error("Failed to delete invoices");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete invoices",
        variant: "destructive",
      });
    }
  };

  const generateInvoicePDF = async (invoice: InvoiceRecord) => {
    const exportHeader = await fetchExportHeader();
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = 210;
    const m = 12;
    let y = 20;

    // ===== HEADER =====
    doc.setFont('Arial', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(44, 62, 80);
    doc.text('TAX INVOICE', m, y);

    doc.setFontSize(11);
    doc.setTextColor(153, 153, 153);
    doc.setFont('Arial', 'normal');
    doc.text(exportHeader.companyName || 'Company Name', m, y + 7);

    // Right side info
    const rX = pageW - m - 60;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('Arial', 'bold');
    doc.text('Invoice No.:', rX, y);
    doc.setFont('Arial', 'normal');
    doc.text(String(invoice.invoiceNumber), rX + 28, y);

    y += 7;
    doc.setFont('Arial', 'bold');
    doc.text('Invoice Date:', rX, y);
    doc.setFont('Arial', 'normal');
    doc.text(String(invoice.invoiceDate), rX + 28, y);

    y += 7;
    doc.setFont('Arial', 'bold');
    doc.text('Due Date:', rX, y);
    doc.setFont('Arial', 'normal');
    doc.text(String(invoice.invoiceDueDate), rX + 28, y);

    y += 18;

    // ===== COMPANY INFO =====
    doc.setFontSize(9);
    doc.setFont('Arial', 'normal');
    doc.setTextColor(0, 0, 0);
    if (exportHeader.companyName) {
      doc.text(exportHeader.companyName, m, y);
      y += 4;
    }
    if (exportHeader.address) {
      doc.text(exportHeader.address, m, y);
      y += 4;
    }
    if (exportHeader.contactPhone) {
      doc.text(`Phone: ${exportHeader.contactPhone}`, m, y);
      y += 4;
    }
    if (exportHeader.website) {
      doc.text(`Website: ${exportHeader.website}`, m, y);
      y += 4;
    }

    y += 6;

    // ===== BILL TO & VENDOR INFO =====
    doc.setFontSize(11);
    doc.setFont('Arial', 'bold');
    doc.text('Bill To', m, y);

    y += 5;

    // Separator
    doc.setDrawColor(221, 221, 221);
    doc.line(m, y, pageW - m, y);

    y += 4;

    // Vendor content
    doc.setFontSize(9);
    doc.setFont('Arial', 'normal');
    doc.setTextColor(0, 0, 0);

    const vn = invoice.vendorName || '[Vendor Name]';
    const ve = invoice.vendorEmail || '';

    doc.setFont('Arial', 'bold');
    doc.setFontSize(10);
    doc.text(vn, m, y);
    y += 4;

    doc.setFont('Arial', 'normal');
    doc.setFontSize(9);
    if (ve) {
      doc.text(ve, m, y);
      y += 4;
    }
    if (invoice.vendorCode) {
      doc.text(`Code: ${invoice.vendorCode}`, m, y);
      y += 4;
    }

    y += 8;

    // ===== ITEMS TABLE =====
    doc.setFontSize(9);
    doc.setFont('Arial', 'bold');
    doc.setFillColor(44, 62, 80);
    doc.setTextColor(255, 255, 255);

    const col1X = m;
    const col2X = m + 90;
    const col3X = m + 130;
    const col4X = m + 160;

    // TABLE HEADER ROW
    doc.setFillColor(44, 62, 80);
    doc.rect(col1X, y, 90, 7, 'F');
    doc.text('Site/Description', col1X + 2, y + 4.5);

    doc.setFillColor(44, 62, 80);
    doc.rect(col2X, y, 40, 7, 'F');
    doc.text('Antenna', col2X + 10, y + 4.5);

    doc.setFillColor(44, 62, 80);
    doc.rect(col3X, y, 30, 7, 'F');
    doc.text('Amount', col3X + 2, y + 4.5);

    doc.setFillColor(44, 62, 80);
    doc.rect(col4X, y, 30, 7, 'F');
    doc.text('Total', col4X + 5, y + 4.5);

    y += 8;

    // ITEM DATA ROWS - Group by PO and show each site
    doc.setFont('Arial', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(221, 221, 221);
    doc.setFontSize(9);

    let totalAmount = 0;

    // Group sites by PO
    const sitesByPo: { [key: string]: any[] } = {};
    if (invoice.invoiceSites && Array.isArray(invoice.invoiceSites)) {
      invoice.invoiceSites.forEach((site: any) => {
        const poKey = site.poNumber || 'Unknown PO';
        if (!sitesByPo[poKey]) {
          sitesByPo[poKey] = [];
        }
        sitesByPo[poKey].push(site);
      });
    }

    // Display each PO and its sites
    Object.keys(sitesByPo).forEach((poNumber: string) => {
      const sites = sitesByPo[poNumber];

      // PO subheader
      doc.setFont('Arial', 'bold');
      doc.setFillColor(240, 240, 240);
      doc.rect(col1X, y, pageW - 2 * m, 6, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.text(`Purchase Order: ${poNumber}`, col1X + 2, y + 4);
      y += 7;

      // Sites for this PO
      doc.setFont('Arial', 'normal');
      sites.forEach((site: any) => {
        // Check if we need a new page
        if (y > 250) {
          doc.addPage();
          y = 20;

          // Re-draw table header on new page
          doc.setFontSize(9);
          doc.setFont('Arial', 'bold');
          doc.setFillColor(44, 62, 80);
          doc.setTextColor(255, 255, 255);

          doc.rect(col1X, y, 90, 7, 'F');
          doc.text('Site/Description', col1X + 2, y + 4.5);

          doc.rect(col2X, y, 40, 7, 'F');
          doc.text('Antenna', col2X + 10, y + 4.5);

          doc.rect(col3X, y, 30, 7, 'F');
          doc.text('Amount', col3X + 2, y + 4.5);

          doc.rect(col4X, y, 30, 7, 'F');
          doc.text('Total', col4X + 5, y + 4.5);

          y += 8;

          doc.setFont('Arial', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(9);
        }

        const siteName = site.siteName || 'Unknown Site';
        const description = `Installation and commissioning for ${siteName}`;
        const antenna = site.maxAntennaSize || '-';
        const amount = site.vendorAmount ? parseFloat(site.vendorAmount) : 0;
        const amountDisplay = amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        totalAmount += amount;

        // Description cell
        doc.rect(col1X, y, 90, 8);
        doc.setFontSize(8);
        doc.text(description, col1X + 2, y + 4.5);

        // Antenna cell
        doc.rect(col2X, y, 40, 8);
        doc.setFontSize(9);
        doc.text(antenna, col2X + 15, y + 4.5);

        // Amount cell
        doc.rect(col3X, y, 30, 8);
        doc.text(`Rs. ${amountDisplay}`, col3X + 2, y + 4.5);

        // Total cell (same as amount for now)
        doc.rect(col4X, y, 30, 8);
        doc.text(`Rs. ${amountDisplay}`, col4X + 2, y + 4.5);

        y += 8;
      });
    });

    y += 6;

    // Check if totals section needs a new page
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    // ===== TOTALS =====
    const tX = col3X;
    doc.setFontSize(9);
    doc.setFont('Arial', 'normal');

    const subtotalDisplay = totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    doc.setTextColor(0, 0, 0);
    doc.text('Subtotal:', tX, y);
    doc.text(`Rs. ${subtotalDisplay}`, col4X + 2, y);
    y += 6;

    // Get GST info from first PO in poDetails array
    let gstAmount = 0;
    let igstAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let showGST = false;
    let gstType = '';

    if (invoice.poDetails && invoice.poDetails.length > 0) {
      const firstPO = invoice.poDetails[0];
      // Note: These fields would need to come from the backend in poDetails
      // For now, checking if gstApply exists (would be added to backend response)
      if (firstPO.gstApply) {
        showGST = true;
        gstType = firstPO.gstType || 'igst';

        if (gstType === 'igst') {
          igstAmount = totalAmount * 0.18;
          gstAmount = igstAmount;
        } else if (gstType === 'cgstsgst') {
          cgstAmount = totalAmount * 0.09;
          sgstAmount = totalAmount * 0.09;
          gstAmount = cgstAmount + sgstAmount;
        }
      }
    }

    // Only show GST if it's applied
    if (showGST) {
      if (gstType === 'igst') {
        const gstDisplay = igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        doc.text('IGST (18%):', tX, y);
        doc.text(`Rs. ${gstDisplay}`, col4X + 2, y);
        y += 6;
      } else if (gstType === 'cgstsgst') {
        const cgstDisplay = cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const sgstDisplay = sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        doc.text('CGST (9%):', tX, y);
        doc.text(`Rs. ${cgstDisplay}`, col4X + 2, y);
        y += 6;
        doc.text('SGST (9%):', tX, y);
        doc.text(`Rs. ${sgstDisplay}`, col4X + 2, y);
        y += 6;
      }
    }

    doc.text('Shipping:', tX, y);
    doc.text('Rs. 0', col4X + 2, y);
    y += 7;

    // Total box
    doc.setFont('Arial', 'bold');
    doc.setFontSize(11);
    doc.setFillColor(44, 62, 80);
    doc.setTextColor(255, 255, 255);
    doc.rect(tX, y, 60, 7, 'F');
    doc.text('TOTAL:', tX + 2, y + 5);
    const finalTotal = totalAmount + gstAmount;
    const finalDisplay = finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    doc.text(`Rs. ${finalDisplay}`, col4X + 2, y + 5);

    y += 14;

    // ===== FOOTER =====
    doc.setFontSize(8);
    doc.setFont('Arial', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.line(m, y, pageW - m, y);
    y += 4;
    doc.text('This is an electronically generated document. No signature required.', pageW / 2, y, { align: 'center' });

    return doc;
  };

  const downloadInvoicePDF = async (invoice: InvoiceRecord) => {
    try {
      setExportingPdf(invoice.id);
      const doc = await generateInvoicePDF(invoice);
      doc.save(`${invoice.invoiceNumber}.pdf`);
      toast({ title: "Success", description: "Invoice downloaded successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setExportingPdf(null);
    }
  };

  const printInvoice = async (invoice: InvoiceRecord) => {
    try {
      setPrinting(invoice.id);
      const doc = await generateInvoicePDF(invoice);
      const pdfUrl = doc.output("bloburi");
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      toast({ title: "Success", description: "Print dialog opened" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to print invoice", variant: "destructive" });
    } finally {
      setPrinting(null);
    }
  };

  const generateInvoices = async () => {
    if (selectedPOs.size === 0) {
      toast({ title: "Alert", description: "Please select at least one PO", variant: "destructive" });
      return;
    }

    // Check date restriction for vendors (only if invoiceGenerationDate is not -1)
    if (isVendor && invoiceGenerationDate !== -1) {
      const today = new Date().getDate();
      const startDate = invoiceGenerationDate;
      const endDate = startDate + 5; // 5-day window

      if (today < startDate || today > endDate) {
        toast({
          title: "Access Restricted",
          description: `Invoice generation is only allowed from day ${startDate} to day ${endDate} of the month. Today is day ${today}. Contact admin to change this setting or disable restrictions.`,
          variant: "destructive"
        });
        return;
      }
    }

    setGenerating(true);
    try {
      const selectedPOIds = Array.from(selectedPOs);
      const posData = availablePOs.filter(po => selectedPOIds.includes(po.id));

      // Fetch full lines for selected POs so we can compute accurate site lists immediately
      const poLinesMap: Record<string, string[]> = {};
      await Promise.all(selectedPOIds.map(async (id) => {
        try {
          const r = await authenticatedFetch(`${getApiBaseUrl()}/api/purchase-orders/${id}?withLines=true`);
          if (r.ok) {
            const parsed = await r.json(); // { po, lines: [...] }
            const lines = Array.isArray(parsed.lines) ? parsed.lines : [];
            const names = lines.map((l: any) => l.siteHopAB || l.siteName || l.siteId || 'Unknown').filter(Boolean);
            poLinesMap[id] = names.length > 0 ? names : [(posData.find(p => p.id === id)?.siteName) || 'Unknown'];
          } else {
            poLinesMap[id] = [(posData.find(p => p.id === id)?.siteName) || 'Unknown'];
          }
        } catch (e) {
          poLinesMap[id] = [(posData.find(p => p.id === id)?.siteName) || 'Unknown'];
        }
      }));

      const createdInvoices = [];

      if (groupByVendor) {
        // Group POs by vendor and create one consolidated invoice per vendor
        const byVendor: Record<string, typeof posData> = {};
        posData.forEach(po => {
          const vendorId = String(po.vendorId);
          if (!byVendor[vendorId]) {
            byVendor[vendorId] = [];
          }
          byVendor[vendorId].push(po);
        });

        // Create one invoice per vendor with all their POs
        for (const vendorId of Object.keys(byVendor)) {
          const vendorPOs = byVendor[vendorId];
          const firstPO = vendorPOs[0];
          const poIds = vendorPOs.map(po => po.id);

          // Calculate totals from all POs
          let totalAmount = 0;
          let totalGst = 0;
          vendorPOs.forEach(po => {
            const gstAmount = (parseFloat(po.cgstAmount || 0) || 0) + (parseFloat(po.sgstAmount || 0) || 0) + (parseFloat(po.igstAmount || 0) || 0);
            totalAmount += parseFloat(po.totalAmount.toString());
            totalGst += gstAmount;
          });
          const finalTotal = totalAmount + totalGst;

          const siteList = vendorPOs.flatMap(po => poLinesMap[po.id] || [po.siteName || po.siteId2 || "Unknown"]);
          const uniqueSites = [...new Set(siteList)]; // Get unique sites
          const record: InvoiceRecord = {
            id: "",
            invoiceNumber: `INV-${Date.now()}-${vendorId.slice(0, 6)}`,
            poNumber: vendorPOs.map(po => po.poNumber).join(", "), // Show all PO numbers in detail
            poCount: vendorPOs.length, // Show count
            siteCount: uniqueSites.length, // Show site count
            poIds: poIds,
            siteName: formatSiteNames(uniqueSites, 3), // Show first 3 sites, then "and X more"
            vendorName: firstPO.vendorName || "Unknown",
            vendorCode: firstPO.vendorCode,
            poDate: firstPO.poDate || "",
            poDueDate: firstPO.dueDate || "",
            vendorEmail: firstPO.vendorEmail,
            description: vendorPOs.map(po => po.description || "N/A").join("; "),
            quantity: vendorPOs.reduce((sum, po) => sum + (po.quantity || 0), 0),
            unitPrice: "0", // Not applicable for consolidated invoice
            amount: totalAmount.toString(),
            gst: totalGst.toString(),
            totalAmount: finalTotal.toString(),
            invoiceDate: new Date().toISOString().split('T')[0],
            invoiceDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: "Draft",
            // Build a minimal invoiceSites array from the POs so UI can show site details immediately
            invoiceSites: uniqueSites.map(name => ({ siteName: name })),
          };

          const response = await authenticatedFetch(`${getApiBaseUrl()}/api/invoices`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              invoiceNumber: record.invoiceNumber,
              vendorId: firstPO.vendorId,
              poId: poIds[0], // First PO for backward compatibility
              poIds: poIds, // All PO IDs for consolidated invoice
              invoiceDate: record.invoiceDate,
              dueDate: record.invoiceDueDate,
              amount: totalAmount.toString(),
              gst: totalGst.toString(),
              totalAmount: finalTotal.toString(),
              status: "Draft",
            }),
          });

          if (response.ok) {
            const createdInvoice = await response.json();
            createdInvoices.push({ ...record, id: createdInvoice.id });
          }
        }
      } else {
        // Default: one invoice per PO
        const records: InvoiceRecord[] = posData.map((po, index) => {
          // NO LOOKUPS! All data comes pre-joined from database but we also fetched full PO lines for accuracy
          const gstAmount = (parseFloat(po.cgstAmount || 0) || 0) + (parseFloat(po.sgstAmount || 0) || 0) + (parseFloat(po.igstAmount || 0) || 0);
          const totalAmount = parseFloat(po.totalAmount.toString()) + gstAmount;

          const poSites = poLinesMap[po.id] || [po.siteName || po.siteId2 || "Unknown"];

          return {
            id: "",
            invoiceNumber: `INV-${Date.now()}-${index + 1}`,
            poNumber: po.poNumber,
            poCount: 1, // Single PO invoice
            siteCount: poSites.length,
            poIds: [po.id],
            siteName: formatSiteNames(poSites, 3),
            vendorName: po.vendorName || "Unknown",
            vendorCode: po.vendorCode,
            poDate: po.poDate || "",
            poDueDate: po.dueDate || "",
            vendorEmail: po.vendorEmail,
            description: po.description || "N/A",
            quantity: po.quantity || 0,
            unitPrice: po.unitPrice?.toString() || "0",
            amount: po.totalAmount.toString(),
            gst: gstAmount.toString(),
            totalAmount: totalAmount.toString(),
            invoiceDate: new Date().toISOString().split('T')[0],
            invoiceDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: "Draft",
            invoiceSites: poSites.map((n: string) => ({ siteName: n })),
          };
        });

        // Create invoices via API
        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          const po = posData[i];

          const response = await authenticatedFetch(`${getApiBaseUrl()}/api/invoices`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              invoiceNumber: record.invoiceNumber,
              vendorId: po.vendorId,
              poIds: [po.id],  // Send as array (required)
              invoiceDate: record.invoiceDate,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              amount: po.totalAmount.toString(),
              gst: record.gst,
              totalAmount: record.totalAmount,
              status: "Draft",
            }),
          });

          if (response.ok) {
            const createdInvoice = await response.json();

            // Process the response through the same mapping logic as other invoices
            const poIds = Array.isArray(createdInvoice.poIds) && createdInvoice.poIds.length > 0
              ? createdInvoice.poIds
              : [];

            const siteNames = (Array.isArray(createdInvoice.allSiteNames) && createdInvoice.allSiteNames.length > 0)
              ? createdInvoice.allSiteNames.filter((s: string) => s)
              : [createdInvoice.siteName || createdInvoice.siteId2 || "Unknown"];

            const firstPoDetail = (Array.isArray(createdInvoice.poDetails) && createdInvoice.poDetails.length > 0)
              ? createdInvoice.poDetails[0]
              : null;

            // Normalize site details: prefer server-provided invoiceSites, otherwise build from the original PO
            const invoiceSites = (Array.isArray(createdInvoice.invoiceSites) && createdInvoice.invoiceSites.length > 0)
              ? createdInvoice.invoiceSites
              : [{ siteName: po.siteName || po.siteId2 || "Unknown" }];

            const siteNamesFromSites = invoiceSites.map((s: any) => s.siteName || s.name || s.siteId || "Unknown").filter(Boolean);

            const mappedInvoice: InvoiceRecord = {
              id: createdInvoice.id,
              invoiceNumber: createdInvoice.invoiceNumber,
              poNumber: firstPoDetail?.poNumber || "Unknown",
              poCount: poIds.length,
              siteCount: siteNamesFromSites.length,
              poIds: poIds,
              poDate: firstPoDetail?.poDate || "",
              poDueDate: firstPoDetail?.poDate || "",
              vendorName: firstPoDetail?.vendorName || createdInvoice.vendorName || "Unknown",
              vendorCode: createdInvoice.vendorCode,
              vendorEmail: createdInvoice.vendorEmail,
              siteName: formatSiteNames(siteNamesFromSites, 3),
              description: createdInvoice.description || "N/A",
              quantity: createdInvoice.quantity || 0,
              unitPrice: createdInvoice.unitPrice?.toString() || "0",
              amount: createdInvoice.amount,
              gst: createdInvoice.gst,
              totalAmount: createdInvoice.totalAmount,
              invoiceDate: createdInvoice.invoiceDate,
              invoiceDueDate: createdInvoice.dueDate,
              status: createdInvoice.status,
              poDetails: createdInvoice.poDetails || [],
              invoiceSites: invoiceSites,
            };

            createdInvoices.push(mappedInvoice);
          }
        }
      }

      // Ensure each created invoice has invoiceSites/siteCount populated (defensive) using the selected POs
      const normalizedCreated = createdInvoices.map((ci) => {
        // If server didn't provide invoiceSites, derive from selected POs or fetched PO lines
        if (!Array.isArray(ci.invoiceSites) || ci.invoiceSites.length === 0) {
          const siteNames: string[] = [];
          (ci.poIds || []).forEach((pid: string) => {
            const namesFromLines = poLinesMap[pid];
            if (Array.isArray(namesFromLines) && namesFromLines.length > 0) {
              namesFromLines.forEach(n => { if (!siteNames.includes(n)) siteNames.push(n); });
            } else {
              const matchingPo = posData.find((p: any) => p.id === pid);
              const name = matchingPo ? (matchingPo.siteName || matchingPo.siteId2 || 'Unknown') : 'Unknown';
              if (!siteNames.includes(name)) siteNames.push(name);
            }
          });
          ci.invoiceSites = siteNames.map((n) => ({ siteName: n }));
          ci.siteCount = siteNames.length;
          ci.siteName = formatSiteNames(siteNames, 3);
        } else {
          const siteNamesFromSites = ci.invoiceSites.map((s: any) => s.siteName || s.name || s.siteId || 'Unknown').filter(Boolean);
          ci.siteCount = siteNamesFromSites.length;
          ci.siteName = formatSiteNames(siteNamesFromSites, 3);
        }
        return ci;
      });

      setInvoiceRecords(normalizedCreated);
      setSelectedPOs(new Set());

      // Update available POs and all invoices
      const updatedAvailable = availablePOs.filter(
        po => !selectedPOIds.includes(po.id)
      );
      setAvailablePOs(updatedAvailable);
      setAllInvoices(prev => [...prev, ...normalizedCreated]);

      toast({
        title: "Success",
        description: `${createdInvoices.length} Invoice(s) generated successfully`,
      });

      topRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate invoices";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  return (
    <div className="space-y-6" ref={topRef}>
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Generate Invoices</h2>
        <p className="text-muted-foreground">Create invoices for Purchase Orders. GST data is automatically fetched from PO.</p>
      </div>

      {availablePOs.length === 0 && allInvoices.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">No Purchase Orders available for invoice generation.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {loadingPOs ? (
            <Card>
              <CardHeader>
                <CardTitle>Available Purchase Orders</CardTitle>
                <CardDescription>Loading purchase orders...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <svg className="animate-spin h-8 w-8 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p>Loading available purchase orders...</p>
                </div>
              </CardContent>
            </Card>
          ) : availablePOs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Available Purchase Orders</CardTitle>
                <CardDescription>Select POs to generate invoices ({availablePOs.filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).length} available)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!isVendor && vendors.length > 0 && (
                    <div className="mb-4 flex items-center gap-3">
                      <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Filter by Vendor:</label>
                      <SmartSearchTextbox
                        value={selectedVendorFilter ? (vendorSuggestions.find(v => v.id === selectedVendorFilter)?.label || '') : ''}
                        onChange={(v) => {
                          if (!v) setSelectedVendorFilter('');
                        }}
                        onSelect={(s) => {
                          setSelectedVendorFilter(s.id || '');
                        }}
                        suggestions={vendorSuggestions}
                        placeholder="Search vendor by name or code..."
                        maxSuggestions={5000}
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

                  {/* Invoice Grouping - Always enabled, hidden from UI */}
                </div>

                {/* Desktop grid layout (matching PO page style) */}
                <div className="hidden md:block rounded-md border bg-card overflow-x-auto max-h-96">
                  <div className="sticky top-0 z-20 grid grid-cols-12 gap-3 p-3 font-medium border-b bg-primary text-primary-foreground text-xs min-w-[1000px]">
                    <div className="col-span-1">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            const pageItems = availablePOs
                              .filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter)
                              .slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize);
                            if (e.target.checked) {
                              const newSet = new Set(selectedPOs);
                              pageItems.forEach(p => newSet.add(p.id));
                              setSelectedPOs(newSet);
                            } else {
                              const newSet = new Set(selectedPOs);
                              pageItems.forEach(p => newSet.delete(p.id));
                              setSelectedPOs(newSet);
                            }
                          }}
                          checked={
                            (() => {
                              const pageItems = availablePOs
                                .filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter)
                                .slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize);
                              return pageItems.length > 0 && pageItems.every(p => selectedPOs.has(p.id));
                            })()
                          }
                          className="w-4 h-4 mr-2"
                        />
                        <span className="sr-only">Select all on page</span>
                      </label>
                    </div>
                    <div className="col-span-2">PO Number</div>
                    <div className="col-span-2">Site</div>
                    <div className="col-span-3">Vendor</div>
                    <div className="col-span-1 text-center">Antenna</div>
                    <div className="col-span-1 text-right">Amount</div>
                    <div className="col-span-1 text-right">GST</div>
                    <div className="col-span-1 text-right">Total</div>
                  </div>

                  {availablePOs
                    .filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter)
                    .slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize)
                    .length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      {selectedVendorFilter ? 'No purchase orders available for the selected vendor.' : 'No purchase orders available for invoice generation.'}
                    </div>
                  ) : (
                    availablePOs
                      .filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter)
                      .slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize)
                      .map((po) => {
                        // NO LOOPS! All data comes pre-joined from database
                        const gstAmount = (parseFloat(po.cgstAmount || 0) || 0) + (parseFloat(po.sgstAmount || 0) || 0) + (parseFloat(po.igstAmount || 0) || 0);
                        return (
                          <div key={po.id} className="grid grid-cols-12 gap-3 p-3 border-b last:border-0 items-center hover:bg-muted/50 transition-colors min-w-[1000px]">
                            <div className="col-span-1">
                              <input
                                type="checkbox"
                                checked={selectedPOs.has(po.id)}
                                onChange={() => handlePOSelection(po.id)}
                                className="w-4 h-4"
                              />
                            </div>
                            <div className="col-span-2">
                              <div className="font-mono font-semibold text-sm truncate">{po.poNumber}</div>
                            </div>
                            <div className="col-span-2 text-xs truncate">{po.siteName || po.siteId2 || '-'}</div>
                            <div className="col-span-3 text-xs truncate">{po.vendorName}{po.vendorCode ? ` (${po.vendorCode})` : ''}</div>
                            <div className="col-span-1 text-center text-xs">{po.maxAntennaSize || '-'}</div>
                            <div className="col-span-1 text-right text-sm whitespace-nowrap">Rs {parseFloat(po.totalAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                            <div className="col-span-1 text-right text-sm text-orange-600 whitespace-nowrap">{gstAmount > 0 ? `Rs ${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '-'}</div>
                            <div className="col-span-1 text-right text-sm font-bold text-green-600 whitespace-nowrap">Rs {(parseFloat(po.totalAmount || '0') + gstAmount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Pagination Controls */}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">{`Showing ${availablePOs.filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).length === 0 ? 0 : (Math.min(((currentPage - 1) * pageSize) + 1, availablePOs.filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).length))} - ${Math.min((currentPage * pageSize), availablePOs.filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).length)} of ${availablePOs.filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).length}`}</div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</Button>
                    <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
                    <div className="flex items-center gap-2">
                      <input value={String(currentPage)} onChange={(e) => { const v = Number(e.target.value || 1); if (!isNaN(v)) setCurrentPage(Math.min(Math.max(1, v), Math.max(1, Math.ceil(availablePOs.filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).length / pageSize)))); }} className="w-16 text-center form-input text-sm" />
                      <div className="px-2">of {Math.max(1, Math.ceil(availablePOs.filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).length / pageSize))}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(availablePOs.filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).length / pageSize)), p + 1))} disabled={currentPage === Math.max(1, Math.ceil(availablePOs.filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).length / pageSize))}>Next</Button>
                    <Button size="sm" variant="outline" onClick={() => setCurrentPage(Math.max(1, Math.ceil(availablePOs.filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).length / pageSize)))} disabled={currentPage === Math.max(1, Math.ceil(availablePOs.filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).length / pageSize))}>Last</Button>
                    <select className="form-select text-sm" value={String(pageSize)} onChange={(e) => { const v = Number(e.target.value || 50); setPageSize(v); setCurrentPage(1); }}>
                      {pageSizeOptions.map(opt => (
                        <option key={opt} value={String(opt)}>{opt} items per page</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="inline-flex items-center">
                      <input type="checkbox" checked={availablePOs.filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize).every(p => selectedPOs.has(p.id))} onChange={(e) => {
                        const pageItems = availablePOs.filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize);
                        const newSet = new Set(selectedPOs);
                        if (e.target.checked) pageItems.forEach(p => newSet.add(p.id)); else pageItems.forEach(p => newSet.delete(p.id));
                        setSelectedPOs(newSet);
                      }} className="w-4 h-4 mr-2" />
                      <span className="text-sm">Select all on page</span>
                    </label>
                  </div>
                  {availablePOs
                    .filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter)
                    .slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize)
                    .map((po) => {
                      // NO LOOPS! All data comes pre-joined from database
                      const isSelected = selectedPOs.has(po.id);
                      return (
                        <div key={po.id} className={`p-3 border rounded-md bg-card ${isSelected ? 'ring-2 ring-blue-200' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <input type="checkbox" checked={isSelected} onChange={() => handlePOSelection(po.id)} className="w-4 h-4" />
                              <div>
                                <div className="font-mono font-semibold truncate">{po.poNumber}</div>
                                <div className="text-xs text-muted-foreground truncate">{po.vendorName}{po.vendorCode ? ` (${po.vendorCode})` : ''}</div>
                              </div>
                            </div>
                            <div className="text-right text-sm font-semibold">Rs {parseFloat(po.totalAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
                            <div>Max Ant: {po.maxAntennaSize || '-'}</div>
                            <div className="text-green-600">Available</div>
                          </div>
                        </div>
                      );
                    })}
                  {availablePOs.filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">{selectedVendorFilter ? 'No purchase orders available for the selected vendor.' : 'No purchase orders available for invoice generation.'}</div>
                  )}
                </div>
                <Button onClick={generateInvoices} className="mt-4 w-full" disabled={selectedPOs.size === 0 || generating}>
                  {generating ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Invoices...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Invoices ({selectedPOs.size} selected)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {invoiceRecords.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-700">✓ Just Generated Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {invoiceRecords.map((invoice) => (
                    <div key={invoice.id} className="border rounded-lg p-2 bg-white hover:shadow-md hover:border-blue-400 transition-all">
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase">Invoice Number</p>
                          <p className="text-sm font-bold text-blue-600">{invoice.invoiceNumber}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Invoice Date</p>
                            <p className="text-xs font-semibold text-slate-700">{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Vendor</p>
                            <p className="text-xs font-semibold">{invoice.vendorName}{invoice.vendorCode ? ` (${invoice.vendorCode})` : ''}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">PO Number</p>
                            <button
                              onClick={() => {
                                setSelectedPODetails(invoice.poDetails || []);
                                setShowPODetailsModal(true);
                              }}
                              className="text-xs font-semibold cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              ({invoice.poCount} PO{invoice.poCount !== 1 ? 's' : ''})
                            </button>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">SITE</p>
                            <button
                              onClick={() => {
                                setSelectedSiteDetails(invoice.invoiceSites || []);
                                setShowSiteDetailsModal(true);
                              }}
                              className="text-xs font-semibold cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              ({invoice.siteCount} Site{invoice.siteCount !== 1 ? 's' : ''})
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1 border-t pt-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-600 uppercase">Amount</span>
                            <span className="font-bold text-slate-700">Rs {parseFloat(invoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                          </div>
                          {parseFloat(invoice.gst) > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-600 uppercase">GST</span>
                              <span className="font-bold text-orange-600">Rs {parseFloat(invoice.gst).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center bg-green-50 p-1 rounded">
                            <span className="text-xs font-bold text-slate-700">Total</span>
                            <span className="text-xs font-bold text-green-600">Rs {parseFloat(invoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Button
                            onClick={() => downloadInvoicePDF(invoice)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs gap-1"
                            size="sm"
                            disabled={exportingPdf === invoice.id || printing === invoice.id}
                          >
                            {exportingPdf === invoice.id ? (
                              <span className="animate-spin">⏳</span>
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            onClick={() => printInvoice(invoice)}
                            variant="outline"
                            className="flex-1 h-8 text-xs gap-1"
                            size="sm"
                            disabled={exportingPdf === invoice.id || printing === invoice.id}
                          >
                            {printing === invoice.id ? (
                              <span className="animate-spin">⏳</span>
                            ) : (
                              <Printer className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            onClick={() => deleteInvoice(invoice.id, invoice.invoiceNumber)}
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-8 text-xs gap-1"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {allInvoices.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>All Generated Invoices</CardTitle>
                  <CardDescription>Complete list of all invoices ({allInvoices.length} total)</CardDescription>
                </div>
                <Button onClick={deleteAllInvoices} variant="destructive" size="sm" className="gap-2 hidden">
                  <Trash2 className="h-4 w-4" /> Delete All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {allInvoices.map((invoice) => (
                    <div key={invoice.id} className="border rounded-lg p-2 hover:shadow-md hover:border-primary/50 transition-all">
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase">Invoice Number</p>
                          <p className="text-sm font-bold text-blue-600">{invoice.invoiceNumber}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Invoice Date</p>
                            <p className="text-xs font-semibold text-slate-700">{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Vendor</p>
                            <p className="text-xs font-semibold">{invoice.vendorName}{invoice.vendorCode ? ` (${invoice.vendorCode})` : ''}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">PO Number</p>
                            <button
                              onClick={() => {
                                setSelectedPODetails(invoice.poDetails || []);
                                setShowPODetailsModal(true);
                              }}
                              className="text-xs font-semibold cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              ({invoice.poCount} PO{invoice.poCount !== 1 ? 's' : ''})
                            </button>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">SITE</p>
                            <button
                              onClick={() => {
                                setSelectedSiteDetails(invoice.invoiceSites || []);
                                setShowSiteDetailsModal(true);
                              }}
                              className="text-xs font-semibold cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              ({invoice.siteCount} Site{invoice.siteCount !== 1 ? 's' : ''})
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1 border-t pt-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-600 uppercase">Amount</span>
                            <span className="font-bold text-slate-700">Rs {parseFloat(invoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                          </div>
                          {parseFloat(invoice.gst) > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-600 uppercase">GST</span>
                              <span className="font-bold text-orange-600">Rs {parseFloat(invoice.gst).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center bg-green-50 p-1 rounded">
                            <span className="text-xs font-bold text-slate-700">Total</span>
                            <span className="text-xs font-bold text-green-600">Rs {(parseFloat(invoice.amount) + parseFloat(invoice.gst)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        {invoice.status !== 'Draft' && (
                          <div className="pt-1 border-t">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Status</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${invoice.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                              {invoice.status}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-2 mt-1">
                          <Button
                            onClick={() => downloadInvoicePDF(invoice)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs gap-1"
                            size="sm"
                            disabled={exportingPdf === invoice.id || printing === invoice.id}
                          >
                            {exportingPdf === invoice.id ? (
                              <span className="animate-spin">⏳</span>
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            onClick={() => printInvoice(invoice)}
                            variant="outline"
                            className="flex-1 h-8 text-xs gap-1"
                            size="sm"
                            disabled={exportingPdf === invoice.id || printing === invoice.id}
                          >
                            {printing === invoice.id ? (
                              <span className="animate-spin">⏳</span>
                            ) : (
                              <Printer className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            onClick={() => deleteInvoice(invoice.id, invoice.invoiceNumber)}
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-8 text-xs gap-1"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* PO Details Modal */}
          {showPODetailsModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-2xl max-h-96 overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Purchase Order Details</CardTitle>
                  <button
                    onClick={() => setShowPODetailsModal(false)}
                    className="text-2xl font-bold text-gray-600 hover:text-gray-900"
                  >
                    ×
                  </button>
                </CardHeader>
                <CardContent>
                  {selectedPODetails.length === 0 ? (
                    <p className="text-muted-foreground">No PO details available</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedPODetails.map((po: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="font-semibold text-gray-600">PO Number</p>
                              <p className="text-gray-800 font-bold text-blue-700">{po.poNumber || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-600">Vendor Name</p>
                              <p className="text-gray-800">{po.vendorName || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-600">Total Sites</p>
                              <button
                                onClick={() => {
                                  // Find the current invoice to get all its sites
                                  const currentInvoice = allInvoices.find((inv: any) =>
                                    inv.poDetails?.some((poDetail: any) => poDetail.poId === po.poId)
                                  );

                                  // Filter sites that belong to this specific PO
                                  const poSites = currentInvoice?.invoiceSites?.filter((site: any) => site.poId === po.poId) || [];

                                  setSelectedSiteDetails(poSites);
                                  setSelectedPoForSites(po.poId);
                                  setShowPODetailsModal(false);
                                  setShowSiteDetailsModal(true);
                                }}
                                className="text-gray-800 font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              >
                                {po.totalSites || '0'}
                              </button>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-600">PO Generation Date</p>
                              <p className="text-gray-800">{po.poDate ? new Date(po.poDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="font-semibold text-gray-600">Total PO Amount</p>
                              <p className="text-gray-800 font-bold text-green-600">Rs {parseFloat(po.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Site Details Modal */}
          {showSiteDetailsModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-2xl max-h-96 overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Site Details</CardTitle>
                    {selectedPoForSites && (
                      <p className="text-sm text-gray-600 mt-1">
                        Showing sites for PO: <span className="font-mono font-bold text-purple-600">{selectedSiteDetails[0]?.poNumber || 'N/A'}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {selectedPoForSites && (
                      <button
                        onClick={() => {
                          setSelectedPoForSites(null);
                          setShowSiteDetailsModal(false);
                          setShowPODetailsModal(true);
                        }}
                        className="text-sm px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        ← Back
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowSiteDetailsModal(false);
                        setSelectedPoForSites(null);
                      }}
                      className="text-2xl font-bold text-gray-600 hover:text-gray-900"
                    >
                      ×
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedSiteDetails.length === 0 ? (
                    <p className="text-muted-foreground">No site details available</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedSiteDetails.map((site: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="font-semibold text-gray-600">Site Name</p>
                              <p className="text-gray-800 font-bold text-blue-700">{site.siteName || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-600">PO Number</p>
                              <p className="text-gray-800 font-mono font-bold text-purple-600">{site.poNumber || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-600">PO Date</p>
                              <p className="text-gray-800">{site.poDate ? new Date(site.poDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-600">Plan ID</p>
                              <p className="text-gray-800">{site.planId || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-600">Max Antenna Size</p>
                              <p className="text-gray-800">{site.maxAntennaSize || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-600">Vendor Amount</p>
                              <p className="text-gray-800 font-bold text-green-600">Rs {parseFloat(site.vendorAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="font-semibold text-gray-600">Site A Installation Date</p>
                              <p className="text-gray-800">{site.siteAInstallationDate ? new Date(site.siteAInstallationDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
