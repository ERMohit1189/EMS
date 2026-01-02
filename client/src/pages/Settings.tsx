import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { authenticatedFetch } from "@/lib/fetchWithLoader";
import { Loader2, X } from "lucide-react";
import { SkeletonLoader } from "@/components/SkeletonLoader";

export default function Settings() {
  const [showGstInput, setShowGstInput] = useState(false);
  const [pwaEnabled, setPwaEnabled] = useState(false);
  const [hrEmail, setHrEmail] = useState('');
  const [procurementEmail, setProcurementEmail] = useState('');
  const [dpoEmail, setDpoEmail] = useState('');
  const [approvalsRequired, setApprovalsRequired] = useState('1');
  const [poGenerationDate, setPoGenerationDate] = useState('-1');
  const [invoiceGenerationDate, setInvoiceGenerationDate] = useState('-1');
  const [loadingSaveApprovals, setLoadingSaveApprovals] = useState(false);
  const [savingLetterhead, setSavingLetterhead] = useState(false);
  const [loading, setLoading] = useState(true);
  const [letterhead, setLetterhead] = useState<{
    letterheadImage?: string;
    applyLetterheadToSalarySlip: boolean;
  }>({
    applyLetterheadToSalarySlip: false
  });
  const [allowanceCaps, setAllowanceCaps] = useState({
    travelAllowance: '',
    foodAllowance: '',
    accommodationAllowance: '',
    mobileAllowance: '',
    internetAllowance: '',
    utilitiesAllowance: '',
    parkingAllowance: '',
    miscAllowance: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('showGstInputInPO');
    setShowGstInput(stored === 'true');
    
    // Load PWA setting
    const pwaStored = localStorage.getItem('pwaEnabled');
    setPwaEnabled(pwaStored === 'true');
    
    // Load contact emails
    setHrEmail(localStorage.getItem('hrContactEmail') || 'hr@company.com');
    setProcurementEmail(localStorage.getItem('procurementContactEmail') || 'procurement@company.com');
    setDpoEmail(localStorage.getItem('dpoContactEmail') || 'dpo@company.com');

    // Load allowance caps
    const caps = localStorage.getItem('allowanceCaps');
    if (caps) {
      setAllowanceCaps(JSON.parse(caps));
    }

    // Load app settings from API
    fetchAppSettings();
  }, []);

  const fetchAppSettings = async () => {
    try {
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/app-settings`);
      if (response.ok) {
        const data = await response.json();
        setApprovalsRequired(data.approvalsRequiredForAllowance?.toString() || '1');
        setPoGenerationDate(data.poGenerationDate?.toString() || '-1');
        setInvoiceGenerationDate(data.invoiceGenerationDate?.toString() || '-1');

        // Load letterhead settings
        if (data.letterheadImage) {
          setLetterhead({
            letterheadImage: data.letterheadImage,
            applyLetterheadToSalarySlip: data.applyLetterheadToSalarySlip || false
          });
        }
      }
    } catch (error) {
      console.error('Error fetching app settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApprovals = async () => {
    setLoadingSaveApprovals(true);
    try {
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/app-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalsRequiredForAllowance: parseInt(approvalsRequired, 10),
          poGenerationDate: parseInt(poGenerationDate, 10),
          invoiceGenerationDate: parseInt(invoiceGenerationDate, 10),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Application settings updated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving app settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setLoadingSaveApprovals(false);
    }
  };

  const handleGstToggle = (checked: boolean) => {
    setShowGstInput(checked);
    localStorage.setItem('showGstInputInPO', checked.toString());
    toast({
      title: "Success",
      description: `GST input in PO Generation is now ${checked ? 'enabled' : 'disabled'}`,
    });
  };

  const handlePwaToggle = (checked: boolean) => {
    setPwaEnabled(checked);
    localStorage.setItem('pwaEnabled', checked.toString());
    toast({
      title: "Success",
      description: `PWA Installation prompt is now ${checked ? 'enabled' : 'disabled'}`,
    });
  };

  const handleSaveContactEmails = () => {
    localStorage.setItem('hrContactEmail', hrEmail);
    localStorage.setItem('procurementContactEmail', procurementEmail);
    localStorage.setItem('dpoContactEmail', dpoEmail);
    toast({
      title: "Success",
      description: 'Contact and complaints emails saved successfully',
    });
  };

  const handleSaveAllowanceCaps = () => {
    localStorage.setItem('allowanceCaps', JSON.stringify(allowanceCaps));
    // Dispatch custom event to update allowances page in real-time
    window.dispatchEvent(new CustomEvent('allowanceCapsUpdated', { detail: allowanceCaps }));
    toast({
      title: "Success",
      description: 'Allowance caps updated successfully',
    });
  };

  const handleLetterheadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setLetterhead({
        ...letterhead,
        letterheadImage: base64String,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLetterhead = async () => {
    setSavingLetterhead(true);
    try {
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/app-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letterheadImage: letterhead.letterheadImage || null,
          applyLetterheadToSalarySlip: letterhead.applyLetterheadToSalarySlip,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Letterhead settings saved successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save letterhead settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving letterhead:', error);
      toast({
        title: 'Error',
        description: 'Failed to save letterhead settings',
        variant: 'destructive',
      });
    } finally {
      setSavingLetterhead(false);
    }
  };

  const handleRemoveLetterhead = () => {
    setLetterhead({
      letterheadImage: undefined,
      applyLetterheadToSalarySlip: false,
    });
  };

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Application Settings</h1>
        <p className="text-muted-foreground mt-2">Manage application preferences and features</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Allowance Approval Settings</CardTitle>
          <CardDescription>Configure approval requirements for daily allowances</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Number of Approvals Required for Allowances</label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                max="5"
                value={approvalsRequired}
                onChange={(e) => setApprovalsRequired(e.target.value)}
                placeholder="1"
                data-testid="input-approvals-required"
                className="flex-1"
              />
              <Button
                onClick={handleSaveApprovals}
                disabled={loadingSaveApprovals}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-save-approvals"
              >
                {loadingSaveApprovals ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Set how many approvals are needed before an allowance is approved (1-5)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Generation Dates</CardTitle>
          <CardDescription>Configure dates when vendors can generate POs and Invoices (Admins can generate anytime)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mt-4">
            <a href="/admin/email-settings" className="text-sm text-blue-600 hover:text-blue-800 font-semibold">Configure Email Settings (Superadmin only)</a>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">PO Generation Day of Month</label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="-1"
                max="31"
                value={poGenerationDate}
                onChange={(e) => setPoGenerationDate(e.target.value)}
                placeholder="-1"
                data-testid="input-po-generation-date"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Day of month (1-31) when vendors can generate Purchase Orders. Use <strong>-1 to disable restrictions</strong> (allow any day).
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Invoice Generation Day of Month</label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="-1"
                max="31"
                value={invoiceGenerationDate}
                onChange={(e) => setInvoiceGenerationDate(e.target.value)}
                placeholder="-1"
                data-testid="input-invoice-generation-date"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Day of month (1-31) when vendors can generate Invoices. Use <strong>-1 to disable restrictions</strong> (allow any day).
            </p>
          </div>

          <Button
            onClick={handleSaveApprovals}
            disabled={loadingSaveApprovals}
            className="w-full bg-green-600 hover:bg-green-700"
            data-testid="button-save-generation-dates"
          >
            {loadingSaveApprovals ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save All Settings'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PO Generation</CardTitle>
          <CardDescription>Configure Purchase Order generation settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
            <div>
              <p className="font-semibold">Show GST Input</p>
              <p className="text-sm text-muted-foreground">Display GST rate input field in PO generation form</p>
            </div>
            <Switch
              checked={showGstInput}
              onCheckedChange={handleGstToggle}
              data-testid="toggle-gst-input"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App Features</CardTitle>
          <CardDescription>Configure optional application features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
            <div>
              <p className="font-semibold">PWA Installation Prompt</p>
              <p className="text-sm text-muted-foreground">Show install prompt to allow users to install the app</p>
            </div>
            <Switch
              checked={pwaEnabled}
              onCheckedChange={handlePwaToggle}
              data-testid="toggle-pwa-enabled"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Allowances</CardTitle>
          <CardDescription>Set maximum limits for each allowance type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Travel Max (Rs)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={allowanceCaps.travelAllowance}
                onChange={(e) => setAllowanceCaps({...allowanceCaps, travelAllowance: e.target.value})}
                placeholder="0"
                className="mt-1"
                data-testid="input-travel-cap"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Food Max (Rs)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={allowanceCaps.foodAllowance}
                onChange={(e) => setAllowanceCaps({...allowanceCaps, foodAllowance: e.target.value})}
                placeholder="0"
                className="mt-1"
                data-testid="input-food-cap"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Accommodation Max (Rs)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={allowanceCaps.accommodationAllowance}
                onChange={(e) => setAllowanceCaps({...allowanceCaps, accommodationAllowance: e.target.value})}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mobile Max (Rs)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={allowanceCaps.mobileAllowance}
                onChange={(e) => setAllowanceCaps({...allowanceCaps, mobileAllowance: e.target.value})}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Internet Max (Rs)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={allowanceCaps.internetAllowance}
                onChange={(e) => setAllowanceCaps({...allowanceCaps, internetAllowance: e.target.value})}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Utilities Max (Rs)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={allowanceCaps.utilitiesAllowance}
                onChange={(e) => setAllowanceCaps({...allowanceCaps, utilitiesAllowance: e.target.value})}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Parking Max (Rs)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={allowanceCaps.parkingAllowance}
                onChange={(e) => setAllowanceCaps({...allowanceCaps, parkingAllowance: e.target.value})}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Miscellaneous Max (Rs)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={allowanceCaps.miscAllowance}
                onChange={(e) => setAllowanceCaps({...allowanceCaps, miscAllowance: e.target.value})}
                placeholder="0"
                className="mt-1"
              />
            </div>
          </div>
          <Button onClick={handleSaveAllowanceCaps} className="w-full" data-testid="button-save-allowance-caps">
            Save Allowance Caps
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact & Complaints</CardTitle>
          <CardDescription>Configure contact emails for privacy policy and support</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">HR Department Email</label>
            <Input
              type="email"
              placeholder="hr@company.com"
              value={hrEmail}
              onChange={(e) => setHrEmail(e.target.value)}
              data-testid="input-hr-email"
            />
            <p className="text-xs text-muted-foreground mt-1">Email displayed in Employee Privacy Policy</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Procurement Department Email</label>
            <Input
              type="email"
              placeholder="procurement@company.com"
              value={procurementEmail}
              onChange={(e) => setProcurementEmail(e.target.value)}
              data-testid="input-procurement-email"
            />
            <p className="text-xs text-muted-foreground mt-1">Email displayed in Vendor Privacy Policy</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Data Protection Officer Email</label>
            <Input
              type="email"
              placeholder="dpo@company.com"
              value={dpoEmail}
              onChange={(e) => setDpoEmail(e.target.value)}
              data-testid="input-dpo-email"
            />
            <p className="text-xs text-muted-foreground mt-1">Email displayed in Vendor Privacy Policy</p>
          </div>

          <Button
            onClick={handleSaveContactEmails}
            className="w-full bg-blue-600 hover:bg-blue-700"
            data-testid="button-save-contact-emails"
          >
            Save Contact Emails
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Letterhead Settings</CardTitle>
          <CardDescription>Configure letterhead for salary slip documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Salary Slip Letterhead Image</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition">
              <input
                type="file"
                accept="image/*"
                onChange={handleLetterheadFileChange}
                className="hidden"
                id="letterhead-input"
                data-testid="input-letterhead-file"
              />
              <label htmlFor="letterhead-input" className="cursor-pointer block">
                {letterhead.letterheadImage ? (
                  <div className="text-center">
                    <p className="text-sm text-green-600 font-semibold mb-2">Image Selected</p>
                    <img
                      src={letterhead.letterheadImage}
                      alt="Letterhead Preview"
                      className="max-h-40 mx-auto mb-2"
                    />
                    <p className="text-xs text-gray-500">Click to change image</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Upload Letterhead Image</p>
                    <p className="text-xs text-gray-500">Drag and drop or click to select an image</p>
                  </div>
                )}
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Supported formats: JPG, PNG, GIF (Max size: 5MB)
            </p>
          </div>

          {letterhead.letterheadImage && (
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={letterhead.applyLetterheadToSalarySlip}
                  onChange={(e) =>
                    setLetterhead({
                      ...letterhead,
                      applyLetterheadToSalarySlip: e.target.checked,
                    })
                  }
                  data-testid="checkbox-apply-letterhead-salary-slip"
                  className="w-4 h-4"
                />
                Apply Letterhead to Salary Slips
              </label>
              <p className="text-xs text-muted-foreground">
                When enabled, the letterhead image will be displayed on all salary slip documents
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSaveLetterhead}
              disabled={savingLetterhead}
              className="flex-1 bg-green-600 hover:bg-green-700"
              data-testid="button-save-letterhead"
            >
              {savingLetterhead ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Letterhead'
              )}
            </Button>
            {letterhead.letterheadImage && (
              <Button
                onClick={handleRemoveLetterhead}
                disabled={savingLetterhead}
                variant="outline"
                className="flex-1"
                data-testid="button-remove-letterhead"
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
