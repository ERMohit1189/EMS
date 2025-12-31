import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { Receipt, Calendar, FileText, Search, RefreshCw, AlertCircle, Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: string;
  gst: string;
  totalAmount: string;
  status: string;
  poId: string;
  poNumber?: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  siteId?: string;
}

interface Site {
  id: string;
  vendorAmount?: string;
}

export default function VendorInvoiceReport() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedPO, setSelectedPO] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const vendorId = localStorage.getItem("vendorId");

  useEffect(() => {
    if (vendorId) {
      fetchPurchaseOrders();
      fetchInvoices();
      fetchSites();
    }
  }, [vendorId]);

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

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}/purchase-orders`);
      if (response.ok) {
        const data = await response.json();
        setPurchaseOrders(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching POs:", error);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}/invoices`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.data || []);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    let matchesDate = true;
    let matchesPO = true;

    if (fromDate && invoice.invoiceDate) {
      matchesDate = new Date(invoice.invoiceDate) >= new Date(fromDate);
    }
    if (toDate && invoice.invoiceDate) {
      matchesDate = matchesDate && new Date(invoice.invoiceDate) <= new Date(toDate);
    }
    if (selectedPO) {
      matchesPO = invoice.poId === selectedPO;
    }

    return matchesDate && matchesPO;
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
      case "submitted":
        return "bg-yellow-100 text-yellow-800";
      case "draft":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setSelectedPO("");
  };

  const totalAmount = filteredInvoices.reduce(
    (sum, inv) => sum + parseFloat(inv.totalAmount || "0"),
    0
  );

  const paidAmount = filteredInvoices
    .filter((inv) => inv.status?.toLowerCase() === "paid")
    .reduce((sum, inv) => sum + parseFloat(inv.totalAmount || "0"), 0);

  const totalVendorAmount = filteredInvoices.reduce((sum, inv) => {
    const po = purchaseOrders.find(p => p.id === inv.poId);
    const site = sites.find(s => s.id === po?.siteId);
    return sum + parseFloat(site?.vendorAmount || "0");
  }, 0);

  const downloadExcel = () => {
    if (filteredInvoices.length === 0) {
      toast({ title: "No data", description: "No invoices to download", variant: "destructive" });
      return;
    }

    const formattedData = filteredInvoices.map((invoice) => ({
      'Invoice Number': invoice.invoiceNumber,
      'Invoice Date': invoice.invoiceDate ? format(new Date(invoice.invoiceDate), "dd MMM yyyy") : "N/A",
      'Due Date': invoice.dueDate ? format(new Date(invoice.dueDate), "dd MMM yyyy") : "N/A",
      'Amount': parseFloat(invoice.amount),
      'GST': parseFloat(invoice.gst || "0"),
      'Total Amount': parseFloat(invoice.totalAmount),
      'Status': invoice.status,
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 18 },  // Invoice Number
      { wch: 15 },  // Invoice Date
      { wch: 15 },  // Due Date
      { wch: 15 },  // Amount
      { wch: 15 },  // GST
      { wch: 15 },  // Total Amount
      { wch: 12 },  // Status
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
    XLSX.writeFile(workbook, `vendor-invoice-report-${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({ title: "Success", description: "Invoice report downloaded successfully" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Receipt className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Invoice Report</h1>
            <p className="text-gray-500">View and filter your invoices</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadExcel} variant="outline" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={fetchInvoices} variant="outline" data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
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
              <Label htmlFor="po" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                PO Filter
              </Label>
              <select
                id="po"
                value={selectedPO}
                onChange={(e) => setSelectedPO(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="select-po"
              >
                <option value="">All POs</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.poNumber}
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
            <p className="text-3xl font-bold text-blue-900">{filteredInvoices.length}</p>
            <p className="text-sm text-blue-700">Total Invoices</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-green-900">Rs {totalAmount.toLocaleString()}</p>
            <p className="text-sm text-green-700">Total Invoice Amount (With GST)</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-purple-900">Rs {paidAmount.toLocaleString()}</p>
            <p className="text-sm text-purple-700">Paid Amount</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-orange-900">Rs {totalVendorAmount.toLocaleString()}</p>
            <p className="text-sm text-orange-700">Total Vendor Amount</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices ({filteredInvoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Invoice Number</th>
                    <th className="px-4 py-3 text-left font-medium">Invoice Date</th>
                    <th className="px-4 py-3 text-left font-medium">Due Date</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-right font-medium">GST</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50" data-testid={`row-invoice-${invoice.id}`}>
                      <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3">
                        {invoice.invoiceDate ? format(new Date(invoice.invoiceDate), "dd MMM yyyy") : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        {invoice.dueDate ? format(new Date(invoice.dueDate), "dd MMM yyyy") : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-right">Rs {parseFloat(invoice.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">Rs {parseFloat(invoice.gst || "0").toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium">Rs {parseFloat(invoice.totalAmount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
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
            <p className="text-gray-500 text-center py-8">No invoices found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
