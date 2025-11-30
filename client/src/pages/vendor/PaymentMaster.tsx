import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import type { PaymentMaster, Site, Vendor } from "@shared/schema";

export default function PaymentMaster() {
  const topRef = useRef<HTMLDivElement>(null);
  const antennaSelectRef = useRef<HTMLSelectElement>(null);
  const siteAmountRef = useRef<HTMLInputElement>(null);
  const [masters, setMasters] = useState<PaymentMaster[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PaymentMaster | null>(null);
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [newMaster, setNewMaster] = useState({ antennaSize: "", siteAmount: "", vendorAmount: "" });
  const [usedCombinations, setUsedCombinations] = useState<string[]>([]);
  const [savingLoading, setSavingLoading] = useState(false);
  const { toast } = useToast();

  const fetchMasters = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/payment-masters`);
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setMasters(result.data || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load payment masters", variant: "destructive" });
    }
  };

  const fetchSites = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/sites?pageSize=10000`);
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setSites(result.data || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load sites", variant: "destructive" });
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/vendors?pageSize=10000`);
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setVendors(result.data || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load vendors", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsedPaymentMasters = async () => {
    try {
      const [posRes, sitesRes] = await Promise.all([
        fetch(`${getApiBaseUrl()}/api/purchase-orders?pageSize=10000`),
        fetch(`${getApiBaseUrl()}/api/sites?pageSize=10000`)
      ]);

      if (!posRes.ok || !sitesRes.ok) return;

      const posData = await posRes.json();
      const sitesData = await sitesRes.json();

      const pos = posData.data || [];
      const allSites = sitesData.data || [];

      const siteMap = new Map(allSites.map((s: any) => [s.id, s]));

      const used: string[] = [];
      pos.forEach((po: any) => {
        const site = siteMap.get(po.siteId);
        if (po.vendorId && po.siteId && site?.planId && site?.maxAntSize) {
          // PO uses vendor+site+planId+maxAntSize combination
          used.push(`${po.vendorId}_${po.siteId}_${site.planId}_${site.maxAntSize}`);
        }
      });
      setUsedCombinations(used);
    } catch (error) {
      // Silently fail
    }
  };

  useEffect(() => {
    fetchMasters();
    fetchSites();
    fetchVendors();
    fetchUsedPaymentMasters();
  }, []);

  useEffect(() => {
    // Focus first control on page load
    if (!loading) {
      setTimeout(() => antennaSelectRef.current?.focus(), 100);
    }
  }, [loading]);

  useEffect(() => {
    // Auto-select vendor and planId when site is selected
    if (selectedSite) {
      const site = sites.find((s) => s.id === selectedSite);
      if (site) {
        setSelectedVendor(site.vendorId);
        setSelectedPlanId(site.planId || "");
      }
    }
  }, [selectedSite, sites]);

  const handleSave = async () => {
    if (!newMaster.antennaSize || !newMaster.siteAmount || !newMaster.vendorAmount || !selectedSite || !selectedPlanId || !selectedVendor) {
      toast({ title: "Error", description: "All fields required", variant: "destructive" });
      return;
    }

    setSavingLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const url = editing ? `${baseUrl}/api/payment-masters/${editing.id}` : `${baseUrl}/api/payment-masters`;
      const method = editing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: selectedSite,
          planId: selectedPlanId,
          vendorId: selectedVendor,
          antennaSize: newMaster.antennaSize,
          siteAmount: newMaster.siteAmount,
          vendorAmount: newMaster.vendorAmount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save");
      }

      toast({
        title: "Success",
        description: editing ? "Updated successfully" : "Created successfully",
      });

      setNewMaster({ antennaSize: "", siteAmount: "", vendorAmount: "" });
      setEditing(null);
      fetchMasters();

      // Scroll to top and focus first control
      topRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => antennaSelectRef.current?.focus(), 300);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save";
      toast({ title: "Alert", description: errorMessage, variant: "destructive" });
    } finally {
      setSavingLoading(false);
    }
  };

  const handleEdit = (master: PaymentMaster) => {
    setEditing(master);
    setSelectedSite(master.siteId);
    setSelectedPlanId(master.planId);
    setSelectedVendor(master.vendorId);
    setNewMaster({
      antennaSize: master.antennaSize,
      siteAmount: master.siteAmount.toString(),
      vendorAmount: master.vendorAmount.toString(),
    });
    // Focus on site amount field after edit
    setTimeout(() => siteAmountRef.current?.focus(), 0);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment master?")) return;
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/payment-masters/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete");
      }
      toast({ title: "Success", description: "Deleted successfully" });
      fetchMasters();
      fetchUsedPaymentMasters();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  };

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0" ref={topRef}>
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Payment Master</h2>
        <p className="text-xs md:text-sm text-muted-foreground">Configure site and vendor amounts by antenna size.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Filter by Site & Vendor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs md:text-sm font-medium">Site</label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full mt-2 h-9 px-3 py-2 text-xs md:text-sm border rounded-md"
            >
              <option value="">Select Site</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.hopAB || s.siteId} ({s.planId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium">Plan ID</label>
            <input
              type="text"
              value={selectedPlanId}
              readOnly
              className="w-full mt-2 h-9 px-3 py-2 text-xs md:text-sm border rounded-md bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium">Vendor</label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full mt-2 h-9 px-3 py-2 text-xs md:text-sm border rounded-md"
              disabled={!!selectedSite}
            >
              <option value="">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">{editing ? "Edit" : "Add New"} Payment Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:gap-4 md:grid-cols-4">
          <div>
            <label className="block text-xs md:text-sm font-medium">Antenna Size (kVA)</label>
            <select
              ref={antennaSelectRef}
              value={newMaster.antennaSize}
              onChange={(e) => setNewMaster({ ...newMaster, antennaSize: e.target.value })}
              className="w-full mt-2 h-9 px-3 py-2 text-xs md:text-sm border rounded-md"
              disabled={editing !== null}
            >
              <option value="">Select Size</option>
              <option value="0.6">0.6 kVA</option>
              <option value="0.9">0.9 kVA</option>
              <option value="1.2">1.2 kVA</option>
            </select>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium">Site Amount (₹)</label>
            <Input
              ref={siteAmountRef}
              type="number"
              placeholder="Enter amount"
              value={newMaster.siteAmount}
              onChange={(e) => setNewMaster({ ...newMaster, siteAmount: e.target.value })}
              className="mt-2 h-9 text-xs md:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium">Vendor Amount (₹)</label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={newMaster.vendorAmount}
              onChange={(e) => setNewMaster({ ...newMaster, vendorAmount: e.target.value })}
              className="mt-2 h-9 text-xs md:text-sm"
            />
          </div>

          <div className="flex gap-2 items-end">
            <Button onClick={handleSave} className="w-full h-9 text-xs md:text-sm" disabled={savingLoading}>
              {savingLoading && <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-2 animate-spin" />}
              {editing ? "Update" : "Add"}
            </Button>
            {editing && (
              <Button
                variant="outline"
                className="h-9 text-xs md:text-sm"
                onClick={() => {
                  setEditing(null);
                  setNewMaster({ antennaSize: "", siteAmount: "", vendorAmount: "" });
                }}
                disabled={savingLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Current Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          {masters.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">No payment masters configured yet.</p>
          ) : (
            <div className="grid gap-2 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {masters.map((m) => {
                const siteData = sites.find(s => s.id === m.siteId);
                const vendorData = vendors.find(v => v.id === m.vendorId);
                const isUsed = usedCombinations.includes(`${m.vendorId}_${m.siteId}_${m.planId}_${m.antennaSize}`);
                return (
                  <div key={m.id} className="border rounded-lg p-3 md:p-4 hover:bg-muted/50 transition-colors">
                    <div className="space-y-2">
                      <div className="min-h-0 pr-2">
                        <p className="font-semibold text-xs md:text-sm truncate">{siteData?.hopAB || 'N/A'} (Plan: {m.planId})</p>
                        <p className="text-xs text-muted-foreground truncate">{vendorData?.name || 'N/A'} - {m.antennaSize} kVA</p>
                      </div>
                      <div className="bg-muted/30 p-2 rounded text-xs md:text-sm">
                        <p className="text-muted-foreground">
                          <span className="block">Site: ₹{m.siteAmount}</span>
                          <span className="block">Vendor: ₹{m.vendorAmount}</span>
                        </p>
                      </div>
                      <div className="flex gap-1 pt-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEdit(m)}
                          className="flex-1 h-8 text-xs"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleDelete(m.id)}
                          disabled={isUsed}
                          title={isUsed ? "Cannot delete - used in PO generation" : "Delete payment master"}
                          className="flex-1 h-8 text-xs"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
