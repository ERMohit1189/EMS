import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { SkeletonLoader } from "@/components/SkeletonLoader";

export default function Settings() {
  const [showGstInput, setShowGstInput] = useState(false);
  const [hrEmail, setHrEmail] = useState('');
  const [procurementEmail, setProcurementEmail] = useState('');
  const [dpoEmail, setDpoEmail] = useState('');
  const [approvalsRequired, setApprovalsRequired] = useState('1');
  const [loadingSaveApprovals, setLoadingSaveApprovals] = useState(false);
  const [loading, setLoading] = useState(true);
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
      const response = await fetch(`${getApiBaseUrl()}/api/app-settings`);
      if (response.ok) {
        const data = await response.json();
        setApprovalsRequired(data.approvalsRequiredForAllowance?.toString() || '1');
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
      const response = await fetch(`${getApiBaseUrl()}/api/app-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalsRequiredForAllowance: parseInt(approvalsRequired, 10),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Allowance approvals required updated to ${approvalsRequired}`,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save approval settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving app settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save approval settings',
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
    toast({
      title: "Success",
      description: 'Allowance caps updated successfully',
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
    </div>
  );
}
