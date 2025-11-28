import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, Eye, Printer, Trash2, FileText } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api";
import { fetchWithLoader, fetchJsonWithLoader } from "@/lib/fetchWithLoader";
import { truncateId } from "@/lib/utils";
import type { Site, Vendor } from "@shared/schema";
import jsPDF from 'jspdf';

interface PORecord {
  id: string;
  siteId: string;
  vendorId: string;
  siteName: string;
  vendorName: string;
  planId: string;
  poNumber: string;
  description: string;
  quantity: number;
  unitPrice: string;
  maxAntennaSize?: number;
  gstType?: string;
  gstApply?: boolean;
  vendorState?: string;
  siteState?: string;
}

export default function POGeneration() {
  const topRef = useRef<HTMLDivElement>(null);
  const poNumberRef = useRef<HTMLInputElement>(null);
  const [approvedSites, setApprovedSites] = useState<Site[]>([]);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [poRecords, setPoRecords] = useState<PORecord[]>([]);
  const [allPOs, setAllPOs] = useState<PORecord[]>([]);
  const [poInvoices, setPoInvoices] = useState<{ [key: string]: any[] }>({});
  const [applyGstToAll, setApplyGstToAll] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const [sitesRes, vendorsRes, posRes] = await Promise.all([
          fetch(`${baseUrl}/api/sites/for-po-generation`),
          fetch(`${baseUrl}/api/vendors?pageSize=10000`),
          fetch(`${baseUrl}/api/purchase-orders?pageSize=10000`),
        ]);

        if (!sitesRes.ok || !vendorsRes.ok || !posRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const sitesData = await sitesRes.json();
        const vendorsData = await vendorsRes.json();
        const posData = await posRes.json();

        const sites = sitesData.data || [];
        const vendorsList = vendorsData.data || [];
        const pos = posData.data || [];

        // Set vendors and sites
        setApprovedSites(sites);
        setVendors(vendorsList);

        // Convert POs to PORecord format
        const poRecords: PORecord[] = [];
        for (const po of pos) {
          const vendor = vendorsList.find(v => v.id === po.vendorId);
          const site = sites.find(s => s.id === po.siteId);
          const maxAntennaSize = site 
            ? Math.max(
                parseFloat(site.siteAAntDia) || 0,
                parseFloat(site.siteBAntDia) || 0
              )
            : 0;
          poRecords.push({
            id: po.id,
            siteId: po.siteId,
            vendorId: po.vendorId,
            siteName: site?.hopAB || site?.siteId || "Unknown",
            vendorName: vendor?.name || "Unknown",
            planId: site?.planId || "Unknown",
            poNumber: po.poNumber,
            description: po.description,
            quantity: po.quantity,
            unitPrice: po.unitPrice,
            maxAntennaSize,
          });
        }
        setAllPOs(poRecords);

        // Load invoices for each PO to check if they have invoices
        const invoicesMap: { [key: string]: any[] } = {};
        for (const po of pos) {
          try {
            const invRes = await fetch(`${baseUrl}/api/purchase-orders/${po.id}/invoices`);
            if (invRes.ok) {
              const invData = await invRes.json();
              invoicesMap[po.id] = invData.data || [];
            }
          } catch (e) {
            invoicesMap[po.id] = [];
          }
        }
        setPoInvoices(invoicesMap);

        // Filter out sites that already have POs
        const sitesWithPOs = new Set(pos.map((po: any) => po.siteId));
        const filtered = sites.filter(site => !sitesWithPOs.has(site.id));
        setAvailableSites(filtered);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handleSiteSelection = (siteId: string) => {
    const newSet = new Set(selectedSites);
    if (newSet.has(siteId)) {
      newSet.delete(siteId);
    } else {
      newSet.add(siteId);
    }
    setSelectedSites(newSet);
  };

  const generatePOs = async () => {
    if (selectedSites.size === 0) {
      toast({ title: "Alert", description: "Please select at least one site", variant: "destructive" });
      return;
    }

    try {
      const selectedSiteIds = Array.from(selectedSites);
      const sitesData = approvedSites.filter(s => selectedSiteIds.includes(s.id));

      const records: PORecord[] = sitesData.map((site, index) => {
        const vendor = vendors.find(v => v.id === site.vendorId);
        const maxAntennaSize = Math.max(
          parseFloat(site.siteAAntDia) || 0,
          parseFloat(site.siteBAntDia) || 0
        );
        // Auto-determine GST type: IGST if different states, CGST+SGST if same state
        const gstType = (vendor?.state && site.state && vendor.state !== site.state) ? 'igst' : 'cgstsgst';
        return {
          siteId: site.id,
          vendorId: site.vendorId,
          siteName: site.hopAB || site.siteId,
          vendorName: vendor?.name || "Unknown",
          planId: site.planId,
          poNumber: `PO-${Date.now()}-${index + 1}`,
          description: `Installation and commissioning for ${site.hopAB || site.siteId}`,
          quantity: 1,
          unitPrice: site.vendorAmount?.toString() || "0",
          maxAntennaSize,
          gstType,
          vendorState: vendor?.state,
          siteState: site.state,
        };
      });

      // Create POs via API with auto-determined GST type
      const createdPOs = [];
      for (const record of records) {
        const totalAmount = record.quantity * parseFloat(record.unitPrice);
        
        // Calculate GST amounts if enabled
        let igstPercentage = 0, igstAmount = 0;
        let cgstPercentage = 0, cgstAmount = 0;
        let sgstPercentage = 0, sgstAmount = 0;
        
        if (applyGstToAll) {
          if (record.gstType === 'igst') {
            igstPercentage = 18;
            igstAmount = Math.round(totalAmount * 0.18 * 100) / 100;
          } else if (record.gstType === 'cgstsgst') {
            cgstPercentage = 9;
            sgstPercentage = 9;
            cgstAmount = Math.round(totalAmount * 0.09 * 100) / 100;
            sgstAmount = Math.round(totalAmount * 0.09 * 100) / 100;
          }
        }
        
        const response = await fetch("/api/purchase-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            poNumber: record.poNumber,
            vendorId: record.vendorId,
            siteId: record.siteId,
            description: record.description,
            quantity: record.quantity,
            unitPrice: record.unitPrice,
            totalAmount: totalAmount.toString(),
            gstType: record.gstType,
            gstApply: applyGstToAll,
            igstPercentage: igstPercentage.toString(),
            igstAmount: igstAmount.toString(),
            cgstPercentage: cgstPercentage.toString(),
            cgstAmount: cgstAmount.toString(),
            sgstPercentage: sgstPercentage.toString(),
            sgstAmount: sgstAmount.toString(),
            poDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: "Draft",
          }),
        });

        if (response.ok) {
          const createdPO = await response.json();
          createdPOs.push({ ...record, id: createdPO.id, gstApply: applyGstToAll });
        }
      }

      setPoRecords(createdPOs);
      setSelectedSites(new Set());

      // Update available sites and all POs
      const updatedAvailable = availableSites.filter(
        site => !selectedSiteIds.includes(site.id)
      );
      setAvailableSites(updatedAvailable);
      setAllPOs([...allPOs, ...createdPOs]);

      toast({
        title: "Success",
        description: `${createdPOs.length} PO(s) generated successfully`,
      });

      topRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate POs";
      toast({ title: "Alert", description: errorMessage, variant: "destructive" });
    }
  };

  const deletePO = async (poId: string, poNumber: string) => {
    if (!confirm(`Delete PO ${poNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/purchase-orders/${poId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAllPOs(allPOs.filter(po => po.id !== poId));
        setPoRecords(poRecords.filter(po => po.id !== poId));
        toast({
          title: "Success",
          description: `PO ${poNumber} has been deleted.`,
        });
      } else {
        throw new Error("Failed to delete PO");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete PO",
        variant: "destructive",
      });
    }
  };

  const exportPOToPDF = async (poId: string, poNumber: string) => {
    try {
      const baseUrl = getApiBaseUrl();
      const poRes = await fetch(`${baseUrl}/api/purchase-orders/${poId}`);
      if (!poRes.ok) throw new Error("Failed to fetch PO");
      const po = await poRes.json();
      
      const siteRes = await fetch(`${baseUrl}/api/sites/${po.siteId}`);
      const site = siteRes.ok ? await siteRes.json() : null;

      const vendorRes = await fetch(`${baseUrl}/api/vendors/${po.vendorId}`);
      const vendor = vendorRes.ok ? await vendorRes.json() : null;

      const headerRes = await fetch(`${baseUrl}/api/export-headers`);
      const exportHeaderSettings = headerRes.ok ? await headerRes.json() : {};

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const m = 12;
      let y = 20;

      // Calculate GST amounts based on PO gstApply flag and gstType
      const subtotal = Number(po.totalAmount || 0);
      let igstAmt = 0, cgstAmt = 0, sgstAmt = 0;
      
      if (po.gstApply) {
        if (po.gstType === 'igst') {
          igstAmt = Math.round(subtotal * 0.18 * 100) / 100;
        } else if (po.gstType === 'cgstsgst') {
          cgstAmt = Math.round(subtotal * 0.09 * 100) / 100;
          sgstAmt = Math.round(subtotal * 0.09 * 100) / 100;
        }
      }
      const finalTotal = subtotal + igstAmt + cgstAmt + sgstAmt;

      // ===== HEADER =====
      pdf.setFont('Arial', 'bold');
      pdf.setFontSize(26);
      pdf.setTextColor(44, 62, 80);
      pdf.text('PURCHASE ORDER', m, y);

      pdf.setFontSize(11);
      pdf.setTextColor(153, 153, 153);
      pdf.setFont('Arial', 'normal');
      pdf.text(exportHeaderSettings.companyName || 'Company Name', m, y + 7);

      // Right side info
      const rX = pageW - m - 60;
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('Arial', 'bold');
      pdf.text('PO No.:', rX, y);
      pdf.setFont('Arial', 'normal');
      pdf.text(String(poNumber), rX + 25, y);

      y += 7;
      pdf.setFont('Arial', 'bold');
      pdf.text('PO Date:', rX, y);
      pdf.setFont('Arial', 'normal');
      pdf.text(String(po.poDate || ''), rX + 25, y);

      y += 7;
      pdf.setFont('Arial', 'bold');
      pdf.text('Due Date:', rX, y);
      pdf.setFont('Arial', 'normal');
      pdf.text(String(po.dueDate || ''), rX + 25, y);

      y += 18;

      // ===== COMPANY INFO =====
      pdf.setFontSize(9);
      pdf.setFont('Arial', 'normal');
      pdf.setTextColor(0, 0, 0);
      if (exportHeaderSettings.companyName) {
        pdf.text(exportHeaderSettings.companyName, m, y);
        y += 4;
      }
      if (exportHeaderSettings.address) {
        pdf.text(exportHeaderSettings.address, m, y);
        y += 4;
      }
      if (exportHeaderSettings.contactPhone) {
        pdf.text(`Phone: ${exportHeaderSettings.contactPhone}`, m, y);
        y += 4;
      }
      if (exportHeaderSettings.website) {
        pdf.text(`Website: ${exportHeaderSettings.website}`, m, y);
        y += 4;
      }

      y += 6;

      // ===== BILL TO & SITE INFO =====
      pdf.setFontSize(11);
      pdf.setFont('Arial', 'bold');
      pdf.text('Bill To', m, y);
      pdf.text('Site Information', 105, y);

      y += 5;

      // Separators
      pdf.setDrawColor(221, 221, 221);
      pdf.line(m, y, 100, y);
      pdf.line(105, y, pageW - m, y);

      y += 4;

      // Vendor & Site content
      pdf.setFontSize(9);
      pdf.setFont('Arial', 'normal');
      pdf.setTextColor(0, 0, 0);

      const vn = vendor?.name || '[Vendor Name]';
      const ve = vendor?.email || '';
      const va = vendor?.address || '';
      const vc = vendor?.city || '';
      const vst = vendor?.state || '';
      const vp = vendor?.pincode || '';
      const vg = vendor?.gstin || '';

      // Vendor left column
      let vy = y;
      pdf.setFont('Arial', 'bold');
      pdf.setFontSize(10);
      pdf.text(vn, m, vy);
      vy += 4;

      pdf.setFont('Arial', 'normal');
      pdf.setFontSize(9);
      if (ve) { pdf.text(ve, m, vy); vy += 4; }
      pdf.text(va, m, vy);
      vy += 4;
      if (vc || vst || vp) {
        pdf.text(`${vc}, ${vst} ${vp}`.trim(), m, vy);
        vy += 4;
      }
      if (vg) { pdf.text(`GSTIN: ${vg}`, m, vy); vy += 4; }
      if (vendor?.phone) { pdf.text(`Phone: ${vendor.phone}`, m, vy); }

      // Site right column
      let sy = y;
      pdf.setFont('Arial', 'bold');
      pdf.setFontSize(10);
      const sn = site?.hopAB || '[Site Name]';
      pdf.text(sn, 105, sy);
      sy += 4;

      pdf.setFont('Arial', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Site ID: ${po.siteId}`, 105, sy);
      sy += 4;
      if (site?.planId) { pdf.text(`Plan ID: ${site.planId}`, 105, sy); sy += 4; }
      if (site?.circle) { pdf.text(`Circle: ${site.circle}`, 105, sy); sy += 4; }
      if (site?.district) { pdf.text(`District: ${site.district}`, 105, sy); sy += 4; }
      if (site?.state) { pdf.text(`State: ${site.state}`, 105, sy); }

      y += 26;

      // ===== ITEMS TABLE =====
      pdf.setFontSize(11);
      pdf.setFont('Arial', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.setFillColor(44, 62, 80);

      const col1X = m;
      const col2X = 95;
      const col3X = 130;
      const col4X = 160;

      // TABLE HEADER ROW
      pdf.rect(col1X, y, 80, 7, 'F');
      pdf.text('Description', col1X + 2, y + 4.5);

      pdf.rect(col2X, y, 30, 7, 'F');
      pdf.text('QTY', col2X + 8, y + 4.5);

      pdf.rect(col3X, y, 25, 7, 'F');
      pdf.text('Unit Price', col3X + 1, y + 4.5);

      pdf.rect(col4X, y, 30, 7, 'F');
      pdf.text('Amount', col4X + 2, y + 4.5);

      y += 8;

      // ITEM DATA ROW
      pdf.setFont('Arial', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.setDrawColor(221, 221, 221);
      pdf.setFontSize(10);

      const desc = String(po.description || '').substring(0, 60);
      const qty = String(po.quantity || 1);
      const rate = Number(po.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      const total = Number(po.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

      // Description value
      pdf.rect(col1X, y, 80, 8);
      pdf.text(desc, col1X + 2, y + 4.5);

      // Quantity value
      pdf.rect(col2X, y, 30, 8);
      pdf.text(qty, col2X + 12, y + 4.5);

      // Unit Price value
      pdf.rect(col3X, y, 25, 8);
      pdf.text(`Rs. ${rate}`, col3X + 1, y + 4.5);

      // Amount value
      pdf.rect(col4X, y, 30, 8);
      pdf.text(`Rs. ${total}`, col4X + 2, y + 4.5);

      y += 14;

      // ===== TOTALS =====
      const tX = col3X;
      pdf.setFontSize(9);
      pdf.setFont('Arial', 'normal');

      pdf.text('Subtotal:', tX, y);
      pdf.text(`Rs. ${total}`, col4X + 2, y);
      y += 6;

      // Show GST lines if applied
      if (po.gstApply) {
        if (po.gstType === 'igst') {
          const igstDisplay = igstAmt.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
          pdf.text('IGST (18%):', tX, y);
          pdf.text(`Rs. ${igstDisplay}`, col4X + 2, y);
          y += 6;
        } else if (po.gstType === 'cgstsgst') {
          const cgstDisplay = cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
          const sgstDisplay = sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
          pdf.text('CGST (9%):', tX, y);
          pdf.text(`Rs. ${cgstDisplay}`, col4X + 2, y);
          y += 6;
          pdf.text('SGST (9%):', tX, y);
          pdf.text(`Rs. ${sgstDisplay}`, col4X + 2, y);
          y += 6;
        }
      }

      pdf.text('Shipping:', tX, y);
      pdf.text('Rs. 0', col4X + 2, y);
      y += 7;

      // Total box
      pdf.setFont('Arial', 'bold');
      pdf.setFontSize(11);
      pdf.setFillColor(44, 62, 80);
      pdf.setTextColor(255, 255, 255);
      pdf.rect(tX, y, 60, 7, 'F');
      pdf.text('TOTAL:', tX + 2, y + 5);
      const finalDisplay = finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      pdf.text(`Rs. ${finalDisplay}`, col4X + 2, y + 5);

      y += 14;

      // ===== REMARKS =====
      if (po.remarks) {
        pdf.setFontSize(9);
        pdf.setFont('Arial', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Remarks:', m, y);
        y += 5;
        pdf.setFont('Arial', 'normal');
        pdf.setFontSize(8);
        pdf.text(po.remarks.substring(0, 100), m, y);
      }

      // ===== FOOTER =====
      pdf.setFontSize(8);
      pdf.setFont('Arial', 'normal');
      pdf.setTextColor(102, 102, 102);
      pdf.text('This is a system-generated Purchase Order. No signature required.', 105, 278, { align: 'center' });
      pdf.text(`Status: ${po.status}`, 105, 283, { align: 'center' });

      pdf.save(`PO-${poNumber}.pdf`);
      toast({ title: 'Success', description: `PDF exported for ${poNumber}` });
    } catch (error: any) {
      console.error('PDF export error:', error?.message || error);
      toast({ title: 'Error', description: error?.message || 'Failed to export PDF', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6" ref={topRef}>
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Generate Purchase Orders</h2>
        <p className="text-muted-foreground">Auto-generate POs for sites with approved SOFT-AT and PHY-AT status.</p>
      </div>

      {availableSites.length === 0 && allPOs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">No sites available with approved SOFT-AT and PHY-AT status.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {availableSites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Available Sites for PO Generation</CardTitle>
                <CardDescription>Choose one or more sites to generate purchase orders ({availableSites.length} available)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {availableSites.map((site) => {
                    const vendor = vendors.find(v => v.id === site.vendorId);
                    const isDisabled = !site.vendorAmount;
                    return (
                      <div
                        key={site.id}
                        className={`flex items-center gap-3 p-3 border rounded-lg ${
                          isDisabled 
                            ? "opacity-50 cursor-not-allowed bg-gray-50" 
                            : "hover:bg-muted/50 cursor-pointer"
                        }`}
                        onClick={() => !isDisabled && handleSiteSelection(site.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSites.has(site.id)}
                          onChange={() => !isDisabled && handleSiteSelection(site.id)}
                          disabled={isDisabled}
                          className="w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex-1">
                          <p className="font-semibold font-mono">{truncateId(site.planId)}</p>
                          <p className="text-sm text-muted-foreground">
                            Vendor: {vendor?.name} | Max Antenna: {Math.max(parseFloat(site.siteAAntDia) || 0, parseFloat(site.siteBAntDia) || 0)} | Amount: {site.vendorAmount ? `₹${site.vendorAmount}` : "Not Set"}
                          </p>
                          {isDisabled && <p className="text-xs text-red-600 mt-1">⚠ Vendor Amount is required</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
                  applyGstToAll 
                    ? 'bg-green-50 border border-green-300' 
                    : 'bg-gray-50 border border-gray-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={applyGstToAll}
                    onChange={(e) => setApplyGstToAll(e.target.checked)}
                    className="w-5 h-5 cursor-pointer"
                    data-testid="checkbox-apply-gst-all"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">Apply GST to All POs</p>
                    <p className="text-xs text-gray-600">GST will be auto-determined based on vendor state (IGST for interstate, CGST+SGST for intrastate)</p>
                    <p className={`text-sm font-bold mt-2 ${applyGstToAll ? 'text-green-700' : 'text-gray-600'}`}>
                      Status: {applyGstToAll ? '✓ GST ENABLED' : '✗ GST DISABLED'}
                    </p>
                  </div>
                </div>

                <Button onClick={generatePOs} className="mt-4 w-full" disabled={selectedSites.size === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate POs ({selectedSites.size} selected)
                </Button>
              </CardContent>
            </Card>
          )}

          {poRecords.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-700">✓ Just Generated Purchase Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2">PO Number</th>
                        <th className="text-left py-2">Plan ID</th>
                        <th className="text-left py-2">Vendor</th>
                        <th className="text-center py-2">Max Antenna Size</th>
                        <th className="text-right py-2">Amount</th>
                        <th className="text-center py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poRecords.map((po) => (
                        <tr key={po.poNumber} className="border-b hover:bg-green-100">
                          <td className="py-2 font-semibold">{po.poNumber}</td>
                          <td className="py-2 font-mono text-sm">{truncateId(po.planId)}</td>
                          <td className="py-2">{po.vendorName}</td>
                          <td className="text-center py-2">{po.maxAntennaSize || "-"}</td>
                          <td className="text-right py-2">₹{po.unitPrice}</td>
                          <td className="text-center py-2">
                            <a href={`/vendor/po/print/${po.id}`} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="gap-1">
                                <Printer className="h-3 w-3" /> Print
                              </Button>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {allPOs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>All Generated Purchase Orders</CardTitle>
                <CardDescription>Complete list of all purchase orders ({allPOs.length} total)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {allPOs.map((po) => (
                    <div
                      key={po.id}
                      className="border rounded-lg p-4 hover:shadow-md hover:border-primary/50 transition-all"
                    >
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PO Number</p>
                          <p className="text-base font-bold text-blue-600">{po.poNumber}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Site ID</p>
                            <p className="text-xs text-gray-700 truncate font-mono">{po.siteId}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Site Name</p>
                            <p className="text-sm font-semibold">{po.siteName}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Vendor</p>
                            <p className="text-sm font-semibold">{po.vendorName}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Plan ID</p>
                            <p className="text-sm text-gray-700 truncate font-mono">{po.planId}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Max Antenna</p>
                            <p className="text-sm font-bold text-blue-600">{po.maxAntennaSize || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Amount</p>
                            <p className="text-sm font-bold text-green-600">₹{po.unitPrice}</p>
                          </div>
                        </div>

                        <div className="pt-2 border-t space-y-2">
                          <a href={`/vendor/po/print/${po.id}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="w-full gap-1">
                              <Printer className="h-3 w-3" /> Print PO
                            </Button>
                          </a>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                            onClick={() => exportPOToPDF(po.id, po.poNumber)}
                            data-testid={`button-export-pdf-${po.id}`}
                          >
                            <FileText className="h-3 w-3" /> Export PDF
                          </Button>
                          {(!poInvoices[po.id] || poInvoices[po.id].length === 0) && (
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="w-full gap-1"
                              onClick={() => deletePO(po.id, po.poNumber)}
                            >
                              <Trash2 className="h-3 w-3" /> Delete PO
                            </Button>
                          )}
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
