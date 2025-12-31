import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SmartSearchTextbox, { Suggestion } from "@/components/SmartSearchTextbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { authenticatedFetch } from "@/lib/fetchWithLoader";
import type { Vendor } from "@shared/schema";
import { useLocation } from "wouter";

export default function VendorRates() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorSuggestions, setVendorSuggestions] = useState<Suggestion[]>([]);
  const [vendorSearchText, setVendorSearchText] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [rates, setRates] = useState<Array<{ antennaSize: string; vendorAmount: string }>>([]);
  const [antenna, setAntenna] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const role = (typeof window !== 'undefined' ? localStorage.getItem('employeeRole') : '')?.toLowerCase() || '';
    if (role !== 'admin' && role !== 'superadmin') {
      toast({ title: 'Access Denied', description: 'You do not have access to Vendor Rates', variant: 'destructive' });
      navigate('/');
      return;
    }
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await authenticatedFetch(`${getApiBaseUrl()}/api/vendors/all?minimal=true`);
      if (!res.ok) throw new Error('Failed to fetch vendors');
      const json = await res.json();
      const vendorsData = json.data || [];
      const sugg = vendorsData.map((v: any) => ({ id: v.id, label: `${(v.name||'').trim()} — ${(v.vendorCode||'').trim()}`, name: v.name||'', code: v.vendorCode||'' }));
      setVendorSuggestions(sugg);
      setVendors(vendorsData);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load vendors', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (selectedVendor) loadRates(selectedVendor);
    else setRates([]);
  }, [selectedVendor]);

  const loadRates = async (vendorId: string) => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`${getApiBaseUrl()}/api/vendors/${vendorId}/rates`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Failed to load rates', json);
        throw new Error(json?.error || 'Failed to fetch');
      }
      setRates((json.data || []).map((r: any) => ({ antennaSize: r.antennaSize, vendorAmount: String(r.vendorAmount) })));
    } catch (e) {
      console.error('loadRates error', e);
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to load rates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedVendor) { toast({ title: 'Error', description: 'Select vendor first', variant: 'destructive' }); return; }
    if (!antenna || !amount) { toast({ title: 'Error', description: 'Antenna and amount required', variant: 'destructive' }); return; }
    try {
      const res = await authenticatedFetch(`${getApiBaseUrl()}/api/vendors/${selectedVendor}/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ antennaSize: antenna, vendorAmount: amount })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Save vendor rate failed', json);
        throw new Error(json?.error || 'Failed to save');
      }
      toast({ title: 'Saved', description: 'Vendor rate saved' });
      setAntenna(''); setAmount('');
      await loadRates(selectedVendor);
    } catch (e) {
      console.error('handleSave error', e);
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to save vendor rate', variant: 'destructive' });
    }
  };

  const handleDelete = async (ant: string) => {
    if (!selectedVendor) return;
    if (!confirm(`Delete rate for ${ant} kVA?`)) return;
    try {
      const res = await authenticatedFetch(`${getApiBaseUrl()}/api/vendors/${selectedVendor}/rates/${ant}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Delete vendor rate failed', json);
        throw new Error(json?.error || 'Failed to delete');
      }
      toast({ title: 'Deleted', description: 'Vendor rate deleted' });
      await loadRates(selectedVendor);
    } catch (e) {
      console.error('handleDelete error', e);
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to delete vendor rate', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Vendor Rates</h2>
        <p className="text-sm text-muted-foreground">Manage default vendor amounts per antenna size (admin only)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Find Vendor</CardTitle>
          <CardDescription>Select a vendor to view or edit rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <SmartSearchTextbox
                value={vendorSearchText}
                onChange={(v:any) => { const vv = typeof v === 'string' ? v : (v?.target?.value ?? ''); setVendorSearchText(vv); if (!vv) setSelectedVendor(''); }}
                onSelect={(s:any) => { const sel = s as Suggestion; setVendorSearchText(sel.label || sel.name || ''); setSelectedVendor((sel.id || '') as string); }}
                suggestions={vendorSuggestions}
                placeholder="Vendor..."
                inputClassName="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <Button onClick={() => { setVendorSearchText(''); setSelectedVendor(''); }}>Clear</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedVendor && (
        <Card>
          <CardHeader>
            <CardTitle>Vendor Rates</CardTitle>
            <CardDescription>Define antenna-wise vendor amounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-center mb-3">
              <select value={antenna} onChange={(e) => setAntenna(e.target.value)} className="h-9 px-2 border rounded">
                <option value="">Select Antenna</option>
                <option value="0.6">0.6 kVA</option>
                <option value="0.9">0.9 kVA</option>
                <option value="1.2">1.2 kVA</option>
              </select>
              <Input value={amount} onChange={(e:any)=>setAmount(e.target.value)} placeholder="Vendor Amount" className="w-40" />
              <Button onClick={handleSave}>Save</Button>
            </div>

            {loading ? <div>Loading…</div> : (
              <div className="space-y-2">
                {rates.length === 0 ? <div className="text-sm text-muted-foreground">No rates defined</div> : rates.map(r => (
                  <div key={r.antennaSize} className="flex items-center justify-between border rounded p-2">
                    <div>{r.antennaSize} kVA — Rs {r.vendorAmount}</div>
                    <div>
                      <Button variant="ghost" onClick={() => handleDelete(r.antennaSize)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
