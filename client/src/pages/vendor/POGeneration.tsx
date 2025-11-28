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
      
      const siteRes = await fetch(`${baseUrl}/api/sites/${po.siteId}`);
      const site = siteRes.ok ? await siteRes.json() : null;
      
      const vendorRes = await fetch(`${baseUrl}/api/vendors/${po.vendorId}`);
      const vendor = vendorRes.ok ? await vendorRes.json() : null;

      const headerRes = await fetch(`${baseUrl}/api/export-headers`);
      const exportHeaderSettings = headerRes.ok ? await headerRes.json() : {};

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const colWidth = (pageWidth - 2 * margin) / 2;

      let yPosition = margin;

      // LEFT COLUMN: Company Info
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.text(exportHeaderSettings.companyName || '[Company Name]', margin, yPosition);
      yPosition += 5;

      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      const companyLines = [
        exportHeaderSettings.address || '[Street Address]',
        exportHeaderSettings.address ? '[City, ST ZIP]' : '',
        exportHeaderSettings.contactPhone ? `Phone: ${exportHeaderSettings.contactPhone}` : 'Phone: (000) 000-0000',
        exportHeaderSettings.contactPhone ? 'Fax: (000) 000-0000' : '',
        exportHeaderSettings.website ? `Website: ${exportHeaderSettings.website}` : 'Website:',
      ].filter(Boolean);

      companyLines.forEach(line => {
        pdf.text(line, margin, yPosition);
        yPosition += 3;
      });

      // RIGHT COLUMN: PO Title and Date
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(41, 128, 185);
      pdf.text('PURCHASE ORDER', margin + colWidth + 15, margin + 5);

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      
      const dateX = margin + colWidth + 20;
      pdf.text('DATE', dateX, margin + 15);
      pdf.rect(dateX, margin + 16, 35, 4);
      pdf.text(po.poDate || '', dateX + 2, margin + 19);
      
      pdf.text('PO #', dateX, margin + 22);
      pdf.rect(dateX, margin + 23, 35, 4);
      pdf.text(po.poNumber, dateX + 2, margin + 26);

      yPosition = margin + 35;

      // VENDOR and SHIP TO sections
      const leftX = margin;
      const rightX = margin + colWidth + 5;

      // VENDOR header
      pdf.setFillColor(41, 59, 89);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(9);
      pdf.rect(leftX, yPosition, colWidth - 3, 4, 'F');
      pdf.text('VENDOR', leftX + 2, yPosition + 3);

      // SHIP TO header
      pdf.rect(rightX, yPosition, colWidth - 3, 4, 'F');
      pdf.text('SHIP TO', rightX + 2, yPosition + 3);

      yPosition += 5;

      // Vendor details
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);
      const vendorLines = [
        vendor?.name || '[Company Name]',
        vendor?.email || '[Contact or Department]',
        vendor?.address || '[Street Address]',
        '[City, ST ZIP]',
        vendor?.phone ? `Phone: ${vendor.phone}` : 'Phone: (000) 000-0000',
        vendor?.phone ? 'Fax: (000) 000-0000' : '',
      ].filter(Boolean);

      vendorLines.forEach(line => {
        pdf.text(line, leftX, yPosition);
        yPosition += 3;
      });

      // Ship To (same as vendor for now)
      let shipY = margin + 39;
      vendorLines.forEach(line => {
        pdf.text(line, rightX, shipY);
        shipY += 3;
      });

      yPosition = Math.max(yPosition, shipY) + 3;

      // REQUISITIONER, SHIP VIA, F.O.B., SHIPPING TERMS row
      pdf.setFillColor(41, 59, 89);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(8);
      
      const colWidths = [(pageWidth - 2 * margin) / 4, (pageWidth - 2 * margin) / 4, (pageWidth - 2 * margin) / 4, (pageWidth - 2 * margin) / 4];
      let xPos = margin;
      
      pdf.rect(xPos, yPosition, colWidths[0], 4, 'F');
      pdf.text('REQUISITIONER', xPos + 2, yPosition + 3);
      xPos += colWidths[0];
      
      pdf.rect(xPos, yPosition, colWidths[1], 4, 'F');
      pdf.text('SHIP VIA', xPos + 2, yPosition + 3);
      xPos += colWidths[1];
      
      pdf.rect(xPos, yPosition, colWidths[2], 4, 'F');
      pdf.text('F.O.B.', xPos + 2, yPosition + 3);
      xPos += colWidths[2];
      
      pdf.rect(xPos, yPosition, colWidths[3], 4, 'F');
      pdf.text('SHIPPING TERMS', xPos + 2, yPosition + 3);

      yPosition += 4;
      
      // Empty row for requisitioner details
      xPos = margin;
      for (let i = 0; i < 4; i++) {
        pdf.rect(xPos, yPosition, colWidths[i], 4);
        xPos += colWidths[i];
      }

      yPosition += 5;

      // ITEMS TABLE
      pdf.setFillColor(41, 59, 89);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(8);

      const itemColWidths = [20, (pageWidth - 2 * margin - 20 - 20 - 25) / 2, 20, 25];
      let itemX = margin;
      
      pdf.rect(itemX, yPosition, itemColWidths[0], 4, 'F');
      pdf.text('ITEM #', itemX + 1, yPosition + 3);
      itemX += itemColWidths[0];
      
      pdf.rect(itemX, yPosition, itemColWidths[1], 4, 'F');
      pdf.text('DESCRIPTION', itemX + 1, yPosition + 3);
      itemX += itemColWidths[1];
      
      pdf.rect(itemX, yPosition, itemColWidths[2], 4, 'F');
      pdf.text('QTY', itemX + 5, yPosition + 3);
      itemX += itemColWidths[2];
      
      pdf.rect(itemX, yPosition, itemColWidths[3], 4, 'F');
      pdf.text('UNIT PRICE', itemX + 2, yPosition + 3);

      yPosition += 4;

      // Item rows
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);

      itemX = margin;
      pdf.rect(itemX, yPosition, itemColWidths[0], 4);
      pdf.text('1', itemX + 2, yPosition + 3);
      itemX += itemColWidths[0];
      
      pdf.rect(itemX, yPosition, itemColWidths[1], 4);
      pdf.text(po.description.substring(0, 30), itemX + 1, yPosition + 3);
      itemX += itemColWidths[1];
      
      pdf.rect(itemX, yPosition, itemColWidths[2], 4);
      pdf.text(String(po.quantity), itemX + 8, yPosition + 3);
      itemX += itemColWidths[2];
      
      pdf.rect(itemX, yPosition, itemColWidths[3], 4);
      pdf.text(`₹${Number(po.unitPrice).toFixed(2)}`, itemX + 2, yPosition + 3);

      yPosition += 4;

      // Empty rows for additional items
      for (let i = 0; i < 5; i++) {
        itemX = margin;
        for (let j = 0; j < 4; j++) {
          pdf.rect(itemX, yPosition, itemColWidths[j]);
          itemX += itemColWidths[j];
        }
        yPosition += 4;
      }

      yPosition += 2;

      // Comments and Totals
      const commentX = margin;
      const totalX = margin + colWidth + 10;

      // Comments section
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(8);
      pdf.text('Comments or Special Instructions', commentX, yPosition);
      yPosition += 1;
      
      pdf.rect(commentX, yPosition, colWidth - 5, 25);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(7);
      pdf.text('Thank you for your business.', commentX + 2, yPosition + 3);

      // Totals on right
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);
      const totalAmount = Number(po.totalAmount);

      let totalsY = yPosition + 2;
      
      pdf.text('SUBTOTAL', totalX + 20, totalsY);
      pdf.rect(totalX + 50, totalsY - 1, 25, 3);
      pdf.text(`₹${totalAmount.toFixed(2)}`, totalX + 51, totalsY + 1);

      totalsY += 5;
      pdf.text('TAX', totalX + 20, totalsY);
      pdf.rect(totalX + 50, totalsY - 1, 25, 3);

      totalsY += 5;
      pdf.text('SHIPPING', totalX + 20, totalsY);
      pdf.rect(totalX + 50, totalsY - 1, 25, 3);

      totalsY += 5;
      pdf.text('OTHER', totalX + 20, totalsY);
      pdf.rect(totalX + 50, totalsY - 1, 25, 3);

      totalsY += 5;
      pdf.setFont(undefined, 'bold');
      pdf.setFillColor(41, 128, 185);
      pdf.setTextColor(255, 255, 255);
      pdf.rect(totalX + 20, totalsY, 55, 5, 'F');
      pdf.text('TOTAL', totalX + 23, totalsY + 3.5);
      pdf.text(`₹${totalAmount.toFixed(2)}`, totalX + 51, totalsY + 3.5);

      pdf.save(`PO-${poNumber}-${new Date().getTime()}.pdf`);
      toast({ title: 'Success', description: `PDF exported for ${poNumber}` });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ title: 'Error', description: 'Failed to export PDF', variant: 'destructive' });
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
