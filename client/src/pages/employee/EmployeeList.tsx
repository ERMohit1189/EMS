import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { authenticatedFetch } from "@/lib/fetchWithLoader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
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
import { Input } from "@/components/ui/input";

interface Employee {
  id: string;
  name: string;
  email: string;
  mobile: string;
  city: string;
  status: string;
  empCode?: string;
  designationName?: string;
  departmentName?: string;
}

export default function EmployeeList() {
  // Role-based access control
  const employeeRole = localStorage.getItem('employeeRole')?.toLowerCase() || '';
  if (employeeRole !== 'admin' && employeeRole !== 'user' && employeeRole !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-xl font-bold mb-2">Not Authorized</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true); // Always show loader instantly
        setTableLoading(true);
        const params = new URLSearchParams();
        params.append('page', String(currentPage));
        params.append('pageSize', String(pageSize));

        const empResponse = await authenticatedFetch(`${getApiBaseUrl()}/api/employees?${params.toString()}`, { cache: 'no-store' });
        if (!empResponse.ok) throw new Error('Failed to fetch employees');
        const { data, totalCount } = await empResponse.json();
        const employees_data = data || [];

        // Fetch designations once
        const desigResponse = await authenticatedFetch(`${getApiBaseUrl()}/api/designations`, { cache: 'no-store' });
        const designations = desigResponse.ok ? await desigResponse.json() : [];
        const designationMap: { [key: string]: string } = {};
        designations.forEach((d: any) => { designationMap[d.id] = d.name; });

        const enrichedEmployees = employees_data
          .filter((e: Employee) => e.email !== 'superadmin@eoms.local')
          .map((e: any) => ({
            ...e,
            designationName: e.designationId ? designationMap[e.designationId] : 'Not Specified'
          }));

        setEmployees(enrichedEmployees);
        setTotalEmployees(totalCount || 0);
      } catch (error) {
        console.error('Failed to fetch employees:', error);
        toast({ title: 'Error', description: 'Failed to load employees', variant: 'destructive' });
      } finally {
        setLoading(false);
        setTableLoading(false);
      }
    };
    fetchEmployees();
  }, [toast, currentPage, pageSize]);

  const handleDelete = async (id: string) => {
    try {
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/employees/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setEmployees(employees.filter(e => e.id !== id));
        setDeleteConfirm(null);
        
        // Also delete the employee's credentials from localStorage
        const saved = localStorage.getItem('employeeCredentials');
        if (saved) {
          const allCreds = JSON.parse(saved);
          const filteredCreds = allCreds.filter((c: any) => c.employeeId !== id);
          localStorage.setItem('employeeCredentials', JSON.stringify(filteredCreds));
        }
        
        toast({
          title: 'Employee Deleted',
          description: 'Employee record and credentials have been removed',
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete employee', variant: 'destructive' });
    }
  };
  
  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
       <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
         <div>
           <h2 className="text-2xl md:text-3xl font-bold tracking-tight">All Employees</h2>
           <p className="text-xs md:text-sm text-muted-foreground">Directory of all staff members.</p>
         </div>
         <Link href="/employee/register">
            <Button className="gap-2 w-full md:w-auto text-xs md:text-sm">
              <Plus className="h-4 w-4" /> Add Employee
            </Button>
         </Link>
       </div>

       {/* Desktop Table */}
       <div className="hidden md:block rounded-md border bg-card overflow-x-auto max-h-[60vh] overflow-auto">
         <div className="sticky top-0 z-20 grid grid-cols-[1fr_1.5fr_1.5fr_1.5fr_1fr_1fr_1fr] gap-0 p-4 font-medium border-b bg-primary text-primary-foreground text-sm">
           <div className="">Employee Code</div>
           <div className="">Name / Designation</div>
           <div className="">Email</div>
           <div className="">Contact</div>
           <div className="">Location</div>
           <div className="">Status</div>
           <div className="">Actions</div>
         </div>
         {tableLoading ? (
           <div className="p-8">
             <SkeletonLoader type="table" count={Math.min(pageSize, 10)} />
           </div>
         ) : employees.length === 0 ? (
           <div className="p-8 text-center text-muted-foreground">No employees found. Add one to get started.</div>
         ) : (
           employees.map(e => (
             <div key={e.id} className="grid gap-0 border-b last:border-0 hover:bg-muted/50 transition-colors items-center" style={{gridTemplateColumns: '1fr 1.5fr 1.5fr 1.5fr 1fr 1fr 1fr'}}>
               <div className="p-4 text-sm font-mono text-blue-600">{e.empCode || 'N/A'}</div>
               <div className="p-4">
                 <div className="font-medium text-sm">{e.name}</div>
                 <div className="text-xs text-muted-foreground">{e.designationName || 'Not Specified'}</div>
               </div>
               <div className="p-4 text-sm font-mono text-blue-600 truncate" data-testid={`text-email-${e.id}`} title={e.email}>{e.email}</div>
               <div className="p-4 text-sm font-mono">{e.mobile}</div>
               <div className="p-4 text-sm">{e.city}</div>
               <div className="p-4">
                 <Badge
                   variant={e.status === 'Active' ? 'default' : 'secondary'}
                   data-testid={`badge-status-${e.id}`}
                 >
                   {e.status}
                 </Badge>
               </div>
               <div className="p-4 flex gap-2">
                 <Button
                   variant="outline"
                   size="sm"
                   className="h-8"
                   onClick={() => setLocation(`/employee/edit/${e.id}`)}
                   data-testid={`button-edit-${e.id}`}
                 >
                   <Edit className="h-4 w-4" />
                 </Button>
                 <Button
                   variant="destructive"
                   size="sm"
                   className="h-8"
                   onClick={() => setDeleteConfirm(e.id)}
                   data-testid={`button-delete-${e.id}`}
                 >
                   <Trash2 className="h-4 w-4" />
                 </Button>
               </div>
             </div>
           ))
         )}

         {/* Table footer: sticky pagination inside scroll container */}
         {totalEmployees > 0 && (
           <div className="sticky bottom-0 bg-card/90 backdrop-blur border-t p-2 flex items-center justify-between">
             <div className="text-sm text-muted-foreground">Showing {totalEmployees === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(totalEmployees, currentPage * pageSize)} of {totalEmployees.toLocaleString()} employees</div>
             <div className="flex items-center gap-2">
               <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</Button>
               <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
               <div className="px-2">Page</div>
               <Input value={String(currentPage)} onChange={(e) => { const v = Number(e.target.value || 1); if (!isNaN(v)) setCurrentPage(Math.min(Math.max(1, v), Math.max(1, Math.ceil(totalEmployees / pageSize)))); }} className="w-16 text-center" onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
               <div className="px-2">of {Math.max(1, Math.ceil(totalEmployees / pageSize))}</div>
               <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(totalEmployees / pageSize)), p + 1))} disabled={currentPage === Math.max(1, Math.ceil(totalEmployees / pageSize))}>Next</Button>
               <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(Math.max(1, Math.ceil(totalEmployees / pageSize)))} disabled={currentPage === Math.max(1, Math.ceil(totalEmployees / pageSize))}>Last</Button>
               <select className="form-select text-sm" value={String(pageSize)} onChange={(e) => { const v = Number(e.target.value || 50); setPageSize(v); setCurrentPage(1); }}>
                 {[10,25,50,100].map(sz => <option key={sz} value={sz}>{sz}</option>) }
               </select>
             </div>
           </div>
         )}
       </div>

       {/* Mobile Card View */}
       <div className="md:hidden space-y-2">
         {employees.length === 0 ? (
           <div className="p-6 text-center text-muted-foreground text-sm">No employees found. Add one to get started.</div>
         ) : (
           employees.map(e => (
             <Card key={e.id} className="p-3 shadow-sm border">
               <div className="space-y-2">
                 <div className="flex items-start justify-between gap-2">
                   <div className="flex-1 min-w-0">
                     <p className="text-xs text-muted-foreground">Code: {e.empCode || 'N/A'}</p>
                     <p className="font-medium text-sm truncate">{e.name}</p>
                     <p className="text-xs text-muted-foreground">{e.designationName || 'Not Specified'}</p>
                   </div>
                   <div className="flex gap-1 flex-shrink-0">
                     <Button
                       variant="outline"
                       size="sm"
                       className="h-7 px-2"
                       onClick={() => setLocation(`/employee/edit/${e.id}`)}
                       data-testid={`button-edit-${e.id}`}
                     >
                       <Edit className="h-3 w-3" />
                     </Button>
                     <Button
                       variant="destructive"
                       size="sm"
                       className="h-7 px-2"
                       onClick={() => setDeleteConfirm(e.id)}
                       data-testid={`button-delete-${e.id}`}
                     >
                       <Trash2 className="h-3 w-3" />
                     </Button>
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-2 text-xs">
                   <div>
                     <p className="text-muted-foreground">Email</p>
                     <p className="font-medium text-xs truncate" title={e.email}>{e.email}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Contact</p>
                     <p className="font-medium text-xs">{e.mobile}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Location</p>
                     <p className="font-medium text-xs">{e.city}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Status</p>
                     <Badge 
                       variant={e.status === 'Active' ? 'default' : 'secondary'}
                       className="text-xs"
                       data-testid={`badge-status-${e.id}`}
                     >
                       {e.status}
                     </Badge>
                   </div>
                 </div>
               </div>
             </Card>
           ))
         )}
       </div>

      {/* Mobile pagination controls */}
      {totalEmployees > 0 && (
        <div className="md:hidden flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">Showing {totalEmployees === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(totalEmployees, currentPage * pageSize)} of {totalEmployees.toLocaleString()}</div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
            <div className="px-2">Page</div>
            <Input value={String(currentPage)} onChange={(e) => { const v = Number(e.target.value || 1); if (!isNaN(v)) setCurrentPage(Math.min(Math.max(1, v), Math.max(1, Math.ceil(totalEmployees / pageSize)))); }} className="w-16 text-center" onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
            <div className="px-2">of {Math.max(1, Math.ceil(totalEmployees / pageSize))}</div>
            <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(totalEmployees / pageSize)), p + 1))} disabled={currentPage === Math.max(1, Math.ceil(totalEmployees / pageSize))}>Next</Button>
            <select className="form-select text-sm" value={String(pageSize)} onChange={(e) => { const v = Number(e.target.value || 50); setPageSize(v); setCurrentPage(1); }}>
              {[10,25,50,100].map(sz => <option key={sz} value={sz}>{sz}</option>) }
            </select>
          </div>
        </div>
      )}

       <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
         <AlertDialogContent className="max-w-sm">
           <AlertDialogHeader>
             <AlertDialogTitle>Delete Employee</AlertDialogTitle>
             <AlertDialogDescription className="text-xs md:text-sm">
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
