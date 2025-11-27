import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Vendor } from "@shared/schema";

export default function VendorList() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vendors?pageSize=10000');
      if (!response.ok) throw new Error('Failed to fetch vendors');
      const result = await response.json();
      setVendors(result.data || []);
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
      const response = await fetch(`/api/vendors/${id}/status`, {
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

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading vendors...</div>;
  }
  
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h2 className="text-3xl font-bold tracking-tight">All Vendors</h2>
           <p className="text-muted-foreground">Manage your registered vendors.</p>
         </div>
         <Link href="/vendor/register">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Register Vendor
            </Button>
         </Link>
       </div>

       <div className="rounded-md border bg-card">
         <div className="grid grid-cols-6 p-4 font-medium border-b bg-muted/50 text-muted-foreground text-sm">
           <div className="col-span-2">Name / Email</div>
           <div>Location</div>
           <div>Category</div>
           <div>Status</div>
           <div>Contact</div>
           <div className="text-right">Action</div>
         </div>
         {vendors.length === 0 ? (
           <div className="p-8 text-center text-muted-foreground">No vendors found. Register one to get started.</div>
         ) : (
           vendors.map(v => (
             <div key={v.id} className="grid grid-cols-6 p-4 border-b last:border-0 items-center hover:bg-muted/50 transition-colors">
               <div className="col-span-2">
                 <div className="font-medium">{v.name}</div>
                 <div className="text-xs text-muted-foreground">{v.email}</div>
               </div>
               <div className="text-sm">{v.city}, {v.state}</div>
               <div className="text-sm">{v.category}</div>
               <div>
                 <Select value={v.status} onValueChange={(status) => updateStatus(v.id, status)}>
                   <SelectTrigger className="w-[120px]">
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
               <div className="text-right">
               </div>
             </div>
           ))
         )}
       </div>
    </div>
  );
}
