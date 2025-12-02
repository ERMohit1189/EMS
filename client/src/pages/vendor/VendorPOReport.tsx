import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
      const response = await fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}/purchase-orders`);
      if (response.ok) {
        const data = await response.json();
        setPurchaseOrders(data.data || []);
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

  const totalAmount = filteredPOs.reduce(
    (sum, po) => sum + parseFloat(po.totalAmount || "0"),
    0
  );

  const totalVendorAmount = filteredPOs.reduce((sum, po) => {
    const site = sites.find(s => s.id === po.siteId);
    return sum + parseFloat(site?.vendorAmount || "0");
  }, 0);

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-blue-900">{filteredPOs.length}</p>
            <p className="text-sm text-blue-700">Total POs</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-green-900">₹{totalAmount.toLocaleString()}</p>
            <p className="text-sm text-green-700">Total PO Amount</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-purple-900">
              {filteredPOs.filter((po) => po.status?.toLowerCase() === "approved").length}
            </p>
            <p className="text-sm text-purple-700">Approved POs</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-orange-900">₹{totalVendorAmount.toLocaleString()}</p>
            <p className="text-sm text-orange-700">Total Vendor Amount</p>
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
                    <th className="px-4 py-3 text-left font-medium">PO Number</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                    <th className="px-4 py-3 text-center font-medium">Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Unit Price</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50" data-testid={`row-po-${po.id}`}>
                      <td className="px-4 py-3 font-medium">{po.poNumber}</td>
                      <td className="px-4 py-3">
                        {po.poDate ? format(new Date(po.poDate), "dd MMM yyyy") : "N/A"}
                      </td>
                      <td className="px-4 py-3">{po.description}</td>
                      <td className="px-4 py-3 text-center">{po.quantity}</td>
                      <td className="px-4 py-3 text-right">₹{parseFloat(po.unitPrice).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium">₹{parseFloat(po.totalAmount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={getStatusColor(po.status)}>{po.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 font-bold text-right">Total:</td>
                    <td className="px-4 py-3 text-right font-bold">₹{totalAmount.toLocaleString()}</td>
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
    </div>
  );
}
