import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { FileText, Receipt, MapPin, User, Mail, Phone, Calendar, Eye, AlertCircle, Download, X, Building2 } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from 'xlsx';

interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  email: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  status: string;
  createdAt: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  description: string;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  status: string;
  poDate: string;
  siteName?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: string;
  totalAmount: string;
  status: string;
  poNumber?: string;
}

interface Site {
  id: string;
  siteId: string;
  planId: string;
  circle: string;
  district: string;
  siteAName: string;
  siteBName: string;
  hopType: string;
  status?: string;
  [key: string]: any;
}

export default function VendorDashboard() {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("info");
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const vendorId = localStorage.getItem("vendorId");

  const columnHeaderMap: Record<string, string> = {
    siteId: 'Site ID',
    planId: 'Plan ID',
    circle: 'Circle',
    district: 'District',
    project: 'Project',
    siteAAntDia: 'Site A Ant Dia',
    siteBAntDia: 'Site B Ant Dia',
    maxAntSize: 'Max Ant Size',
    siteAName: 'Site A Name',
    tocoVendorA: 'TOCO Vendor A',
    tocoIdA: 'TOCO ID A',
    siteBName: 'Site B Name',
    tocoVendorB: 'TOCO Vendor B',
    tocoIdB: 'TOCO ID B',
    hopType: 'HOP Type',
    hopAB: 'HOP AB',
    hopBA: 'HOP BA',
    nominalAop: 'Nominal AOP',
    mediaAvailabilityStatus: 'Media Availability Status',
    srNoSiteA: 'SR No Site A',
    srDateSiteA: 'SR Date Site A',
    srNoSiteB: 'SR No Site B',
    srDateSiteB: 'SR Date Site B',
    hopSrDate: 'HOP SR Date',
    spDateSiteA: 'SP Date Site A',
    spDateSiteB: 'SP Date Site B',
    hopSpDate: 'HOP SP Date',
    soReleasedDateSiteA: 'SO Released Date Site A',
    soReleasedDateSiteB: 'SO Released Date Site B',
    hopSoDate: 'HOP SO Date',
    rfaiOfferedDateSiteA: 'RFAI Offered Date Site A',
    rfaiOfferedDateSiteB: 'RFAI Offered Date Site B',
    actualHopRfaiOfferedDate: 'Actual HOP RFAI Offered Date',
    partnerName: 'Partner Name',
    rfaiSurveyCompletionDate: 'RFAI Survey Completion Date',
    moNumberSiteA: 'MO Number Site A',
    materialTypeSiteA: 'Material Type Site A',
    moDateSiteA: 'MO Date Site A',
    moNumberSiteB: 'MO Number Site B',
    materialTypeSiteB: 'Material Type Site B',
    moDateSiteB: 'MO Date Site B',
    srnRmoNumber: 'SRN RMO Number',
    srnRmoDate: 'SRN RMO Date',
    hopMoDate: 'HOP MO Date',
    hopMaterialDispatchDate: 'HOP Material Dispatch Date',
    hopMaterialDeliveryDate: 'HOP Material Delivery Date',
    materialDeliveryStatus: 'Material Delivery Status',
    siteAInstallationDate: 'Site A Installation Date',
    ptwNumberSiteA: 'PTW Number Site A',
    ptwStatusA: 'PTW Status A',
    siteBInstallationDate: 'Site B Installation Date',
    ptwNumberSiteB: 'PTW Number Site B',
    ptwStatusB: 'PTW Status B',
    hopIcDate: 'HOP IC Date',
    alignmentDate: 'Alignment Date',
    hopInstallationRemarks: 'HOP Installation Remarks',
    visibleInNms: 'Visible In NMS',
    nmsVisibleDate: 'NMS Visible Date',
    softAtOfferDate: 'Soft AT Offer Date',
    softAtAcceptanceDate: 'Soft AT Acceptance Date',
    softAtStatus: 'Soft AT Status',
    phyAtOfferDate: 'Phy AT Offer Date',
    phyAtAcceptanceDate: 'Phy AT Acceptance Date',
    phyAtStatus: 'Phy AT Status',
    bothAtStatus: 'Both AT Status',
    priIssueCategory: 'PRI Issue Category',
    priSiteId: 'PRI Site ID',
    priOpenDate: 'PRI Open Date',
    priCloseDate: 'PRI Close Date',
    priHistory: 'PRI History',
    rfiSurveyAllocationDate: 'RFI Survey Allocation Date',
    descope: 'Descope',
    reasonOfExtraVisit: 'Reason Of Extra Visit',
    wccReceived80Percent: 'WCC Received 80 Percent',
    wccReceivedDate80Percent: 'WCC Received Date 80 Percent',
    wccReceived20Percent: 'WCC Received 20 Percent',
    wccReceivedDate20Percent: 'WCC Received Date 20 Percent',
    wccReceivedDate100Percent: 'WCC Received Date 100 Percent',
    survey: 'Survey',
    finalPartnerSurvey: 'Final Partner Survey',
    surveyDate: 'Survey Date',
    status: 'Status',
    sno: 'S.No',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
    vendorCode: 'Partner Code',
    vendorAmount: 'Vendor Amount',
  };

  const fieldsToExclude = new Set(['id', 'zoneId', 'vendorId', 'siteAmount']);

  const getFormattedExcelData = (data: any[]) => {
    return data.map(item => {
      const formattedItem: Record<string, any> = {};
      // Add Partner Code from vendor
      formattedItem['Partner Code'] = vendor?.vendorCode || 'N/A';
      Object.entries(item).forEach(([key, value]) => {
        if (!fieldsToExclude.has(key)) {
          const headerName = columnHeaderMap[key] || key;
          formattedItem[headerName] = value;
        }
      });
      return formattedItem;
    });
  };

  const downloadSitesExcel = () => {
    if (sites.length === 0) {
      toast({ title: "No data", description: "No sites to download", variant: "destructive" });
      return;
    }
    
    const formattedData = getFormattedExcelData(sites);
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sites");
    XLSX.writeFile(workbook, `vendor-sites-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({ title: "Success", description: "Sites data downloaded successfully" });
  };

  useEffect(() => {
    if (!vendorId) {
      setError("Please log in to access your dashboard");
      setLoading(false);
      return;
    }
    fetchVendorData();
  }, [vendorId]);

  const fetchVendorData = async () => {
    setLoading(true);
    try {
      const [vendorRes, posRes, invoicesRes, sitesRes] = await Promise.all([
        fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}`),
        fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}/purchase-orders`),
        fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}/invoices`),
        fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}/sites`),
      ]);

      if (vendorRes.ok) {
        const vendorData = await vendorRes.json();
        setVendor(vendorData);
      }

      if (posRes.ok) {
        const posData = await posRes.json();
        setPurchaseOrders(posData.data || []);
      }

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData.data || []);
      }

      if (sitesRes.ok) {
        const sitesData = await sitesRes.json();
        setSites(sitesData || []);
      }
    } catch (error: any) {
      console.error("Error fetching vendor data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
      case "paid":
      case "active":
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !vendorId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-semibold text-gray-900">Session Expired</h2>
              <p className="text-gray-600">{error || "Please log in to access your dashboard"}</p>
              <Button onClick={() => setLocation("/vendor-login")} data-testid="button-login-redirect">
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="info" data-testid="tab-profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="po" data-testid="tab-po">
            <FileText className="h-4 w-4 mr-2" />
            PO
          </TabsTrigger>
          <TabsTrigger value="invoice" data-testid="tab-invoice">
            <Receipt className="h-4 w-4 mr-2" />
            Invoice
          </TabsTrigger>
          <TabsTrigger value="site" data-testid="tab-site">
            <MapPin className="h-4 w-4 mr-2" />
            Site
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Vendor Profile
              </CardTitle>
              <CardDescription>Your registered details</CardDescription>
            </CardHeader>
            <CardContent>
              {vendor ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <User className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium">{vendor.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Building2 className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Vendor Code</p>
                        <p className="font-medium">{vendor.vendorCode || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{vendor.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Phone className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Mobile</p>
                        <p className="font-medium">{vendor.mobile}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium">{vendor.address}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">City / State</p>
                        <p className="font-medium">{vendor.city}, {vendor.state}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Registered On</p>
                        <p className="font-medium">
                          {vendor.createdAt ? format(new Date(vendor.createdAt), "dd MMM yyyy") : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <Badge className={getStatusColor(vendor.status)}>{vendor.status}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No vendor information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="po" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Vendor PO
              </CardTitle>
              <CardDescription>Your purchase orders ({purchaseOrders.length})</CardDescription>
            </CardHeader>
            <CardContent>
              {purchaseOrders.length > 0 ? (
                <div className="w-full">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">PO Number</th>
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                        <th className="px-4 py-3 text-left font-medium">Description</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                        <th className="px-4 py-3 text-center font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {purchaseOrders.map((po) => (
                        <tr key={po.id} className="hover:bg-gray-50" data-testid={`row-po-${po.id}`}>
                          <td className="px-4 py-3 font-medium">{po.poNumber}</td>
                          <td className="px-4 py-3">
                            {po.poDate ? format(new Date(po.poDate), "dd MMM yyyy") : "N/A"}
                          </td>
                          <td className="px-4 py-3">{po.description}</td>
                          <td className="px-4 py-3 text-right">₹{parseFloat(po.totalAmount).toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={getStatusColor(po.status)}>{po.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No purchase orders found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Vendor Invoice
              </CardTitle>
              <CardDescription>Your invoices ({invoices.length})</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <div className="w-full">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Invoice Number</th>
                        <th className="px-4 py-3 text-left font-medium">Invoice Date</th>
                        <th className="px-4 py-3 text-left font-medium">Due Date</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                        <th className="px-4 py-3 text-center font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50" data-testid={`row-invoice-${invoice.id}`}>
                          <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                          <td className="px-4 py-3">
                            {invoice.invoiceDate ? format(new Date(invoice.invoiceDate), "dd MMM yyyy") : "N/A"}
                          </td>
                          <td className="px-4 py-3">
                            {invoice.dueDate ? format(new Date(invoice.dueDate), "dd MMM yyyy") : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-right">₹{parseFloat(invoice.totalAmount).toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No invoices found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="site" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Vendor Site
                </CardTitle>
                <CardDescription>Your assigned sites ({sites.length})</CardDescription>
              </div>
              <Button onClick={downloadSitesExcel} className="gap-2" data-testid="button-download-sites">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </CardHeader>
            <CardContent>
              {sites.length > 0 ? (
                <div className="w-full">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Site ID</th>
                        <th className="px-4 py-3 text-left font-medium">Plan ID</th>
                        <th className="px-4 py-3 text-left font-medium">Circle</th>
                        <th className="px-4 py-3 text-left font-medium">Site A</th>
                        <th className="px-4 py-3 text-left font-medium">Site B</th>
                        <th className="px-4 py-3 text-left font-medium">HOP Type</th>
                        <th className="px-4 py-3 text-center font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sites.map((site) => (
                        <tr key={site.id} className="hover:bg-gray-50" data-testid={`row-site-${site.id}`}>
                          <td className="px-4 py-3 font-medium">{site.siteId}</td>
                          <td className="px-4 py-3">{site.planId}</td>
                          <td className="px-4 py-3">{site.circle || "N/A"}</td>
                          <td className="px-4 py-3">{site.siteAName || "N/A"}</td>
                          <td className="px-4 py-3">{site.siteBName || "N/A"}</td>
                          <td className="px-4 py-3">{site.hopType || "N/A"}</td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedSite(site)}
                              data-testid={`button-view-site-${site.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No sites found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Site Details Modal */}
      <Dialog open={!!selectedSite} onOpenChange={(open) => !open && setSelectedSite(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Site Details - {selectedSite?.siteId}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSite && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Partner Code from vendor */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Partner Code</p>
                  <p className="font-medium text-sm mt-1">{vendor?.vendorCode || "N/A"}</p>
                </div>
                {Object.entries(selectedSite).map(([key, value]) => {
                  if (fieldsToExclude.has(key)) return null;
                  const displayKey = columnHeaderMap[key] || key.replace(/([A-Z])/g, ' $1').trim();
                  return (
                    <div key={key} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-semibold">{displayKey}</p>
                      <p className="font-medium text-sm mt-1">
                        {value !== null && value !== undefined ? String(value) : "N/A"}
                      </p>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => {
                    const formattedData = getFormattedExcelData([selectedSite]);
                    const sheet = XLSX.utils.json_to_sheet(formattedData);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, sheet, "Site");
                    XLSX.writeFile(workbook, `site-${selectedSite.siteId}.xlsx`);
                    toast({ title: "Success", description: "Site data downloaded" });
                  }}
                  className="gap-2"
                  data-testid="button-download-site-detail"
                >
                  <Download className="h-4 w-4" />
                  Download Site
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
