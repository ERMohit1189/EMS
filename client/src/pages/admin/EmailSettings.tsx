import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { getApiBaseUrl } from '@/lib/api';
import { authenticatedFetch } from '@/lib/fetchWithLoader';

export default function EmailSettings() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const { toast } = useToast();

  // Check if user is superadmin
  useEffect(() => {
    const role = localStorage.getItem('employeeRole');
    const normalizedRole = role ? role.toLowerCase() : '';
    if (normalizedRole !== 'superadmin') {
      setIsUnauthorized(true);
      toast({
        title: 'Unauthorized',
        description: 'Only superadmin can access email settings',
        variant: 'destructive'
      });
      // Redirect after showing toast
      setTimeout(() => setLocation('/'), 1000);
    }
  }, [setLocation, toast]);

  useEffect(() => {
    // Don't fetch if user is not authorized
    if (isUnauthorized) return;

    (async () => {
      try {
        setLoading(true);
        const resp = await authenticatedFetch(`${getApiBaseUrl()}/api/admin/email-settings`);
        const raw = await resp.text();
        let js: any = null;
        try { js = raw ? JSON.parse(raw) : null; } catch (e) { /* invalid json, proceed with raw */ }
        if (!resp.ok) throw new Error(js?.error || js?.message || raw || `Status ${resp.status}`);
        setSettings(js?.settings || {});
      } catch (err: any) {
        console.error('[EmailSettings] load error:', err);
        toast({ title: 'Error', description: err.message || 'Failed to load settings', variant: 'destructive' });
      } finally { setLoading(false); }
    })();
  }, [isUnauthorized, toast]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const body = { ...settings };
      const resp = await authenticatedFetch(`${getApiBaseUrl()}/api/admin/email-settings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const raw = await resp.text();
      let js: any = null;
      try { js = raw ? JSON.parse(raw) : null; } catch (e) { /* ignore parse error */ }
      if (!resp.ok) throw new Error(js?.error || js?.message || raw || `Status ${resp.status}`);
      setSettings(js?.settings);
      toast({ title: 'Saved', description: 'Email settings updated' });
    } catch (err: any) {
      console.error('[EmailSettings] save error:', err);
      toast({ title: 'Error', description: err.message || 'Save failed', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleTest = async () => {
    try {
      if (!testEmail) return toast({ title: 'Error', description: 'Enter recipient email', variant: 'destructive' });
      setLoading(true);
      const resp = await authenticatedFetch(`${getApiBaseUrl()}/api/admin/email-settings/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: testEmail }) });
      const raw = await resp.text();
      let js: any = null;
      try { js = raw ? JSON.parse(raw) : null; } catch (e) { /* ignore parse error */ }
      if (!resp.ok) throw new Error(js?.error || js?.message || raw || `Status ${resp.status}`);
      toast({ title: 'Test Sent', description: js?.message || raw || 'Test email attempted' });
      setTestResult(js);
    } catch (err: any) {
      console.error('[EmailSettings] test error:', err);
      toast({ title: 'Error', description: err.message || 'Test failed', variant: 'destructive' });
      setTestResult(null);
    } finally { setLoading(false); }
  };

  // Don't render content if user is not superadmin
  if (isUnauthorized) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Email Settings</CardTitle>
          <CardDescription>Configure SMTP details for sending OTP/email. Only superadmin can access this page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">SMTP Host</label>
              <Input value={settings.smtpHost || ''} onChange={e => setSettings({...settings, smtpHost: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-medium">SMTP Port</label>
              <Input value={settings.smtpPort || ''} onChange={e => setSettings({...settings, smtpPort: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-medium">SMTP User</label>
              <Input value={settings.smtpUser || ''} onChange={e => setSettings({...settings, smtpUser: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-medium">SMTP Password</label>
              <Input type="password" placeholder={settings.smtpPass ? '********' : ''} onChange={e => setSettings({...settings, smtpPass: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-medium">Secure (TLS/SSL)</label>
              <select className="w-full h-9 rounded-md" value={settings.smtpSecure ? 'true' : 'false'} onChange={e => setSettings({...settings, smtpSecure: e.target.value === 'true'})}>
                <option value="false">false</option>
                <option value="true">true</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">From Email</label>
              <Input value={settings.fromEmail || ''} onChange={e => setSettings({...settings, fromEmail: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium">From Name</label>
              <Input value={settings.fromName || ''} onChange={e => setSettings({...settings, fromName: e.target.value})} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={loading}>Save Settings</Button>
            <Input placeholder="recipient@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="ml-3" />
            <Button variant="outline" onClick={handleTest} disabled={loading}>Send Test</Button>
          </div>

          {testResult && (
            <div className="mt-4 p-4 border rounded-md bg-white">
              <h4 className="text-sm font-medium">Test Result Preview</h4>
              <div className="text-xs text-slate-600 mt-2">
                <div><strong>Subject:</strong> {testResult.preview?.subject}</div>
                <div className="mt-2"><strong>Text:</strong>
                  <pre className="whitespace-pre-wrap text-xs mt-1 p-2 bg-slate-50 rounded">{testResult.preview?.text}</pre>
                </div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <strong>Masked Settings:</strong>
                    <pre className="whitespace-pre-wrap text-xs mt-1 p-2 bg-slate-50 rounded">{JSON.stringify(testResult.settings, null, 2)}</pre>
                  </div>
                  <div>
                    <strong>Company:</strong>
                    <div className="text-xs mt-1">
                      <div><strong>Name:</strong> {testResult.company?.companyName || '—'}</div>
                      <div><strong>Address:</strong> {testResult.company?.address || '—'}</div>
                      <div><strong>Website:</strong> {testResult.company?.website ? <a className="text-blue-600" href={testResult.company.website} target="_blank" rel="noreferrer">{testResult.company.website}</a> : '—'}</div>
                      <div><strong>Contact:</strong> {testResult.company?.contactEmail || testResult.company?.contactPhone || '—'}</div>
                    </div>
                  </div>
                </div>
                {testResult.messageId && <div className="mt-2 text-xs text-green-700">Message ID: {testResult.messageId}</div>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
