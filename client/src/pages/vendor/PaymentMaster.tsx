import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import SmartSearchTextbox, { Suggestion } from "@/components/SmartSearchTextbox";
import { Plus, Edit2, Trash2, Loader } from "lucide-react";
import type { PaymentMaster, Site, Vendor } from "@shared/schema";

export default function PaymentMaster() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorSuggestions, setVendorSuggestions] = useState<Suggestion[]>([]);
  const [vendorSearchText, setVendorSearchText] = useState<string>("");
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [vendorRatesMap, setVendorRatesMap] = useState<Record<string, string>>({});
  const [vendorSites, setVendorSites] = useState<Site[]>([]);
  // Date inputs are empty by default; apply only when user clicks Date Search
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [appliedStartDate, setAppliedStartDate] = useState<string>('');
  const [appliedEndDate, setAppliedEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [siteAmounts, setSiteAmounts] = useState<Record<string, { siteAmount: string; vendorAmount: string }>>({});
  const [paymentMasters, setPaymentMasters] = useState<PaymentMaster[]>([]);
  const [filteredMasters, setFilteredMasters] = useState<PaymentMaster[]>([]);
  const [configSearchQuery, setConfigSearchQuery] = useState<string>('');
  const [editing, setEditing] = useState<PaymentMaster | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    antennaSize: "",
    siteAmount: "",
    vendorAmount: "",
  });

  const antennaOptions = ["0.6", "0.9", "1.2"];

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const mastersResP = fetch(`${getApiBaseUrl()}/api/payment-masters`, { credentials: 'include' });
      const vendorsP = fetch(`${getApiBaseUrl()}/api/vendors/all?minimal=true`, { credentials: 'include' }).then(r => r.json()).then(j => j.data || []);

      const [mastersRes, vendorsDataList] = await Promise.all([mastersResP, vendorsP]);

      if (!mastersRes.ok) throw new Error("Failed to fetch masters");
      const mastersData = await mastersRes.json();

      setVendors(vendorsDataList || []);
      setPaymentMasters(mastersData.data || []);

      // Build vendor suggestions for SmartSearchTextbox
      const sugg: Suggestion[] = vendorsDataList
        .map((v: any) => ({
          id: v.id,
          label: `${(v.name || '').trim()} — ${(v.vendorCode || '').trim()}`.trim(),
          name: v.name || '',
          code: v.vendorCode || ''
        }))
        .filter((s: Suggestion) => s.name || s.code)
        .sort((a: Suggestion, b: Suggestion) => (a.code || '').toString().localeCompare((b.code || '').toString(), undefined, { numeric: true, sensitivity: 'base' }));
      setVendorSuggestions(sugg);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill vendor amount when antenna size selected and a vendor rate exists
  useEffect(() => {
    if (formData.antennaSize && selectedVendor) {
      const rate = vendorRatesMap[formData.antennaSize];
      if (rate && !formData.vendorAmount) {
        setFormData(prev => ({ ...prev, vendorAmount: rate }));
      }
    }
  }, [formData.antennaSize, selectedVendor, vendorRatesMap]);

  // If a single site is selected and antenna is set, prefill vendor amount if available
  useEffect(() => {
    if (selectedSite && formData.antennaSize && vendorRatesMap[formData.antennaSize] && !formData.vendorAmount) {
      setFormData(prev => ({ ...prev, vendorAmount: vendorRatesMap[formData.antennaSize] }));
    }
  }, [selectedSite, formData.antennaSize, vendorRatesMap]);

  // Load sites when vendor is selected
  useEffect(() => {
    if (selectedVendor) {
      loadVendorSites();
      loadVendorRates(selectedVendor);
    } else {
      setAllSites([]);
    }
  }, [selectedVendor]);

  const loadVendorRates = async (vendorId: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}/rates`, { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Failed to fetch vendor rates', json);
        throw new Error(json?.error || 'Failed to fetch rates');
      }
      const map: Record<string,string> = {};
      (json.data || []).forEach((r: any) => { map[String(r.antennaSize)] = String(r.vendorAmount); });
      setVendorRatesMap(map);
    } catch (e) {
      console.error('loadVendorRates error', e);
      setVendorRatesMap({});
    }
  };



  // If a single site is selected and has a known antenna, prefill form antenna and vendor amount if empty
  useEffect(() => {
    if (selectedSite) {
      const antFromSite = selectedSite.maxAntSize ? String(selectedSite.maxAntSize) : '';
      const ant = formData.antennaSize || antFromSite;
      if (ant && !formData.antennaSize) {
        setFormData(prev => ({ ...prev, antennaSize: ant }));
      }
      if (ant && vendorRatesMap[ant] && !formData.vendorAmount) {
        setFormData(prev => ({ ...prev, vendorAmount: vendorRatesMap[ant] }));
      }
    }
  }, [selectedSite, vendorRatesMap]);
  const saveVendorRate = async (antenna: string, amount: string) => {
    if (!selectedVendor) return;
    if (!selectedVendor) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/vendors/${selectedVendor}/rates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ antennaSize: antenna, vendorAmount: amount }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('saveVendorRate failed', json);
        throw new Error(json?.error || 'Failed to save');
      }
      await loadVendorRates(selectedVendor);
      toast({ title: 'Saved', description: `Rate ${amount} saved for ${antenna} kVA` });
    } catch (e) {
      console.error('saveVendorRate error', e);
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to save vendor rate', variant: 'destructive' });
    }
  };

  const deleteVendorRate = async (antenna: string) => {
    if (!selectedVendor) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/vendors/${selectedVendor}/rates/${antenna}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('deleteVendorRate failed', json);
        throw new Error(json?.error || 'Failed to delete');
      }
      await loadVendorRates(selectedVendor);
      toast({ title: 'Deleted', description: `Rate for ${antenna} kVA removed` });
    } catch (e) {
      console.error('deleteVendorRate error', e);
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to delete vendor rate', variant: 'destructive' });
    }
  };

  const loadVendorSites = async () => {
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/sites?vendorId=${selectedVendor}&pageSize=500`
      );
      if (!response.ok) throw new Error("Failed to fetch sites");
      const data = await response.json();
      setAllSites(data.data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load sites",
        variant: "destructive",
      });
    }
  };

  // Filter sites when vendor changes or date filters change
  // Filter sites when vendor changes or applied date filters change
  useEffect(() => {
    filterSites();
  }, [selectedVendor, appliedStartDate, appliedEndDate, searchQuery, allSites, paymentMasters, formData.antennaSize]);

  const [totalVendorSitesCount, setTotalVendorSitesCount] = useState<number>(0);
  const [excludedByMasterCount, setExcludedByMasterCount] = useState<number>(0);

  const filterSites = () => {
    if (!selectedVendor) {
      setVendorSites([]);
      setSelectedSite(null);
      setFilteredMasters([]);
      setShowForm(false);
      setEditing(null);
      setTotalVendorSitesCount(0);
      setExcludedByMasterCount(0);
      return;
    }

    // Filter by vendor
    let filtered = allSites.filter((site) => site.vendorId === selectedVendor);
    const totalVendorSites = filtered.length;

    // Exclude sites which already have payment master for this vendor (and antenna if set)
    const hasPaymentMaster = (site: Site) => {
      if (!selectedVendor) return false;
      if (formData.antennaSize) {
        return paymentMasters.some(m => String(m.vendorId) === String(selectedVendor) && String(m.siteId) === String(site.id) && String(m.antennaSize) === String(formData.antennaSize));
      }
      return paymentMasters.some(m => String(m.vendorId) === String(selectedVendor) && String(m.siteId) === String(site.id));
    };

    filtered = filtered.filter(site => !hasPaymentMaster(site));
    const excludedCount = totalVendorSites - filtered.length;

    // Apply antenna size filter if selected (show only sites with matching antenna size)
    if (formData.antennaSize) {
      const sel = String(formData.antennaSize).trim();
      filtered = filtered.filter((site) => String(site.maxAntSize || '').trim() === sel);
    }

    // Apply applied date filter if present (using siteAInstallationDate)
    if (appliedStartDate || appliedEndDate) {
      const fromDate = appliedStartDate ? new Date(appliedStartDate) : null;
      const toDate = appliedEndDate ? new Date(appliedEndDate) : null;
      filtered = filtered.filter((site) => {
        const installDate = site.siteAInstallationDate ? new Date(site.siteAInstallationDate) : null;
        if (!installDate) return false; // Exclude sites without installation date
        if (fromDate && installDate < fromDate) return false;
        if (toDate && installDate > toDate) return false;
        return true;
      });
    }

    // Smart search filter - search across multiple fields
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((site) => {
        return (
          site.planId?.toLowerCase().includes(query) ||
          site.hopAB?.toLowerCase().includes(query) ||
          site.hopBA?.toLowerCase().includes(query) ||
          site.maxAntSize?.toLowerCase().includes(query) ||
          site.siteAAntDia?.toLowerCase().includes(query) ||
          site.siteBAntDia?.toLowerCase().includes(query) ||
          site.status?.toLowerCase().includes(query) ||
          site.siteAName?.toLowerCase().includes(query) ||
          site.siteBName?.toLowerCase().includes(query) ||
          site.id.toLowerCase().includes(query) ||
          site.district?.toLowerCase().includes(query) ||
          site.circle?.toLowerCase().includes(query)
        );
      });
    }

    setVendorSites(filtered);
    setSelectedSite(null);
    setSelectedSites(new Set());
    setFilteredMasters(paymentMasters.filter(m => String(m.vendorId) === String(selectedVendor)));
    setShowForm(true);
    setEditing(null);
    setTotalVendorSitesCount(totalVendorSites);
    setExcludedByMasterCount(excludedCount);
  };

  // Multiselect handler
  const handleSiteCheckbox = (site: Site, checked: boolean) => {
    const next = new Set(selectedSites);
    if (checked) {
      next.add(site.id);
      setSiteAmounts(prev => ({ ...prev, [site.id]: prev[site.id] || { siteAmount: '', vendorAmount: '' } }));
      // clear single selection when using multi-select
      setSelectedSite(null);
    } else {
      next.delete(site.id);
    }
    setSelectedSites(next);
  };

  // For single site details (legacy)
  const handleSiteSelect = (site: Site) => {
    setSelectedSite(site);
    setSelectedSites(new Set([site.id]));
    setShowForm(false);
    setEditing(null);
    setFormData({ antennaSize: "", siteAmount: "", vendorAmount: "" });

    const masters = paymentMasters.filter(
      (m) => m.siteId === site.id && m.vendorId === selectedVendor
    );
    setFilteredMasters(masters);
  };

  const handleAddNew = () => {
    setEditing(null);
    setFormData({ antennaSize: "", siteAmount: "", vendorAmount: "" });
    setShowForm(true);
  };

  const handleEdit = (master: PaymentMaster) => {
    setEditing(master);
    setFormData({
      antennaSize: master.antennaSize,
      siteAmount: String(master.siteAmount),
      vendorAmount: String(master.vendorAmount),
    });
    setShowForm(true);
  };

  // Compute vendor amount to display for a site (prefers explicit payment master, then vendor rate, then per-site input)
  const getVendorAmountDisplay = (site: Site) => {
    // Try PaymentMaster for this site + vendor (+ antenna if set)
    const master = paymentMasters.find(m => String(m.siteId) === String(site.id) && String(m.vendorId) === String(selectedVendor) && (!formData.antennaSize || String(m.antennaSize) === String(formData.antennaSize)));
    if (master && master.vendorAmount != null && String(master.vendorAmount).trim() !== "") {
      return `Rs ${parseFloat(String(master.vendorAmount)).toFixed(2)}`;
    }
    // Fallback: vendor rate for antenna
    const ant = String(site.maxAntSize || "");
    const rate = vendorRatesMap[ant];
    if (rate) {
      const parsed = parseFloat(String(rate));
      if (!isNaN(parsed)) return `Rs ${parsed.toFixed(2)}`;
    }
    // Fallback: per-site input the user may have typed but not saved
    const typed = siteAmounts[site.id]?.vendorAmount;
    if (typed && String(typed).trim() !== "") {
      const parsed = parseFloat(String(typed));
      if (!isNaN(parsed)) return `Rs ${parsed.toFixed(2)}`;
      return String(typed);
    }
    return 'N/A';
  };

  const handleSave = async () => {
    // Require vendor and either a single selected site or multiple selected sites
    if (!selectedVendor || (!selectedSite && selectedSites.size === 0 && !editing)) {
      toast({ title: "Error", description: "Please select vendor and at least one site", variant: "destructive" });
      return;
    }

    // For editing single record, require antenna size and vendor amount (site amount optional)
    if (editing) {
      if (!formData.antennaSize || !formData.vendorAmount) {
        toast({ title: "Error", description: "Please select antenna size and provide vendor amount", variant: "destructive" });
        return;
      }
    }

    // For bulk create, ensure we have antenna size and amounts either per-site or global
    if (!editing && selectedSites.size > 0) {
      if (!formData.antennaSize) {
        toast({ title: "Error", description: "Please select antenna size for bulk create", variant: "destructive" });
        return;
      }
      // check that for every selected site we have vendor amount (per-site or global); site amount is optional (falls back to vendor amount)
      const globalVendorAmt = formData.vendorAmount;
      let missing = false;
      Array.from(selectedSites).forEach(id => {
        const b = siteAmounts[id]?.vendorAmount || '';
        if (!b && !globalVendorAmt) missing = true;
      });
      if (missing) {
        toast({ title: "Error", description: "Please provide vendor amounts for all selected sites or provide a global vendor amount", variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      const baseUrl = getApiBaseUrl();

      if (editing && editing.id) {
        const payload = {
          antennaSize: formData.antennaSize,
          siteAmount: formData.siteAmount ? parseFloat(formData.siteAmount) : null,
          vendorAmount: parseFloat(formData.vendorAmount),
        };
        const response = await fetch(`${baseUrl}/api/payment-masters/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
        if (!response.ok) throw new Error('Failed to update');
        toast({ title: 'Success', description: 'Payment master updated' });
      } else if (selectedSites.size > 0) {
        // Batch create - send all records in one shot
        const payloads = [];
        for (const sid of Array.from(selectedSites)) {
          const site = vendorSites.find(s => s.id === sid) || allSites.find(s => s.id === sid);
          if (!site) continue;
          const amt = siteAmounts[sid] || { siteAmount: '', vendorAmount: '' };
          const vendorAmount = amt.vendorAmount || formData.vendorAmount || vendorRatesMap[formData.antennaSize || ''] || '';
          const siteAmount = amt.siteAmount || formData.siteAmount || '';
          if (!vendorAmount) continue;

          payloads.push({
            siteId: site.id,
            planId: site.planId || '',
            vendorId: selectedVendor,
            antennaSize: formData.antennaSize,
            siteAmount: siteAmount ? parseFloat(siteAmount) : null,
            vendorAmount: parseFloat(vendorAmount)
          });
        }

        if (payloads.length === 0) {
          toast({ title: 'Error', description: 'No valid payment masters to save', variant: 'destructive' });
          setSaving(false);
          return;
        }

        const response = await fetch(`${baseUrl}/api/payment-masters/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payloads)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to save payment masters');

        toast({ title: 'Success', description: `${result.created} payment masters created` });
        if (result.errors && result.errors.length > 0) {
          console.warn('[PaymentMaster] batch errors:', result.errors.slice(0, 10));
        }
      } else {
        // Single create
        const site = selectedSite as Site;
        const vendorAmountSingle = formData.vendorAmount || vendorRatesMap[formData.antennaSize || ''] || '';
        const siteAmountSingle = formData.siteAmount || '';
        if (!vendorAmountSingle) { throw new Error('Vendor amount is required'); }
        const payload = {
          siteId: site.id,
          planId: site.planId || "",
          vendorId: selectedVendor,
          antennaSize: formData.antennaSize,
          siteAmount: siteAmountSingle ? parseFloat(siteAmountSingle) : null,
          vendorAmount: parseFloat(vendorAmountSingle),
        };
        const response = await fetch(`${baseUrl}/api/payment-masters`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
        if (!response.ok) throw new Error('Failed to save');
        toast({ title: 'Success', description: 'Payment master created' });
      }

      await loadInitialData();
      setShowForm(false);
      setEditing(null);
      setSelectedSite(null);
      setSelectedSites(new Set());
      setSiteAmounts({});
      if (selectedSite) handleSiteSelect(selectedSite);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save payment master', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    setSaving(true);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/payment-masters/${id}`,
        {
          method: "DELETE",
          credentials: 'include'
        }
      );

      if (!response.ok) throw new Error("Failed to delete");

      toast({
        title: "Success",
        description: "Payment master deleted",
      });

      await loadInitialData();
      if (selectedSite) {
        handleSiteSelect(selectedSite);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete payment master",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SkeletonLoader />;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Payment Master</h2>
        <p className="text-muted-foreground">
          Configure site and vendor amounts by antenna size
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Vendor Selection and Filters */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Select Vendor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <SmartSearchTextbox
                  value={vendorSearchText}
                  onChange={(v: any) => { const vv = typeof v === 'string' ? v : (v?.target?.value ?? ''); setVendorSearchText(vv); if (!vv) setSelectedVendor(''); }}
                  onSelect={(s: any) => {
                    const sel = s as Suggestion;
                    setVendorSearchText(sel.label || sel.name || '');
                    setSelectedVendor(sel.id || '');
                  }}
                  suggestions={vendorSuggestions}
                  placeholder="Search vendor..."
                  inputClassName="w-full px-3 py-2 border rounded-md bg-background"
                  maxSuggestions={5000}
                />
                {vendorSearchText && (
                  <Button size="sm" variant="ghost" onClick={() => { setVendorSearchText(''); setSelectedVendor(''); }} className="w-full">
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedVendor && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Vendor Rates (Antenna-wise)</CardTitle>
                <CardDescription>Set default vendor amount per antenna size (auto-applies on Add)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 items-center mb-2">
                  <select id="vendorRateAntenna" className="w-28 h-8 text-sm border rounded px-2">
                    <option value="">Antenna</option>
                    {antennaOptions.map(a => <option key={a} value={a}>{a} kVA</option>)}
                  </select>
                  <input id="vendorRateAmount" className="w-36 h-8 text-sm border rounded px-2" type="number" placeholder="Vendor Rs" />
                  <Button size="sm" onClick={() => {
                    const ant = (document.getElementById('vendorRateAntenna') as HTMLSelectElement)?.value;
                    const amt = (document.getElementById('vendorRateAmount') as HTMLInputElement)?.value;
                    if (!ant || !amt) { toast({ title: 'Error', description: 'Select antenna and amount', variant: 'destructive' }); return; }
                    saveVendorRate(ant, amt);
                    (document.getElementById('vendorRateAntenna') as HTMLSelectElement).value = '';
                    (document.getElementById('vendorRateAmount') as HTMLInputElement).value = '';
                  }}>Save Rate</Button>
                </div>
                <div className="space-y-1">
                  {Object.keys(vendorRatesMap).length > 0 ? Object.entries(vendorRatesMap).map(([ant, amt]) => (
                    <div key={ant} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                      <div>{ant} kVA — Rs {amt}</div>
                      <div>
                        <Button size="sm" variant="ghost" onClick={() => deleteVendorRate(ant)}>Delete</Button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-xs text-muted-foreground">No vendor rates defined for this vendor</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedVendor && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Smart Search</CardTitle>
                <CardDescription>Search by Plan ID, HOP, Antenna, Status, etc.</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  type="text"
                  placeholder="Search sites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-sm"
                  title="Search by: Plan ID, HOP A→B, HOP B→A, Max Antenna Size, Site A Antenna Diameter, Site B Antenna Diameter, Status, Site A Name, Site B Name, Site ID, District, Circle"
                />
                {searchQuery && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Found {vendorSites.length} site(s)
                  </p>
                )}
              </CardContent>
            </Card>
          )}



          {!selectedSite && selectedVendor && (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground text-center">
                  Select a site from the right panel<br />to configure payment details
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Vendor Sites List */}
        <div className="lg:col-span-2">
          {selectedVendor ? (
            <Card className="h-full">
              <CardHeader className="pb-3 p-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
                  <div className="flex flex-col">
                    <CardTitle className="text-lg text-white flex items-center gap-2 leading-tight">
                      <span className="inline-block w-3 h-3 rounded-full bg-white/30" />
                      <span className="whitespace-nowrap">Vendor Sites</span>
                      <span className="ml-2 inline-block bg-white text-black rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap">{vendorSites.length} sites</span>
                    </CardTitle>
                    <CardDescription className="text-white/90">{totalVendorSitesCount > vendorSites.length ? `(showing ${vendorSites.length} of ${totalVendorSitesCount}, ${excludedByMasterCount} excluded)` : `(${vendorSites.length} sites)`}</CardDescription>
                  </div>

                  <div className="flex items-center gap-2 md:ml-4 md:pl-4">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-32 h-8 text-xs border rounded px-2 bg-white text-black"
                      title="From date (site A installation)"
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-32 h-8 text-xs border rounded px-2 bg-white text-black"
                      title="To date (site A installation)"
                    />
                    <Button size="sm" variant="outline" onClick={() => { setAppliedStartDate(startDate); setAppliedEndDate(endDate); }} className="text-xs">Date Search</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAppliedStartDate(''); setAppliedEndDate(''); setStartDate(''); setEndDate(''); }} className="text-xs">Clear</Button>
                  </div>
                </div>
              </CardHeader>
              <hr className="border-white/20 mt-3" />
              <CardContent>
                {/* Action bar: stays outside the scrollable sites list */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex flex-col">
                    <select value={formData.antennaSize} onChange={(e) => setFormData(prev => ({ ...prev, antennaSize: e.target.value }))} className="w-28 h-8 text-sm border rounded px-2 mt-2">
                      <option value="">Antenna</option>
                      {antennaOptions.map(a => <option key={a} value={a}>{a} kVA</option>)}
                    </select>
                    {selectedSites.size > 0 && !formData.antennaSize && (
                      <div className="text-xs text-yellow-700 mt-1">Select antenna size to enable bulk save</div>
                    )}
                  </div>
                  <input id="applySiteAmt" type="number" placeholder="Site Rs (apply)" className="w-28 h-8 text-xs border rounded px-2" />
                  <input id="applyVendorAmt" type="number" placeholder="Vendor Rs (apply)" className="w-28 h-8 text-xs border rounded px-2" />

                  <Button size="sm" onClick={() => {
                    const siteValue = (document.getElementById('applySiteAmt') as HTMLInputElement)?.value;
                    const vendorValue = (document.getElementById('applyVendorAmt') as HTMLInputElement)?.value;
                    if (!siteValue && !vendorValue) { toast({ title: 'Info', description: 'Enter site or vendor amount to apply', variant: 'default' }); return; }
                    const next = { ...siteAmounts };
                    selectedSites.forEach(id => { next[id] = { siteAmount: siteValue || (next[id]?.siteAmount || ''), vendorAmount: vendorValue || (next[id]?.vendorAmount || '') }; });
                    setSiteAmounts(next);
                  }} className="bg-emerald-600 hover:bg-emerald-700 text-white">Apply to selected</Button>

                  <Button size="sm" variant="outline" onClick={() => { setSelectedSites(new Set(vendorSites.map(s => s.id))); const amounts: any = {}; vendorSites.forEach(s => { amounts[s.id] = { siteAmount: '', vendorAmount: '' }; }); setSiteAmounts(amounts); }}>Select all</Button>

                  <Button size="sm" variant="ghost" onClick={() => { setSelectedSites(new Set()); setSiteAmounts({}); }}>Clear</Button>

                  <Button
                    size="sm"
                    onClick={async () => { await handleSave(); }}
                    disabled={selectedSites.size === 0 || !formData.antennaSize || saving}
                    className={`ml-auto px-3 ${(selectedSites.size > 0 && formData.antennaSize && !saving) ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-600 cursor-not-allowed'}`}
                    title={saving ? 'Saving...' : (!formData.antennaSize ? 'Select antenna size for bulk create' : (selectedSites.size === 0 ? 'Select at least one site to enable' : `Save ${selectedSites.size} selected site(s)`))}
                  >
                    {saving ? (
                      <div className="flex items-center gap-2">
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>Saving...</span>
                      </div>
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>

                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                  {vendorSites.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No sites found
                    </p>
                  ) : (
                    <>
                      {vendorSites.map((site) => (
                        <div key={site.id} className="flex items-center gap-2 border rounded px-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedSites.has(site.id)}
                            onChange={e => handleSiteCheckbox(site, e.target.checked)}
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-xs mb-0.5">{site.siteAName || site.id}</p>
                            <p className="text-xs mb-1 text-gray-600">{site.district || site.circle || "-"}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs">
                              <div>
                                <span className="text-gray-500">Plan: </span>
                                <span className="font-medium">{site.planId || "-"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Circle: </span>
                                <span className="font-medium">{site.circle || "-"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Ant: </span>
                                <span className="font-medium">{site.maxAntSize || "-"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Status: </span>
                                <span className="font-medium capitalize">{site.status || "-"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {selectedSite && selectedSite.id === site.id ? (
                              // When expanded (single selected site), only show vendor amount (computed)
                              <div className="flex items-center gap-2">
                                <div className="w-28 h-8 text-xs text-right text-muted-foreground">&nbsp;</div>
                                <div className="w-28 h-8 text-xs text-right font-medium">{getVendorAmountDisplay(site)}</div>
                              </div>
                            ) : (
                              // Default list view: editable inputs for bulk selection
                              <>
                                <input className="w-28 h-8 text-xs border rounded px-2" type="number" placeholder={vendorRatesMap[String(site.maxAntSize||'')] ? `Auto: Rs ${vendorRatesMap[String(site.maxAntSize||'')]}` : "Site Rs"} value={siteAmounts[site.id]?.siteAmount || ''} onChange={(e) => setSiteAmounts(prev => ({ ...prev, [site.id]: { ...(prev[site.id] || { siteAmount: '', vendorAmount: '' }), siteAmount: e.target.value } }))} />
                                <input className="w-28 h-8 text-xs border rounded px-2" type="number" placeholder={vendorRatesMap[String(site.maxAntSize||'')] ? `Auto: Rs ${vendorRatesMap[String(site.maxAntSize||'')]}` : "Vendor Rs"} value={siteAmounts[site.id]?.vendorAmount || ''} onChange={(e) => setSiteAmounts(prev => ({ ...prev, [site.id]: { ...(prev[site.id] || { siteAmount: '', vendorAmount: '' }), vendorAmount: e.target.value } }))} />
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <p className="text-muted-foreground text-center">
                  Please select a vendor from the left panel<br />to view sites
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom Section - Payment Configuration - Full Width */}
      {selectedVendor && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Payment Configurations</CardTitle>
                <CardDescription>
                  Configurations for {vendors.find(v => String(v.id) === String(selectedVendor))?.name || 'selected vendor'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Search configs..."
                  value={configSearchQuery}
                  onChange={(e) => setConfigSearchQuery(e.target.value)}
                  className="h-8 text-sm w-52"
                />
                <p className="text-xs text-muted-foreground">{filteredMasters.length ? `${filteredMasters.length} configs` : ''}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredMasters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No payment configurations found for this vendor.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="sticky top-0 z-10 bg-white/95 py-2 px-2 text-left font-semibold">Antenna Size</th>
                        <th className="sticky top-0 z-10 bg-white/95 py-2 px-2 text-left font-semibold">Plan ID</th>
                        <th className="sticky top-0 z-10 bg-white/95 py-2 px-2 text-left font-semibold">HOP A-B</th>
                        <th className="sticky top-0 z-10 bg-white/95 py-2 px-2 text-right font-semibold">Site Amount</th>
                        <th className="sticky top-0 z-10 bg-white/95 py-2 px-2 text-right font-semibold">Vendor Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMasters.filter((master) => {
                        const q = configSearchQuery.trim().toLowerCase();
                        if (!q) return true;
                        const site = allSites.find(s => String(s.id) === String(master.siteId));
                        return String(master.antennaSize || '').toLowerCase().includes(q)
                          || String(master.siteAmount || '').toLowerCase().includes(q)
                          || String(master.vendorAmount || '').toLowerCase().includes(q)
                          || String(master.planId || '').toLowerCase().includes(q)
                          || String(site?.hopAB || '').toLowerCase().includes(q);
                      }).map((master) => {
                        const hasSiteAmount = master.siteAmount !== null && master.siteAmount !== undefined && String(master.siteAmount).trim() !== '';
                        const siteForMaster = allSites.find(s => String(s.id) === String(master.siteId));
                        const hopAB = siteForMaster?.hopAB || siteForMaster?.id || '-';
                        return (
                          <tr key={master.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-2">{master.antennaSize} kVA</td>
                            <td className="py-2 px-2">{master.planId || '-'}</td>
                            <td className="py-2 px-2">{hopAB}</td>
                            <td className="text-right py-2 px-2">{hasSiteAmount ? `Rs ${parseFloat(String(master.siteAmount)).toFixed(2)}` : 'N/A'}</td>
                            <td className="text-right py-2 px-2">{master.vendorAmount != null && String(master.vendorAmount).trim() !== '' ? `Rs ${parseFloat(String(master.vendorAmount)).toFixed(2)}` : 'N/A'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
