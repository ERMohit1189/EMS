import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { Copy, RotateCw } from "lucide-react";
import type { Vendor } from "@shared/schema";

export default function VendorCredentials() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [generatedPasswords, setGeneratedPasswords] = useState<Record<string, string>>({});
  const [loadingVendorId, setLoadingVendorId] = useState<string | null>(null);
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
    setLoadingVendorId(vendorId);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}/generate-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate password");
      }

      setGeneratedPasswords(prev => ({
        ...prev,
        [vendorId]: data.tempPassword
      }));
      
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
      setLoadingVendorId(null);
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
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Vendor Credentials Manager</h2>
        <p className="text-sm text-muted-foreground">Manage and generate vendor login credentials</p>
      </div>

      {vendors.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No vendors found</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Vendor Name</th>
                  <th className="text-left px-3 py-2 font-semibold">Email (Username)</th>
                  <th className="text-center px-3 py-2 font-semibold">Role</th>
                  <th className="text-center px-3 py-2 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 font-semibold">Generated Password</th>
                  <th className="text-center px-3 py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor, idx) => (
                  <tr key={vendor.id} className={`border-b hover:bg-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                    <td className="px-3 py-2 font-medium">{vendor.name}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          value={vendor.email}
                          disabled
                          className="bg-slate-100 h-7 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(vendor.email)}
                          className="px-2 h-7"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs px-2 py-1 rounded font-semibold bg-blue-100 text-blue-800">
                        {(vendor as any).role || "Vendor"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`text-xs px-2 py-1 rounded font-semibold ${
                          vendor.password
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {vendor.password ? "Set" : "No Pass"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {generatedPasswords[vendor.id] ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="text"
                            value={generatedPasswords[vendor.id]}
                            disabled
                            className="bg-green-50 font-mono h-7 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => copyToClipboard(generatedPasswords[vendor.id])}
                            className="px-2 h-7"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGeneratePassword(vendor.id)}
                        disabled={loadingVendorId === vendor.id}
                        className="gap-1 h-7"
                      >
                        <RotateCw className="h-3 w-3" />
                        <span className="text-xs">{vendor.password ? "Reset" : "Generate"}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-slate-700 space-y-1">
        <p className="font-semibold">How to Use:</p>
        <p>• Click <strong>"Generate"</strong> button to create login credentials</p>
        <p>• Copy email (username) and generated password</p>
        <p>• Share credentials with vendor securely</p>
        <p>• Vendor logs in at <strong>/vendor-login</strong></p>
        <p>• Click <strong>"Reset"</strong> to generate new password anytime</p>
      </div>
    </div>
  );
}
