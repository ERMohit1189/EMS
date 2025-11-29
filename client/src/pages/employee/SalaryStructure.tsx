import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

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
  wantDeduction: boolean;
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

interface ExportHeader {
  companyName?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  gstin?: string;
  website?: string;
}

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
  const [wantDeduction, setWantDeduction] = useState<boolean>(true);
  const [exportHeader, setExportHeader] = useState<ExportHeader | null>(null);

  useEffect(() => {
    fetchEmployees();
    fetchExportHeader();
  }, []);

  // Focus basic salary input only when salary is first loaded, not on edits
  useEffect(() => {
    if (salary && editSource === null && selectedEmployee) {
      setTimeout(() => basicSalaryRef.current?.focus(), 0);
    }
  }, [selectedEmployee]);

  // Handle "Want Salary Deduction" checkbox change
  useEffect(() => {
    if (!salary) return;
    
    if (!wantDeduction) {
      // Unchecked: Set all deductions to 0
      setSalary({
        ...salary,
        pf: 0,
        professionalTax: 0,
        incomeTax: 0,
        epf: 0,
        esic: 0,
      });
    } else {
      // Checked: Recalculate deductions based on current basic salary
      const calculated = autoCalculateSalary(salary.basicSalary, true);
      setSalary({
        ...salary,
        ...calculated,
      });
    }
  }, [wantDeduction]);

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

  const fetchExportHeader = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/export-headers`);
      if (response.ok) {
        const data = await response.json();
        setExportHeader(data);
      }
    } catch (error) {
      console.error("Failed to fetch export header", error);
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
    
    // If deductions not wanted, Net = Gross, so calculate differently
    if (!wantDeduction) {
      // When no deductions, Net Salary = Gross Salary
      // So we just need to calculate Basic from Gross (which equals Net in this case)
      return calculateBasicFromGross(net);
    }
    
    // Estimate deductions as percentage of basic and calculate gross
    const factor = 1 - deductionPercentages / 100;
    let estimatedBasic = net / factor;

    // Refine by calculating actual deductions
    for (let i = 0; i < 3; i++) {
      const earnings = autoCalculateSalary(estimatedBasic, true, wantDeduction);
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

  const autoCalculateSalary = (basicSalary: number, includeFixed: boolean = false, considerDeduction: boolean = true): Partial<SalaryStructure> => {
    const calculated: Partial<SalaryStructure> = {};
    // Only auto-calculate percentage fields, not fixed values
    const percentageFields: (keyof Omit<SalaryStructure, 'id' | 'employeeId'>)[] = [
      'hra', 'da', 'lta', 'pf', 'epf', 'esic'
    ];

    percentageFields.forEach(field => {
      // Only recalculate if user hasn't manually edited it
      if (!manuallyEdited.has(field)) {
        // Skip deduction fields if considerDeduction is false
        const isDeductionField = ['pf', 'epf', 'esic'].includes(field);
        if (isDeductionField && !considerDeduction) {
          calculated[field] = 0;
        } else {
          calculated[field] = calculateValue(field, basicSalary);
        }
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
        // Load the wantDeduction toggle state from database
        setWantDeduction(data.wantDeduction !== undefined ? data.wantDeduction : true);
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
          wantDeduction: true,
        };
        setSalary(newSalary);
        setWantDeduction(true);
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
        wantDeduction: true,
      };
      setSalary(newSalary);
      setWantDeduction(true);
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

      const calculated = autoCalculateSalary(numValue, false, wantDeduction);
      setSalary({
        ...salary,
        [field]: numValue,
        ...calculated,
      });
      setManuallyEdited(new Set(['basicSalary']));
    } else if (source === 'gross') {
      setEditSource('gross');
      const basicSalary = calculateBasicFromGross(numValue);
      const calculated = autoCalculateSalary(basicSalary, true, wantDeduction);
      setSalary({
        ...salary,
        basicSalary,
        ...calculated,
      });
      setManuallyEdited(new Set());
    } else if (source === 'net') {
      setEditSource('net');
      const basicSalary = calculateBasicFromNet(numValue);
      const calculated = autoCalculateSalary(basicSalary, true, wantDeduction);
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
        wantDeduction: wantDeduction,
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
      // Convert all string numeric values to numbers from the database response
      const numericFields = ['basicSalary', 'hra', 'da', 'lta', 'conveyance', 'medical', 'bonuses', 'otherBenefits', 'pf', 'professionalTax', 'incomeTax', 'epf', 'esic'] as const;
      const convertedSalary = { ...saved };
      numericFields.forEach(field => {
        if (convertedSalary[field] !== undefined && convertedSalary[field] !== null) {
          convertedSalary[field] = Number(convertedSalary[field]);
        }
      });
      setSalary(convertedSalary);
      setWantDeduction(convertedSalary.wantDeduction !== undefined ? convertedSalary.wantDeduction : true);
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

  const downloadSalary = () => {
    if (!salary || !selectedEmployee) return;
    
    const employee = employees.find(e => e.id === selectedEmployee);
    const employeeName = employee?.name || 'Employee';
    const companyName = exportHeader?.companyName || 'Enterprise Management System';
    const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const gross = salary.basicSalary + salary.hra + salary.da + salary.lta + salary.conveyance + salary.medical + salary.bonuses + salary.otherBenefits;
    const deductions = salary.pf + salary.professionalTax + salary.incomeTax + salary.epf + salary.esic;
    const net = gross - deductions;
    
    const data = [
      [companyName],
      ['SALARY STRUCTURE / SALARY SLIP'],
      [''],
      ['Document Date:', currentDate],
      [''],
      ['EMPLOYEE INFORMATION'],
      ['Employee Name', employeeName],
      ['Employee ID', selectedEmployee],
      ['Deductions Status', wantDeduction ? 'Applied' : 'Not Applied'],
      [''],
      ['MONTHLY EARNINGS', 'Amount (₹)'],
      ['Basic Salary', salary.basicSalary],
      ['House Rent Allowance (HRA @ 50%)', salary.hra],
      ['Dearness Allowance (DA @ 20%)', salary.da],
      ['Leave Travel Allowance (LTA @ 10%)', salary.lta],
      ['Conveyance Allowance', salary.conveyance],
      ['Medical Allowance', salary.medical],
      ['Bonuses', salary.bonuses],
      ['Other Benefits', salary.otherBenefits],
      ['GROSS SALARY', gross],
      [''],
      ['DEDUCTIONS', 'Amount (₹)'],
      ['Provident Fund (PF @ 12%)', salary.pf],
      ['Professional Tax', salary.professionalTax],
      ['Income Tax', salary.incomeTax],
      ['Employees Provident Fund (EPF @ 3.67%)', salary.epf],
      ['Employee State Insurance (ESIC @ 0.75%)', salary.esic],
      ['TOTAL DEDUCTIONS', deductions],
      [''],
      ['NET SALARY (Take Home)', net],
      [''],
      ['Note: This is a system-generated salary structure document.'],
      ['Generated from Enterprise Management System (EMS)'],
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Structure');
    
    // Set column widths and styling
    worksheet['!cols'] = [{ wch: 40 }, { wch: 18 }];
    
    XLSX.writeFile(workbook, `${employeeName}_SalaryStructure_${new Date().getFullYear()}.xlsx`);
    
    toast({
      title: 'Success',
      description: `Excel downloaded for ${employeeName}`,
    });
  };

  const downloadSalaryPDF = () => {
    if (!salary || !selectedEmployee) return;
    
    const employee = employees.find(e => e.id === selectedEmployee);
    const employeeName = employee?.name || 'Employee';
    const companyName = exportHeader?.companyName || 'Enterprise Management System';
    const companyAddress = exportHeader?.address || '';
    const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const gross = salary.basicSalary + salary.hra + salary.da + salary.lta + salary.conveyance + salary.medical + salary.bonuses + salary.otherBenefits;
    const deductions = salary.pf + salary.professionalTax + salary.incomeTax + salary.epf + salary.esic;
    const net = gross - deductions;
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    let yPos = 15;
    const margin = 12;
    const lineHeight = 6;
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Company Header
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text(companyName, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    
    // Company Address
    if (companyAddress) {
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.text(companyAddress, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }
    
    // Document Title
    pdf.setFontSize(12);
    pdf.text('SALARY STRUCTURE DOCUMENT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    // Date
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Date: ${currentDate}`, margin, yPos);
    yPos += 8;
    
    // Divider line
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;
    
    // Employee Information Section
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');
    pdf.text('EMPLOYEE INFORMATION', margin, yPos);
    yPos += lineHeight;
    
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Name: ${employeeName}`, margin + 2, yPos);
    yPos += lineHeight;
    pdf.text(`Employee ID: ${selectedEmployee}`, margin + 2, yPos);
    yPos += lineHeight;
    pdf.text(`Deductions Status: ${wantDeduction ? 'Applied' : 'Not Applied'}`, margin + 2, yPos);
    yPos += 8;
    
    // Earnings Section
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text('EARNINGS', margin, yPos);
    yPos += lineHeight;
    
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);
    
    const earningsLabels = [
      { label: 'Basic Salary', value: salary.basicSalary },
      { label: 'House Rent Allowance (HRA @ 50%)', value: salary.hra },
      { label: 'Dearness Allowance (DA @ 20%)', value: salary.da },
      { label: 'Leave Travel Allowance (LTA @ 10%)', value: salary.lta },
      { label: 'Conveyance Allowance', value: salary.conveyance },
      { label: 'Medical Allowance', value: salary.medical },
      { label: 'Bonuses', value: salary.bonuses },
      { label: 'Other Benefits', value: salary.otherBenefits },
    ];
    
    earningsLabels.forEach(({ label, value }) => {
      pdf.text(label, margin + 2, yPos);
      pdf.text(`₹${formatValue(value)}`, pageWidth - margin - 20, yPos);
      yPos += lineHeight;
    });
    
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text('Gross Salary', margin + 2, yPos);
    pdf.text(`₹${formatValue(gross)}`, pageWidth - margin - 20, yPos);
    yPos += 8;
    
    // Deductions Section
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(231, 76, 60);
    pdf.setFontSize(10);
    pdf.text('DEDUCTIONS', margin, yPos);
    yPos += lineHeight;
    
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);
    
    const deductionLabels = [
      { label: 'Provident Fund (PF @ 12%)', value: salary.pf },
      { label: 'Professional Tax', value: salary.professionalTax },
      { label: 'Income Tax', value: salary.incomeTax },
      { label: 'Employees Provident Fund (EPF @ 3.67%)', value: salary.epf },
      { label: 'Employee State Insurance (ESIC @ 0.75%)', value: salary.esic },
    ];
    
    deductionLabels.forEach(({ label, value }) => {
      pdf.text(label, margin + 2, yPos);
      pdf.text(`₹${formatValue(value)}`, pageWidth - margin - 20, yPos);
      yPos += lineHeight;
    });
    
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(231, 76, 60);
    pdf.text('Total Deductions', margin + 2, yPos);
    pdf.text(`₹${formatValue(deductions)}`, pageWidth - margin - 20, yPos);
    yPos += 10;
    
    // Net Salary Section
    pdf.setFillColor(41, 128, 185);
    pdf.rect(margin, yPos - 5, pageWidth - (2 * margin), 12, 'F');
    
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('NET SALARY (Take Home Pay)', margin + 2, yPos + 2);
    pdf.text(`₹${formatValue(net)}`, pageWidth - margin - 20, yPos + 2);
    
    yPos += 18;
    
    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.setFont(undefined, 'normal');
    pdf.text('This is a system-generated document. No signature required.', margin, yPos);
    yPos += lineHeight;
    pdf.text('Generated from Enterprise Management System (EMS)', margin, yPos);
    
    pdf.save(`${employeeName}_SalaryStructure_${new Date().getFullYear()}.pdf`);
    
    toast({
      title: 'Success',
      description: `PDF downloaded for ${employeeName}`,
    });
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
    const isDeductionField = ['pf', 'professionalTax', 'incomeTax', 'epf', 'esic'].includes(field);
    const isDisabled = isDeductionField && !wantDeduction;
    
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
            disabled={isDisabled}
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
            className={isDisabled ? 'opacity-50 cursor-not-allowed' : isManuallyEdited ? 'border-blue-500' : isFixed ? 'bg-blue-50 dark:bg-blue-950' : ''}
            placeholder="0"
          />
          {isManuallyEdited && !isDisabled && (
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
        <CardContent className="space-y-4">
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
                disabled
                className="text-lg font-bold text-blue-700 dark:text-blue-300 opacity-60 cursor-not-allowed"
                placeholder="0"
              />
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded border border-purple-200 dark:border-purple-800">
            <Label htmlFor="quick-apply-deductions" className="font-semibold cursor-pointer">
              Apply Salary Deductions
            </Label>
            <Switch 
              id="quick-apply-deductions" 
              checked={wantDeduction}
              onCheckedChange={(checked) => setWantDeduction(checked)}
              data-testid="switch-apply-deductions"
            />
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
          <Button variant="outline" onClick={downloadSalary} data-testid="button-download-salary">
            Download Excel
          </Button>
          <Button variant="outline" onClick={downloadSalaryPDF} data-testid="button-download-pdf">
            Download PDF
          </Button>
          <Button size="lg" onClick={saveSalary} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Structure'}
          </Button>
        </div>
      </div>
    </div>
  );
}
