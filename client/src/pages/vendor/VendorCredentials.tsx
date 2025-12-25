import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { Copy, RotateCw } from "lucide-react";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import SmartSearchTextbox, { Suggestion } from "@/components/SmartSearchTextbox";
import type { Vendor } from "@shared/schema";

export default function VendorCredentials() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]); // ALL vendors for search suggestions
  const [allVendorsLoading, setAllVendorsLoading] = useState<boolean>(false);
  const [generatedPasswords, setGeneratedPasswords] = useState<Record<string, string>>({});
  const [loadingVendorId, setLoadingVendorId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalVendors, setTotalVendors] = useState(0);
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>("");
  const [vendorSuggestions, setVendorSuggestions] = useState<Suggestion[]>([]);
  const { toast } = useToast();

  // Load all vendors once for search suggestions
  useEffect(() => {
    const loadAllVendorsForSearch = async () => {
      try {
        setAllVendorsLoading(true);
        // Use the lightweight all vendors endpoint with minimal=true to reduce payload
        const url = `${getApiBaseUrl()}/api/vendors/all?minimal=true`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setAllVendors(data.data || []);
        }
      } catch (error) {
        console.error('Failed to load all vendors for search:', error);
      } finally {
        setAllVendorsLoading(false);
      }
    };
    loadAllVendorsForSearch();
  }, []);

  useEffect(() => {
    loadVendors();
  }, [currentPage, pageSize, selectedVendorFilter]);

  // Build vendor suggestions from ALL vendors (not just paginated ones)
  useEffect(() => {
    const sugg = allVendors
      .map((v: any) => ({
        id: v.id,
        label: `${(v.name || '').trim()} — ${(v.vendorCode || '').trim()}`.trim(),
        name: v.name || '',
        code: v.vendorCode || ''
      }))
      .filter((s: any) => s.name || s.code)
      .sort((a: any, b: any) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    setVendorSuggestions(sugg);
  }, [allVendors]);

  const loadVendors = async () => {
    try {
      setTableLoading(true);
      // If a specific vendor is selected by id, fetch just that vendor (fast)
      if (selectedVendorFilter) {
        const url = `${getApiBaseUrl()}/api/vendors/${selectedVendorFilter}`;
        const response = await fetch(url);
        if (!response.ok) {
          if (response.status === 404) {
            setVendors([]);
            setTotalVendors(0);
            return;
          }
          throw new Error('Failed to fetch vendor');
        }
        const vendor = await response.json();
        setVendors([vendor]);
        setTotalVendors(1);
        return;
      }

      // Otherwise use paginated fetch (full list)
      const params = new URLSearchParams();
      params.append('page', String(currentPage));
      params.append('pageSize', String(pageSize));

      const url = `${getApiBaseUrl()}/api/vendors?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch vendors');
      const data = await response.json();

      const vendorsData = data.data || [];
      setVendors(vendorsData);
      setTotalVendors(data.totalCount || 0);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load vendors",
        variant: "destructive",
      });
    } finally {
      setPageLoading(false);
      setTableLoading(false);
    }
  };

  const handleGeneratePassword = async (vendorId: string) => {
    setLoadingVendorId(vendorId);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}/generate-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate password");
      }

      setGeneratedPasswords(prev => ({
        ...prev,
        [vendorId]: data.tempPassword
      }));
      
      toast({
        title: "Success",
        description: data.message,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate password",
        variant: "destructive",
      });
    } finally {
      setLoadingVendorId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Password copied to clipboard",
    });
  };

  if (pageLoading) {
    // Show table-row skeleton for initial page load so the grid doesn't flash 'No vendors found'
    return (
      <div className="border rounded-lg">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto rounded-md border bg-card">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr>
                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Vendor Name</th>
                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Email (Username)</th>
                <th className="p-3 text-center font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Role</th>
                <th className="p-3 text-center font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Status</th>
                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Generated Password</th>
                <th className="p-3 text-center font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                  <td className="px-3 py-3">
                    <div className="h-4 w-44 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto"></div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto"></div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Vendor Credentials Manager</h2>
        <p className="text-sm text-muted-foreground">Manage and generate vendor login credentials</p>
      </div>

      {/* SmartSearch for vendor filtering */}
      {vendors.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Filter by Vendor:</label>
          <SmartSearchTextbox
            value={selectedVendorFilter ? (allVendors.find(v => v.id === selectedVendorFilter)?.name || '') : ''}
            onChange={(v) => {
              if (!v) setSelectedVendorFilter('');
            }}
            onSelect={(s) => {
              if (s && 'id' in s) {
                setSelectedVendorFilter((s as Suggestion).id || '');
              }
            }}
            suggestions={vendorSuggestions}
            loading={allVendorsLoading || tableLoading}
            placeholder="Search vendor by name or code..."
            maxSuggestions={5000}
            className="flex-1"
          />
          {selectedVendorFilter && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedVendorFilter('');
              }}
              className="whitespace-nowrap"
            >
              Clear Filter
            </Button>
          )}
        </div>
      )}

      {(() => {
        // Filter vendors based on selected vendor filter
        const filteredVendors = vendors.filter(vendor => !selectedVendorFilter || vendor.id === selectedVendorFilter);
        const totalFiltered = filteredVendors.length;
        const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
        const displayedPage = Math.min(currentPage, totalPages);
        const startIndex = (displayedPage - 1) * pageSize;
        const paginatedVendors = filteredVendors.slice(startIndex, startIndex + pageSize);

        if (totalFiltered === 0) {
          // When the table is loading, show a table-shaped skeleton instead of "No vendors found"
          if (tableLoading) {
            return (
              <div className="border rounded-lg">
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto rounded-md border bg-card">
                          <table className="w-full text-sm min-w-[900px]">
                            <thead>
                              <tr>
                                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Vendor Name</th>
                                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Email (Username)</th>
                                <th className="p-3 text-center font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Role</th>
                                <th className="p-3 text-center font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Status</th>
                                <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Generated Password</th>
                                <th className="p-3 text-center font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                                  <td className="px-3 py-3">
                                    <div className="h-4 w-44 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto"></div>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto"></div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto"></div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                </div>
              </div>
            );
          }

          return <div className="text-center py-8 text-muted-foreground">No vendors found</div>;
        }

        return (
          <div className="border rounded-lg">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto rounded-md border bg-card">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr>
                    <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Vendor Name</th>
                    <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Email (Username)</th>
                    <th className="p-3 text-center font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Role</th>
                    <th className="p-3 text-center font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Status</th>
                    <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Generated Password</th>
                    <th className="p-3 text-center font-semibold sticky top-0 z-20 bg-primary text-primary-foreground">Action</th>
                  </tr>
                </thead>
                {tableLoading ? (
                  <tbody>
                    <tr>
                      <td colSpan={6} className="p-8">
                        <SkeletonLoader type="table" count={5} />
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody>
                    {paginatedVendors.map((vendor, idx) => (
                      <tr key={vendor.id} className={`border-b hover:bg-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                        <td className="px-3 py-2 font-medium">{vendor.name} ({vendor.vendorCode || 'N/A'})</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Input
                              type="text"
                              value={vendor.email}
                              disabled
                              className="bg-slate-100 h-7 text-xs"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(vendor.email)}
                              className="px-2 h-7"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="text-xs px-2 py-1 rounded font-semibold bg-blue-100 text-blue-800">
                            {(vendor as any).role || "Vendor"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`text-xs px-2 py-1 rounded font-semibold ${
                              vendor.password
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {vendor.password ? "Set" : "No Pass"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {generatedPasswords[vendor.id] ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="text"
                                value={generatedPasswords[vendor.id]}
                                disabled
                                className="bg-green-50 font-mono h-7 text-xs"
                              />
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => copyToClipboard(generatedPasswords[vendor.id])}
                                className="px-2 h-7"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGeneratePassword(vendor.id)}
                            disabled={loadingVendorId === vendor.id}
                            className="gap-1 h-7"
                          >
                            {loadingVendorId === vendor.id ? (
                              <>
                                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="text-xs">Generating...</span>
                              </>
                            ) : (
                              <>
                                <RotateCw className="h-3 w-3" />
                                <span className="text-xs">{vendor.password ? "Reset" : "Generate"}</span>
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
              {/* Table footer: sticky pagination inside the scrollable container */}
              {totalFiltered > 0 && (
                <div className="sticky bottom-0 bg-card/90 backdrop-blur border-t p-2 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Showing {totalFiltered === 0 ? 0 : startIndex + 1} - {Math.min(totalFiltered, startIndex + pageSize)} of {totalFiltered.toLocaleString()} vendors</div>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(1)} disabled={displayedPage === 1}>First</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={displayedPage === 1}>Prev</Button>
                    <div className="px-2">Page</div>
                    <Input value={String(displayedPage)} onChange={(e) => { const v = Number(e.target.value || 1); if (!isNaN(v)) setCurrentPage(Math.min(Math.max(1, v), totalPages)); }} className="w-16 text-center" onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
                    <div className="px-2">of {totalPages}</div>
                    <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={displayedPage === totalPages}>Next</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(totalPages)} disabled={displayedPage === totalPages}>Last</Button>
                    <select className="form-select text-sm" value={String(pageSize)} onChange={(e) => { const v = Number(e.target.value || 50); setPageSize(v); setCurrentPage(1); }}>
                      {[10,25,50,100].map(sz => <option key={sz} value={sz}>{sz}</option>) }
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-slate-700 space-y-1">
        <p className="font-semibold">How to Use:</p>
        <p>• Click <strong>"Generate"</strong> button to create login credentials</p>
        <p>• Copy email (username) and generated password</p>
        <p>• Share credentials with vendor securely</p>
        <p>• Vendor logs in at <strong>/vendor-login</strong></p>
        <p>• Click <strong>"Reset"</strong> to generate new password anytime</p>
      </div>


    </div>
  );
}
