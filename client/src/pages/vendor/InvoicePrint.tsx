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

interface LineItem {
  slNo?: number;
  description?: string;
  hsnSacNo?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  taxableValue?: number;
}

interface InvoiceWithDetails extends Invoice {
  vendor?: any;
  exportHeaders?: any;
  lineItems?: LineItem[];
}

export default function InvoicePrint() {
  const [, params] = useRoute("/vendor/invoice/print/:id");
  const invoiceId = params?.id;
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<number>(1);
  const [firstPageCapacity, setFirstPageCapacity] = useState<number>(5);
  const [otherPageCapacity, setOtherPageCapacity] = useState<number>(10);
  const [printHeaders, setPrintHeaders] = useState<boolean>(true);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  // Calculate pages based on line items count
  const calculatePages = (lineCount: number) => {
    const firstPageItems = 12;
    const otherPageItems = 22;

    let totalPages = 1;
    let remainingItems = lineCount;

    if (remainingItems > firstPageItems) {
      remainingItems -= firstPageItems;
      totalPages += Math.ceil(remainingItems / otherPageItems);
    } else if (remainingItems >= 1) {
      totalPages = 1;
    }

    console.log(`📄 Invoice A4 Calculation:
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
    if (!invoice?.lineItems) return [];

    let itemsPerPage = otherPageCapacity;
    let startIdx = 0;

    if (pageNum === 1) {
      itemsPerPage = firstPageCapacity;
      startIdx = 0;
    } else {
      startIdx = firstPageCapacity + (pageNum - 2) * otherPageCapacity;
    }

    const endIdx = startIdx + itemsPerPage;
    return invoice.lineItems.slice(startIdx, endIdx);
  };

  // Recalculate pages when invoice data changes
  useEffect(() => {
    if (invoice && invoice.lineItems) {
      calculatePages(invoice.lineItems.length);
    }
  }, [invoice?.id, invoice?.lineItems?.length]);

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

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const pdfWidth = pageWidth - 2 * margin;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, pdfWidth, pdfHeight);

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
        {/* Toolbar - matching POPrint */}
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
          <div style={{ padding: '8px 16px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontWeight: 600, color: '#003d7a' }}>
            📄 Pages: <span style={{ fontSize: '16px' }}>{pages}</span> | Items: <span style={{ fontSize: '16px' }}>{invoice?.lineItems?.length || 0}</span>
          </div>
        </div>

        {/* Invoice container - scrollable */}
        <div style={{ padding: '20px', width: '100%', overflowY: 'auto', flex: 1, backgroundColor: '#f0f0f0', boxSizing: 'border-box' }}>
          <div ref={printRef} style={{ margin: '0 auto', width: 'fit-content' }}>

          {/* Render multiple pages */}
          {Array.from({ length: pages }).map((_, pageIndex) => {
            const pageNum = pageIndex + 1;
            const pageLines = getPageLines(pageNum);
            const hasContent = pageLines.length > 0 || pageIndex === 0;

            if (!hasContent && pageIndex > 0) return null;

            return (
              <div
                key={pageIndex}
                className="invoice-container"
              >
              <div className="invoice-content">

          {/* Header - shown on all pages when printHeaders is checked */}
          {printHeaders && (
            <div style={{ padding: '12px 15px', width: 'calc(100% - 30px)', margin: '0 auto 8px', borderBottom: '3px solid #333', boxSizing: 'border-box' }}>
              {/* Top Section: Company Info and Invoice Title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', margin: '0 0 3px 0' }}>{invoice.exportHeaders?.companyName || 'COMPANY NAME'}</h1>
                  <p style={{ fontSize: '13px', color: '#666', margin: '1px 0' }}>{invoice.exportHeaders?.address}</p>
                  <p style={{ fontSize: '13px', color: '#666', margin: '1px 0' }}>{invoice.exportHeaders?.state}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: '#d32f2f', margin: 0 }}>TAX INVOICE</h2>
                  <p style={{ fontSize: '13px', color: '#666', margin: '3px 0 0 0' }}><strong>Invoice No:</strong> {invoice.invoiceNumber}</p>
                  <p style={{ fontSize: '13px', color: '#666', margin: '2px 0' }}><strong>Date:</strong> {formatDate(invoice.invoiceDate)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Bill To / Ship To - only on first page */}
          {pageIndex === 0 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '20px 8px', width: 'calc(100% - 16px)', margin: '0 auto', backgroundColor: 'white', boxSizing: 'border-box' }}>
                <div style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#fafafa' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#d32f2f', marginBottom: '6px', textTransform: 'uppercase' }}>Bill To</h3>
                  <p style={{ fontSize: '14px', color: '#333', margin: '2px 0' }}><strong>{invoice.vendor?.name || 'Vendor Name'}</strong></p>
                  <p style={{ fontSize: '14px', color: '#333', margin: '2px 0' }}>PAN No: {invoice.vendor?.pan || 'N/A'}</p>
                  <p style={{ fontSize: '14px', color: '#333', margin: '2px 0' }}>State Code: {(invoice.vendor as any)?.stateCode || 'N/A'}</p>
                  <p style={{ fontSize: '14px', color: '#333', margin: '2px 0' }}>GSTIN/UIN: {invoice.vendor?.gstin || 'N/A'}</p>
                  <p style={{ fontSize: '14px', color: '#333', margin: '2px 0' }}>{invoice.vendor?.address || 'N/A'}</p>
                  <p style={{ fontSize: '14px', color: '#333', margin: '2px 0' }}>{invoice.vendor?.city}, {invoice.vendor?.state}</p>
                </div>

                <div style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#fafafa' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#d32f2f', marginBottom: '6px', textTransform: 'uppercase' }}>Ship To</h3>
                  <p style={{ fontSize: '14px', color: '#333', margin: '2px 0' }}><strong>{invoice.exportHeaders?.companyName || 'COMPANY NAME'}</strong></p>
                  <p style={{ fontSize: '14px', color: '#333', margin: '2px 0' }}>PAN No: {(invoice.exportHeaders as any)?.pan || 'N/A'}</p>
                  <p style={{ fontSize: '14px', color: '#333', margin: '2px 0' }}>State Code: {(invoice.exportHeaders as any)?.stateCode || 'N/A'}</p>
                  <p style={{ fontSize: '14px', color: '#333', margin: '2px 0' }}>GSTIN/UIN: {invoice.exportHeaders?.gstin || 'N/A'}</p>
                  <p style={{ fontSize: '14px', color: '#333', margin: '2px 0' }}>{invoice.exportHeaders?.address}</p>
                  <p style={{ fontSize: '14px', color: '#333', margin: '2px 0' }}>{invoice.exportHeaders?.city}, {invoice.exportHeaders?.state}</p>
                </div>
              </div>

              {/* Order Details - Below Bill To / Ship To */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', padding: '20px 15px', width: 'calc(100% - 30px)', margin: '0 auto', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd', borderLeft: '1px solid #ddd', borderRight: '1px solid #ddd', boxSizing: 'border-box' }}>
                <div style={{ fontSize: '13px' }}>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '3px' }}>Project Name</div>
                  <div style={{ color: '#666' }}>{(invoice as any)?.projectName || 'N/A'}</div>
                </div>
                <div style={{ fontSize: '13px' }}>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '3px' }}>SO No.</div>
                  <div style={{ color: '#666' }}>{(invoice as any)?.soNumber || 'N/A'}</div>
                </div>
                <div style={{ fontSize: '13px' }}>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '3px' }}>Project No.</div>
                  <div style={{ color: '#666' }}>{(invoice as any)?.projectNumber || 'N/A'}</div>
                </div>
                <div style={{ fontSize: '13px' }}>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '3px' }}>PO No.</div>
                  <div style={{ color: '#666' }}>{(invoice as any)?.poNumber || 'N/A'}</div>
                </div>
                <div style={{ fontSize: '13px' }}>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '3px' }}>PO Date</div>
                  <div style={{ color: '#666' }}>{formatDate((invoice as any)?.poDate) || 'N/A'}</div>
                </div>
                <div style={{ fontSize: '13px' }}>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '3px' }}>Payment Terms</div>
                  <div style={{ color: '#666' }}>{(invoice as any)?.paymentTerms || 'N/A'}</div>
                </div>
                <div style={{ fontSize: '13px' }}>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '3px' }}>Place of Supply</div>
                  <div style={{ color: '#666' }}>{(invoice as any)?.placeOfSupply || 'N/A'}</div>
                </div>
                <div style={{ fontSize: '13px' }}>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '3px' }}>CIN</div>
                  <div style={{ color: '#666' }}>{(invoice.exportHeaders as any)?.cin || 'N/A'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Items Table */}
          <table style={{ width: 'calc(100% - 30px)', borderCollapse: 'collapse', margin: '20px 15px', fontSize: '14px', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#333', color: 'white' }}>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #333', fontSize: '13px', width: '4%' }}>SI. No.</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #333', fontSize: '13px', width: '35%' }}>Product / Service Description</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #333', fontSize: '13px', width: '10%' }}>HSN/SAC No.</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #333', fontSize: '13px', width: '7%' }}>QTY</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #333', fontSize: '13px', width: '11%' }}>Unit Price</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #333', fontSize: '13px', width: '11%' }}>Amount</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #333', fontSize: '13px', width: '12%' }}>Taxable Value</th>
              </tr>
            </thead>
            <tbody>
              {pageLines && pageLines.length > 0 ? (
                pageLines.map((item, idx) => {
                  // Calculate global serial number across all pages
                  let globalIdx = idx;
                  if (pageNum === 1) {
                    globalIdx = idx;
                  } else {
                    globalIdx = firstPageCapacity + (pageNum - 2) * otherPageCapacity + idx;
                  }

                  return (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontSize: '14px' }}>{globalIdx + 1}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '14px' }}>{item.description || 'Invoice Item'}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontSize: '14px' }}>{item.hsnSacNo || '-'}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontSize: '14px' }}>{item.quantity || 1}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontSize: '14px' }}>₹ {Number(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontSize: '14px' }}>₹ {Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontSize: '14px' }}>₹ {Number(item.taxableValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No items</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals - only on last page */}
          {pageIndex === pages - 1 && (
            <div style={{ padding: '0 8px', marginBottom: '30px', width: 'calc(100% - 16px)', margin: '0 auto 30px', boxSizing: 'border-box' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 10px', border: '1px solid #ddd', textAlign: 'left', width: '85%' }}>Taxable Amount</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #ddd', textAlign: 'right' }}>₹ {Number(invoice.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 10px', border: '1px solid #ddd', textAlign: 'left' }}>Add: IGST 18%</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #ddd', textAlign: 'right' }}>₹ {Number(invoice.gst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                    <td style={{ padding: '8px 10px', border: '2px solid #333', textAlign: 'left', fontWeight: 'bold' }}>Total Amount</td>
                    <td style={{ padding: '8px 10px', border: '2px solid #333', textAlign: 'right', fontWeight: 'bold' }}>₹ {Number(invoice.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Bank Details - only on last page */}
          {pageIndex === pages - 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', padding: '20px 15px', width: 'calc(100% - 30px)', margin: '0 auto', backgroundColor: '#fafafa', border: '1px solid #ddd', boxSizing: 'border-box' }}>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', marginBottom: '8px', textTransform: 'uppercase' }}>Bank Details for R.T.G.S./N.E.F.T</h3>
                <p style={{ fontSize: '13px', color: '#333', margin: '3px 0' }}><strong>Bank Name:</strong> Bank of Baroda</p>
                <p style={{ fontSize: '13px', color: '#333', margin: '3px 0' }}><strong>IFSC Code:</strong> BARB0INDLUC</p>
                <p style={{ fontSize: '13px', color: '#333', margin: '3px 0' }}><strong>Bank A/C No.:</strong> 58000200000089</p>
              </div>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', marginBottom: '8px', textTransform: 'uppercase' }}>Contact Information</h3>
                <p style={{ fontSize: '13px', color: '#333', margin: '3px 0' }}><strong>Phone:</strong> {invoice.exportHeaders?.contactPhone || 'N/A'}</p>
                <p style={{ fontSize: '13px', color: '#333', margin: '3px 0' }}><strong>Email:</strong> {invoice.exportHeaders?.contactEmail || 'N/A'}</p>
                <p style={{ fontSize: '13px', color: '#333', margin: '3px 0' }}><strong>Website:</strong> {invoice.exportHeaders?.website || 'N/A'}</p>
              </div>
            </div>
          )}

          {/* Footer - only on last page */}
          {pageIndex === pages - 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '20px 8px', width: 'calc(100% - 16px)', margin: '0 auto', borderTop: '1px solid #ddd', boxSizing: 'border-box' }}>
              <div style={{ fontSize: '14px', color: '#666' }}>
                <p>Place & Date: {invoice.exportHeaders?.city || 'N/A'} - {formatDate(new Date().toISOString())}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', width: '150px', height: '40px', margin: '0 auto' }}></div>
                <div style={{ fontSize: '14px', color: '#333', marginTop: '5px', fontWeight: 'bold' }}>AUTHORISED SIGNATORY</div>
              </div>
            </div>
          )}

          {/* Footer - positioned absolutely at bottom */}
          <div className="footer" style={{ marginTop: 'auto', padding: '0 15px', width: 'calc(100% - 30px)', margin: '0 auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#666' }}>
              <div>
                {new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div>
                Page {pageNum} of {pages}
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
