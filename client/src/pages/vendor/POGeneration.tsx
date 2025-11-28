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
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const m = 12;
      
      let y = m;

      // COMPANY HEADER
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(exportHeaderSettings.companyName || '[Company Name]', m, y);
      y += 5;

      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.text(exportHeaderSettings.address || '[Street Address]', m, y);
      y += 3;
      pdf.text('[City, ST ZIP]', m, y);
      y += 3;
      pdf.text(`Phone: ${exportHeaderSettings.contactPhone || '(000) 000-0000'}`, m, y);
      y += 3;
      pdf.text(`Fax: (000) 000-0000`, m, y);
      y += 3;
      pdf.text(`Website: ${exportHeaderSettings.website || ''}`, m, y);

      // PO TITLE (Right side)
      pdf.setFontSize(24);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(70, 130, 180);
      pdf.text('PURCHASE ORDER', pw - m - 50, m + 3);

      // DATE and PO# boxes
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(0, 0, 0);
      const rx = pw - m - 55;

      pdf.text('DATE', rx, m + 18);
      pdf.rect(rx, m + 19, 45, 4);
      pdf.text(String(po.poDate || ''), rx + 2, m + 22);

      pdf.text('PO #', rx, m + 25);
      pdf.rect(rx, m + 26, 45, 4);
      pdf.text(String(po.poNumber || ''), rx + 2, m + 29);

      y = m + 38;

      // VENDOR & SHIP TO
      const halfW = (pw - 2 * m - 2) / 2;

      pdf.setFillColor(41, 59, 89);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(9);
      
      pdf.rect(m, y, halfW, 5, 'F');
      pdf.text('VENDOR', m + 2, y + 3.5);
      
      pdf.rect(m + halfW + 2, y, halfW, 5, 'F');
      pdf.text('SHIP TO', m + halfW + 4, y + 3.5);

      y += 6;

      // Vendor info
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);

      const vname = vendor?.name || '[Vendor Name]';
      const vemail = vendor?.email || '';
      const vphone = vendor?.phone || '';

      const startY = y;
      pdf.text(vname, m + 1, y);
      y += 3;
      if (vemail) {
        pdf.text(vemail, m + 1, y);
        y += 3;
      }
      pdf.text('[Street Address]', m + 1, y);
      y += 3;
      pdf.text('[City, ST ZIP]', m + 1, y);
      y += 3;
      pdf.text(`Phone: ${vphone}`, m + 1, y);
      y += 3;
      pdf.text('Fax: (000) 000-0000', m + 1, y);

      // Ship To
      let sy = startY;
      pdf.text(vname, m + halfW + 3, sy);
      sy += 3;
      if (vemail) {
        pdf.text(vemail, m + halfW + 3, sy);
        sy += 3;
      }
      pdf.text('[Street Address]', m + halfW + 3, sy);
      sy += 3;
      pdf.text('[City, ST ZIP]', m + halfW + 3, sy);

      y = startY + 20;

      // REQUISITIONER ROW
      pdf.setFillColor(41, 59, 89);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(8);

      const cw = (pw - 2 * m - 3) / 4;
      let cx = m;

      pdf.rect(cx, y, cw, 4, 'F');
      pdf.text('REQUISITIONER', cx + 1, y + 2.5);
      cx += cw + 1;

      pdf.rect(cx, y, cw, 4, 'F');
      pdf.text('SHIP VIA', cx + 1, y + 2.5);
      cx += cw + 1;

      pdf.rect(cx, y, cw, 4, 'F');
      pdf.text('F.O.B.', cx + 1, y + 2.5);
      cx += cw + 1;

      pdf.rect(cx, y, cw, 4, 'F');
      pdf.text('SHIPPING TERMS', cx + 1, y + 2.5);

      y += 5;

      // Empty row
      cx = m;
      pdf.rect(cx, y, cw, 4);
      cx += cw + 1;
      pdf.rect(cx, y, cw, 4);
      cx += cw + 1;
      pdf.rect(cx, y, cw, 4);
      cx += cw + 1;
      pdf.rect(cx, y, cw, 4);

      y += 6;

      // ITEMS TABLE
      pdf.setFillColor(41, 59, 89);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(8);

      const icw = (pw - 2 * m) / 5;
      let ix = m;

      const hdr = ['ITEM #', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL'];
      for (const h of hdr) {
        pdf.rect(ix, y, icw, 4, 'F');
        pdf.text(h, ix + 1, y + 2.5);
        ix += icw;
      }

      y += 5;

      // Item row
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);

      ix = m;
      pdf.rect(ix, y, icw, 4);
      pdf.text('1', ix + 2, y + 2.5);
      ix += icw;

      pdf.rect(ix, y, icw, 4);
      pdf.text(String(po.description || '').substring(0, 18), ix + 1, y + 2.5);
      ix += icw;

      pdf.rect(ix, y, icw, 4);
      pdf.text(String(po.quantity || ''), ix + 3, y + 2.5);
      ix += icw;

      pdf.rect(ix, y, icw, 4);
      pdf.text(`₹${Number(po.unitPrice || 0).toFixed(2)}`, ix + 1, y + 2.5);
      ix += icw;

      pdf.rect(ix, y, icw, 4);
      const ta = Number(po.totalAmount || 0).toFixed(2);
      pdf.text(`₹${ta}`, ix + 1, y + 2.5);

      y += 5;

      // Empty rows
      for (let i = 0; i < 8; i++) {
        ix = m;
        for (let j = 0; j < 5; j++) {
          pdf.rect(ix, y, icw);
          ix += icw;
        }
        y += 4;
      }

      y += 3;

      // COMMENTS & TOTALS
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(8);
      pdf.text('Comments', m, y);

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(7);
      pdf.rect(m, y + 1, halfW, 15);
      pdf.text('Thank you for your business.', m + 1, y + 3);

      // TOTALS
      const tx = m + halfW + 5;
      pdf.setFontSize(8);

      pdf.text('SUBTOTAL', tx, y + 2);
      pdf.rect(tx + 25, y + 1, 20, 3);
      pdf.text(`₹${ta}`, tx + 26, y + 3);

      pdf.text('TAX', tx, y + 6);
      pdf.rect(tx + 25, y + 5, 20, 3);

      pdf.text('SHIPPING', tx, y + 10);
      pdf.rect(tx + 25, y + 9, 20, 3);

      pdf.text('OTHER', tx, y + 14);
      pdf.rect(tx + 25, y + 13, 20, 3);

      pdf.setFont(undefined, 'bold');
      pdf.setFillColor(41, 128, 185);
      pdf.setTextColor(255, 255, 255);
      pdf.rect(tx, y + 18, 45, 5, 'F');
      pdf.text('TOTAL', tx + 2, y + 20.5);
      pdf.text(`₹${ta}`, tx + 26, y + 20.5);

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
