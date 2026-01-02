import { useEffect, useState, useRef } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { authenticatedFetch } from "@/lib/fetchWithLoader";
import type { Invoice } from "@shared/schema";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './InvoicePrint.css';

interface VendorDetail {
  id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  gstin?: string;
}

interface InvoiceWithDetails extends Invoice {
  vendor?: VendorDetail;
  exportHeaders?: any;
}

export default function InvoicePrint() {
  const [, params] = useRoute("/vendor/invoice/print/:id");
  const invoiceId = params?.id;
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [printHeaders, setPrintHeaders] = useState<boolean>(true);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    if (!invoiceId) return;
    try {
      const baseUrl = getApiBaseUrl();

      const response = await authenticatedFetch(`${baseUrl}/api/invoices/${invoiceId}`);
      if (!response.ok) throw new Error("Failed to fetch invoice");
      const result = await response.json();

      const invoiceData = result.invoice || result;

      const headerRes = await authenticatedFetch(`${baseUrl}/api/export-headers`);
      const headerData = headerRes.ok ? await headerRes.json() : {};

      setInvoice({
        ...invoiceData,
        exportHeaders: headerData
      });
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast({ title: "Error", description: "Failed to load invoice", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;

      const pdfWidth = contentWidth;
      const pdfHeight = pdfWidth / ratio;
      const availableHeight = pageHeight - (margin * 2);

      const pages = Math.ceil(pdfHeight / availableHeight);

      for (let pageNum = 0; pageNum < pages; pageNum++) {
        if (pageNum > 0) {
          pdf.addPage();
        }

        const startY = (pageNum * availableHeight * canvasHeight) / pdfHeight;
        const endY = ((pageNum + 1) * availableHeight * canvasHeight) / pdfHeight;
        const cropHeight = Math.min(endY - startY, canvasHeight - startY);

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

      const filename = `Invoice-${invoice?.invoiceNumber}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      toast({ title: "Success", description: "PDF downloaded successfully", variant: "default" });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!invoice) return <div className="p-8 text-center">Invoice not found</div>;

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
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', padding: '8px 16px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontWeight: 600, color: '#003d7a', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={printHeaders}
              onChange={(e) => setPrintHeaders(e.target.checked)}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            Print Header
          </label>
        </div>

        <div style={{ padding: '20px', width: '100%', overflowY: 'auto', flex: 1, backgroundColor: '#f0f0f0', boxSizing: 'border-box' }}>
          <div ref={printRef} style={{ margin: '0 auto', width: 'fit-content' }}>
            <div className="invoice-container">
              <div className="invoice-content">
                {/* Header */}
                <div className={`header ${!printHeaders ? 'hidden' : ''}`}>
                  <div className="company-info">
                    <h1>{invoice.exportHeaders?.companyName || 'COMPANY NAME'}</h1>
                    {invoice.exportHeaders?.address && <p>{invoice.exportHeaders.address}</p>}
                    {invoice.exportHeaders?.city && invoice.exportHeaders?.state && <p>{invoice.exportHeaders.city}, {invoice.exportHeaders.state}</p>}
                    {invoice.exportHeaders?.gstin && <p>GSTIN: {invoice.exportHeaders.gstin}</p>}
                    {invoice.exportHeaders?.contactPhone && <p>Tel: {invoice.exportHeaders.contactPhone}</p>}
                    {invoice.exportHeaders?.website && <p>Website: {invoice.exportHeaders.website}</p>}
                  </div>
                  <div className="invoice-title">
                    <h2>TAX INVOICE</h2>
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      <p style={{ margin: 0 }}>Invoice Type: <strong>Tax Invoice</strong></p>
                    </div>
                  </div>
                </div>

                {/* Invoice Meta */}
                <div className="invoice-meta">
                  <div className="meta-item">
                    <span className="meta-label">Invoice Number</span>
                    <span className="meta-value">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Invoice Date</span>
                    <span className="meta-value">{formatDate(invoice.invoiceDate)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Due Date</span>
                    <span className="meta-value">{formatDate(invoice.dueDate)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Status</span>
                    <span className="meta-value" style={{ backgroundColor: '#e8f5e9', padding: '3px 8px', borderRadius: '3px', color: '#2e7d32', fontWeight: '600' }}>{invoice.status || 'Draft'}</span>
                  </div>
                </div>

                {/* Vendor Info - Bill To */}
                <div className="parties-section">
                  <div className="party-box">
                    <h3>Bill To</h3>
                    <p><strong>{invoice.vendor?.name || 'Vendor Name'}</strong></p>
                    <p>PAN No: {invoice.vendor?.pan || 'N/A'}</p>
                    <p>GSTIN: {invoice.vendor?.gstin || 'N/A'}</p>
                    <p>Address: {invoice.vendor?.address || 'N/A'}</p>
                    <p>City/State: {invoice.vendor?.city && invoice.vendor?.state ? `${invoice.vendor.city}, ${invoice.vendor.state}` : 'N/A'}</p>
                  </div>

                  <div className="party-box">
                    <h3>Ship To</h3>
                    <p><strong>{invoice.exportHeaders?.companyName || 'COMPANY NAME'}</strong></p>
                    <p>State Code: {(invoice.exportHeaders as any)?.stateCode || 'N/A'}</p>
                    {invoice.exportHeaders?.gstin && <p>GSTIN: {invoice.exportHeaders.gstin}</p>}
                    {invoice.exportHeaders?.address && <p>Address: {invoice.exportHeaders.address}</p>}
                    {invoice.exportHeaders?.city && invoice.exportHeaders?.state && (
                      <p>City/State: {invoice.exportHeaders.city}, {invoice.exportHeaders.state}</p>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <table className="items-table">
                  <thead>
                    <tr>
                      <th style={{ width: '5%' }}>Line</th>
                      <th style={{ width: '25%' }}>Description</th>
                      <th style={{ width: '10%' }}>UOM</th>
                      <th style={{ width: '12%' }}>Qty</th>
                      <th style={{ width: '18%' }}>Unit Price (INR)</th>
                      <th style={{ width: '18%' }}>Amount (INR)</th>
                      <th style={{ width: '12%' }}>Tax %</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="text-center">1</td>
                      <td>Invoice Item</td>
                      <td className="text-center">Nos</td>
                      <td className="text-center">1</td>
                      <td className="text-right">₹ {Number(invoice.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="text-right">₹ {Number(invoice.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="text-center">18%</td>
                    </tr>
                  </tbody>
                </table>

                {/* Summary Section */}
                <div className="summary-section">
                  <div className="summary-box">
                    <div className="summary-row">
                      <span className="summary-row-label">Subtotal (Basic):</span>
                      <span className="summary-row-value">₹ {Number(invoice.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-row-label">Tax (18% GST):</span>
                      <span className="summary-row-value">₹ {Number(invoice.gst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="summary-divider"></div>
                    <div className="summary-total">
                      <span>TOTAL AMOUNT:</span>
                      <span>₹ {Number(invoice.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                {invoice.remarks && (
                  <div className="remarks-section">
                    <strong>Remarks:</strong> {invoice.remarks}
                  </div>
                )}

                {/* Footer */}
                <div className="footer">
                  <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: '#666' }}>
                    <p>Generated on {new Date().toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
