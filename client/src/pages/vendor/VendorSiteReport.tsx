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
import { MapPin, Calendar, Radio, Globe, Hash, Search, RefreshCw, Eye, X, AlertCircle, Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface Site {
  id: string;
  siteId: string;
  planId: string;
  circle: string;
  district: string;
  siteAName: string;
  siteBName: string;
  hopType: string;
  hopAB: string;
  hopBA: string;
  siteAAntDia: string;
  siteBAntDia: string;
  maxAntSize: string;
  nominalAop: string;
  tocoVendorA: string;
  tocoVendorB: string;
  tocoIdA: string;
  tocoIdB: string;
  srNoSiteA: string;
  srNoSiteB: string;
  phyAtStatus: string;
  softAtStatus: string;
  createdAt: string;
  zoneId: string;
  zoneName?: string;
  vendorAmount: string;
  siteAmount: string;
}

interface Zone {
  id: string;
  name: string;
  code: string;
}

interface Vendor {
  id: string;
  vendorCode: string;
  companyName: string;
  email: string;
  contactPerson: string;
  [key: string]: any;
}

export default function VendorSiteReport() {
  const [sites, setSites] = useState<Site[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [antennaFilter, setAntennaFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [planIdFilter, setPlanIdFilter] = useState("");
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

  const getFormattedExcelData = (data: Site[]) => {
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

  const downloadExcel = () => {
    if (filteredSites.length === 0) {
      toast({ title: "No data", description: "No sites to download", variant: "destructive" });
      return;
    }
    
    const formattedData = getFormattedExcelData(filteredSites);
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sites");
    XLSX.writeFile(workbook, `vendor-sites-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({ title: "Success", description: "Sites report downloaded successfully" });
  };

  useEffect(() => {
    if (vendorId) {
      fetchZones();
      fetchSites();
      fetchVendor();
    }
  }, [vendorId]);

  const fetchVendor = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}`);
      if (response.ok) {
        const data = await response.json();
        setVendor(data);
      }
    } catch (error) {
      console.error("Error fetching vendor:", error);
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

  const fetchZones = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/zones?pageSize=100`);
      if (response.ok) {
        const result = await response.json();
        setZones(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching zones:", error);
    }
  };

  const fetchSites = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}/sites`);
      if (response.ok) {
        const data = await response.json();
        setSites(data || []);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch sites",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUniqueAntennas = () => {
    const antennas = new Set<string>();
    sites.forEach((site) => {
      if (site.siteAAntDia) antennas.add(site.siteAAntDia);
      if (site.siteBAntDia) antennas.add(site.siteBAntDia);
      if (site.maxAntSize) antennas.add(site.maxAntSize);
    });
    return Array.from(antennas).sort();
  };

  const filteredSites = sites.filter((site) => {
    let matchesDate = true;
    let matchesAntenna = true;
    let matchesZone = true;
    let matchesPlanId = true;

    if (fromDate && site.createdAt) {
      matchesDate = new Date(site.createdAt) >= new Date(fromDate);
    }
    if (toDate && site.createdAt) {
      matchesDate = matchesDate && new Date(site.createdAt) <= new Date(toDate);
    }
    if (antennaFilter) {
      matchesAntenna = site.siteAAntDia === antennaFilter || 
                       site.siteBAntDia === antennaFilter || 
                       site.maxAntSize === antennaFilter;
    }
    if (zoneFilter) {
      matchesZone = site.zoneId === zoneFilter;
    }
    if (planIdFilter) {
      matchesPlanId = site.planId?.toLowerCase().includes(planIdFilter.toLowerCase());
    }

    return matchesDate && matchesAntenna && matchesZone && matchesPlanId;
  });

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setAntennaFilter("");
    setZoneFilter("");
    setPlanIdFilter("");
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "done":
        return "bg-green-100 text-green-800";
      case "in progress":
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "not started":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Site Report</h1>
            <p className="text-gray-500">View and filter your sites</p>
          </div>
        </div>
        <Button onClick={fetchSites} variant="outline" data-testid="button-refresh">
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              <Label htmlFor="antenna" className="flex items-center gap-2">
                <Radio className="h-4 w-4" />
                Antenna Size
              </Label>
              <select
                id="antenna"
                value={antennaFilter}
                onChange={(e) => setAntennaFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="select-antenna"
              >
                <option value="">All Antennas</option>
                {getUniqueAntennas().map((ant) => (
                  <option key={ant} value={ant}>{ant}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zone" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Zone
              </Label>
              <select
                id="zone"
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="select-zone"
              >
                <option value="">All Zones</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="planId" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Plan ID
              </Label>
              <Input
                id="planId"
                placeholder="Search Plan ID"
                value={planIdFilter}
                onChange={(e) => setPlanIdFilter(e.target.value)}
                data-testid="input-plan-id"
              />
            </div>

            <div className="flex items-end">
              <Button onClick={clearFilters} variant="outline" className="w-full" data-testid="button-clear">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-purple-900">{filteredSites.length}</p>
            <p className="text-sm text-purple-700">Total Sites</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-green-900">
              {filteredSites.filter((s) => s.phyAtStatus?.toLowerCase() === "completed").length}
            </p>
            <p className="text-sm text-green-700">Physical AT Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-blue-900">
              {filteredSites.filter((s) => s.softAtStatus?.toLowerCase() === "completed").length}
            </p>
            <p className="text-sm text-blue-700">Soft AT Completed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sites ({filteredSites.length})</CardTitle>
          <Button 
            onClick={downloadExcel} 
            className="gap-2"
            data-testid="button-download-excel"
            disabled={filteredSites.length === 0}
          >
            <Download className="h-4 w-4" />
            Download Excel
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredSites.length > 0 ? (
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
                    <th className="px-4 py-3 text-center font-medium">Phy AT</th>
                    <th className="px-4 py-3 text-center font-medium">Soft AT</th>
                    <th className="px-4 py-3 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSites.map((site) => (
                    <tr key={site.id} className="hover:bg-gray-50" data-testid={`row-site-${site.id}`}>
                      <td className="px-4 py-3 font-medium">{site.siteId}</td>
                      <td className="px-4 py-3">{site.planId}</td>
                      <td className="px-4 py-3">{site.circle || "N/A"}</td>
                      <td className="px-4 py-3">{site.siteAName || "N/A"}</td>
                      <td className="px-4 py-3">{site.siteBName || "N/A"}</td>
                      <td className="px-4 py-3">{site.hopType || "N/A"}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={getStatusColor(site.phyAtStatus)}>
                          {site.phyAtStatus || "N/A"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={getStatusColor(site.softAtStatus)}>
                          {site.softAtStatus || "N/A"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedSite(site)}
                          data-testid={`button-view-${site.id}`}
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
