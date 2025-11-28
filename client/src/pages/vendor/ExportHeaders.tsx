import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/api";

type ExportHeader = {
  id: string;
  companyName: string | null;
  reportTitle: string | null;
  footerText: string | null;
  showGeneratedDate: boolean;
};

export default function ExportHeaders() {
  const [header, setHeader] = useState<ExportHeader>({
    id: '',
    companyName: '',
    reportTitle: '',
    footerText: '',
    showGeneratedDate: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadHeader();
  }, []);

  const loadHeader = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/export-headers`);
      if (response.ok) {
        const data = await response.json();
        setHeader(data || { id: '', companyName: '', reportTitle: '', footerText: '', showGeneratedDate: true });
      }
    } catch (error) {
      console.error('Failed to load header settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/export-headers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: header.companyName || null,
          reportTitle: header.reportTitle || null,
          footerText: header.footerText || null,
          showGeneratedDate: header.showGeneratedDate,
        }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Export header settings saved' });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="title-export-headers">Export Header Settings</h1>
        <p className="text-gray-600 mt-2">Configure headers and footers for Excel and PDF exports</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <Label htmlFor="company-name">Company Name</Label>
          <Input
            id="company-name"
            data-testid="input-company-name"
            value={header.companyName || ''}
            onChange={(e) => setHeader({ ...header, companyName: e.target.value })}
            placeholder="Enter company name"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="report-title">Report Title</Label>
          <Input
            id="report-title"
            data-testid="input-report-title"
            value={header.reportTitle || ''}
            onChange={(e) => setHeader({ ...header, reportTitle: e.target.value })}
            placeholder="e.g., Site Status Report"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="footer-text">Footer Text</Label>
          <Textarea
            id="footer-text"
            data-testid="input-footer-text"
            value={header.footerText || ''}
            onChange={(e) => setHeader({ ...header, footerText: e.target.value })}
            placeholder="Enter footer text (e.g., confidential notice, contact info)"
            className="mt-1 min-h-24"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="show-date"
            data-testid="checkbox-show-date"
            checked={header.showGeneratedDate}
            onChange={(e) => setHeader({ ...header, showGeneratedDate: e.target.checked })}
            className="cursor-pointer w-4 h-4"
          />
          <Label htmlFor="show-date" className="cursor-pointer">Show Generated Date in Exports</Label>
        </div>
      </div>

      <Button 
        onClick={handleSave}
        disabled={saving}
        data-testid="button-save-settings"
        className="bg-blue-600 hover:bg-blue-700"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>📋 Preview:</strong> These settings will appear at the top of all Excel and PDF exports from the Site Status page.
        </p>
      </div>
    </div>
  );
}
