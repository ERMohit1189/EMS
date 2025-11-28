import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api";
import type { PaymentMaster, Site, Vendor } from "@shared/schema";

export default function PaymentMaster() {
  const topRef = useRef<HTMLDivElement>(null);
  const antennaSelectRef = useRef<HTMLSelectElement>(null);
  const [masters, setMasters] = useState<PaymentMaster[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PaymentMaster | null>(null);
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [newMaster, setNewMaster] = useState({ antennaSize: "", siteAmount: "", vendorAmount: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchMasters();
    fetchSites();
    fetchVendors();
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

  const handleSave = async () => {
    if (!newMaster.antennaSize || !newMaster.siteAmount || !newMaster.vendorAmount || !selectedSite || !selectedPlanId || !selectedVendor) {
      toast({ title: "Error", description: "All fields required", variant: "destructive" });
      return;
    }

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
    }
  };

  const handleEdit = (master: PaymentMaster) => {
    setEditing(master);
    setNewMaster({
      antennaSize: master.antennaSize,
      siteAmount: master.siteAmount.toString(),
      vendorAmount: master.vendorAmount.toString(),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment master?")) return;
    try {
      const response = await fetch(`/api/payment-masters/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed");
      toast({ title: "Success", description: "Deleted successfully" });
      fetchMasters();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6" ref={topRef}>
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Payment Master</h2>
        <p className="text-muted-foreground">Configure site and vendor amounts by antenna size.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter by Site & Vendor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Site</label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full mt-2 px-3 py-2 border rounded-md"
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
            <label className="text-sm font-medium">Plan ID</label>
            <input
              type="text"
              value={selectedPlanId}
              readOnly
              className="w-full mt-2 px-3 py-2 border rounded-md bg-gray-100"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Vendor</label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full mt-2 px-3 py-2 border rounded-md"
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
          <CardTitle>{editing ? "Edit" : "Add New"} Payment Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="text-sm font-medium">Antenna Size (kVA)</label>
            <select
              ref={antennaSelectRef}
              value={newMaster.antennaSize}
              onChange={(e) => setNewMaster({ ...newMaster, antennaSize: e.target.value })}
              className="w-full mt-2 px-3 py-2 border rounded-md"
              disabled={editing !== null}
            >
              <option value="">Select Size</option>
              <option value="0.6">0.6 kVA</option>
              <option value="0.9">0.9 kVA</option>
              <option value="1.2">1.2 kVA</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Site Amount (₹)</label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={newMaster.siteAmount}
              onChange={(e) => setNewMaster({ ...newMaster, siteAmount: e.target.value })}
              className="mt-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Vendor Amount (₹)</label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={newMaster.vendorAmount}
              onChange={(e) => setNewMaster({ ...newMaster, vendorAmount: e.target.value })}
              className="mt-2"
            />
          </div>

          <div className="flex gap-2 items-end">
            <Button onClick={handleSave} className="w-full">
              {editing ? "Update" : "Add"}
            </Button>
            {editing && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setNewMaster({ antennaSize: "", siteAmount: "", vendorAmount: "" });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {masters.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No payment masters configured yet.</p>
            ) : (
              <div className="grid gap-3">
                {masters.map((m) => {
                  const siteData = sites.find(s => s.id === m.siteId);
                  const vendorData = vendors.find(v => v.id === m.vendorId);
                  return (
                    <div key={m.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex-1">
                        <p className="font-semibold">{siteData?.hopAB || 'N/A'} (Plan: {m.planId}) - {vendorData?.name || 'N/A'} - {m.antennaSize} kVA</p>
                        <p className="text-sm text-muted-foreground">
                          Site Amount: ₹{m.siteAmount} | Vendor Amount: ₹{m.vendorAmount}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(m)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(m.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
