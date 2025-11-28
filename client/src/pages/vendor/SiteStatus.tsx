import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';
import { fetchWithLoader } from '@/lib/fetchWithLoader';
import { truncateId } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SiteStatusData {
  id: string;
  siteId: string;
  planId: string;
  circle: string;
  district: string;
  status: string;
  atpRemark: string | null;
  phyAtRemark: string | null;
  softAtRemark: string | null;
  phyAtStatus: string | null;
  softAtStatus: string | null;
  visibleInNms: string | null;
  bothAtStatus: string | null;
  descope: string | null;
}

const statusOptions = ['Pending', 'Raised', 'Approved', 'Rejected'];

export default function SiteStatus() {
  const { toast } = useToast();
  const [sites, setSites] = useState<SiteStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [bulkPhyAtStatus, setBulkPhyAtStatus] = useState('');
  const [bulkSoftAtStatus, setBulkSoftAtStatus] = useState('');

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/api/sites`);
      if (response.ok) {
        const { data } = await response.json();
        setSites(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSites = sites.filter(site => {
    const matchesSearch = 
      site.planId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.circle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.district.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'All' || site.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAtpStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-50 text-gray-600';
    switch (status.toLowerCase()) {
      case 'yes':
      case 'active':
      case 'completed':
        return 'bg-green-50 text-green-700';
      case 'no':
      case 'pending':
      case 'in progress':
        return 'bg-yellow-50 text-yellow-700';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const statusOptions = ['All', ...new Set(sites.map(s => s.status))];

  const toggleSiteSelection = (siteId: string) => {
    const newSelected = new Set(selectedSites);
    if (newSelected.has(siteId)) {
      newSelected.delete(siteId);
    } else {
      newSelected.add(siteId);
    }
    setSelectedSites(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedSites.size === filteredSites.length) {
      setSelectedSites(new Set());
    } else {
      setSelectedSites(new Set(filteredSites.map(s => s.id)));
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedSites.size === 0) {
      toast({ title: 'Error', description: 'Please select at least one site', variant: 'destructive' });
      return;
    }
    if (!bulkPhyAtStatus && !bulkSoftAtStatus) {
      toast({ title: 'Error', description: 'Please select at least one status to update', variant: 'destructive' });
      return;
    }

    try {
      const updatePayload = {
        siteIds: Array.from(selectedSites),
        phyAtStatus: bulkPhyAtStatus || undefined,
        softAtStatus: bulkSoftAtStatus || undefined,
      };
      console.log('[SiteStatus] Sending bulk status update:', updatePayload);
      
      const response = await fetchWithLoader(`${getApiBaseUrl()}/api/sites/bulk-update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[SiteStatus] API Error:', errorData);
        throw new Error(errorData.error || 'Failed to update');
      }
      
      const responseData = await response.json();
      console.log('[SiteStatus] Update response:', responseData);
      
      toast({ title: 'Success', description: `Updated ${selectedSites.size} sites` });
      setSelectedSites(new Set());
      setBulkPhyAtStatus('');
      setBulkSoftAtStatus('');
      
      console.log('[SiteStatus] Fetching updated sites...');
      await fetchSites();
      console.log('[SiteStatus] Sites refreshed, count:', sites.length);
    } catch (error: any) {
      console.error('[SiteStatus] Bulk update error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold tracking-tight mb-2">Site Status</h2>
            <p className="text-purple-100">View all sites with ATP Remarks and status information</p>
          </div>
          <Button 
            onClick={fetchSites} 
            disabled={loading}
            className="bg-white text-purple-600 hover:bg-purple-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by Plan ID, Circle, or District..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Site Status</label>
              <div className="flex gap-2 flex-wrap">
                {statusOptions.map(status => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus(status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredSites.length} of {sites.length} sites {selectedSites.size > 0 && `(${selectedSites.size} selected)`}
      </div>

      {/* Bulk Update Section */}
      {filteredSites.length > 0 && (
        <Card className="shadow-md border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Bulk Update Status</CardTitle>
            <CardDescription>Update Physical AT and Software AT status for selected sites</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Physical AT Status</label>
                <Select value={bulkPhyAtStatus} onValueChange={setBulkPhyAtStatus}>
                  <SelectTrigger data-testid="select-phy-at-status">
                    <SelectValue placeholder="Select Physical AT Status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Software AT Status</label>
                <Select value={bulkSoftAtStatus} onValueChange={setBulkSoftAtStatus}>
                  <SelectTrigger data-testid="select-soft-at-status">
                    <SelectValue placeholder="Select Software AT Status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={handleBulkUpdate} 
              disabled={selectedSites.size === 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="button-bulk-update"
            >
              Update {selectedSites.size > 0 ? `${selectedSites.size} Sites` : 'Sites'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sites Table */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading site status...</p>
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No sites found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold w-12">
                      <Checkbox 
                        checked={selectedSites.size === filteredSites.length && filteredSites.length > 0}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead className="font-semibold">Plan ID</TableHead>
                    <TableHead className="font-semibold">Circle</TableHead>
                    <TableHead className="font-semibold">District</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Phy AT Status</TableHead>
                    <TableHead className="font-semibold">Soft AT Status</TableHead>
                    <TableHead className="font-semibold">Visible in NMS</TableHead>
                    <TableHead className="font-semibold">Both AT Status</TableHead>
                    <TableHead className="font-semibold">ATP Remark</TableHead>
                    <TableHead className="font-semibold">Descope</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSites.map((site) => (
                    <TableRow key={site.id} className={`hover:bg-gray-50 transition-colors ${selectedSites.has(site.id) ? 'bg-blue-100' : ''}`}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedSites.has(site.id)}
                          onCheckedChange={() => toggleSiteSelection(site.id)}
                          data-testid={`checkbox-site-${site.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-blue-600 font-mono">{truncateId(site.planId)}</TableCell>
                      <TableCell>{site.circle || '-'}</TableCell>
                      <TableCell>{site.district || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(site.status)}>
                          {site.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(site.phyAtStatus || 'pending')}>
                          {site.phyAtStatus || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(site.softAtStatus || 'pending')}>
                          {site.softAtStatus || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getAtpStatusColor(site.visibleInNms)}>
                          {site.visibleInNms || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getAtpStatusColor(site.bothAtStatus)}>
                          {site.bothAtStatus || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {site.atpRemark ? (
                          <div className={`px-2 py-1 rounded text-xs ${getAtpStatusColor(site.atpRemark)}`}>
                            {site.atpRemark}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {site.atpRemark ? (
                          <div className={`px-2 py-1 rounded text-xs ${getAtpStatusColor(site.atpRemark)}`}>
                            {site.atpRemark}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {site.descope ? (
                          <Badge variant="destructive">{site.descope}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {filteredSites.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Active', 'Pending', 'Inactive'].map(status => {
                const count = filteredSites.filter(s => s.status === status).length;
                return (
                  <div key={status} className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">{status}</p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                );
              })}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">With ATP Remarks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredSites.filter(s => s.atpRemark).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
