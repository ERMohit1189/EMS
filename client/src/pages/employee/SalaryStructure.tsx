import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
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

interface SalaryFormula {
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
}

const DEFAULT_FORMULAS: Record<keyof Omit<SalaryStructure, 'id' | 'employeeId'>, SalaryFormula> = {
  basicSalary: { type: 'fixed', value: 0, description: 'Base Salary' },
  hra: { type: 'percentage', value: 50, description: '50% of Basic' },
  da: { type: 'percentage', value: 20, description: '20% of Basic' },
  lta: { type: 'percentage', value: 10, description: '10% of Basic' },
  conveyance: { type: 'fixed', value: 2000, description: 'Fixed' },
  medical: { type: 'fixed', value: 1250, description: 'Fixed' },
  bonuses: { type: 'fixed', value: 0, description: 'Fixed' },
  otherBenefits: { type: 'fixed', value: 0, description: 'Fixed' },
  pf: { type: 'percentage', value: 12, description: '12% of Basic' },
  professionalTax: { type: 'fixed', value: 200, description: 'Fixed' },
  incomeTax: { type: 'fixed', value: 0, description: 'Fixed' },
  epf: { type: 'percentage', value: 3.67, description: '3.67% of Basic' },
  esic: { type: 'percentage', value: 0.75, description: '0.75% of Basic' },
};

