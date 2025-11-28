import { useStore } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export default function EmployeeList() {
  const { employees, updateEmployeeStatus, deleteEmployee } = useStore();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const handleStatusToggle = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    updateEmployeeStatus(id, newStatus as 'Active' | 'Inactive');
    toast({
      title: 'Status Updated',
      description: `Employee status changed to ${newStatus}`,
    });
  };

  const handleDelete = (id: string) => {
    deleteEmployee(id);
    setDeleteConfirm(null);
    toast({
      title: 'Employee Deleted',
      description: 'Employee record has been removed',
    });
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

       <div className="rounded-md border bg-card overflow-x-auto">
         <div className="grid gap-0 min-w-full" style={{gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 1fr'}}>
           <div className="col-span-1 p-4 font-medium border-b bg-muted/50 text-muted-foreground text-sm">Name / Designation</div>
           <div className="col-span-1 p-4 font-medium border-b bg-muted/50 text-muted-foreground text-sm">Email</div>
           <div className="col-span-1 p-4 font-medium border-b bg-muted/50 text-muted-foreground text-sm">Contact</div>
           <div className="col-span-1 p-4 font-medium border-b bg-muted/50 text-muted-foreground text-sm">Location</div>
           <div className="col-span-1 p-4 font-medium border-b bg-muted/50 text-muted-foreground text-sm">Status</div>
           <div className="col-span-1 p-4 font-medium border-b bg-muted/50 text-muted-foreground text-sm text-right">Actions</div>
         </div>
         {employees.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No employees found. Add one to get started.</div>
         ) : (
           employees.map(e => (
             <div key={e.id} className="grid gap-0 border-b last:border-0 hover:bg-muted/50 transition-colors items-center" style={{gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 1fr'}}>
               <div className="p-4">
                 <div className="font-medium">{e.name}</div>
                 <div className="text-xs text-muted-foreground">{e.designation}</div>
               </div>
               <div className="p-4 text-sm font-mono text-blue-600 truncate" data-testid={`text-email-${e.id}`}>{e.email}</div>
               <div className="p-4 text-sm font-mono">{e.mobile}</div>
               <div className="p-4 text-sm">{e.city}</div>
               <div className="p-4">
                 <Badge 
                   variant={e.status === 'Active' ? 'default' : 'secondary'}
                   className="cursor-pointer hover:opacity-80"
                   onClick={() => handleStatusToggle(e.id, e.status)}
                   data-testid={`badge-status-${e.id}`}
                 >
                   {e.status}
                 </Badge>
               </div>
               <div className="p-4 flex justify-end gap-2">
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setLocation(`/employee/edit/${e.id}`)}
                   className="gap-2"
                   data-testid={`button-edit-${e.id}`}
                 >
                   <Edit className="h-4 w-4" />
                   Edit
                 </Button>
                 <Button
                   variant="destructive"
                   size="sm"
                   onClick={() => setDeleteConfirm(e.id)}
                   className="gap-2"
                   data-testid={`button-delete-${e.id}`}
                 >
                   <Trash2 className="h-4 w-4" />
                   Delete
                 </Button>
               </div>
             </div>
           ))
         )}
       </div>

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
               className="bg-destructive hover:bg-destructive/90"
             >
               Delete
             </AlertDialogAction>
           </div>
         </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
