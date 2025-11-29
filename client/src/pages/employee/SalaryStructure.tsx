import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

export default function SalaryStructure() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  
  const employee = employees.find(e => e.id === selectedEmployee);

  // Mock salary calculation
  const basic = 15000;
  const hra = basic * 0.5;
  const da = basic * 0.2;
  const gross = basic + hra + da + 2000; // + conveyance
  const deductions = 1800 + 200; // PF + Tax
  const net = gross - deductions;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Salary Structure</h2>
        <p className="text-muted-foreground">Define and view employee salary breakdowns.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Employee</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="grid gap-4 md:grid-cols-2">
             <div className="space-y-2">
               <Label>Employee Name</Label>
               <Select onValueChange={setSelectedEmployee} value={selectedEmployee}>
                 <SelectTrigger>
                   <SelectValue placeholder="Search employee..." />
                 </SelectTrigger>
                 <SelectContent>
                   {employees.map(e => (
                     <SelectItem key={e.id} value={e.id}>{e.name} - {e.designation}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </div>
        </CardContent>
      </Card>

      {employee && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Earnings</CardTitle>
              <CardDescription>Allowances and Basic Pay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>Basic Salary</Label>
                <Input defaultValue={basic} />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>HRA (50%)</Label>
                <Input defaultValue={hra} />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>DA (20%)</Label>
                <Input defaultValue={da} />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>Conveyance</Label>
                <Input defaultValue="2000" />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>Medical</Label>
                <Input defaultValue="1250" />
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg text-emerald-600">
                <span>Gross Salary</span>
                <span>₹{gross.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deductions</CardTitle>
              <CardDescription>PF, Tax and other deductions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>Provident Fund (PF)</Label>
                <Input defaultValue="1800" />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>Professional Tax</Label>
                <Input defaultValue="200" />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>Income Tax (TDS)</Label>
                <Input defaultValue="0" />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>ESIC</Label>
                <Input defaultValue="500" />
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg text-red-600">
                <span>Total Deductions</span>
                <span>₹{deductions.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-2 bg-slate-50 dark:bg-slate-900 border-primary/20">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Net Salary Payable</h3>
                <p className="text-muted-foreground">Amount to be credited to bank account</p>
              </div>
              <div className="text-3xl font-bold text-primary">
                ₹{net.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <div className="col-span-2 flex justify-end">
             <Button size="lg">Save Structure</Button>
          </div>
        </div>
      )}
    </div>
  );
}
