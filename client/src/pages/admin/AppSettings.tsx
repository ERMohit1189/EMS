import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { getApiBaseUrl } from '@/lib/api';
import { Loader2, Upload, X } from 'lucide-react';
import { authenticatedFetch } from '@/lib/fetchWithLoader';

export default function AppSettings() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<{
    approvalsRequiredForAllowance?: number;
    poGenerationDate?: number;
    invoiceGenerationDate?: number;
  }>({});

  const [companyDetails, setCompanyDetails] = useState<{
    companyName?: string;
    address?: string;
    city?: string;
    state?: string;
    contactPhone?: string;
    contactEmail?: string;
    website?: string;
    gstin?: string;
  }>({});

  const [letterhead, setLetterhead] = useState<{
    letterheadImage?: string;
    applyLetterheadToPO: boolean;
    applyLetterheadToInvoice: boolean;
    applyLetterheadToSalarySlip: boolean;
  }>({
    applyLetterheadToPO: false,
    applyLetterheadToInvoice: false,
    applyLetterheadToSalarySlip: false
  });

  const [loadingCompany, setLoadingCompany] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingLetterhead, setSavingLetterhead] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const { toast } = useToast();

  // Check if user is admin or superadmin
  useEffect(() => {
    const role = localStorage.getItem('employeeRole');
    const normalizedRole = role ? role.toLowerCase() : '';
    const isAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin';
    if (!isAdmin) {
      setIsUnauthorized(true);
      toast({
        title: 'Unauthorized',
        description: 'Only admin and superadmin can access app settings',
        variant: 'destructive'
      });
      // Redirect after showing toast
      setTimeout(() => setLocation('/'), 1000);
    }
  }, [setLocation, toast]);

  // Load app settings
  useEffect(() => {
    if (isUnauthorized) return;

    (async () => {
      try {
        setLoading(true);
        const resp = await authenticatedFetch(`${getApiBaseUrl()}/api/app-settings`);
        const raw = await resp.text();
        let js: any = null;
        try {
          js = raw ? JSON.parse(raw) : null;
        } catch (e) {
          /* invalid json, proceed with raw */
        }
        if (!resp.ok) {
          throw new Error(js?.error || js?.message || raw || `Status ${resp.status}`);
        }
        setSettings({
          approvalsRequiredForAllowance: js?.approvalsRequiredForAllowance ?? 1,
          poGenerationDate: js?.poGenerationDate ?? -1,
          invoiceGenerationDate: js?.invoiceGenerationDate ?? -1
        });
      } catch (err: any) {
        console.error('[AppSettings] load error:', err);
        toast({
          title: 'Error',
          description: err.message || 'Failed to load settings',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [isUnauthorized, toast]);

  // Load company details (export headers)
  useEffect(() => {
    if (isUnauthorized) return;

    (async () => {
      try {
        setLoadingCompany(true);
        const resp = await authenticatedFetch(`${getApiBaseUrl()}/api/export-headers`);
        const raw = await resp.text();
        let js: any = null;
        try {
          js = raw ? JSON.parse(raw) : null;
        } catch (e) {
          /* invalid json, proceed with raw */
        }
        if (!resp.ok) {
          throw new Error(js?.error || js?.message || raw || `Status ${resp.status}`);
        }
        setCompanyDetails({
          companyName: js?.companyName || '',
          address: js?.address || '',
          city: js?.city || '',
          state: js?.state || '',
          contactPhone: js?.contactPhone || '',
          contactEmail: js?.contactEmail || '',
          website: js?.website || '',
          gstin: js?.gstin || ''
        });
      } catch (err: any) {
        console.error('[AppSettings] load company details error:', err);
        // Don't show error toast for company details, as it's optional
      } finally {
        setLoadingCompany(false);
      }
    })();
  }, [isUnauthorized]);

  // Load letterhead settings
  useEffect(() => {
    if (isUnauthorized) return;

    (async () => {
      try {
        const resp = await authenticatedFetch(`${getApiBaseUrl()}/api/app-settings`);
        const raw = await resp.text();
        let js: any = null;
        try {
          js = raw ? JSON.parse(raw) : null;
        } catch (e) {
          /* invalid json, proceed with raw */
        }
        if (!resp.ok) {
          throw new Error(js?.error || js?.message || raw || `Status ${resp.status}`);
        }
        setLetterhead({
          letterheadImage: js?.letterheadImage || undefined,
          applyLetterheadToPO: js?.applyLetterheadToPO ?? false,
          applyLetterheadToInvoice: js?.applyLetterheadToInvoice ?? false,
          applyLetterheadToSalarySlip: js?.applyLetterheadToSalarySlip ?? false
        });
      } catch (err: any) {
        console.error('[AppSettings] load letterhead settings error:', err);
        // Don't show error toast, as it's optional
      }
    })();
  }, [isUnauthorized]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const body = {
        approvalsRequiredForAllowance: parseInt(String(settings.approvalsRequiredForAllowance || 1)),
        poGenerationDate: parseInt(String(settings.poGenerationDate || 1)),
        invoiceGenerationDate: parseInt(String(settings.invoiceGenerationDate || 1))
      };
      const resp = await authenticatedFetch(`${getApiBaseUrl()}/api/app-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const raw = await resp.text();
      let js: any = null;
      try {
        js = raw ? JSON.parse(raw) : null;
      } catch (e) {
        /* ignore parse error */
      }
      if (!resp.ok) {
        throw new Error(js?.error || js?.message || raw || `Status ${resp.status}`);
      }
      setSettings({
        approvalsRequiredForAllowance: js?.approvalsRequiredForAllowance ?? 1,
        poGenerationDate: js?.poGenerationDate ?? 1,
        invoiceGenerationDate: js?.invoiceGenerationDate ?? 1
      });
      toast({
        title: 'Saved',
        description: 'App settings updated successfully'
      });
    } catch (err: any) {
      console.error('[AppSettings] save error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Save failed',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompanyDetails = async () => {
    try {
      setSavingCompany(true);
      const body = {
        companyName: companyDetails.companyName || '',
        address: companyDetails.address || '',
        city: companyDetails.city || '',
        state: companyDetails.state || '',
        contactPhone: companyDetails.contactPhone || '',
        contactEmail: companyDetails.contactEmail || '',
        website: companyDetails.website || '',
        gstin: companyDetails.gstin || ''
      };
      const resp = await authenticatedFetch(`${getApiBaseUrl()}/api/export-headers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const raw = await resp.text();
      let js: any = null;
      try {
        js = raw ? JSON.parse(raw) : null;
      } catch (e) {
        /* ignore parse error */
      }
      if (!resp.ok) {
        throw new Error(js?.error || js?.message || raw || `Status ${resp.status}`);
      }
      setCompanyDetails({
        companyName: js?.companyName || '',
        address: js?.address || '',
        city: js?.city || '',
        state: js?.state || '',
        contactPhone: js?.contactPhone || '',
        contactEmail: js?.contactEmail || '',
        website: js?.website || '',
        gstin: js?.gstin || ''
      });
      toast({
        title: 'Saved',
        description: 'Company details updated successfully'
      });
    } catch (err: any) {
      console.error('[AppSettings] save company details error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Save failed',
        variant: 'destructive'
      });
    } finally {
      setSavingCompany(false);
    }
  };

  const handleLetterheadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'File size must be less than 2MB',
        variant: 'destructive'
      });
      return;
    }

    // Check file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Error',
        description: 'Only PNG, JPEG, and GIF images are supported',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLetterhead({ ...letterhead, letterheadImage: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLetterhead = async () => {
    try {
      setSavingLetterhead(true);
      const body = {
        letterheadImage: letterhead.letterheadImage || null,
        applyLetterheadToPO: letterhead.applyLetterheadToPO,
        applyLetterheadToInvoice: letterhead.applyLetterheadToInvoice,
        applyLetterheadToSalarySlip: letterhead.applyLetterheadToSalarySlip
      };
      const resp = await authenticatedFetch(`${getApiBaseUrl()}/api/app-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const raw = await resp.text();
      let js: any = null;
      try {
        js = raw ? JSON.parse(raw) : null;
      } catch (e) {
        /* ignore parse error */
      }
      if (!resp.ok) {
        throw new Error(js?.error || js?.message || raw || `Status ${resp.status}`);
      }
      setLetterhead({
        letterheadImage: js?.letterheadImage || undefined,
        applyLetterheadToPO: js?.applyLetterheadToPO ?? false,
        applyLetterheadToInvoice: js?.applyLetterheadToInvoice ?? false,
        applyLetterheadToSalarySlip: js?.applyLetterheadToSalarySlip ?? false
      });
      toast({
        title: 'Saved',
        description: 'Letterhead settings updated successfully'
      });
    } catch (err: any) {
      console.error('[AppSettings] save letterhead error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Save failed',
        variant: 'destructive'
      });
    } finally {
      setSavingLetterhead(false);
    }
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
    <div className="p-4 max-w-4xl space-y-6">
      {/* Application Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>
            Configure global application settings for PO generation, invoices, and allowances
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">
                  PO Generation Day of Month
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Day of month (1-31) when vendors can generate Purchase Orders. Use <strong>-1 to disable restrictions</strong> (allow any day).
                </p>
                <Input
                  type="number"
                  min="-1"
                  max="31"
                  value={settings.poGenerationDate || -1}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      poGenerationDate: parseInt(e.target.value) || -1
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Invoice Generation Day of Month
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Day of month (1-31) when vendors can generate Invoices. Use <strong>-1 to disable restrictions</strong> (allow any day).
                </p>
                <Input
                  type="number"
                  min="-1"
                  max="31"
                  value={settings.invoiceGenerationDate || -1}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      invoiceGenerationDate: parseInt(e.target.value) || -1
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Approvals Required for Allowance
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Number of approvals required before an allowance is processed
                </p>
                <Input
                  type="number"
                  min="1"
                  value={settings.approvalsRequiredForAllowance || 1}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      approvalsRequiredForAllowance: parseInt(e.target.value) || 1
                    })
                  }
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Settings
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Company Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>
            Save your company information to be displayed in Purchase Orders and other documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingCompany ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g., Ceragon Networks (India) Pvt Ltd"
                    value={companyDetails.companyName || ''}
                    onChange={(e) =>
                      setCompanyDetails({
                        ...companyDetails,
                        companyName: e.target.value
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Contact Phone
                  </label>
                  <Input
                    placeholder="e.g., 7898767890"
                    value={companyDetails.contactPhone || ''}
                    onChange={(e) =>
                      setCompanyDetails({
                        ...companyDetails,
                        contactPhone: e.target.value
                      })
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Address
                  </label>
                  <Input
                    placeholder="e.g., Vastu Khannd, Gomti Nagar"
                    value={companyDetails.address || ''}
                    onChange={(e) =>
                      setCompanyDetails({
                        ...companyDetails,
                        address: e.target.value
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    City
                  </label>
                  <Input
                    placeholder="e.g., Lucknow"
                    value={companyDetails.city || ''}
                    onChange={(e) =>
                      setCompanyDetails({
                        ...companyDetails,
                        city: e.target.value
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    State
                  </label>
                  <Input
                    placeholder="e.g., Uttar Pradesh"
                    value={companyDetails.state || ''}
                    onChange={(e) =>
                      setCompanyDetails({
                        ...companyDetails,
                        state: e.target.value
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Contact Email
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g., info@company.com"
                    value={companyDetails.contactEmail || ''}
                    onChange={(e) =>
                      setCompanyDetails({
                        ...companyDetails,
                        contactEmail: e.target.value
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Website
                  </label>
                  <Input
                    placeholder="e.g., https://www.company.com"
                    value={companyDetails.website || ''}
                    onChange={(e) =>
                      setCompanyDetails({
                        ...companyDetails,
                        website: e.target.value
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    GSTIN
                  </label>
                  <Input
                    placeholder="e.g., 09AABCT1234H1Z5"
                    value={companyDetails.gstin || ''}
                    onChange={(e) =>
                      setCompanyDetails({
                        ...companyDetails,
                        gstin: e.target.value
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveCompanyDetails}
                  disabled={savingCompany}
                  className="flex items-center gap-2"
                >
                  {savingCompany && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Company Details
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Letterhead Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Letterhead Settings</CardTitle>
          <CardDescription>
            Upload a letterhead image to replace company header and footer in documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload Letterhead Image
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Supports PNG, JPEG, and GIF. Maximum file size: 2MB
            </p>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif"
                onChange={handleLetterheadFileChange}
                className="flex-1 text-sm"
              />
              {letterhead.letterheadImage && (
                <button
                  onClick={() => setLetterhead({ ...letterhead, letterheadImage: undefined })}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {letterhead.letterheadImage && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="text-sm font-medium mb-2">Preview:</p>
              <img
                src={letterhead.letterheadImage}
                alt="Letterhead preview"
                className="max-h-32 object-contain"
              />
            </div>
          )}

          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Apply letterhead to:</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={letterhead.applyLetterheadToPO}
                  onChange={(e) =>
                    setLetterhead({
                      ...letterhead,
                      applyLetterheadToPO: e.target.checked
                    })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">Purchase Orders (PO)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={letterhead.applyLetterheadToInvoice}
                  onChange={(e) =>
                    setLetterhead({
                      ...letterhead,
                      applyLetterheadToInvoice: e.target.checked
                    })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">Invoices</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={letterhead.applyLetterheadToSalarySlip}
                  onChange={(e) =>
                    setLetterhead({
                      ...letterhead,
                      applyLetterheadToSalarySlip: e.target.checked
                    })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">Salary Slips</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSaveLetterhead}
              disabled={savingLetterhead}
              className="flex items-center gap-2"
            >
              {savingLetterhead && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Letterhead Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
