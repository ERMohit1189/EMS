import { useStore } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";
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
              className="cursor-pointer hover:bg-muted/50 transition-colors py-4"
              onClick={() => setExpandedSite(expandedSite === site.id ? null : site.id)}
            >
              <div className="space-y-3">
                <div>
                  <CardTitle className="text-lg">{site.siteId}</CardTitle>
                  <p className="text-sm text-muted-foreground">{getVendorName(site.vendorId)} • {site.state} • {site.zone}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Plan ID</label>
                    <p className="text-sm font-mono font-semibold mt-0.5 truncate" title={site.planId || undefined}>{site.planId || "—"}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Antenna Size</label>
                    <p className="text-sm font-semibold mt-0.5">{site.maxAntSize || "—"}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Soft AT</label>
                    <p className="text-sm font-semibold mt-0.5">
                      <span className={site.softAtStatus === "Approved" ? "text-green-600" : site.softAtStatus === "Pending" ? "text-amber-600" : "text-red-600"}>
                        {site.softAtStatus || "—"}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Physical AT</label>
                    <p className="text-sm font-semibold mt-0.5">
                      <span className={site.phyAtStatus === "Approved" ? "text-green-600" : site.phyAtStatus === "Pending" ? "text-amber-600" : "text-red-600"}>
                        {site.phyAtStatus || "—"}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Site Amount</label>
                    <p className="text-sm font-semibold mt-0.5">{site.siteAmount ? `₹${Number(site.siteAmount).toFixed(2)}` : "—"}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Vendor Amount</label>
                    <p className="text-sm font-semibold mt-0.5">{site.vendorAmount ? `₹${Number(site.vendorAmount).toFixed(2)}` : "—"}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Zone</label>
                    <p className="text-sm font-semibold mt-0.5">{site.circle || "—"}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">HOP Type</label>
                    <p className="text-sm font-semibold mt-0.5">{site.hopType || "—"}</p>
                  </div>
                </div>
              </div>
            </CardHeader>

            {expandedSite === site.id && (
              <CardContent className="border-t pt-6 pb-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="font-semibold text-sm mb-4 text-foreground">Basic Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">Site ID</label>
                      <p className="text-sm font-mono font-semibold mt-1 break-all">{site.siteId}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">Vendor</label>
                      <p className="text-sm font-semibold mt-1">{getVendorName(site.vendorId)}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">Plan ID</label>
                      <p className="text-sm font-mono font-semibold mt-1 break-all">{site.planId}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">Zone</label>
                      <p className="text-sm font-semibold mt-1">{site.circle || "—"}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">HOP A-B</label>
                      <p className="text-sm font-semibold mt-1">{site.hopAB || "—"}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">Form No</label>
                      <p className="text-sm font-mono font-semibold mt-1">{site.formNo || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Location Details */}
                <div>
                  <h3 className="font-semibold text-sm mb-4 text-foreground">Location Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">State</label>
                      <p className="text-sm font-semibold mt-1">{site.state || "—"}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">Region</label>
                      <p className="text-sm font-semibold mt-1">{site.region || "—"}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">Zone</label>
                      <p className="text-sm font-semibold mt-1">{site.zone || "—"}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">Region</label>
                      <p className="text-sm font-semibold mt-1">{site.district || "—"}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">Installation Type</label>
                      <p className="text-sm font-semibold mt-1">{site.inside ? "Inside" : "Outside"}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">Installation Date</label>
                      <p className="text-sm font-semibold mt-1">{site.incDate || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Antenna & Technical */}
                <div>
                  <h3 className="font-semibold text-sm mb-4 text-foreground">Antenna & Technical Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">Max Antenna Size</label>
                      <p className="text-sm font-semibold mt-1">{site.maxAntSize || "—"}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">HOP Type</label>
                      <p className="text-sm font-semibold mt-1">{site.hopType || "—"}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">Project</label>
                      <p className="text-sm font-semibold mt-1">{site.project || "—"}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">Site A Name</label>
                      <p className="text-sm font-semibold mt-1">{site.siteAName || "—"}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">Site B Name</label>
                      <p className="text-sm font-semibold mt-1">{site.siteBName || "—"}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <label className="text-xs font-medium text-muted-foreground">Partner Name</label>
                      <p className="text-sm font-semibold mt-1">{site.partnerName || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* AT Status */}
                <div>
                  <h3 className="font-semibold text-sm mb-4 text-foreground">AT Status</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-900">
                      <label className="text-xs font-medium text-blue-700 dark:text-blue-400">Software AT Status</label>
                      <p className="text-sm font-semibold mt-1 text-blue-900 dark:text-blue-300">{site.softAtStatus || "—"}</p>
                    </div>
                    <div className="bg-green-50/50 dark:bg-green-950/20 p-3 rounded-md border border-green-200 dark:border-green-900">
                      <label className="text-xs font-medium text-green-700 dark:text-green-400">Physical AT Status</label>
                      <p className="text-sm font-semibold mt-1 text-green-900 dark:text-green-300">{site.phyAtStatus || "—"}</p>
                    </div>
                    <div className="bg-purple-50/50 dark:bg-purple-950/20 p-3 rounded-md border border-purple-200 dark:border-purple-900">
                      <label className="text-xs font-medium text-purple-700 dark:text-purple-400">Both AT Status</label>
                      <p className="text-sm font-semibold mt-1 text-purple-900 dark:text-purple-300">{site.bothAtStatus || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Financial */}
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 p-4 rounded-lg border border-amber-300 dark:border-amber-700">
                  <h3 className="font-semibold text-sm mb-4 text-foreground">Financial Details</h3>
                  {site.siteAmount || site.vendorAmount ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-slate-950 p-4 rounded-md border-2 border-amber-400 dark:border-amber-600">
                        <label className="text-xs font-medium text-amber-700 dark:text-amber-400">Site Amount</label>
                        <p className="text-lg font-mono font-bold mt-2 text-amber-900 dark:text-amber-300">{site.siteAmount ? `₹${parseFloat(site.siteAmount).toFixed(2)}` : "—"}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-950 p-4 rounded-md border-2 border-amber-400 dark:border-amber-600">
                        <label className="text-xs font-medium text-amber-700 dark:text-amber-400">Vendor Amount</label>
                        <p className="text-lg font-mono font-bold mt-2 text-amber-900 dark:text-amber-300">{site.vendorAmount ? `₹${parseFloat(site.vendorAmount).toFixed(2)}` : "—"}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-md border border-blue-300 dark:border-blue-700">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        ℹ️ Amounts not configured yet. Configure amounts in <Link href="/vendor/payment-master" className="font-semibold underline">Payment Master</Link> based on antenna size.
                      </p>
                    </div>
                  )}
                </div>

                {/* Remarks */}
                <div>
                  <h3 className="font-semibold text-sm mb-4 text-foreground">Remarks</h3>
                  <div className="space-y-3">
                    {(site.softAtRemark || site.phyAtRemark || site.atpRemark) ? (
                      <>
                        {site.softAtRemark && (
                          <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md">
                            <label className="text-xs font-medium text-muted-foreground">Software AT Remark</label>
                            <p className="text-sm mt-1">{site.softAtRemark}</p>
                          </div>
                        )}
                        {site.phyAtRemark && (
                          <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md">
                            <label className="text-xs font-medium text-muted-foreground">Physical AT Remark</label>
                            <p className="text-sm mt-1">{site.phyAtRemark}</p>
                          </div>
                        )}
                        {site.atpRemark && (
                          <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md">
                            <label className="text-xs font-medium text-muted-foreground">ATP Remark</label>
                            <p className="text-sm mt-1">{site.atpRemark}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-3">No remarks available</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t">
                  <Link href={`/vendor/site/edit/${site.id}`}>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Edit className="h-4 w-4" /> Edit
                    </Button>
                  </Link>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="gap-2"
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this site?')) {
                        try {
                          await fetch(`/api/sites/${site.id}`, { method: 'DELETE' });
                          setSites(sites.filter(s => s.id !== site.id));
                        } catch (error) {
                          console.error('Failed to delete site:', error);
                        }
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