export default function SalaryStructure() {
  const { toast } = useToast();
  const basicSalaryRef = useRef<HTMLInputElement>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salary, setSalary] = useState<SalaryStructure | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formulas, setFormulas] = useState<Record<keyof Omit<SalaryStructure, 'id' | 'employeeId'>, SalaryFormula>>(DEFAULT_FORMULAS);
  const [manuallyEdited, setManuallyEdited] = useState<Set<keyof SalaryStructure>>(new Set());

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Focus basic salary input when salary is loaded
  useEffect(() => {
    if (salary) {
      setTimeout(() => basicSalaryRef.current?.focus(), 0);
    }
  }, [salary]);

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

  const calculateValue = (field: keyof Omit<SalaryStructure, 'id' | 'employeeId'>, basicSalary: number): number => {
    const formula = formulas[field];
    if (formula.type === 'percentage') {
      return (basicSalary * formula.value) / 100;
    }
    return formula.value;
  };

  const autoCalculateSalary = (basicSalary: number): Partial<SalaryStructure> => {
    const calculated: Partial<SalaryStructure> = {};
    const fields: (keyof Omit<SalaryStructure, 'id' | 'employeeId'>)[] = [
      'hra', 'da', 'lta', 'conveyance', 'medical', 'bonuses', 'otherBenefits',
      'pf', 'professionalTax', 'incomeTax', 'epf', 'esic'
    ];

    fields.forEach(field => {
      // Only recalculate if user hasn't manually edited it
      if (!manuallyEdited.has(field)) {
        calculated[field] = calculateValue(field, basicSalary);
      }
    });

    return calculated;
  };

  const loadSalaryStructure = async (employeeId: string) => {
    setIsLoading(true);
    setManuallyEdited(new Set());
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/employees/${employeeId}/salary`);
      if (response.ok) {
        const data = await response.json();
        setSalary(data);
      } else {
        // No salary structure yet, create blank one with auto-calculations
        const newSalary: SalaryStructure = {
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
        };
        setSalary(newSalary);
      }
    } catch (error) {
      console.error("Failed to load salary", error);
      const newSalary: SalaryStructure = {
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
      };
      setSalary(newSalary);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeChange = (value: string) => {
    setSelectedEmployee(value);
    if (value) loadSalaryStructure(value);
  };

  const handleSalaryChange = (field: keyof SalaryStructure, value: string) => {
    if (!salary) return;

    const numValue = parseFloat(value) || 0;
    const newManuallyEdited = new Set(manuallyEdited);
    newManuallyEdited.add(field);
    setManuallyEdited(newManuallyEdited);

    // If basic salary changed, recalculate everything
    if (field === 'basicSalary') {
      const calculated = autoCalculateSalary(numValue);
      setSalary({
        ...salary,
        [field]: numValue,
        ...calculated,
      });
      setManuallyEdited(new Set(['basicSalary'])); // Only basic salary is edited now
    } else {
      setSalary({
        ...salary,
        [field]: numValue,
      });
    }
  };

  const resetToFormula = (field: keyof Omit<SalaryStructure, 'id' | 'employeeId'>) => {
    if (!salary) return;
    const newManuallyEdited = new Set(manuallyEdited);
    newManuallyEdited.delete(field);
    setManuallyEdited(newManuallyEdited);

    const newValue = calculateValue(field, salary.basicSalary);
    setSalary({
      ...salary,
      [field]: newValue,
    });
  };

  const updateFormula = (field: keyof Omit<SalaryStructure, 'id' | 'employeeId'>, newFormula: SalaryFormula) => {
    setFormulas({
      ...formulas,
      [field]: newFormula,
    });

    // Recalculate this field if not manually edited
    if (!manuallyEdited.has(field) && salary) {
      const newValue = newFormula.type === 'percentage' 
        ? (salary.basicSalary * newFormula.value) / 100 
        : newFormula.value;
      setSalary({
        ...salary,
        [field]: newValue,
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
          <p className="text-muted-foreground">Define and view employee salary breakdowns with dynamic auto-fill.</p>
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

  const renderSalaryField = (field: keyof Omit<SalaryStructure, 'id' | 'employeeId'>, label: string) => {
    const isManuallyEdited = manuallyEdited.has(field);
    const formula = formulas[field];
    
    return (
      <div key={field} className="grid grid-cols-2 items-center gap-2">
        <div>
          <Label className="text-sm">{label}</Label>
          <p className="text-xs text-muted-foreground">
            {formula.type === 'percentage' ? `${formula.value}% of Basic` : 'Fixed'}
          </p>
        </div>
        <div className="flex gap-2">
          <Input 
            type="number" 
            value={salary[field]} 
            onChange={(e) => handleSalaryChange(field, e.target.value)}
            className={isManuallyEdited ? 'border-blue-500' : ''}
          />
          {isManuallyEdited && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => resetToFormula(field)}
              title="Reset to formula"
              className="text-xs"
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Salary Structure</h2>
        <p className="text-muted-foreground">Dynamic salary form - enter basic salary and other fields auto-fill based on formulas. Click "Reset" to revert any manual changes.</p>
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
            <CardDescription>Allowances and Basic Pay (Auto-calculated based on Basic Salary)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 items-center gap-2">
              <Label className="text-base font-semibold">Basic Salary</Label>
              <Input 
                ref={basicSalaryRef} 
                type="number" 
                value={salary.basicSalary} 
                onChange={(e) => handleSalaryChange('basicSalary', e.target.value)}
                className="font-semibold"
              />
            </div>
            <Separator />
            {renderSalaryField('hra', 'HRA')}
            {renderSalaryField('da', 'DA')}
            {renderSalaryField('lta', 'LTA')}
            {renderSalaryField('conveyance', 'Conveyance')}
            {renderSalaryField('medical', 'Medical')}
            {renderSalaryField('bonuses', 'Bonuses')}
            {renderSalaryField('otherBenefits', 'Other Benefits')}
            <Separator />
            <div className="flex justify-between font-bold text-lg text-emerald-600 bg-green-50 dark:bg-green-950 p-3 rounded">
              <span>Gross Salary</span>
              <span>₹{gross.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deductions</CardTitle>
            <CardDescription>PF, Tax and other deductions (Auto-calculated based on Basic Salary)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderSalaryField('pf', 'Provident Fund (PF)')}
            {renderSalaryField('professionalTax', 'Professional Tax')}
            {renderSalaryField('incomeTax', 'Income Tax (TDS)')}
            {renderSalaryField('epf', 'EPF')}
            {renderSalaryField('esic', 'ESIC')}
            <Separator />
            <div className="flex justify-between font-bold text-lg text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded">
              <span>Total Deductions</span>
              <span>₹{deductions.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-primary/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Net Salary Payable</h3>
              <p className="text-muted-foreground">Amount to be credited to bank account</p>
            </div>
            <div className="text-4xl font-bold text-primary">
              ₹{net.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        
        <div className="col-span-2 flex justify-end gap-4">
          <Button variant="outline" onClick={() => { setSelectedEmployee(""); setSalary(null); setManuallyEdited(new Set()); }}>Cancel</Button>
          <Button size="lg" onClick={saveSalary} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Structure'}
          </Button>
        </div>
      </div>
    </div>
  );
}
