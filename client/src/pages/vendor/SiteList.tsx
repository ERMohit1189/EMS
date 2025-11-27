import { useStore } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SiteList() {
  const { vendors } = useStore();
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSite, setExpandedSite] = useState<string | null>(null);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/sites');
        const data = await response.json();
        setSites(data.data || []);
      } catch (error) {
        console.error('Failed to fetch sites:', error);
        setSites([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSites();
  }, []);

  const getVendorName = (vendorId: string) => {
    return vendors.find(v => v.id === vendorId)?.name || "N/A";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Site Management</h2>
            <p className="text-muted-foreground">Manage all registered sites.</p>
          </div>
          <Link href="/vendor/site/register">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Register Site
            </Button>
          </Link>
        </div>
        <div className="p-8 text-center text-muted-foreground">Loading sites...</div>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Site Management</h2>
            <p className="text-muted-foreground">Manage all registered sites.</p>
          </div>
          <Link href="/vendor/site/register">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Register Site
            </Button>
          </Link>
        </div>
        <div className="p-8 text-center text-muted-foreground">No sites found. Register one to get started.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Site Management</h2>
          <p className="text-muted-foreground">Manage all registered sites.</p>
        </div>
        <Link href="/vendor/site/register">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Register Site
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {sites.map((site) => (
          <Card key={site.id} className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
              onClick={() => setExpandedSite(expandedSite === site.id ? null : site.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{site.siteId}</CardTitle>
                  <p className="text-sm text-muted-foreground">{getVendorName(site.vendorId)} • {site.state} • {site.zone}</p>
                </div>
                <Select value={site.status} onValueChange={(status) => console.log('Update to:', status)}>
                  <SelectTrigger className="w-[120px]" onClick={(e) => e.stopPropagation()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            {expandedSite === site.id && (
              <CardContent className="border-t pt-6 pb-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">Site ID</label>
                    <p className="text-sm font-mono mt-1">{site.siteId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">Vendor</label>
                    <p className="text-sm mt-1">{getVendorName(site.vendorId)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">Plan ID</label>
                    <p className="text-sm font-mono mt-1">{site.planId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">Antenna Size</label>
                    <p className="text-sm mt-1">{site.antennaSize}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">Installation Date</label>
                    <p className="text-sm mt-1">{site.incDate}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">State</label>
                    <p className="text-sm mt-1">{site.state}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">Region</label>
                    <p className="text-sm mt-1">{site.region}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">Zone</label>
                    <p className="text-sm mt-1">{site.zone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">Installation Type</label>
                    <p className="text-sm mt-1">{site.inside ? "Inside" : "Outside"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">Form No</label>
                    <p className="text-sm font-mono mt-1">{site.formNo}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">Site Amount</label>
                    <p className="text-sm font-mono mt-1">{site.siteAmount ? `₹${parseFloat(site.siteAmount).toFixed(2)}` : "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">Vendor Amount</label>
                    <p className="text-sm font-mono mt-1">{site.vendorAmount ? `₹${parseFloat(site.vendorAmount).toFixed(2)}` : "—"}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <label className="text-sm font-semibold text-muted-foreground">Software AT Remark</label>
                    <p className="text-sm mt-1">{site.softAtRemark || "—"}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <label className="text-sm font-semibold text-muted-foreground">Physical AT Remark</label>
                    <p className="text-sm mt-1">{site.phyAtRemark || "—"}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <label className="text-sm font-semibold text-muted-foreground">ATP Remark</label>
                    <p className="text-sm mt-1">{site.atpRemark || "—"}</p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
