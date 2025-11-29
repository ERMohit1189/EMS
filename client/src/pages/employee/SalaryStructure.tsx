import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface SalaryStructure {
  id?: string;
  employeeId: string;
  basicSalary: number;
  hra: number;
  da: number;
  lta: number;
  conveyance: number;
  medical: number;
  bonuses: number;
  otherBenefits: number;
  pf: number;
  professionalTax: number;
  incomeTax: number;
  epf: number;
  esic: number;
}

export default function SalaryStructure() {
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salary, setSalary] = useState<SalaryStructure | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/employees?page=1&pageSize=100`);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.data || []);
      }
    } catch (error) {
      console.error("Failed to load employees", error);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive",
      });
    }
  };

  const loadSalaryStructure = async (employeeId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/employees/${employeeId}/salary`);
      if (response.ok) {
        const data = await response.json();
        setSalary(data);
      } else {
        // No salary structure yet, create blank one
        setSalary({
          employeeId,
          basicSalary: 0,
          hra: 0,
          da: 0,
          lta: 0,
          conveyance: 0,
          medical: 0,
          bonuses: 0,
          otherBenefits: 0,
          pf: 0,
          professionalTax: 0,
          incomeTax: 0,
          epf: 0,
          esic: 0,
        });
      }
    } catch (error) {
      console.error("Failed to load salary", error);
      setSalary({
        employeeId,
        basicSalary: 0,
        hra: 0,
        da: 0,
        lta: 0,
        conveyance: 0,
        medical: 0,
        bonuses: 0,
        otherBenefits: 0,
        pf: 0,
        professionalTax: 0,
        incomeTax: 0,
        epf: 0,
        esic: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeChange = (value: string) => {
    setSelectedEmployee(value);
    if (value) loadSalaryStructure(value);
  };

  const handleSalaryChange = (field: keyof SalaryStructure, value: string) => {
    if (salary) {
      setSalary({
        ...salary,
        [field]: parseFloat(value) || 0,
      });
    }
  };

  const saveSalary = async () => {
    if (!salary) return;
    setIsSaving(true);
    try {
      const endpoint = salary.id 
        ? `${getApiBaseUrl()}/api/salary-structures/${salary.id}`
        : `${getApiBaseUrl()}/api/salary-structures`;
      
      const method = salary.id ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salary),
      });

      if (!response.ok) {
        throw new Error('Failed to save salary structure');
      }

      const saved = await response.json();
      setSalary(saved);
      toast({
        title: 'Success',
        description: 'Salary structure saved successfully',
      });
    } catch (error) {
      console.error('Error saving salary:', error);
      toast({
        title: 'Error',
        description: 'Failed to save salary structure',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!salary) {
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
                <Select onValueChange={handleEmployeeChange} value={selectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Search employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gross = salary.basicSalary + salary.hra + salary.da + salary.lta + salary.conveyance + salary.medical + salary.bonuses + salary.otherBenefits;
  const deductions = salary.pf + salary.professionalTax + salary.incomeTax + salary.epf + salary.esic;
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
              <Select onValueChange={handleEmployeeChange} value={selectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Search employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Earnings</CardTitle>
            <CardDescription>Allowances and Basic Pay</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>Basic Salary</Label>
              <Input type="number" value={salary.basicSalary} onChange={(e) => handleSalaryChange('basicSalary', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>HRA</Label>
              <Input type="number" value={salary.hra} onChange={(e) => handleSalaryChange('hra', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>DA</Label>
              <Input type="number" value={salary.da} onChange={(e) => handleSalaryChange('da', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>LTA</Label>
              <Input type="number" value={salary.lta} onChange={(e) => handleSalaryChange('lta', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>Conveyance</Label>
              <Input type="number" value={salary.conveyance} onChange={(e) => handleSalaryChange('conveyance', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>Medical</Label>
              <Input type="number" value={salary.medical} onChange={(e) => handleSalaryChange('medical', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>Bonuses</Label>
              <Input type="number" value={salary.bonuses} onChange={(e) => handleSalaryChange('bonuses', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>Other Benefits</Label>
              <Input type="number" value={salary.otherBenefits} onChange={(e) => handleSalaryChange('otherBenefits', e.target.value)} />
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
              <Input type="number" value={salary.pf} onChange={(e) => handleSalaryChange('pf', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>Professional Tax</Label>
              <Input type="number" value={salary.professionalTax} onChange={(e) => handleSalaryChange('professionalTax', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>Income Tax (TDS)</Label>
              <Input type="number" value={salary.incomeTax} onChange={(e) => handleSalaryChange('incomeTax', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>EPF</Label>
              <Input type="number" value={salary.epf} onChange={(e) => handleSalaryChange('epf', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>ESIC</Label>
              <Input type="number" value={salary.esic} onChange={(e) => handleSalaryChange('esic', e.target.value)} />
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
        
        <div className="col-span-2 flex justify-end gap-4">
          <Button variant="outline" onClick={() => { setSelectedEmployee(""); setSalary(null); }}>Cancel</Button>
          <Button size="lg" onClick={saveSalary} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Structure'}
          </Button>
        </div>
      </div>
    </div>
  );
}
