import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';
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
  circle: string;
  district: string;
  status: string;
  atpRemark: string | null;
  phyAtRemark: string | null;
  softAtRemark: string | null;
  visibleInNms: string | null;
  bothAtStatus: string | null;
  descope: string | null;
}

export default function SiteStatus() {
  const [sites, setSites] = useState<SiteStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

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
      site.siteId.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                  placeholder="Search by Site ID, Circle, or District..."
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
        Showing {filteredSites.length} of {sites.length} sites
      </div>

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
                    <TableHead className="font-semibold">Site ID</TableHead>
                    <TableHead className="font-semibold">Circle</TableHead>
                    <TableHead className="font-semibold">District</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Visible in NMS</TableHead>
                    <TableHead className="font-semibold">Both AT Status</TableHead>
                    <TableHead className="font-semibold">ATP Remark</TableHead>
                    <TableHead className="font-semibold">Physical AT Remark</TableHead>
                    <TableHead className="font-semibold">Software AT Remark</TableHead>
                    <TableHead className="font-semibold">Descope</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSites.map((site) => (
                    <TableRow key={site.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium text-blue-600">{site.siteId}</TableCell>
                      <TableCell>{site.circle || '-'}</TableCell>
                      <TableCell>{site.district || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(site.status)}>
                            {site.status}
                          </Badge>
                          {site.softAtRemark === "Approved" && site.phyAtRemark === "Approved" && (
                            <span className="text-xs text-green-600 font-semibold" title="Auto-approved: Both AT remarks approved">✓</span>
                          )}
                        </div>
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
                        {site.phyAtRemark ? (
                          <div className="px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
                            {site.phyAtRemark}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {site.softAtRemark ? (
                          <div className="px-2 py-1 rounded text-xs bg-purple-50 text-purple-700">
                            {site.softAtRemark}
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
