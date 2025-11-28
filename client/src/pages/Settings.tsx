import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [showGstInput, setShowGstInput] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('showGstInputInPO');
    setShowGstInput(stored === 'true');
  }, []);

  const handleGstToggle = (checked: boolean) => {
    setShowGstInput(checked);
    localStorage.setItem('showGstInputInPO', checked.toString());
    toast({
      title: "Success",
      description: `GST input in PO Generation is now ${checked ? 'enabled' : 'disabled'}`,
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
    </div>
  );
}
