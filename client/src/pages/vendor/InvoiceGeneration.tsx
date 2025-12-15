import { getApiBaseUrl } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, Trash2, Printer } from "lucide-react";
import jsPDF from "jspdf";

import { fetchWithLoader } from "@/lib/fetchWithLoader";
import { fetchExportHeader } from "@/lib/exportUtils";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import SmartSearchTextbox, { Suggestion } from "@/components/SmartSearchTextbox";
import type { PurchaseOrder, Vendor } from "@shared/schema";

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  poNumber: string;
  poDate: string;
  poDueDate: string;
  vendorName: string;
  vendorCode?: string;
  vendorEmail?: string;
  siteName: string;
  maxAntennaSize?: string;
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
  gst: string;
  totalAmount: string;
  invoiceDate: string;
  invoiceDueDate: string;
  status: string;
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

  // Clamp current page when filters or page size change
  useEffect(() => {
    const filteredCount = availablePOs.filter(po => !selectedVendorFilter || po.vendorId === selectedVendorFilter).length;
    const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [availablePOs, selectedVendorFilter, pageSize, currentPage]);
  const [vendorSuggestions, setVendorSuggestions] = useState<Suggestion[]>([]);
  const [isVendor, setIsVendor] = useState(false);
  const [invoiceGenerationDate, setInvoiceGenerationDate] = useState<number>(1);
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
          fetch(`${baseUrl}/api/invoices?pageSize=10000&withDetails=true`, { credentials: 'include' }),
          fetch(`${baseUrl}/api/app-settings`, { credentials: 'include' }),
        ]);

        if (!invoicesRes.ok || !settingsRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const invoicesData = await invoicesRes.json();
        const settingsData = await settingsRes.json();

        // Set invoice generation date from settings
        setInvoiceGenerationDate(settingsData.invoiceGenerationDate || 1);

        const invoices = invoicesData.data || [];

        // Invoices already have all details joined from backend - no lookups needed!
        const invoiceRecords: InvoiceRecord[] = invoices.map((invoice: any) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          poNumber: invoice.poNumber || "Unknown",
          poDate: invoice.poDate || "",
          poDueDate: invoice.poDueDate || "",
          vendorName: invoice.vendorName || "Unknown",
          vendorCode: invoice.vendorCode,
          vendorEmail: invoice.vendorEmail,
          siteName: invoice.siteName || invoice.siteId2 || "Unknown",
          maxAntennaSize: invoice.maxAntennaSize,
          description: invoice.description || "N/A",
          quantity: invoice.quantity || 0,
          unitPrice: invoice.unitPrice?.toString() || "0",
          amount: invoice.amount,
          gst: invoice.gst,
          totalAmount: invoice.totalAmount,
          invoiceDate: invoice.invoiceDate,
          invoiceDueDate: invoice.dueDate,
          status: invoice.status,
        }));
        setAllInvoices(invoiceRecords);

        // Load available POs with all details in parallel AFTER initial render (lazy load)
        // OPTIMIZED: Single query returns POs with vendor and site details pre-joined, no loops needed!
        setTimeout(async () => {
          try {
            const posRes = await fetch(`${baseUrl}/api/purchase-orders?pageSize=10000&withDetails=true&availableOnly=true`, { credentials: 'include' });

            if (posRes.ok) {
              const posData = await posRes.json();
              const pos = posData.data || [];

              // All vendor and site data already joined! No lookups needed
              setAvailablePOs(pos);

              // Build vendor suggestions for SmartSearchTextbox directly from available POs
              const vendorMap = new Map<string, { id: string; name: string; code: string }>();
              pos.forEach((po: any) => {
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
      const response = await fetch(apiUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
      });

      const responseData = await response.json();
      console.log(`[Frontend] Delete response:`, responseData);

      if (response.ok) {
        setAllInvoices(allInvoices.filter(inv => inv.id !== invoiceId));
        setInvoiceRecords(invoiceRecords.filter(inv => inv.id !== invoiceId));
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
      const response = await fetch(`${getApiBaseUrl()}/api/invoices`, {
        method: "DELETE",
        credentials: 'include',
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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    let yPosition = 15;

    // Colors
    const primaryColor = [102, 126, 234];
    const textColor = [44, 62, 80];
    const lightGray = [248, 249, 250];
    const darkGray = [100, 100, 100];

    // Company Header Background
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 35, "F");

    // Company Details
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(exportHeader.companyName || 'Enterprise Management System', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (exportHeader.address) {
      doc.text(exportHeader.address, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
    }
    if (exportHeader.contactEmail || exportHeader.contactPhone) {
      doc.text([exportHeader.contactEmail, exportHeader.contactPhone].filter(Boolean).join(' | '), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
    }
    if (exportHeader.gstin || exportHeader.website) {
      doc.text([exportHeader.gstin ? `GSTIN: ${exportHeader.gstin}` : '', exportHeader.website].filter(Boolean).join(' | '), pageWidth / 2, yPosition, { align: 'center' });
    }

    // Invoice Title
    yPosition = 45;
    doc.setTextColor(...textColor);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("TAX INVOICE", pageWidth / 2, yPosition, { align: "center" });

    // Reset position
    yPosition = 55;

    // Two Column Layout - Invoice Details & Dates
    const col1X = margin;
    const col2X = pageWidth / 2 + 5;

    // Two column starting position
    let leftYPos = yPosition;
    let rightYPos = yPosition;

    // Left Column - Invoice Details
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("INVOICE DETAILS", col1X, leftYPos);
    leftYPos += 5;

    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    doc.text(`Invoice #: ${String(invoice.invoiceNumber)}`, col1X, leftYPos);
    leftYPos += 4;
    doc.text(`Invoice Date: ${String(invoice.invoiceDate)}`, col1X, leftYPos);
    leftYPos += 4;
    doc.text(`Due Date: ${String(invoice.invoiceDueDate)}`, col1X, leftYPos);

    // Right Column - PO References
    rightYPos = yPosition;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("PURCHASE ORDER", col2X, rightYPos);
    rightYPos += 5;

    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    doc.text(`PO #: ${String(invoice.poNumber)}`, col2X, rightYPos);
    rightYPos += 4;
    doc.text(`PO Date: ${String(invoice.poDate)}`, col2X, rightYPos);
    rightYPos += 4;
    doc.text(`PO Due: ${String(invoice.poDueDate)}`, col2X, rightYPos);

    // Move to next section after both columns
    yPosition = Math.max(leftYPos, rightYPos) + 6;

    // Separator
    doc.setDrawColor(0, 51, 102);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Vendor Details Section
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text("BILL TO:", margin, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    doc.text(`Vendor: ${String(invoice.vendorName)}`, margin + 2, yPosition);
    yPosition += 4;
    if (invoice.vendorEmail) {
      doc.text(`Email: ${String(invoice.vendorEmail)}`, margin + 2, yPosition);
      yPosition += 4;
    }
    doc.text(`Site: ${String(invoice.siteName)}`, margin + 2, yPosition);
    yPosition += 8;

    // Item Details Section
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("ITEM DETAILS", margin, yPosition);
    yPosition += 5;

    // Table Headers
    doc.setFillColor(...lightGray);
    doc.rect(margin, yPosition - 3, pageWidth - 2 * margin, 6, "F");
    
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text("Description", margin + 2, yPosition + 1);
    doc.text("Qty", pageWidth / 2 + 10, yPosition + 1);
    doc.text("Unit Rate (Rs)", pageWidth / 2 + 30, yPosition + 1);
    doc.text("Amount (Rs)", pageWidth - margin - 22, yPosition + 1, { align: "right" });

    yPosition += 8;

    // Item Row
    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    
    const descLines = doc.splitTextToSize(invoice.description, 50);
    doc.text(descLines, margin + 2, yPosition);
    
    doc.text(invoice.quantity.toString(), pageWidth / 2 + 10, yPosition);
    doc.text(parseFloat(invoice.unitPrice).toFixed(2), pageWidth / 2 + 30, yPosition);
    doc.text((parseFloat(invoice.unitPrice) * invoice.quantity).toFixed(2), pageWidth - margin - 22, yPosition, { align: "right" });

    yPosition += 12;

    // Summary Section
    doc.setDrawColor(0, 51, 102);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;

    // Subtotal
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("Subtotal:", pageWidth / 2, yPosition, { align: "right" });
    doc.setTextColor(...darkGray);
    doc.text(`Rs ${parseFloat(invoice.amount).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: "right" });
    yPosition += 5;

    // GST - only show if greater than 0
    if (parseFloat(invoice.gst) > 0) {
      const gstPercent = (parseFloat(invoice.gst) / parseFloat(invoice.amount) * 100).toFixed(1);
      doc.setTextColor(0, 0, 0);
      doc.text(`GST (${gstPercent}%):`, pageWidth / 2, yPosition, { align: "right" });
      doc.setTextColor(...darkGray);
      doc.text(`Rs ${parseFloat(invoice.gst).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: "right" });
      yPosition += 5;
    }

    // Total
    doc.setFillColor(...lightGray);
    doc.rect(pageWidth / 2 - 5, yPosition - 3, pageWidth / 2 - margin + 3, 6, "F");
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("TOTAL AMOUNT:", pageWidth / 2, yPosition + 1, { align: "right" });
    doc.text(`Rs ${parseFloat(invoice.totalAmount).toFixed(2)}`, pageWidth - margin - 2, yPosition + 1, { align: "right" });

    // Status Badge
    yPosition += 10;
    doc.setFontSize(8);
    const statusColor = invoice.status === "Draft" ? [255, 193, 7] : [76, 175, 80];
    doc.setFillColor(...statusColor);
    doc.rect(pageWidth / 2 - 5, yPosition - 2, 30, 5, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(`Status: ${invoice.status}`, pageWidth / 2 - 3, yPosition + 0.5, { align: "center" });

    // Footer
    yPosition = pageHeight - 12;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    doc.text("This is an electronically generated document. No signature required.", pageWidth / 2, yPosition + 1, { align: "center" });

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

    // Check date restriction for vendors
    if (isVendor) {
      const today = new Date().getDate();
      const startDate = invoiceGenerationDate;
      const endDate = startDate + 5; // 5-day window

      if (today < startDate || today > endDate) {
        toast({
          title: "Access Restricted",
          description: `Vendors can generate invoices from day ${startDate} to day ${endDate} of each month. Today is day ${today}.`,
          variant: "destructive"
        });
        return;
      }
    }

    setGenerating(true);
    try {
      const selectedPOIds = Array.from(selectedPOs);
      const posData = availablePOs.filter(po => selectedPOIds.includes(po.id));

      const records: InvoiceRecord[] = posData.map((po, index) => {
        // NO LOOKUPS! All data comes pre-joined from database
        const gstAmount = (parseFloat(po.cgstAmount || 0) || 0) + (parseFloat(po.sgstAmount || 0) || 0) + (parseFloat(po.igstAmount || 0) || 0);
        const totalAmount = parseFloat(po.totalAmount.toString()) + gstAmount;

        return {
          id: "",
          invoiceNumber: `INV-${Date.now()}-${index + 1}`,
          poNumber: po.poNumber,
          siteName: po.siteName || po.siteId2 || "Unknown",
          maxAntennaSize: po.maxAntennaSize || undefined,
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
        };
      });

      // Create invoices via API
      const createdInvoices = [];
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const po = posData[i];

        const response = await fetch(`${getApiBaseUrl()}/api/invoices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify({
            invoiceNumber: record.invoiceNumber,
            vendorId: po.vendorId,
            poId: po.id,
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
          createdInvoices.push({ ...record, id: createdInvoice.id });
        }
      }

      setInvoiceRecords(createdInvoices);
      setSelectedPOs(new Set());

      // Update available POs and all invoices
      const updatedAvailable = availablePOs.filter(
        po => !selectedPOIds.includes(po.id)
      );
      setAvailablePOs(updatedAvailable);
      setAllInvoices([...allInvoices, ...createdInvoices]);

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
                    <div key={invoice.id} className="border rounded-lg p-4 bg-white hover:shadow-md hover:border-blue-400 transition-all">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase">Invoice Number</p>
                          <p className="text-base font-bold text-blue-600">{invoice.invoiceNumber}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">PO Number</p>
                            <p className="text-sm font-semibold">{invoice.poNumber}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Vendor</p>
                            <p className="text-sm font-semibold">{invoice.vendorName}{invoice.vendorCode ? ` (${invoice.vendorCode})` : ''}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">SITE</p>
                            <p className="text-sm font-semibold">{invoice.siteName}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">ANT</p>
                            <p className="text-sm font-semibold">{invoice.maxAntennaSize || "-"}</p>
                          </div>
                        </div>
                        <div className="space-y-2 border-t pt-2">
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
                          <div className="flex justify-between items-center bg-green-50 p-2 rounded">
                            <span className="text-xs font-bold text-slate-700">Total</span>
                            <span className="text-sm font-bold text-green-600">Rs {parseFloat(invoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
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
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {allInvoices.map((invoice) => (
                    <div key={invoice.id} className="border rounded-lg p-4 hover:shadow-md hover:border-primary/50 transition-all">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase">Invoice Number</p>
                          <p className="text-base font-bold text-blue-600">{invoice.invoiceNumber}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">PO Number</p>
                            <p className="text-sm font-semibold">{invoice.poNumber}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Vendor</p>
                            <p className="text-sm font-semibold">{invoice.vendorName}{invoice.vendorCode ? ` (${invoice.vendorCode})` : ''}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">SITE</p>
                            <p className="text-sm font-semibold">{invoice.siteName}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">ANT</p>
                            <p className="text-sm font-semibold">{invoice.maxAntennaSize || "-"}</p>
                          </div>
                        </div>
                        <div className="space-y-2 border-t pt-2">
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
                          <div className="flex justify-between items-center bg-green-50 p-2 rounded">
                            <span className="text-xs font-bold text-slate-700">Total</span>
                            <span className="text-sm font-bold text-green-600">Rs {(parseFloat(invoice.amount) + parseFloat(invoice.gst)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        {invoice.status !== 'Draft' && (
                          <div className="pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Status</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${invoice.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                              {invoice.status}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-2 mt-2">
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
        </>
      )}
    </div>
  );
}
