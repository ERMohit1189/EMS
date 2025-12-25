import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { FileText, Calendar, MapPin, Search, Download, RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  description: string;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  status: string;
  poDate: string;
  siteId: string;
  siteName?: string;
  planId?: string;
}

interface Site {
  id: string;
  siteId: string;
  planId: string;
  siteAName: string;
  vendorAmount?: string;
}

export default function VendorPOReport() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedSite, setSelectedSite] = useState("");

  const [sitesModalOpen, setSitesModalOpen] = useState(false);
  const [modalSites, setModalSites] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalPoNumber, setModalPoNumber] = useState<string | null>(null);

  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const vendorId = localStorage.getItem("vendorId");

  useEffect(() => {
    if (vendorId) {
      fetchSites();
      fetchPurchaseOrders();
    }
  }, [vendorId]);

  if (!vendorId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-semibold text-gray-900">Session Expired</h2>
              <p className="text-gray-600">Please log in to access this report</p>
              <Button onClick={() => setLocation("/vendor-login")} data-testid="button-login-redirect">
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fetchSites = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}/sites`);
      if (response.ok) {
        const data = await response.json();
        setSites(data || []);
      }
    } catch (error) {
      console.error("Error fetching sites:", error);
    }
  };

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      // Try to fetch POs with lines (preferred); fallback to without-lines if not available or unauthorized
      let response = await fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}/purchase-orders/with-lines`);
      if (response.ok) {
        const data = await response.json();
        setPurchaseOrders(data.data || []);
      } else {
        response = await fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}/purchase-orders`);
        if (response.ok) {
          const data = await response.json();
          setPurchaseOrders(data.data || []);
        } else {
          toast({ title: "Error", description: "Failed to fetch purchase orders", variant: "destructive" });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch purchase orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPOs = purchaseOrders.filter((po) => {
    let matchesDate = true;
    let matchesSite = true;

    if (fromDate && po.poDate) {
      matchesDate = new Date(po.poDate) >= new Date(fromDate);
    }
    if (toDate && po.poDate) {
      matchesDate = matchesDate && new Date(po.poDate) <= new Date(toDate);
    }
    if (selectedSite) {
      matchesSite = po.siteId === selectedSite;
    }

    return matchesDate && matchesSite;
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setSelectedSite("");
  };

  const openSitesModal = async (po: any) => {
    const siteIds = Array.from(new Set((po.lines || []).map((ln: any) => ln.siteId).filter(Boolean)));
    if (siteIds.length === 0) {
      setModalSites([]);
      setModalPoNumber(po.poNumber || null);
      setSitesModalOpen(true);
      return;
    }

    try {
      setModalLoading(true);
      setModalPoNumber(po.poNumber || null);
      const fetches = siteIds.map(id => fetch(`${getApiBaseUrl()}/api/sites/${id}`).then(r => r.ok ? r.json() : null));
      const results = await Promise.all(fetches);
      const sitesData = results.filter(Boolean);
      setModalSites(sitesData as any[]);
      setSitesModalOpen(true);
    } catch (err) {
      console.error('Failed to load sites for PO', err);
      toast({ title: 'Error', description: 'Failed to load site details', variant: 'destructive' });
    } finally {
      setModalLoading(false);
    }
  };

  const totalAmount = filteredPOs.reduce(
    (sum, po) => sum + parseFloat(po.totalAmount || "0"),
    0
  );


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor PO Report</h1>
            <p className="text-gray-500">View and filter your purchase orders</p>
          </div>
        </div>
        <Button onClick={fetchPurchaseOrders} variant="outline" data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                From Date
              </Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                data-testid="input-from-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                To Date
              </Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                data-testid="input-to-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="site" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Site Filter
              </Label>
              <select
                id="site"
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="select-site"
              >
                <option value="">All Sites</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.planId} - {site.siteAName || site.siteId}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button onClick={clearFilters} variant="outline" className="w-full" data-testid="button-clear">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-blue-900">{filteredPOs.length}</p>
            <p className="text-sm text-blue-700">Total POs</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-green-900">Rs {totalAmount.toLocaleString()}</p>
            <p className="text-sm text-green-700">Total PO Amount</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders ({filteredPOs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredPOs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">S.No</th>
                    <th className="px-4 py-3 text-left font-medium">PO Number</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                    <th className="px-4 py-3 text-center font-medium">Sites</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPOs.map((po, idx) => (
                    <tr key={po.id} className="hover:bg-gray-50" data-testid={`row-po-${po.id}`}>
                      <td className="px-4 py-3">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium">{po.poNumber}</td>
                      <td className="px-4 py-3">
                        {po.poDate ? format(new Date(po.poDate), "dd MMM yyyy") : "N/A"}
                      </td>
                      <td className="px-4 py-3">{po.description}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          className="text-sm text-blue-600 hover:underline"
                          onClick={() => openSitesModal(po)}
                          data-testid={`button-po-sites-${po.id}`}
                        >
                          {(() => {
                            const sites = (po.lines || []).map((ln: any) => ln.siteHopAB || ln.sitePlanId || ln.siteId || '').filter(Boolean);
                            const uniqCount = Array.from(new Set(sites)).length;
                            return uniqCount;
                          })()}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">Rs {parseFloat(po.totalAmount || '0').toLocaleString()}</td> 
                      <td className="px-4 py-3 text-center">
                        <Badge className={getStatusColor(po.status)}>{po.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 font-bold text-right">Total:</td>
                    <td className="px-4 py-3 text-right font-bold">Rs {totalAmount.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No purchase orders found</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={sitesModalOpen} onOpenChange={(open) => { if (!open) { setSitesModalOpen(false); setModalSites([]); setModalPoNumber(null);} }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sites for PO {modalPoNumber}</DialogTitle>
          </DialogHeader>

          {modalLoading ? (
            <div className="flex justify-center py-8"><div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : modalSites.length > 0 ? (
            <div className="space-y-4">
              {modalSites.map((s, idx) => (
                <Card key={s.id} className="p-3 relative">
                  <div className="absolute -left-4 -top-4 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center border-2 border-white text-sm font-semibold shadow z-20">
                    {idx + 1}
                  </div>
                  <div className="pt-6 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Site Name</p>
                      <p className="text-sm">{s.hopAB || s.siteHopAB || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Plan ID</p>
                      <p className="text-sm">{s.planId || s.sitePlanId || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Max Ant Size</p>
                      <p className="text-sm">{s.maxAntSize ?? (Math.max(parseFloat(s.siteAAntDia||0), parseFloat(s.siteBAntDia||0)) || '—')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Vendor Amount</p>
                      <p className="text-sm">{s.vendorAmount ? `Rs ${parseFloat(String(s.vendorAmount)).toLocaleString()}` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Installation Date</p>
                      <p className="text-sm">{s.siteAInstallationDate ? new Date(s.siteAInstallationDate).toISOString().slice(0,10) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Soft AT Status</p>
                      <p className="text-sm">{s.softAtStatus || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">PHY AT Status</p>
                      <p className="text-sm">{s.phyAtStatus || '—'}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-muted-foreground">No sites found for this PO</p>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
