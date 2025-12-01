import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiBaseUrl } from "@/lib/api";
import { fetchWithLoader } from "@/lib/fetchWithLoader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import type { Vendor } from "@shared/schema";

export default function VendorList() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorUsage, setVendorUsage] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const url = `${getApiBaseUrl()}/api/vendors?pageSize=10000`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch vendors');
      const result = await response.json();
      setVendors(result.data || []);

      // Check usage for each vendor
      const usageMap: { [key: string]: boolean } = {};
      for (const vendor of result.data || []) {
        try {
          const usageRes = await fetch(`${getApiBaseUrl()}/api/vendors/${vendor.id}/usage`);
          const usageData = await usageRes.json();
          console.log(`[VendorList] Vendor ${vendor.id} usage:`, usageData);
          usageMap[vendor.id] = usageData.isUsed || false;
        } catch (e) {
          console.error(`[VendorList] Error checking usage for vendor ${vendor.id}:`, e);
          usageMap[vendor.id] = false; // Default to not used so delete button shows
        }
      }
      console.log("[VendorList] Final usage map:", usageMap);
      setVendorUsage(usageMap);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load vendors',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const url = `${getApiBaseUrl()}/api/vendors/${id}/status`;
      const response = await fetchWithLoader(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      fetchVendors();
      toast({
        title: 'Success',
        description: 'Vendor status updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update vendor status',
        variant: 'destructive',
      });
    }
  };

  const deleteVendor = async (id: string, name: string) => {
    if (!confirm(`Delete vendor "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const url = `${getApiBaseUrl()}/api/vendors/${id}`;
      const response = await fetchWithLoader(url, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete vendor');
      
      setVendors(vendors.filter(v => v.id !== id));
      toast({
        title: 'Success',
        description: `Vendor "${name}" has been deleted.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete vendor',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }
  
  return (
    <div className="space-y-4 md:space-y-6">
       <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
         <div>
           <h2 className="text-2xl md:text-3xl font-bold tracking-tight">All Vendors</h2>
           <p className="text-xs md:text-sm text-muted-foreground">Manage your registered vendors.</p>
         </div>
         <Link href="/vendor/register">
            <Button className="gap-2 w-full md:w-auto text-xs md:text-sm">
              <Plus className="h-4 w-4" /> Register Vendor
            </Button>
         </Link>
       </div>

       {/* Desktop Table */}
       <div className="hidden md:block rounded-md border bg-card">
         <div className="grid grid-cols-8 gap-4 p-4 font-medium border-b bg-muted/50 text-muted-foreground text-sm">
           <div className="col-span-2">Name / Email</div>
           <div>Vendor Code</div>
           <div>Location</div>
           <div>Category</div>
           <div>Status</div>
           <div>Contact</div>
           <div className="text-right">Actions</div>
         </div>
         {vendors.length === 0 ? (
           <div className="p-8 text-center text-muted-foreground">No vendors found. Register one to get started.</div>
         ) : (
           vendors.map(v => (
             <div key={v.id} className="grid grid-cols-8 gap-4 p-4 border-b last:border-0 items-center hover:bg-muted/50 transition-colors">
               <div className="col-span-2">
                 <div className="font-medium text-sm">{v.name}</div>
                 <div className="text-xs text-muted-foreground truncate">{v.email}</div>
               </div>
               <div className="text-sm font-mono font-bold text-primary" data-testid={`vendor-code-${v.id}`}>{v.vendorCode || 'N/A'}</div>
               <div className="text-sm">{v.city}, {v.state}</div>
               <div className="text-sm">{v.category}</div>
               <div>
                 <Select value={v.status} onValueChange={(status) => updateStatus(v.id, status)}>
                   <SelectTrigger className="w-[120px] h-8 text-xs">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="Pending">Pending</SelectItem>
                     <SelectItem value="Approved">Approved</SelectItem>
                     <SelectItem value="Rejected">Rejected</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div className="text-sm font-mono">{v.mobile}</div>
               <div className="text-right flex gap-1 justify-end">
                 <Link href={`/vendor/edit/${v.id}`}>
                   <Button variant="ghost" size="sm" className="gap-1 h-8">
                     <Edit className="h-4 w-4" />
                   </Button>
                 </Link>
                 {vendorUsage[v.id] === false && (
                   <Button 
                     variant="destructive" 
                     size="sm"
                     className="h-8"
                     onClick={() => deleteVendor(v.id, v.name)}
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 )}
               </div>
             </div>
           ))
         )}
       </div>

       {/* Mobile Card View */}
       <div className="md:hidden space-y-2">
         {vendors.length === 0 ? (
           <div className="p-6 text-center text-muted-foreground text-sm">No vendors found. Register one to get started.</div>
         ) : (
           vendors.map(v => (
             <Card key={v.id} className="p-3 shadow-sm border">
               <div className="space-y-2">
                 <div className="flex items-start justify-between gap-2">
                   <div className="flex-1 min-w-0">
                     <p className="font-medium text-sm truncate">{v.name}</p>
                     <p className="text-xs text-muted-foreground truncate">{v.email}</p>
                     <p className="text-xs font-mono font-bold text-primary mt-1" data-testid={`vendor-code-mobile-${v.id}`}>Code: {v.vendorCode || 'N/A'}</p>
                   </div>
                   <div className="flex gap-1 flex-shrink-0">
                     <Link href={`/vendor/edit/${v.id}`}>
                       <Button variant="ghost" size="sm" className="gap-1 h-7 px-2">
                         <Edit className="h-3 w-3" />
                       </Button>
                     </Link>
                     {vendorUsage[v.id] === false && (
                       <Button 
                         variant="destructive" 
                         size="sm"
                         className="h-7 px-2"
                         onClick={() => deleteVendor(v.id, v.name)}
                       >
                         <Trash2 className="h-3 w-3" />
                       </Button>
                     )}
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-2 text-xs">
                   <div>
                     <p className="text-muted-foreground">Location</p>
                     <p className="font-medium truncate">{v.city}, {v.state}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Category</p>
                     <p className="font-medium">{v.category}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Contact</p>
                     <p className="font-medium text-xs">{v.mobile}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Status</p>
                     <Select value={v.status} onValueChange={(status) => updateStatus(v.id, status)}>
                       <SelectTrigger className="h-6 text-xs w-full">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="Pending">Pending</SelectItem>
                         <SelectItem value="Approved">Approved</SelectItem>
                         <SelectItem value="Rejected">Rejected</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
               </div>
             </Card>
           ))
         )}
       </div>
    </div>
  );
}
