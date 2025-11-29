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

// Format number to max 2 decimals without padding zeros
const formatValue = (value: number | string): string | number => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 0;
  const rounded = parseFloat(num.toFixed(2));
  return rounded % 1 === 0 ? Math.floor(rounded) : rounded;
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
  const [manuallyEdited, setManuallyEdited] = useState<Set<string>>(new Set());
  const [editSource, setEditSource] = useState<'basic' | 'gross' | 'net' | null>(null);
  const [basicInput, setBasicInput] = useState<string>("");
  const [grossInput, setGrossInput] = useState<string>("");
  const [netInput, setNetInput] = useState<string>("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Focus basic salary input only when salary is first loaded, not on edits
  useEffect(() => {
    if (salary && editSource === null && selectedEmployee) {
      setTimeout(() => basicSalaryRef.current?.focus(), 0);
    }
  }, [selectedEmployee]);

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

  const calculateBasicFromGross = (gross: number): number => {
    if (!salary) return 0;
    
    // Calculate percentage multiplier
    const earnPercentageFields: (keyof Omit<SalaryStructure, 'id' | 'employeeId'>)[] = ['hra', 'da', 'lta'];
    let percentageMultiplier = 1; // Basic salary itself
    let fixedEarnings = 0;

    earnPercentageFields.forEach(field => {
      const formula = formulas[field];
      if (formula.type === 'percentage') {
        percentageMultiplier += formula.value / 100;
      }
    });

    // Add ACTUAL fixed earnings from current salary (user-filled values), ensuring numeric conversion
    fixedEarnings += Number(salary.conveyance) + Number(salary.medical) + Number(salary.bonuses) + Number(salary.otherBenefits);

    // Gross = Basic * percentageMultiplier + fixedEarnings
    // Basic = (Gross - fixedEarnings) / percentageMultiplier
    const basic = (gross - fixedEarnings) / percentageMultiplier;
    return Math.max(0, basic);
  };

  const calculateBasicFromNet = (net: number, deductionPercentages: number = 15.42): number => {
    if (!salary) return 0;
    
    // Estimate deductions as percentage of basic and calculate gross
    const factor = 1 - deductionPercentages / 100;
    let estimatedBasic = net / factor;

    // Refine by calculating actual deductions
    for (let i = 0; i < 3; i++) {
      const earnings = autoCalculateSalary(estimatedBasic, true);
      const fixedEarnings = Number(salary.conveyance) + Number(salary.medical) + Number(salary.bonuses) + Number(salary.otherBenefits);
      const gross = estimatedBasic + earnings.hra! + earnings.da! + earnings.lta! + fixedEarnings;
      const deductions = earnings.pf! + Number(salary.professionalTax) + Number(salary.incomeTax) + earnings.epf! + earnings.esic!;
      const calculatedNet = gross - deductions;
      
      if (Math.abs(calculatedNet - net) < 1) break;
      
      // Adjust basic
      estimatedBasic = estimatedBasic * (net / calculatedNet);
    }

    return Math.max(0, estimatedBasic);
  };

  const autoCalculateSalary = (basicSalary: number, includeFixed: boolean = false): Partial<SalaryStructure> => {
    const calculated: Partial<SalaryStructure> = {};
    // Only auto-calculate percentage fields, not fixed values
    const percentageFields: (keyof Omit<SalaryStructure, 'id' | 'employeeId'>)[] = [
      'hra', 'da', 'lta', 'pf', 'epf', 'esic'
    ];

    percentageFields.forEach(field => {
      // Only recalculate if user hasn't manually edited it
      if (!manuallyEdited.has(field)) {
        calculated[field] = calculateValue(field, basicSalary);
      }
    });

    // Fixed values are always user-filled, never auto-calculated
    // But on initial load, keep existing values
    if (includeFixed && salary) {
      calculated.conveyance = salary.conveyance;
      calculated.medical = salary.medical;
      calculated.bonuses = salary.bonuses;
      calculated.otherBenefits = salary.otherBenefits;
      calculated.professionalTax = salary.professionalTax;
      calculated.incomeTax = salary.incomeTax;
    }

    return calculated;
  };

  const loadSalaryStructure = async (employeeId: string) => {
    setIsLoading(true);
    setManuallyEdited(new Set());
    setEditSource(null);
    setBasicInput("");
    setGrossInput("");
    setNetInput("");
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/employees/${employeeId}/salary`);
      if (response.ok) {
        const data = await response.json();
        // Convert all string numeric values to numbers
        const numericFields = ['basicSalary', 'hra', 'da', 'lta', 'conveyance', 'medical', 'bonuses', 'otherBenefits', 'pf', 'professionalTax', 'incomeTax', 'epf', 'esic'] as const;
        const convertedData = { ...data };
        numericFields.forEach(field => {
          if (convertedData[field] !== undefined && convertedData[field] !== null) {
            convertedData[field] = Number(convertedData[field]);
          }
        });
        setSalary(convertedData);
      } else {
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

  const handleSalaryChange = (field: keyof SalaryStructure, value: string, source: 'basic' | 'gross' | 'net' = 'basic') => {
    if (!salary) return;

    const numValue = parseFloat(value) || 0;

    if (source === 'basic') {
      setEditSource('basic');
      const newManuallyEdited = new Set(manuallyEdited);
      newManuallyEdited.add(field as string);
      setManuallyEdited(newManuallyEdited);

      const calculated = autoCalculateSalary(numValue);
      setSalary({
        ...salary,
        [field]: numValue,
        ...calculated,
      });
      setManuallyEdited(new Set(['basicSalary']));
    } else if (source === 'gross') {
      setEditSource('gross');
      const basicSalary = calculateBasicFromGross(numValue);
      const calculated = autoCalculateSalary(basicSalary, true);
      setSalary({
        ...salary,
        basicSalary,
        ...calculated,
      });
      setManuallyEdited(new Set());
    } else if (source === 'net') {
      setEditSource('net');
      const basicSalary = calculateBasicFromNet(numValue);
      const calculated = autoCalculateSalary(basicSalary, true);
      setSalary({
        ...salary,
        basicSalary,
        ...calculated,
      });
      setManuallyEdited(new Set());
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

  const handleQuickInputBlur = (source: 'gross' | 'net', value: number) => {
    // Trigger calculation when user leaves Gross or Net field
    if (value > 0) {
      handleSalaryChange('basicSalary', value.toString(), source);
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
      
      // Only send salary fields (no createdAt, updatedAt, or id)
      const salaryData = {
        employeeId: salary.employeeId,
        basicSalary: String(salary.basicSalary),
        hra: String(salary.hra),
        da: String(salary.da),
        lta: String(salary.lta),
        conveyance: String(salary.conveyance),
        medical: String(salary.medical),
        bonuses: String(salary.bonuses),
        otherBenefits: String(salary.otherBenefits),
        pf: String(salary.pf),
        professionalTax: String(salary.professionalTax),
        incomeTax: String(salary.incomeTax),
        epf: String(salary.epf),
        esic: String(salary.esic),
      };
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salaryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save salary structure');
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
        description: error instanceof Error ? error.message : 'Failed to save salary structure',
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
          <p className="text-muted-foreground">Define salary breakdowns - fill Basic, Gross, or Net to auto-calculate all fields.</p>
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
    const isFixed = formula.type === 'fixed';
    
    return (
      <div key={field} className="grid grid-cols-2 items-center gap-2">
        <div>
          <Label className="text-sm">{label}</Label>
          <p className="text-xs text-muted-foreground">
            {formula.type === 'percentage' ? `${formula.value}% of Basic` : 'Fixed - Manual Entry'}
          </p>
        </div>
        <div className="flex gap-2">
          <Input 
            type="number" 
            step="0.01"
            value={formatValue(salary[field])}
            onChange={(e) => {
              const numValue = parseFloat(e.target.value) || 0;
              setSalary({ ...salary, [field]: numValue });
            }}
            onBlur={(e) => {
              const numValue = parseFloat(e.target.value) || 0;
              const newManuallyEdited = new Set(manuallyEdited);
              newManuallyEdited.add(field);
              setManuallyEdited(newManuallyEdited);
            }}
            className={isManuallyEdited ? 'border-blue-500' : isFixed ? 'bg-blue-50 dark:bg-blue-950' : ''}
            placeholder="0"
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
        <p className="text-muted-foreground">Enter any of: Basic Salary, Gross Salary, or Net Salary - all other fields auto-calculate!</p>
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

      {/* Quick Input Section */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="text-purple-900 dark:text-purple-100">Quick Input</CardTitle>
          <CardDescription>Fill any one field to auto-calculate all others</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="font-semibold">Basic Salary</Label>
              <Input 
                ref={basicSalaryRef}
                type="number" 
                value={basicInput || formatValue(salary.basicSalary)}
                onChange={(e) => setBasicInput(e.target.value)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setBasicInput("");
                  handleSalaryChange('basicSalary', val.toString(), 'basic');
                }}
                className="text-lg font-bold"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Gross Salary</Label>
              <Input 
                type="number" 
                value={grossInput || formatValue(gross)}
                onChange={(e) => setGrossInput(e.target.value)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setGrossInput("");
                  if (val > 0) handleQuickInputBlur('gross', val);
                }}
                className="text-lg font-bold text-green-700 dark:text-green-300"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Net Salary</Label>
              <Input 
                type="number" 
                value={netInput || formatValue(net)}
                onChange={(e) => setNetInput(e.target.value)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setNetInput("");
                  if (val > 0) handleQuickInputBlur('net', val);
                }}
                className="text-lg font-bold text-blue-700 dark:text-blue-300"
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Earnings</CardTitle>
            <CardDescription>Allowances and Benefits (Auto-calculated)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <span>₹{formatValue(gross)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deductions</CardTitle>
            <CardDescription>Deductions and Taxes (Auto-calculated)</CardDescription>
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
              <span>₹{formatValue(deductions)}</span>
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
              ₹{formatValue(net)}
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
