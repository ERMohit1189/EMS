import { useEffect, useState, useRef } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { authenticatedFetch } from "@/lib/fetchWithLoader";
import type { PurchaseOrder, Site, Vendor } from "@shared/schema";

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
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPO();

    // Cleanup: Remove cached PO data from sessionStorage after loading
    return () => {
      if (poId) {
        sessionStorage.removeItem(`po_${poId}`);
      }
    };
  }, [poId]);

  const fetchPO = async () => {
    if (!poId) return;
    try {
      const baseUrl = getApiBaseUrl();

      // First try to get PO data from sessionStorage (passed from POGeneration page)
      const cachedPOData = sessionStorage.getItem(`po_${poId}`);
      if (cachedPOData) {
        try {
          const cachedPO = JSON.parse(cachedPOData);
          // Use cached data and fetch vendor/site info separately
          const poData = cachedPO;
          const lines = cachedPO.lines || [];

          // Get first site for header info
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

      // Fallback: Fetch PO with lines using withLines=true query parameter
      const response = await authenticatedFetch(`${baseUrl}/api/purchase-orders/${poId}?withLines=true`);
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();

      // Extract po and lines from response
      const poData = result.po || result;
      const lines = result.lines || [];

      // Get first site for vendor info (if PO has old structure with single siteId)
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

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!po) return <div className="p-8 text-center">PO not found</div>;

  // Calculate total amount - use sum of lines if available, otherwise use po.totalAmount
  const subtotal = po.lines && po.lines.length > 0
    ? po.lines.reduce((sum, line) => sum + Number(line.totalAmount || 0), 0)
    : Number(po.totalAmount || 0);

  // Calculate GST amounts
  const cgstAmount = Number(po.cgstAmount || 0);
  const sgstAmount = Number(po.sgstAmount || 0);
  const igstAmount = Number(po.igstAmount || 0);
  const totalGst = cgstAmount + sgstAmount + igstAmount;
  const grandTotal = subtotal + totalGst;

  return (
    <div style={{ width: '100%', display: 'block', background: 'white', minHeight: '100%' }}>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; height: auto; overflow-y: auto; }
        body { background: white; }
        @media print {
          html, body { margin: 0; padding: 0; height: auto; }
          .no-print { display: none !important; }
          @page {
            margin: 0.5in;
            size: A4;
          }
          .po-wrapper { margin: 0; padding: 0; }
          .po-container { margin: 0; padding: 0; page-break-inside: auto; }
        }
        .po-container { font-family: Arial, sans-serif; }
        .po-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
        .po-company { flex: 1; }
        .po-title { font-size: 32px; font-weight: bold; color: #2c3e50; margin-bottom: 5px; }
        .po-subtitle { font-size: 12px; color: #999; }
        .po-info-box { flex: 1; text-align: right; }
        .po-info-row { margin-bottom: 8px; font-size: 12px; }
        .po-info-label { font-weight: bold; color: #555; }
        .po-info-value { color: #2c3e50; font-weight: bold; }
        .section-header { font-size: 12px; font-weight: bold; color: #555; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; }
        .party-info { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 20px; padding: 15px 0; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; }
        .party-section { font-size: 11px; line-height: 1.6; }
        .party-name { font-weight: bold; font-size: 12px; margin-bottom: 5px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th { background: #2c3e50; color: white; padding: 10px; text-align: left; font-size: 11px; font-weight: bold; }
        .items-table td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 11px; }
        .text-right { text-align: right; }
        .items-table tr:last-child td { border-bottom: 2px solid #2c3e50; }
        .totals-box { display: flex; justify-content: flex-end; margin: 20px 0; }
        .totals-table { width: 280px; font-size: 11px; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #ddd; }
        .totals-row.total { background: #2c3e50; color: white; font-weight: bold; padding: 10px; border: none; }
        .po-footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center; }
      `}</style>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', background: 'white', minHeight: '100vh' }}>
        <div className="no-print flex gap-4 p-8 border-b sticky top-0 bg-white z-10">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>

        <div className="po-wrapper" style={{ padding: '48px', margin: '0 auto', width: '100%', maxWidth: '900px', overflow: 'visible', display: 'block' }}>
          <div ref={printRef} className="po-container" style={{ width: '100%', margin: '0', padding: '0', display: 'block' }}>
          {/* Header */}
          <div className="po-header">
            <div className="po-company">
              <div className="po-title">PURCHASE ORDER</div>
              <div className="po-subtitle">{po.exportHeaders?.companyName || 'Company Name'}</div>
            </div>
            <div className="po-info-box">
              <div className="po-info-row">
                <span className="po-info-label">PO No.:</span>
                <span className="po-info-value">{po.poNumber}</span>
              </div>
              <div className="po-info-row">
                <span className="po-info-label">PO Date:</span>
                <span className="po-info-value">{po.poDate}</span>
              </div>
              <div className="po-info-row">
                <span className="po-info-label">Due Date:</span>
                <span className="po-info-value">{po.dueDate}</span>
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div style={{ fontSize: '11px', marginBottom: '20px', lineHeight: '1.6' }}>
            {po.exportHeaders?.companyName && <div><strong>{po.exportHeaders.companyName}</strong></div>}
            {po.exportHeaders?.address && <div>{po.exportHeaders.address}</div>}
            {po.exportHeaders?.contactPhone && <div>Phone: {po.exportHeaders.contactPhone}</div>}
            {po.exportHeaders?.website && <div>Website: {po.exportHeaders.website}</div>}
            {po.exportHeaders?.gstin && <div>GSTIN: {po.exportHeaders.gstin}</div>}
          </div>

          {/* Vendor & Site Info */}
          <div className="party-info">
            <div className="party-section">
              <div className="section-header">Bill To</div>
              <div className="party-name">{po.vendor?.name}</div>
              <div>{po.vendor?.email}</div>
              <div>{po.vendor?.address}</div>
              {po.vendor?.city && <div>{po.vendor.city}, {po.vendor?.state} {po.vendor?.pincode}</div>}
              {po.vendor?.gstin && <div>GSTIN: {po.vendor.gstin}</div>}
              {po.vendor?.phone && <div>Phone: {po.vendor.phone}</div>}
            </div>
            <div className="party-section">
              <div className="section-header">Sites Included</div>
              {po.lines && po.lines.length > 0 ? (
                <div style={{ fontSize: '10px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{po.lines.length} Site(s)</div>
                  <ul style={{ margin: '0', paddingLeft: '16px' }}>
                    {po.lines.map((line, idx) => (
                      <li key={line.id || idx} style={{ marginBottom: '4px' }}>
                        {line.siteHopAB || line.siteId}
                        {line.sitePlanId && ` (${line.sitePlanId})`}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : po.site ? (
                <>
                  <div className="party-name">{po.site?.hopAB}</div>
                  <div>Site ID: {po.siteId}</div>
                  {po.site?.planId && <div>Plan ID: {po.site.planId}</div>}
                  {po.site?.circle && <div>Circle: {po.site.circle}</div>}
                  {po.site?.district && <div>District: {po.site.district}</div>}
                  {po.site?.state && <div>State: {po.site.state}</div>}
                </>
              ) : (
                <div>No site information available</div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Description / Site</th>
                <th style={{ width: '15%' }} className="text-right">Quantity</th>
                <th style={{ width: '20%' }} className="text-right">Unit Price</th>
                <th style={{ width: '25%' }} className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {po.lines && po.lines.length > 0 ? (
                po.lines.map((line, idx) => (
                  <tr key={line.id || idx}>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{line.siteHopAB || line.siteId}</div>
                      <div style={{ fontSize: '10px', color: '#666' }}>{line.description || 'Installation and commissioning'}</div>
                    </td>
                    <td className="text-right">{line.quantity}</td>
                    <td className="text-right">Rs. {Number(line.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="text-right">Rs. {Number(line.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td>{po.description}</td>
                  <td className="text-right">{po.quantity}</td>
                  <td className="text-right">Rs. {Number(po.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="text-right">Rs. {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="totals-box">
            <div className="totals-table">
              <div className="totals-row">
                <span>Subtotal:</span>
                <span>Rs. {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {igstAmount > 0 && (
                <div className="totals-row">
                  <span>IGST (18%):</span>
                  <span>Rs. {igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {cgstAmount > 0 && (
                <div className="totals-row">
                  <span>CGST (9%):</span>
                  <span>Rs. {cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {sgstAmount > 0 && (
                <div className="totals-row">
                  <span>SGST (9%):</span>
                  <span>Rs. {sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="totals-row total">
                <span>TOTAL:</span>
                <span>Rs. {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {po.remarks && (
            <div style={{ marginTop: '20px', fontSize: '11px' }}>
              <div className="section-header">Remarks</div>
              <div>{po.remarks}</div>
            </div>
          )}

          {/* Footer */}
          <div className="po-footer">
            <p>This is a system-generated Purchase Order. No signature required.</p>
            <p style={{ marginTop: '8px' }}>Status: <strong>{po.status}</strong></p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
