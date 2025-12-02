import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { fetchWithLoader } from '@/lib/fetchWithLoader';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

interface SiteData {
  id: string;
  siteId: string;
  planId: string;
  vendorId: string;
  vendorAmount: number;
  siteAmount: number;
  [key: string]: any;
}

// All 81 fields in order (matching PDF export)
const fieldColumns = [
  'ID', 'Site ID', 'Vendor ID', 'Zone ID', 'Plan ID', 'Site Amount', 'Vendor Amount', 'S.No',
  'Circle', 'Nominal AOP', 'HOP Type', 'HOP A-B', 'HOP B-A', 'District', 'Project',
  'Site A Ant Dia', 'Site B Ant Dia', 'Max Ant Size', 'Site A Name', 'TOCO Vendor A', 'TOCO ID A',
  'Site B Name', 'TOCO Vendor B', 'TOCO ID B', 'Media Availability Status',
  'SR No Site A', 'SR Date Site A', 'SR No Site B', 'SR Date Site B', 'HOP SR Date',
  'SP Date Site A', 'SP Date Site B', 'HOP SP Date', 'SO Released Date Site A',
  'SO Released Date Site B', 'HOP SO Date', 'RFAI Offered Date Site A', 'RFAI Offered Date Site B',
  'Actual HOP RFAI Offered Date', 'Partner Name', 'RFAI Survey Completion Date',
  'MO Number Site A', 'Material Type Site A', 'MO Date Site A', 'MO Number Site B',
  'Material Type Site B', 'MO Date Site B', 'SRN RMO Number', 'SRN RMO Date', 'HOP MO Date',
  'HOP Material Dispatch Date', 'HOP Material Delivery Date', 'Material Delivery Status',
  'Site A Installation Date', 'PTW Number Site A', 'PTW Status A', 'Site B Installation Date',
  'PTW Number Site B', 'PTW Status B', 'HOP IC Date', 'Alignment Date',
  'HOP Installation Remarks', 'Visible in NMS', 'NMS Visible Date', 'Soft AT Offer Date',
  'Soft AT Acceptance Date', 'Soft AT Status', 'Phy AT Offer Date', 'Phy AT Acceptance Date',
  'Phy AT Status', 'Both AT Status', 'PRI Issue Category', 'PRI Site ID', 'PRI Open Date',
  'PRI Close Date', 'PRI History', 'RFI Survey Allocation Date', 'Descope', 'Reason of Extra Visit',
  'WCC Received 80%', 'WCC Received Date 80%', 'WCC Received 20%', 'WCC Received Date 20%',
  'WCC Received Date 100%', 'Survey', 'Final Partner Survey', 'Survey Date', 'Status'
];

const fieldKeys = [
  'id', 'siteId', 'vendorId', 'zoneId', 'planId', 'siteAmount', 'vendorAmount', 'sno',
  'circle', 'nominalAop', 'hopType', 'hopAB', 'hopBA', 'district', 'project',
  'siteAAntDia', 'siteBAntDia', 'maxAntSize', 'siteAName', 'tocoVendorA', 'tocoIdA',
  'siteBName', 'tocoVendorB', 'tocoIdB', 'mediaAvailabilityStatus',
  'srNoSiteA', 'srDateSiteA', 'srNoSiteB', 'srDateSiteB', 'hopSrDate',
  'spDateSiteA', 'spDateSiteB', 'hopSpDate', 'soReleasedDateSiteA',
  'soReleasedDateSiteB', 'hopSoDate', 'rfaiOfferedDateSiteA', 'rfaiOfferedDateSiteB',
  'actualHopRfaiOfferedDate', 'partnerName', 'rfaiSurveyCompletionDate',
  'moNumberSiteA', 'materialTypeSiteA', 'moDateSiteA', 'moNumberSiteB',
  'materialTypeSiteB', 'moDateSiteB', 'srnRmoNumber', 'srnRmoDate', 'hopMoDate',
  'hopMaterialDispatchDate', 'hopMaterialDeliveryDate', 'materialDeliveryStatus',
  'siteAInstallationDate', 'ptwNumberSiteA', 'ptwStatusA', 'siteBInstallationDate',
  'ptwNumberSiteB', 'ptwStatusB', 'hopIcDate', 'alignmentDate',
  'hopInstallationRemarks', 'visibleInNms', 'nmsVisibleDate', 'softAtOfferDate',
  'softAtAcceptanceDate', 'softAtStatus', 'phyAtOfferDate', 'phyAtAcceptanceDate',
  'phyAtStatus', 'bothAtStatus', 'priIssueCategory', 'priSiteId', 'priOpenDate',
  'priCloseDate', 'priHistory', 'rfiSurveyAllocationDate', 'descope', 'reasonOfExtraVisit',
  'wccReceived80Percent', 'wccReceivedDate80Percent', 'wccReceived20Percent', 'wccReceivedDate20Percent',
  'wccReceivedDate100Percent', 'survey', 'finalPartnerSurvey', 'surveyDate', 'status'
];

