import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { Copy, RotateCw } from "lucide-react";
import type { Vendor } from "@shared/schema";

export default function VendorCredentials() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [generatedPassword, setGeneratedPassword] = useState<string>("");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/vendors?pageSize=1000`);
      const data = await response.json();
      setVendors(data.data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load vendors",
        variant: "destructive",
      });
    } finally {
      setPageLoading(false);
    }
  };

  const handleGeneratePassword = async (vendorId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}/generate-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate password");
      }

      setGeneratedPassword(data.tempPassword);
      setSelectedVendorId(vendorId);
      
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
      setLoading(false);
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
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Vendor Credentials Manager</h2>
        <p className="text-muted-foreground">Manage and generate vendor login credentials</p>
      </div>

      <div className="grid gap-4">
        {vendors.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">No vendors found</p>
            </CardContent>
          </Card>
        ) : (
          vendors.map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{vendor.name}</CardTitle>
                    <CardDescription>Email: {vendor.email}</CardDescription>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      vendor.password
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {vendor.password ? "Password Set" : "No Password"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Username (Email)</label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="text"
                        value={vendor.email}
                        disabled
                        className="bg-slate-100"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(vendor.email)}
                        className="px-2"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {generatedPassword && selectedVendorId === vendor.id && (
                    <div>
                      <label className="text-sm font-medium">
                        Generated Password (Copy and Save)
                      </label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="text"
                          value={generatedPassword}
                          disabled
                          className="bg-green-50 font-mono"
                        />
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => copyToClipboard(generatedPassword)}
                          className="px-2"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => handleGeneratePassword(vendor.id)}
                    disabled={loading}
                    className="gap-2"
                  >
                    <RotateCw className="h-4 w-4" />
                    {vendor.password ? "Reset Password" : "Generate Password"}
                  </Button>
                  <p className="text-xs text-muted-foreground self-center">
                    {vendor.password
                      ? "Click to generate a new password"
                      : "Click to generate login credentials"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>
            • Click <strong>"Generate Password"</strong> to create new login credentials
          </p>
          <p>• The generated password will appear and can be copied to clipboard</p>
          <p>• Share the username (email) and password with the vendor securely</p>
          <p>• Vendors can login at <strong>/vendor-login</strong> with these credentials</p>
          <p>• Click <strong>"Reset Password"</strong> anytime to generate a new password</p>
        </CardContent>
      </Card>
    </div>
  );
}
