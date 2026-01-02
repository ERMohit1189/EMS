import { useEffect, useState, useRef } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { authenticatedFetch } from "@/lib/fetchWithLoader";
import { numberToWords } from "@/lib/numberToWords";
import type { PurchaseOrder, Site, Vendor } from "@shared/schema";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './POPrint.css';

// Import page break tracker for debugging
declare global {
  interface Window {
    pageBreakTracker?: any;
  }
}

interface POWithDetails extends PurchaseOrder {
  site?: Site;
  vendor?: Vendor;
  exportHeaders?: any;
  lines?: Array<{
    id: string;
    poId: string;
    siteId: string;
    description: string;
    quantity: number;
    unitPrice: string;
    totalAmount: string;
    siteHopAB: string;
    sitePlanId: string;
  }>;
}

export default function POPrint() {
  const [, params] = useRoute("/vendor/po/print/:id");
  const poId = params?.id;
  const [po, setPo] = useState<POWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<number>(1);
  const [firstPageCapacity, setFirstPageCapacity] = useState<number>(2); // First page: header + 2 items max
  const [otherPageCapacity, setOtherPageCapacity] = useState<number>(8); // Other pages: 8 items each
  const [printHeaders, setPrintHeaders] = useState<boolean>(true); // Toggle for printing headers
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Calculate pages based on fixed A4 height (297mm = 1123px at 96 DPI)
  const calculatePages = (lineCount: number) => {
    // A4 dimensions: 210mm × 297mm
    // At 96 DPI: 794px × 1123px
    // With overflow: hidden, must fit exactly within 1123px

    // DEBUGGING MODE: Show all content on 1 page
    const debugMode = false;

    if (debugMode) {
      console.log(`📄 DEBUG MODE - Showing all items on 1 page`);
      setPages(1);
      setFirstPageCapacity(lineCount);
      setOtherPageCapacity(lineCount);
      return 1;
    }

    // Fixed capacity for pages
    // First page: 3-4 items (minimum 4 if more than 1 item, but adjusted for spacing)
    const firstPageItems = lineCount > 1 ? 3 : 1;

    // Other pages: 10 items per page (footer shows from page 2)
    const otherPageItems = 10;

    // Calculate total pages needed
    // Minimum 2 pages if there are any items
    let totalPages = 1;
    let remainingItems = lineCount;

    if (remainingItems > firstPageItems) {
      remainingItems -= firstPageItems;
      totalPages += Math.ceil(remainingItems / otherPageItems);
    } else if (remainingItems >= 1) {
      // If at least 1 item, create minimum 2 pages
      totalPages = 2;
    }

    console.log(`📄 PO Print A4 Calculation:
    - Total line items: ${lineCount}
    - First page capacity: ${firstPageItems} items
    - Other pages capacity: ${otherPageItems} items each
    - Calculated pages: ${totalPages}`);

    setPages(totalPages);
    setFirstPageCapacity(firstPageItems);
    setOtherPageCapacity(otherPageItems);
    return totalPages;
  };

  // Get lines for a specific page
  const getPageLines = (pageNum: number) => {
    if (!po?.lines) return [];

    let itemsPerPage = otherPageCapacity;
    let startIdx = 0;

    if (pageNum === 1) {
      itemsPerPage = firstPageCapacity;
      startIdx = 0;
    } else {
      // For page 2+, account for items already shown on page 1
      startIdx = firstPageCapacity + (pageNum - 2) * otherPageCapacity;
    }

    const endIdx = startIdx + itemsPerPage;
    return po.lines.slice(startIdx, endIdx);
  };

  useEffect(() => {
    // Load page break tracker script for debugging
    const script = document.createElement('script');
    script.src = '/page-break-tracker.js';
    script.async = true;
    script.onload = () => {
      console.log('✅ Page Break Tracker loaded');
      if (window.pageBreakTracker) {
        window.pageBreakTracker.trackPageBreakProperties();
      }
    };
    document.head.appendChild(script);

    fetchPO();

    return () => {
      if (poId) {
        sessionStorage.removeItem(`po_${poId}`);
      }
    };
  }, [poId]);

  // Log page state changes
  useEffect(() => {
    console.log(`📄 Page state updated: ${pages} pages to render`);
  }, [pages]);

  // Recalculate pages when PO data changes
  useEffect(() => {
    if (po && po.lines) {
      calculatePages(po.lines.length);
    }
  }, [po?.id, po?.lines?.length]);

  const fetchPO = async () => {
    if (!poId) return;
    try {
      const baseUrl = getApiBaseUrl();

      const cachedPOData = sessionStorage.getItem(`po_${poId}`);
      if (cachedPOData) {
        try {
          const cachedPO = JSON.parse(cachedPOData);
          const poData = cachedPO;
          const lines = cachedPO.lines || [];

          const firstSiteId = poData.siteId || (lines.length > 0 ? lines[0].siteId : null);

          const siteRes = firstSiteId ? await authenticatedFetch(`${baseUrl}/api/sites/${firstSiteId}`) : null;
          const siteData = siteRes?.ok ? await siteRes.json() : null;

          const vendorRes = await authenticatedFetch(`${baseUrl}/api/vendors/${poData.vendorId}`);
          const vendorData = vendorRes.ok ? await vendorRes.json() : null;

          const headerRes = await authenticatedFetch(`${baseUrl}/api/export-headers`);
          const headerData = headerRes.ok ? await headerRes.json() : {};

          setPo({
            ...poData,
            site: siteData,
            vendor: vendorData,
            exportHeaders: headerData,
            lines: lines
          });
          return;
        } catch (cacheError) {
          console.warn('Error using cached PO data, falling back to API:', cacheError);
        }
      }

      const response = await authenticatedFetch(`${baseUrl}/api/purchase-orders/${poId}?withLines=true`);
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();

      const poData = result.po || result;
      const lines = result.lines || [];

      const firstSiteId = poData.siteId || (lines.length > 0 ? lines[0].siteId : null);

      const siteRes = firstSiteId ? await authenticatedFetch(`${baseUrl}/api/sites/${firstSiteId}`) : null;
      const siteData = siteRes?.ok ? await siteRes.json() : null;

      const vendorRes = await authenticatedFetch(`${baseUrl}/api/vendors/${poData.vendorId}`);
      const vendorData = vendorRes.ok ? await vendorRes.json() : null;

      const headerRes = await authenticatedFetch(`${baseUrl}/api/export-headers`);
      const headerData = headerRes.ok ? await headerRes.json() : {};

      const poWithDetails = {
        ...poData,
        site: siteData,
        vendor: vendorData,
        exportHeaders: headerData,
        lines: lines
      };
      setPo(poWithDetails);
      calculatePages(lines.length);
    } catch (error) {
      console.error('Error fetching PO:', error);
      toast({ title: "Error", description: "Failed to load PO", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAnalyzePageBreaks = () => {
    if (window.pageBreakTracker) {
      console.clear();
      window.pageBreakTracker.logAllPageBreaks();
      window.pageBreakTracker.highlightPageBreakElements();

      // In debug mode, highlight page break sections
      const headers = document.querySelectorAll('.header');
      const invoiceContainers = document.querySelectorAll('.invoice-container');

      headers.forEach((header, index) => {
        // Add background highlight to show page break boundaries
        (header as HTMLElement).style.backgroundColor = '#ffcccc';
        (header as HTMLElement).style.padding = '10px';

        // Add label showing this is a page break
        const label = document.createElement('div');
        label.textContent = `🔴 PAGE BREAK #${index + 1}`;
        label.style.fontSize = '12px';
        label.style.fontWeight = 'bold';
        label.style.color = '#d32f2f';
        label.style.marginBottom = '5px';
        label.style.padding = '5px';
        label.style.backgroundColor = '#ffeeee';
        label.style.border = '2px solid #d32f2f';
        label.style.borderRadius = '3px';
        header.insertBefore(label, header.firstChild);
      });

      // Also highlight sections between page breaks
      invoiceContainers.forEach((container, index) => {
        const section = document.createElement('div');
        section.textContent = `Section ${index + 1}`;
        section.style.fontSize = '14px';
        section.style.fontWeight = 'bold';
        section.style.color = '#1976d2';
        section.style.padding = '10px';
        section.style.backgroundColor = '#e3f2fd';
        section.style.border = '3px solid #1976d2';
        section.style.margin = '10px 0';
        section.style.textAlign = 'center';
        container.insertBefore(section, container.firstChild);
      });

      toast({ title: "Page Break Analysis Active", description: "Red sections show page breaks. Blue labels show content sections. Check console for details.", variant: "default" });
    } else {
      toast({ title: "Error", description: "Page Break Tracker not loaded", variant: "destructive" });
    }
  };

  const handleDownloadPDF = async () => {
    const element = printRef.current;
    if (!element) return;

    try {
      toast({ title: "Generating PDF", description: "Please wait...", variant: "default" });

      // Hide performance badges and dev tools before capturing
      const elementsToHide = document.querySelectorAll(
        '[data-testid], .react-devtools, .react-devtools-portal, [role="status"], [aria-live]'
      );
      const originalDisplay: { [key: number]: string } = {};
      elementsToHide.forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        originalDisplay[index] = htmlEl.style.display;
        htmlEl.style.display = 'none';
      });

      // Create canvas from HTML element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Restore hidden elements
      elementsToHide.forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.display = originalDisplay[index];
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10; // 10mm margins
      const contentWidth = pageWidth - (margin * 2);

      // Calculate dimensions
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;

      const pdfWidth = contentWidth;
      const pdfHeight = pdfWidth / ratio;
      const availableHeight = pageHeight - (margin * 2);

      // Calculate pages needed
      const pages = Math.ceil(pdfHeight / availableHeight);

      // Process each page
      for (let pageNum = 0; pageNum < pages; pageNum++) {
        if (pageNum > 0) {
          pdf.addPage();
        }

        // Calculate crop dimensions for this page
        const startY = (pageNum * availableHeight * canvasHeight) / pdfHeight;
        const endY = ((pageNum + 1) * availableHeight * canvasHeight) / pdfHeight;
        const cropHeight = Math.min(endY - startY, canvasHeight - startY);

        // Create a temporary canvas for this page's content
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvasWidth;
        pageCanvas.height = cropHeight;

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, startY, canvasWidth, cropHeight, 0, 0, canvasWidth, cropHeight);
        }

        const pageImageData = pageCanvas.toDataURL('image/png');
        pdf.addImage(pageImageData, 'PNG', margin, margin, pdfWidth, (cropHeight * pdfWidth) / canvasWidth);
      }

      // Download PDF
      const filename = `PO-${po.poNumber}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      toast({ title: "Success", description: "PDF downloaded successfully", variant: "default" });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!po) return <div className="p-8 text-center">PO not found</div>;

  const subtotalBasic = po.lines && po.lines.length > 0
    ? po.lines.reduce((sum, line) => sum + Number(line.totalAmount || 0), 0)
    : Number(po.totalAmount || 0);

  const gstApplied = po.gstApply === true;
  const igstAmount = gstApplied ? Number(po.igstAmount || 0) : 0;
  const cgstAmount = gstApplied ? Number(po.cgstAmount || 0) : 0;
  const sgstAmount = gstApplied ? Number(po.sgstAmount || 0) : 0;
  const totalTax = igstAmount + cgstAmount + sgstAmount;
  const grandTotal = subtotalBasic + totalTax;

  const formatDate = (dateStr: any) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div style={{ width: '100%', display: 'block', background: 'white', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div className="print-wrapper" style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden', boxSizing: 'border-box' }}>
        <div className="no-print flex gap-4 p-8 border-b sticky top-0 bg-white z-10 items-center" style={{ width: '100%', boxSizing: 'border-box' }}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.history.back()}
            className="border-slate-300 hover:bg-slate-50 text-xs py-1 h-auto"
          >
            <ArrowLeft className="h-3 w-3 mr-2" /> Back
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            className="border-slate-300 hover:bg-slate-50 text-xs py-1 h-auto"
          >
            <Printer className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPDF}
            className="border-slate-300 hover:bg-slate-50 text-xs py-1 h-auto"
          >
            <FileText className="h-3 w-3" />
          </Button>
          <Button variant="outline" onClick={handleAnalyzePageBreaks} style={{ backgroundColor: '#fff3cd', borderColor: '#ffc107', display: 'none' }} className="no-print">
            🔍 Analyze Page Breaks
          </Button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', padding: '8px 16px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontWeight: 600, color: '#003d7a', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={printHeaders}
              onChange={(e) => setPrintHeaders(e.target.checked)}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            Print Header
          </label>
          <div style={{ padding: '8px 16px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontWeight: 600, color: '#003d7a' }}>
            📄 Pages: <span style={{ fontSize: '16px' }}>{pages}</span> | Items: <span style={{ fontSize: '16px' }}>{po?.lines?.length || 0}</span>
          </div>
        </div>

        <div style={{ padding: '20px', width: '100%', overflowY: 'auto', flex: 1, backgroundColor: '#f0f0f0', boxSizing: 'border-box' }}>
          <div ref={printRef} style={{ margin: '0 auto', width: 'fit-content' }}>
            {/* Render multiple pages */}
            {Array.from({ length: pages }).map((_, pageIndex) => {
              const pageItems = getPageLines(pageIndex + 1).length;
              const hasContent = pageItems > 0 || pageIndex >= 1;
              console.log(`🖨️ Rendering page ${pageIndex + 1}/${pages} with ${pageItems} items`);

              // Skip completely empty pages
              if (!hasContent) return null;

              return (
          <div
            key={pageIndex}
            className="invoice-container"
          >
            <div className="invoice-content">
              {/* Header - Show on all pages, hide if printHeaders is disabled (preserves space) */}
              <div className={`header ${!printHeaders ? 'hidden' : ''}`}>
                <div className="company-info">
                  <h1>{po.exportHeaders?.companyName || 'COMPANY NAME'}</h1>
                  {po.exportHeaders?.address && <p>{po.exportHeaders.address}</p>}
                  {po.exportHeaders?.city && po.exportHeaders?.state && <p>{po.exportHeaders.city}, {po.exportHeaders.state}</p>}
                  {po.exportHeaders?.gstin && <p>GSTIN: {po.exportHeaders.gstin}</p>}
                  {po.exportHeaders?.contactPhone && <p>Tel: {po.exportHeaders.contactPhone}</p>}
                  {po.exportHeaders?.website && <p>Website: {po.exportHeaders.website}</p>}
                </div>
                <div className="invoice-title">
                  <h2>PURCHASE ORDER</h2>
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    <p style={{ margin: 0 }}>PO Type: <strong>Standard Purchase Order</strong></p>
                  </div>
                </div>
              </div>

              {/* Invoice Meta - First page only */}
              {pageIndex === 0 && (
              <div className="invoice-meta">
                <div className="meta-item">
                  <span className="meta-label">PO Number</span>
                  <span className="meta-value">{po.poNumber}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">PO Date</span>
                  <span className="meta-value">{formatDate(po.poDate)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">SO Number</span>
                  <span className="meta-value">N/A</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Project Number</span>
                  <span className="meta-value">N/A</span>
                </div>
              </div>
              )}

              {/* TO and Ship To - First page only */}
              {pageIndex === 0 && (
              <div className="parties-section">
                <div className="party-box">
                  <h3>Bill To</h3>
                  <p><strong>{po.vendor?.name || 'N/A'}</strong></p>
                  <p>GSTIN: {po.vendor?.gstin || 'N/A'}</p>
                  <p>{po.vendor?.address || 'N/A'}</p>
                  <p>{po.vendor?.city || ''} {po.vendor?.pincode || ''}</p>
                  <p>{po.vendor?.state || ''}</p>
                  <p style={{ marginTop: '8px', fontSize: '11px' }}>
                    <strong>Contact:</strong> {po.vendor?.mobile || 'N/A'}<br />
                    <strong>Vendor No:</strong> {po.vendor?.vendorCode || 'N/A'}
                  </p>
                </div>

                <div className="party-box">
                  <h3>Ship To</h3>
                  <p><strong>{po.exportHeaders?.companyName || 'COMPANY NAME'}</strong></p>
                  {po.exportHeaders?.address && <p>{po.exportHeaders.address}</p>}
                  {po.exportHeaders?.city && <p>{po.exportHeaders.city}</p>}
                  {po.exportHeaders?.state && po.exportHeaders?.city && (
                    <p>{po.exportHeaders.city}, {po.exportHeaders.state}</p>
                  )}
                  {po.exportHeaders?.gstin && <p>GSTIN: {po.exportHeaders.gstin}</p>}
                  <p style={{ marginTop: '8px', fontSize: '11px' }}>
                    <strong>Buyer:</strong> {po.exportHeaders?.companyName || 'N/A'}<br />
                    <strong>Email:</strong> {po.exportHeaders?.contactEmail || 'N/A'}
                  </p>
                </div>
              </div>
              )}

              {/* Additional Info - First page only */}
              {pageIndex === 0 && (
              <div className="invoice-meta">
                <div className="meta-item">
                  <span className="meta-label">Payment Terms</span>
                  <span className="meta-value">N/A</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Delivery Terms</span>
                  <span className="meta-value">N/A</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Status</span>
                  <span className="meta-value" style={{ backgroundColor: '#e8f5e9', padding: '3px 8px', borderRadius: '3px', color: '#2e7d32', fontWeight: '600' }}>{po.status}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Need By Date</span>
                  <span className="meta-value">{formatDate(po.dueDate)}</span>
                </div>
              </div>
              )}

              {/* Items Table - Only show if page has items */}
              {getPageLines(pageIndex + 1).length > 0 && (
              <table className="items-table">
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>Line</th>
                    <th style={{ width: '12%' }}>Ceragon P/N</th>
                    <th style={{ width: '25%' }}>Description</th>
                    <th style={{ width: '10%' }}>HSN/SAC</th>
                    <th style={{ width: '8%' }}>UOM</th>
                    <th style={{ width: '8%' }}>Qty</th>
                    <th style={{ width: '12%' }}>Unit Price (INR)</th>
                    <th style={{ width: '12%' }}>Basic Total</th>
                    <th style={{ width: '8%' }}>Tax %</th>
                    <th style={{ width: '12%' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {getPageLines(pageIndex + 1).map((line, idx) => {
                      const lineTotal = Number(line.totalAmount || 0);
                      let taxPercent = 'N/A';
                      let lineWithTax = lineTotal;

                      if (gstApplied) {
                        if (po.gstType === 'igst') {
                          taxPercent = `IGST ${po.igstPercentage || 18}%`;
                          lineWithTax = lineTotal * (1 + (po.igstPercentage || 18) / 100);
                        } else {
                          const cgstPct = po.cgstPercentage || 9;
                          const sgstPct = po.sgstPercentage || 9;
                          taxPercent = `CGST ${cgstPct}% + SGST ${sgstPct}%`;
                          lineWithTax = lineTotal * (1 + (cgstPct + sgstPct) / 100);
                        }
                      }

                      return (
                        <tr key={line.id || idx}>
                          <td className="text-center">{idx + 1}</td>
                          <td>N/A</td>
                          <td>{line.description || 'Installation and commissioning'}</td>
                          <td className="text-center">N/A</td>
                          <td className="text-center">Nos</td>
                          <td className="text-center">{line.quantity}</td>
                          <td className="text-right">₹ {Number(line.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="text-right">₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="text-center">{taxPercent}</td>
                          <td className="text-right">₹ {lineWithTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
              )}

              {/* Summary Section - Show on first page if 1 item, or last page if multiple items */}
              {((po?.lines?.length === 1 && pageIndex === 0) || (po?.lines?.length > 1 && pageIndex === pages - 1)) && (
              <div className="summary-section">
                <div className="summary-box">
                  <div className="summary-row">
                    <span className="summary-row-label">Subtotal (Basic):</span>
                    <span className="summary-row-value">₹ {subtotalBasic.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {gstApplied && (
                    <>
                      {po.gstType === 'igst' && igstAmount > 0 && (
                        <div className="summary-row">
                          <span className="summary-row-label">Tax ({po.igstPercentage || 18}% IGST):</span>
                          <span className="summary-row-value">₹ {igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {po.gstType !== 'igst' && (
                        <>
                          {cgstAmount > 0 && (
                            <div className="summary-row">
                              <span className="summary-row-label">CGST ({po.cgstPercentage || 9}%):</span>
                              <span className="summary-row-value">₹ {cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {sgstAmount > 0 && (
                            <div className="summary-row">
                              <span className="summary-row-label">SGST ({po.sgstPercentage || 9}%):</span>
                              <span className="summary-row-value">₹ {sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                  <div className="summary-divider"></div>
                  <div className="summary-total">
                    <span>TOTAL AMOUNT:</span>
                    <span>₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '10px', fontWeight: '600' }}>
                    {numberToWords(grandTotal)}
                  </div>
                </div>
              </div>
              )}

              {/* Remarks - Show from page 2 onwards */}
              {pageIndex >= 1 && po.remarks && (
                <div className="remarks-section">
                  <strong>Remarks:</strong> {po.remarks}
                </div>
              )}

              {/* Terms & Conditions section - Show only on last page, in normal content flow */}
              {pageIndex === pages - 1 && (
              <div className="footer-content">
                <div className="footer-section">
                  <h4>Terms & Conditions</h4>
                  <p>Goods once sold will not be exchanged or refunded</p>
                </div>
                <div className="footer-section">
                  <h4>Contact Information</h4>
                  <p>{po.exportHeaders?.contactPhone || 'N/A'}</p>
                  <p>{po.exportHeaders?.contactEmail || 'N/A'}</p>
                </div>
                <div className="footer-section">
                  <h4>Authorized By</h4>
                  <p style={{ marginTop: '30px', borderTop: '1px solid #333', paddingTop: '5px' }}>_________________</p>
                </div>
              </div>
              )}

              {/* Footer with date, time, and page number - Always at bottom */}
              <div className="footer">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#666' }}>
                  <div>
                    {new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div>
                    Page {pageIndex + 1} of {pages}
                  </div>
                </div>
              </div>
            </div>
          </div>
            );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
