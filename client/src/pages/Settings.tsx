import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [showGstInput, setShowGstInput] = useState(false);
  const [hrEmail, setHrEmail] = useState('');
  const [procurementEmail, setProcurementEmail] = useState('');
  const [dpoEmail, setDpoEmail] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('showGstInputInPO');
    setShowGstInput(stored === 'true');
    
    // Load contact emails
    setHrEmail(localStorage.getItem('hrContactEmail') || 'hr@company.com');
    setProcurementEmail(localStorage.getItem('procurementContactEmail') || 'procurement@company.com');
    setDpoEmail(localStorage.getItem('dpoContactEmail') || 'dpo@company.com');
  }, []);

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Application Settings</h1>
        <p className="text-muted-foreground mt-2">Manage application preferences and features</p>
      </div>

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
