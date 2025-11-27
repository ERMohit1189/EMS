import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, Eye, Printer } from "lucide-react";
import type { Site, Vendor } from "@shared/schema";

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
  const { toast } = useToast();

  useEffect(() => {
    fetchApprovedSites();
    fetchVendors();
    fetchAllPOs();
  }, []);

  const fetchApprovedSites = async () => {
    try {
      const response = await fetch("/api/sites/for-po-generation");
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setApprovedSites(result.data || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load approved sites", variant: "destructive" });
    }
  };

  const fetchAllPOs = async () => {
    try {
      const response = await fetch("/api/purchase-orders?pageSize=10000");
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      const pos = result.data || [];
      
      // Convert POs to PORecord format
      const poRecords: PORecord[] = [];
      for (const po of pos) {
        const vendor = vendors.find(v => v.id === po.vendorId);
        const site = approvedSites.find(s => s.id === po.siteId);
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
        });
      }
      setAllPOs(poRecords);
      
      // Filter out sites that already have POs
      const sitesWithPOs = new Set(pos.map((po: any) => po.siteId));
      const filtered = approvedSites.filter(site => !sitesWithPOs.has(site.id));
      setAvailableSites(filtered);
    } catch (error) {
      console.log("Note: Some POs may not load - this is normal on first load");
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch("/api/vendors?pageSize=10000");
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setVendors(result.data || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load vendors", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
        return {
          siteId: site.id,
          vendorId: site.vendorId,
          siteName: site.hopAB || site.siteId,
          vendorName: vendor?.name || "Unknown",
          planId: site.planId,
          poNumber: `PO-${Date.now()}-${index + 1}`,
          description: `Installation and commissioning for ${site.hopAB || site.siteId}`,
          quantity: 1,
          unitPrice: site.siteAmount?.toString() || "0",
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
                    return (
                      <div
                        key={site.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleSiteSelection(site.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSites.has(site.id)}
                          onChange={() => handleSiteSelection(site.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="font-semibold">{site.hopAB || site.siteId}</p>
                          <p className="text-sm text-muted-foreground">
                            Plan: {site.planId} | Vendor: {vendor?.name} | Amount: ₹{site.siteAmount}
                          </p>
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
                        <th className="text-left py-2">Site</th>
                        <th className="text-left py-2">Vendor</th>
                        <th className="text-left py-2">Plan ID</th>
                        <th className="text-right py-2">Amount</th>
                        <th className="text-center py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poRecords.map((po) => (
                        <tr key={po.poNumber} className="border-b hover:bg-green-100">
                          <td className="py-2 font-semibold">{po.poNumber}</td>
                          <td className="py-2">{po.siteName}</td>
                          <td className="py-2">{po.vendorName}</td>
                          <td className="py-2">{po.planId}</td>
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2">PO Number</th>
                        <th className="text-left py-2">Site</th>
                        <th className="text-left py-2">Vendor</th>
                        <th className="text-left py-2">Plan ID</th>
                        <th className="text-right py-2">Amount</th>
                        <th className="text-center py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPOs.map((po) => (
                        <tr key={po.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 font-semibold">{po.poNumber}</td>
                          <td className="py-2">{po.siteName}</td>
                          <td className="py-2">{po.vendorName}</td>
                          <td className="py-2">{po.planId}</td>
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
        </>
      )}
    </div>
  );
}
