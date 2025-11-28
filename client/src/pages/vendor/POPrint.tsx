import { useEffect, useState, useRef } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import type { PurchaseOrder, Site, Vendor } from "@shared/schema";

interface POWithDetails extends PurchaseOrder {
  site?: Site;
  vendor?: Vendor;
  exportHeaders?: any;
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
  }, [poId]);

  const fetchPO = async () => {
    if (!poId) return;
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/purchase-orders/${poId}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      
      const siteRes = await fetch(`${baseUrl}/api/sites/${result.siteId}`);
      const siteData = siteRes.ok ? await siteRes.json() : null;
      
      const vendorRes = await fetch(`${baseUrl}/api/vendors/${result.vendorId}`);
      const vendorData = vendorRes.ok ? await vendorRes.json() : null;

      const headerRes = await fetch(`${baseUrl}/api/export-headers`);
      const headerData = headerRes.ok ? await headerRes.json() : {};
      
      setPo({ ...result, site: siteData, vendor: vendorData, exportHeaders: headerData });
    } catch (error) {
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

  const totalAmount = Number(po.totalAmount || 0);

  return (
    <div className="w-full bg-white">
      <style>{`
        @media print {
          body { margin: 0; padding: 0; background: white; }
          .no-print { display: none !important; }
          @page { margin: 0.5in; size: A4; }
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

      <div className="min-h-screen bg-white">
        <div className="no-print flex gap-4 p-8 border-b">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>

        <div ref={printRef} className="max-w-4xl mx-auto bg-white p-12 po-container">
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
              <div className="section-header">Site Information</div>
              <div className="party-name">{po.site?.hopAB}</div>
              <div>Site ID: {po.siteId}</div>
              {po.site?.planId && <div>Plan ID: {po.site.planId}</div>}
              {po.site?.circle && <div>Circle: {po.site.circle}</div>}
              {po.site?.district && <div>District: {po.site.district}</div>}
              {po.site?.state && <div>State: {po.site.state}</div>}
            </div>
          </div>

          {/* Items Table */}
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Description</th>
                <th style={{ width: '15%' }} className="text-right">Quantity</th>
                <th style={{ width: '20%' }} className="text-right">Unit Price</th>
                <th style={{ width: '25%' }} className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{po.description}</td>
                <td className="text-right">{po.quantity}</td>
                <td className="text-right">₹ {Number(po.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="text-right">₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="totals-box">
            <div className="totals-table">
              <div className="totals-row">
                <span>Subtotal:</span>
                <span>₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="totals-row">
                <span>Tax:</span>
                <span>₹ 0.00</span>
              </div>
              <div className="totals-row">
                <span>Shipping:</span>
                <span>₹ 0.00</span>
              </div>
              <div className="totals-row total">
                <span>TOTAL:</span>
                <span>₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
  );
}