export default function SiteManagement() {
  const { toast } = useToast();
  const [sites, setSites] = useState<SiteData[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [currentSite, setCurrentSite] = useState<SiteData | null>(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch all sites for dropdown
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/sites?pageSize=10000`);
        if (response.ok) {
          const { data } = await response.json();
          setSites(data || []);
        }
      } catch (error) {
        console.error('Failed to fetch sites');
      }
    };
    fetchSites();
  }, []);

  // Load site data when selected
  useEffect(() => {
    if (selectedSiteId && sites.length > 0) {
      const site = sites.find(s => s.id === selectedSiteId);
      if (site) {
        setCurrentSite(site);
        setSearchText('');
      }
    }
  }, [selectedSiteId, sites]);

  // Search functionality
  const handleSearch = () => {
    if (!searchText.trim()) {
      toast({ title: 'Error', description: 'Please enter a Plan ID or Site ID', variant: 'destructive' });
      return;
    }

    const found = sites.find(
      s => s.planId?.toLowerCase().includes(searchText.toLowerCase()) ||
           s.siteId?.toLowerCase().includes(searchText.toLowerCase())
    );

    if (found) {
      setSelectedSiteId(found.id);
      setCurrentSite(found);
    } else {
      toast({ title: 'Not Found', description: 'No site found with that ID', variant: 'destructive' });
      setCurrentSite(null);
    }
  };

  const getFieldValue = (site: SiteData, index: number): string => {
    const key = fieldKeys[index];
    const value = site[key];
    return value ? String(value) : '-';
  };

  return (
    <div className="space-y-6 max-w-full mx-auto pb-10 px-4">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Site Management</h2>
        <p className="text-muted-foreground">View and manage all site data - Sequential display of 81 fields</p>
      </div>

      {/* Selection Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Select or Search Site</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {/* Search by Plan ID or Site ID */}
            <div className="flex gap-2 flex-1 min-w-xs">
              <Input
                placeholder="Search by Plan ID or Site ID..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                data-testid="input-search-site"
              />
              <Button onClick={handleSearch} size="sm" data-testid="button-search">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Dropdown select */}
            <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
              <SelectTrigger className="w-64" data-testid="select-site">
                <SelectValue placeholder="Or select from list..." />
              </SelectTrigger>
              <SelectContent>
                {sites.map(site => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.siteId} - {site.planId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Site Data Display */}
      {currentSite && (
        <div className="space-y-4">
          <Card className="bg-blue-50">
            <CardHeader>
              <CardTitle>
                Site: {currentSite.siteId} | Plan ID: {currentSite.planId}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Display fields in 5-column grid layout (matching PDF export) */}
          {Array.from({ length: Math.ceil(fieldColumns.length / 5) }).map((_, sectionIdx) => {
            const startIdx = sectionIdx * 5;
            const endIdx = Math.min(startIdx + 5, fieldColumns.length);
            const sectionColumns = fieldColumns.slice(startIdx, endIdx);
            const sectionKeys = fieldKeys.slice(startIdx, endIdx);

            return (
              <Card key={sectionIdx}>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Columns {startIdx + 1} - {endIdx}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Column Headers */}
                  <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${sectionColumns.length}, 1fr)` }}>
                    {sectionColumns.map((col, idx) => (
                      <div key={idx} className="bg-gray-200 p-2 rounded font-bold text-xs text-center">
                        {col}
                      </div>
                    ))}
                  </div>

                  {/* Data Rows */}
                  <div className="grid gap-2 border rounded" style={{ gridTemplateColumns: `repeat(${sectionColumns.length}, 1fr)` }}>
                    {sectionKeys.map((key, idx) => (
                      <div key={idx} className="p-2 border text-xs" data-testid={`field-${key}`}>
                        {getFieldValue(currentSite, startIdx + idx)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Change Site Button */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setCurrentSite(null);
                setSelectedSiteId('');
                setSearchText('');
              }}
              data-testid="button-clear"
            >
              Clear / Select Different Site
            </Button>
          </div>
        </div>
      )}

      {!currentSite && sites.length === 0 && (
        <Card className="bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No sites available. Please create a site first.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
