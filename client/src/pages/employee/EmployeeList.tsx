import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { PageLoader } from "@/components/PageLoader";
import { usePageLoader } from "@/hooks/usePageLoader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";

interface Employee {
  id: string;
  name: string;
  email: string;
  mobile: string;
  city: string;
  status: string;
  designationName?: string;
  departmentName?: string;
}

export default function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { isLoading, withLoader } = usePageLoader();

  useEffect(() => {
    const fetchEmployees = async () => {
      await withLoader(async () => {
        try {
          const [empResponse, desigResponse] = await Promise.all([
            fetch(`${getApiBaseUrl()}/api/employees?page=1&pageSize=100`, { cache: 'no-store' }),
            fetch(`${getApiBaseUrl()}/api/designations`, { cache: 'no-store' })
          ]);
          
          if (empResponse.ok && desigResponse.ok) {
            const empData = await empResponse.json();
            const designations = await desigResponse.json();
            
            // Create a map of designationId -> name
            const designationMap: { [key: string]: string } = {};
            designations.forEach((d: any) => {
              designationMap[d.id] = d.name;
            });
            
            // Enrich employees with designation names
            const enrichedEmployees = (empData.data || [])
              .filter((e: Employee) => e.email !== 'superadmin@ems.local')
              .map((e: any) => ({
                ...e,
                designationName: e.designationId ? designationMap[e.designationId] : 'Not Specified'
              }));
            
            setEmployees(enrichedEmployees);
          }
        } catch (error) {
          console.error('Failed to fetch employees:', error);
          toast({ title: 'Error', description: 'Failed to load employees', variant: 'destructive' });
        }
      });
    };
    fetchEmployees();
  }, [toast, withLoader]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/employees/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setEmployees(employees.filter(e => e.id !== id));
        setDeleteConfirm(null);
        toast({
          title: 'Employee Deleted',
          description: 'Employee record has been removed',
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete employee', variant: 'destructive' });
    }
  };
  
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h2 className="text-3xl font-bold tracking-tight">All Employees</h2>
           <p className="text-muted-foreground">Directory of all staff members.</p>
         </div>
         <Link href="/employee/register">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Employee
            </Button>
         </Link>
       </div>

       {isLoading ? (
         <PageLoader isLoading={true} message="Loading employee data..." />
       ) : (
       <div className="rounded-md border bg-card overflow-x-auto">
         <div className="grid gap-0 min-w-full" style={{gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 1fr'}}>
           <div className="col-span-1 p-4 font-medium border-b bg-muted/50 text-muted-foreground text-sm text-left">Name / Designation</div>
           <div className="col-span-1 p-4 font-medium border-b bg-muted/50 text-muted-foreground text-sm text-left">Email</div>
           <div className="col-span-1 p-4 font-medium border-b bg-muted/50 text-muted-foreground text-sm text-left">Contact</div>
           <div className="col-span-1 p-4 font-medium border-b bg-muted/50 text-muted-foreground text-sm text-left">Location</div>
           <div className="col-span-1 p-4 font-medium border-b bg-muted/50 text-muted-foreground text-sm text-left">Status</div>
           <div className="col-span-1 p-4 font-medium border-b bg-muted/50 text-muted-foreground text-sm text-left">Actions</div>
         </div>
         {employees.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No employees found. Add one to get started.</div>
         ) : (
           employees.map(e => (
             <div key={e.id} className="grid gap-0 border-b last:border-0 hover:bg-muted/50 transition-colors items-center" style={{gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 1fr'}}>
               <div className="p-4">
                 <div className="font-medium">{e.name}</div>
                 <div className="text-xs text-muted-foreground">{e.designationName || 'Not Specified'}</div>
               </div>
               <div className="p-4 text-sm font-mono text-blue-600 truncate text-left" data-testid={`text-email-${e.id}`} title={e.email}>{e.email}</div>
               <div className="p-4 text-sm font-mono text-left">{e.mobile}</div>
               <div className="p-4 text-sm text-left">{e.city}</div>
               <div className="p-4 text-left">
                 <Badge 
                   variant={e.status === 'Active' ? 'default' : 'secondary'}
                   data-testid={`badge-status-${e.id}`}
                 >
                   {e.status}
                 </Badge>
               </div>
               <div className="p-4 flex justify-start gap-2">
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setLocation(`/employee/edit/${e.id}`)}
                   data-testid={`button-edit-${e.id}`}
                 >
                   <Edit className="h-4 w-4" />
                 </Button>
                 <Button
                   variant="destructive"
                   size="sm"
                   onClick={() => setDeleteConfirm(e.id)}
                   data-testid={`button-delete-${e.id}`}
                 >
                   <Trash2 className="h-4 w-4" />
                 </Button>
               </div>
             </div>
           ))
         )}
       </div>
       )}

       <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Delete Employee</AlertDialogTitle>
             <AlertDialogDescription>
               Are you sure you want to delete this employee record? This action cannot be undone.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <div className="flex justify-end gap-4">
             <AlertDialogCancel>Cancel</AlertDialogCancel>
             <AlertDialogAction
               onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
             >
               Delete
             </AlertDialogAction>
           </div>
         </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
