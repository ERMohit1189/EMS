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
        };
      });

      // Create POs via API
      const createdPOs = [];
      for (const record of records) {
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
            totalAmount: (record.quantity * parseFloat(record.unitPrice)).toString(),
            poDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: "Draft",
          }),
        });

        if (response.ok) {
          const createdPO = await response.json();
          createdPOs.push({ ...record, id: createdPO.id });
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
      
      const vendorRes = await fetch(`${baseUrl}/api/vendors/${po.vendorId}`);
      const vendor = vendorRes.ok ? await vendorRes.json() : null;

      const headerRes = await fetch(`${baseUrl}/api/export-headers`);
      const exportHeaderSettings = headerRes.ok ? await headerRes.json() : {};

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = margin;

      // ========== HEADER SECTION ==========
      // Left: Company Info
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(exportHeaderSettings.companyName || '[Company Name]', margin, yPos);
      yPos += 6;

      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      pdf.text(exportHeaderSettings.address || '[Street Address]', margin, yPos);
      yPos += 4;
      pdf.text('[City, ST ZIP]', margin, yPos);
      yPos += 4;
      pdf.text(`Phone: ${exportHeaderSettings.contactPhone || '(000) 000-0000'}`, margin, yPos);
      yPos += 4;
      pdf.text(`Fax: ${exportHeaderSettings.contactPhone ? '(000) 000-0000' : ''}`.trim(), margin, yPos);
      yPos += 4;
      pdf.text(`Website: ${exportHeaderSettings.website || ''}`.trim(), margin, yPos);

      // Right: PO Title and Info
      pdf.setFontSize(28);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(70, 130, 180);
      pdf.text('PURCHASE ORDER', pageWidth - margin - 70, margin + 5);

      // Date and PO boxes on right
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(0, 0, 0);
      const rightBoxX = pageWidth - margin - 65;

      pdf.text('DATE', rightBoxX, margin + 20);
      pdf.rect(rightBoxX, margin + 21, 50, 5);
      pdf.setFontSize(9);
      pdf.text(String(po.poDate || ''), rightBoxX + 2, margin + 24);

      pdf.setFontSize(9);
      pdf.text('PO #', rightBoxX, margin + 30);
      pdf.rect(rightBoxX, margin + 31, 50, 5);
      pdf.text(String(po.poNumber || ''), rightBoxX + 2, margin + 34);

      yPos = margin + 42;

      // ========== VENDOR & SHIP TO SECTION ==========
      const sectionWidth = (pageWidth - 2 * margin - 2) / 2;

      // Vendor header
      pdf.setFillColor(41, 59, 89);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(10);
      pdf.rect(margin, yPos, sectionWidth, 6, 'F');
      pdf.text('VENDOR', margin + 3, yPos + 4);

      // Ship To header
      pdf.rect(margin + sectionWidth + 2, yPos, sectionWidth, 6, 'F');
      pdf.text('SHIP TO', margin + sectionWidth + 5, yPos + 4);

      yPos += 8;

      // Vendor details
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9);

      const vendorName = vendor?.name || '[Company Name]';
      const vendorEmail = vendor?.email || '[Contact or Department]';
      const vendorAddress = vendor?.address || '[Street Address]';
      const vendorPhone = vendor?.phone || '(000) 000-0000';

      pdf.text(vendorName, margin + 2, yPos);
      yPos += 4;
      pdf.text(vendorEmail, margin + 2, yPos);
      yPos += 4;
      pdf.text(vendorAddress, margin + 2, yPos);
      yPos += 4;
      pdf.text('[City, ST ZIP]', margin + 2, yPos);
      yPos += 4;
      pdf.text(`Phone: ${vendorPhone}`, margin + 2, yPos);
      yPos += 4;
      pdf.text('Fax: (000) 000-0000', margin + 2, yPos);

      // Ship To (same as vendor)
      let shipY = margin + 50;
      pdf.text(vendorName, margin + sectionWidth + 5, shipY);
      shipY += 4;
      pdf.text(vendorEmail, margin + sectionWidth + 5, shipY);
      shipY += 4;
      pdf.text(vendorAddress, margin + sectionWidth + 5, shipY);
      shipY += 4;
      pdf.text('[City, ST ZIP]', margin + sectionWidth + 5, shipY);
      shipY += 4;
      pdf.text(`Phone: ${vendorPhone}`, margin + sectionWidth + 5, shipY);

      yPos = margin + 80;

      // ========== REQUISITIONER / SHIP VIA / F.O.B. / SHIPPING TERMS ==========
      pdf.setFillColor(41, 59, 89);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(9);

      const colW = (pageWidth - 2 * margin - 3) / 4;
      let colX = margin;

      // Headers
      pdf.rect(colX, yPos, colW, 5, 'F');
      pdf.text('REQUISITIONER', colX + 1, yPos + 3.5);
      colX += colW + 1;

      pdf.rect(colX, yPos, colW, 5, 'F');
      pdf.text('SHIP VIA', colX + 1, yPos + 3.5);
      colX += colW + 1;

      pdf.rect(colX, yPos, colW, 5, 'F');
      pdf.text('F.O.B.', colX + 1, yPos + 3.5);
      colX += colW + 1;

      pdf.rect(colX, yPos, colW, 5, 'F');
      pdf.text('SHIPPING TERMS', colX + 1, yPos + 3.5);

      yPos += 6;

      // Empty boxes for details
      colX = margin;
      pdf.rect(colX, yPos, colW, 5);
      colX += colW + 1;
      pdf.rect(colX, yPos, colW, 5);
      colX += colW + 1;
      pdf.rect(colX, yPos, colW, 5);
      colX += colW + 1;
      pdf.rect(colX, yPos, colW, 5);

      yPos += 8;

      // ========== ITEMS TABLE ==========
      pdf.setFillColor(41, 59, 89);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(9);

      const itemColW = (pageWidth - 2 * margin) / 5;
      let itemX = margin;

      // Table headers
      const headers = ['ITEM #', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL'];
      for (const header of headers) {
        pdf.rect(itemX, yPos, itemColW, 5, 'F');
        pdf.text(header, itemX + 1, yPos + 3.5);
        itemX += itemColW;
      }

      yPos += 6;

      // Item row
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9);

      itemX = margin;
      pdf.rect(itemX, yPos, itemColW, 5);
      pdf.text('1', itemX + 2, yPos + 3.5);
      itemX += itemColW;

      pdf.rect(itemX, yPos, itemColW, 5);
      pdf.text(String(po.description || '').substring(0, 20), itemX + 1, yPos + 3.5);
      itemX += itemColW;

      pdf.rect(itemX, yPos, itemColW, 5);
      pdf.text(String(po.quantity || ''), itemX + 3, yPos + 3.5);
      itemX += itemColW;

      pdf.rect(itemX, yPos, itemColW, 5);
      pdf.text(`₹${Number(po.unitPrice || 0).toFixed(2)}`, itemX + 1, yPos + 3.5);
      itemX += itemColW;

      pdf.rect(itemX, yPos, itemColW, 5);
      const totalAmount = Number(po.totalAmount || 0).toFixed(2);
      pdf.text(`₹${totalAmount}`, itemX + 1, yPos + 3.5);

      yPos += 6;

      // Empty rows
      for (let i = 0; i < 8; i++) {
        itemX = margin;
        for (let j = 0; j < 5; j++) {
          pdf.rect(itemX, yPos, itemColW);
          itemX += itemColW;
        }
        yPos += 5;
      }

      // ========== COMMENTS AND TOTALS ==========
      yPos += 2;

      // Comments box on left
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(9);
      pdf.text('Comments or Special Instructions', margin, yPos);
      yPos += 4;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);
      pdf.rect(margin, yPos, (pageWidth - 2 * margin - 2) / 2, 20);
      pdf.text('Thank you for your business.', margin + 2, yPos + 3);

      // Totals on right
      const totalsX = margin + (pageWidth - 2 * margin - 2) / 2 + 5;
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9);

      let totalsY = yPos + 2;

      pdf.text('SUBTOTAL', totalsX + 5, totalsY);
      pdf.rect(totalsX + 30, totalsY - 1, 25, 4);
      pdf.text(`₹${totalAmount}`, totalsX + 32, totalsY + 2);

      totalsY += 6;
      pdf.text('TAX', totalsX + 5, totalsY);
      pdf.rect(totalsX + 30, totalsY - 1, 25, 4);

      totalsY += 6;
      pdf.text('SHIPPING', totalsX + 5, totalsY);
      pdf.rect(totalsX + 30, totalsY - 1, 25, 4);

      totalsY += 6;
      pdf.text('OTHER', totalsX + 5, totalsY);
      pdf.rect(totalsX + 30, totalsY - 1, 25, 4);

      totalsY += 6;
      pdf.setFont(undefined, 'bold');
      pdf.setFillColor(41, 128, 185);
      pdf.setTextColor(255, 255, 255);
      pdf.rect(totalsX + 5, totalsY, 50, 5, 'F');
      pdf.text('TOTAL', totalsX + 7, totalsY + 3.5);
      pdf.text(`₹${totalAmount}`, totalsX + 32, totalsY + 3.5);

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
