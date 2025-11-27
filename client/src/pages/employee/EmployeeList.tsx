import { useStore } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "wouter";

export default function EmployeeList() {
  const { employees } = useStore();
  
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

       <div className="rounded-md border bg-card">
         <div className="grid grid-cols-5 p-4 font-medium border-b bg-muted/50 text-muted-foreground text-sm">
           <div className="col-span-2">Name / Designation</div>
           <div>Contact</div>
           <div>Location</div>
           <div>Joining Date</div>
         </div>
         {employees.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No employees found. Add one to get started.</div>
         ) : (
           employees.map(e => (
             <div key={e.id} className="grid grid-cols-5 p-4 border-b last:border-0 items-center hover:bg-muted/50 transition-colors">
               <div className="col-span-2">
                 <div className="font-medium">{e.name}</div>
                 <div className="text-xs text-muted-foreground">{e.designation}</div>
               </div>
               <div className="text-sm font-mono">{e.mobile}</div>
               <div className="text-sm">{e.city}</div>
               <div className="text-sm">{e.doj}</div>
             </div>
           ))
         )}
       </div>
    </div>
  );
}
