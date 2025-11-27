import { useEffect, useState, useRef } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PurchaseOrder, Site, Vendor } from "@shared/schema";

interface POWithDetails extends PurchaseOrder {
  site?: Site;
  vendor?: Vendor;
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
      const response = await fetch(`/api/purchase-orders/${poId}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      
      // Fetch site and vendor details
      const siteRes = await fetch(`/api/sites/${result.siteId}`);
      const siteData = siteRes.ok ? await siteRes.json() : null;
      
      const vendorRes = await fetch(`/api/vendors/${result.vendorId}`);
      const vendorData = vendorRes.ok ? await vendorRes.json() : null;
      
      setPo({ ...result, site: siteData, vendor: vendorData });
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

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="no-print flex gap-4 mb-8">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" /> Print
        </Button>
      </div>

      <div ref={printRef} className="max-w-4xl mx-auto bg-white">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-3xl font-bold mb-2">PURCHASE ORDER</h1>
          <p className="text-gray-600">EMS Portal - Enterprise Management System</p>
        </div>

        {/* PO Header Info */}
        <div className="grid grid-cols-3 gap-8 mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">PO NUMBER</p>
            <p className="text-lg font-bold">{po.poNumber}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">PO DATE</p>
            <p className="text-lg font-bold">{po.poDate}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">DUE DATE</p>
            <p className="text-lg font-bold">{po.dueDate}</p>
          </div>
        </div>

        {/* Vendor & Site Info */}
        <div className="grid grid-cols-2 gap-8 mb-8 border-t border-b py-4">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">VENDOR</p>
            <p className="font-semibold">{po.vendor?.name}</p>
            <p className="text-sm text-gray-600">{po.vendor?.email}</p>
            <p className="text-sm text-gray-600">{po.vendor?.address}</p>
            <p className="text-sm text-gray-600">{po.vendor?.city}, {po.vendor?.state} {po.vendor?.pincode}</p>
            {po.vendor?.gstin && <p className="text-sm">GSTIN: {po.vendor.gstin}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">SITE</p>
            <p className="font-semibold">{po.site?.hopAB}</p>
            <p className="text-sm text-gray-600">Plan ID: {po.site?.planId}</p>
            <p className="text-sm text-gray-600">Circle: {po.site?.circle}</p>
            <p className="text-sm text-gray-600">District: {po.site?.district}</p>
            <p className="text-sm text-gray-600">Site ID: {po.site?.siteId}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="text-left py-3 px-2 font-semibold">Description</th>
                <th className="text-center py-3 px-2 font-semibold">Quantity</th>
                <th className="text-right py-3 px-2 font-semibold">Unit Price</th>
                <th className="text-right py-3 px-2 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-4 px-2">{po.description}</td>
                <td className="text-center py-4 px-2">{po.quantity}</td>
                <td className="text-right py-4 px-2">₹ {Number(po.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="text-right py-4 px-2">₹ {Number(po.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 border border-gray-300">
            <div className="flex justify-between p-3 border-b">
              <span className="font-semibold">Subtotal:</span>
              <span>₹ {Number(po.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between p-3 border-b">
              <span className="font-semibold">Tax (0%):</span>
              <span>₹ 0.00</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-100 font-bold text-lg">
              <span>Total:</span>
              <span>₹ {Number(po.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">STATUS</p>
              <p className="font-semibold">{po.status}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">CREATED DATE</p>
              <p className="font-semibold">{new Date(po.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {po.remarks && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-600 mb-1">REMARKS</p>
              <p>{po.remarks}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t mt-8 pt-4 text-center text-xs text-gray-600">
          <p>This is a system-generated document. No signature required.</p>
          <p className="mt-2">Enterprise Management System (EMS) Portal</p>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
}
