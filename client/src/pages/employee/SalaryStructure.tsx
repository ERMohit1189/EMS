import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect, useRef } from "react";
import { Download, FileText, Save, Eye, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { fetchExportHeader, getCompanyName, getCompanyAddress, formatExportDate, getCurrentYear, createProfessionalSalaryExcel, type ExportHeader } from "@/lib/exportUtils";

interface Employee {
  id: string;
  emp_code?: string;
  name?: string;
  email?: string;
  avatar?: string | null;
}
type SalaryFormula = { type: 'percentage' | 'fixed'; value: number; description?: string };

const DEFAULT_FORMULAS: Record<
  keyof Omit<SalaryStructure, 'id' | 'employeeId' | 'wantDeduction'>,
  SalaryFormula
> = {
  hra: { type: 'percentage', value: 50, description: '50% of Basic' },
  da: { type: 'percentage', value: 20, description: '20% of Basic' },
  lta: { type: 'percentage', value: 10, description: '10% of Basic' },
  pf: { type: 'percentage', value: 12, description: '12% of Basic' },
  professionalTax: { type: 'fixed', value: 200, description: 'Fixed' },
  incomeTax: { type: 'fixed', value: 0, description: 'Fixed' },
  epf: { type: 'percentage', value: 3.67, description: '3.67% of Basic' },
  esic: { type: 'percentage', value: 0.75, description: '0.75% of Basic' },
  // The following fields are user-filled numeric fields; add defaults for TypeScript
  basicSalary: { type: 'fixed', value: 0 },
  conveyance: { type: 'fixed', value: 0 },
  medical: { type: 'fixed', value: 0 },
  bonuses: { type: 'fixed', value: 0 },
  otherBenefits: { type: 'fixed', value: 0 },
};

// Format number to max 2 decimals without padding zeros
const formatValue = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  const rounded = parseFloat(num.toFixed(2));
  const result = rounded % 1 === 0 ? Math.floor(rounded) : rounded;
  return String(result);
};


export default function SalaryStructure() {
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
  const { toast } = useToast();
  const basicSalaryRef = useRef<HTMLInputElement>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [configuredCount, setConfiguredCount] = useState<number | null>(null);
  const [salary, setSalary] = useState<SalaryStructure | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formulas, setFormulas] = useState<Record<keyof Omit<SalaryStructure, 'id' | 'employeeId' | 'wantDeduction'>, SalaryFormula>>(DEFAULT_FORMULAS);
  const [manuallyEdited, setManuallyEdited] = useState<Set<string>>(new Set());
  const [editSource, setEditSource] = useState<'basic' | 'gross' | 'net' | null>(null);
  const [basicInput, setBasicInput] = useState<string>("");
  const [grossInput, setGrossInput] = useState<string>("");
  const [netInput, setNetInput] = useState<string>("");
  const [wantDeduction, setWantDeduction] = useState<boolean>(true);
  const [exportHeader, setExportHeader] = useState<ExportHeader | null>(null);
  const [heroMounted, setHeroMounted] = useState(false);

  useEffect(() => {
    // Parallel fetch: employees + export header at same time
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchEmployeesParallel(),
          fetchExportHeaderParallel(),
          fetchConfiguredCountParallel()
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
    // trigger hero entrance animation
    setTimeout(() => setHeroMounted(true), 80);
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

  const fetchEmployeesParallel = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/employees?page=1&pageSize=100`, {
        credentials: 'include',
      });
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

  const fetchConfiguredCountParallel = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/salary-structures/count`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setConfiguredCount(typeof data.count === 'number' ? data.count : 0);
      } else {
        setConfiguredCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch configured salary count', error);
      setConfiguredCount(0);
    }
  };

  const fetchExportHeaderParallel = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/export-headers`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setExportHeader(data);
      }
    } catch (error) {
      console.error("Failed to fetch export header", error);
    }
  };

  const fetchEmployees = async () => {
    await fetchEmployeesParallel();
  };

  const fetchExportHeader = async () => {
    await fetchExportHeaderParallel();
  };

  const calculateValue = (field: keyof typeof formulas, basicSalary: number): number => {
    const formula = formulas[field];
    if (!formula) return 0;
    if (formula.type === 'percentage') {
      // Round to 2 decimals to prevent floating-point precision errors
      return Math.round((basicSalary * formula.value) / 100 * 100) / 100;
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

    return Math.max(0, Math.round(basic * 100) / 100);
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

    // Refine by calculating actual deductions (iterative approach for accuracy)
    for (let i = 0; i < 5; i++) {
      const earnings = autoCalculateSalary(estimatedBasic, true, wantDeduction);
      const fixedEarnings = Number(salary.conveyance) + Number(salary.medical) + Number(salary.bonuses) + Number(salary.otherBenefits);
      const gross = Math.round((estimatedBasic + earnings.hra! + earnings.da! + earnings.lta! + fixedEarnings) * 100) / 100;
      const deductions = Math.round((earnings.pf! + Number(salary.professionalTax) + Number(salary.incomeTax) + earnings.epf! + earnings.esic!) * 100) / 100;
      const calculatedNet = Math.round((gross - deductions) * 100) / 100;

      if (Math.abs(calculatedNet - net) < 0.01) break;

      // Adjust basic proportionally
      const ratio = net / calculatedNet;
      estimatedBasic = Math.round((estimatedBasic * ratio) * 100) / 100;
    }

    return Math.max(0, estimatedBasic);
  };

  const autoCalculateSalary = (basicSalary: number, includeFixed: boolean = false, considerDeduction: boolean = true): Partial<SalaryStructure> => {
    const calculated: Partial<SalaryStructure> = {};
    // Only auto-calculate percentage fields, not fixed values
    const percentageFields: (keyof Omit<SalaryStructure, 'id' | 'employeeId' | 'wantDeduction'>)[] = [
      'hra', 'da', 'lta', 'pf', 'epf', 'esic'
    ];

    percentageFields.forEach(field => {
      // Only recalculate if user hasn't manually edited it
      if (!manuallyEdited.has(field)) {
        // Skip deduction fields if considerDeduction is false
        const isDeductionField = ['pf', 'epf', 'esic'].includes(field);
        if (isDeductionField && !considerDeduction) {
          (calculated as any)[field] = 0;
        } else {
          (calculated as any)[field] = calculateValue(field, basicSalary);
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
      const response = await fetch(`${getApiBaseUrl()}/api/employees/${employeeId}/salary`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        // Convert all string numeric values to numbers and round to 2 decimals to fix precision issues
        const numericFields = ['basicSalary', 'hra', 'da', 'lta', 'conveyance', 'medical', 'bonuses', 'otherBenefits', 'pf', 'professionalTax', 'incomeTax', 'epf', 'esic'] as const;
        const convertedData = { ...data };
        numericFields.forEach(field => {
          if (convertedData[field] !== undefined && convertedData[field] !== null) {
            convertedData[field] = Math.round(Number(convertedData[field]) * 100) / 100;
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

      // Verify and adjust to match exact gross
      const fixedEarnings = Number(salary.conveyance) + Number(salary.medical) + Number(salary.bonuses) + Number(salary.otherBenefits);
      const calculatedGross = Math.round((basicSalary + (calculated.hra || 0) + (calculated.da || 0) + (calculated.lta || 0) + fixedEarnings) * 100) / 100;

      // If there's a rounding difference, adjust HRA to compensate
      if (calculatedGross !== numValue && Math.abs(calculatedGross - numValue) < 1) {
        const difference = numValue - calculatedGross;
        calculated.hra = Math.round(((calculated.hra || 0) + difference) * 100) / 100;
      }

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

      // Verify and adjust to match exact net
      const fixedEarnings = Number(salary.conveyance) + Number(salary.medical) + Number(salary.bonuses) + Number(salary.otherBenefits);
      const gross = Math.round((basicSalary + (calculated.hra || 0) + (calculated.da || 0) + (calculated.lta || 0) + fixedEarnings) * 100) / 100;
      const deductions = Math.round(((calculated.pf || 0) + Number(salary.professionalTax) + Number(salary.incomeTax) + (calculated.epf || 0) + (calculated.esic || 0)) * 100) / 100;
      const calculatedNet = Math.round((gross - deductions) * 100) / 100;

      // If there's a rounding difference, adjust HRA to compensate
      if (calculatedNet !== numValue && Math.abs(calculatedNet - numValue) < 1) {
        const difference = numValue - calculatedNet;
        calculated.hra = Math.round(((calculated.hra || 0) + difference) * 100) / 100;
      }

      setSalary({
        ...salary,
        basicSalary,
        ...calculated,
      });
      setManuallyEdited(new Set());
    }
  };

  const resetToFormula = (field: keyof Omit<SalaryStructure, 'id' | 'employeeId' | 'wantDeduction'>) => {
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

      // Helper to round to exactly 2 decimal places to prevent floating-point precision issues
      const roundTo2Decimals = (value: number): string => {
        return Number(value.toFixed(2)).toFixed(2);
      };

      // Only send salary fields (no createdAt, updatedAt, or id)
      const salaryData = {
        employeeId: salary.employeeId,
        basicSalary: roundTo2Decimals(salary.basicSalary),
        hra: roundTo2Decimals(salary.hra),
        da: roundTo2Decimals(salary.da),
        lta: roundTo2Decimals(salary.lta),
        conveyance: roundTo2Decimals(salary.conveyance),
        medical: roundTo2Decimals(salary.medical),
        bonuses: roundTo2Decimals(salary.bonuses),
        otherBenefits: roundTo2Decimals(salary.otherBenefits),
        pf: roundTo2Decimals(salary.pf),
        professionalTax: roundTo2Decimals(salary.professionalTax),
        incomeTax: roundTo2Decimals(salary.incomeTax),
        epf: roundTo2Decimals(salary.epf),
        esic: roundTo2Decimals(salary.esic),
        wantDeduction: wantDeduction,
      };
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salaryData),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save salary structure');
      }

      const saved = await response.json();
      // Convert all string numeric values to numbers and round to 2 decimals to fix precision issues
      const numericFields = ['basicSalary', 'hra', 'da', 'lta', 'conveyance', 'medical', 'bonuses', 'otherBenefits', 'pf', 'professionalTax', 'incomeTax', 'epf', 'esic'] as const;
      const convertedSalary = { ...saved };
      numericFields.forEach(field => {
        if (convertedSalary[field] !== undefined && convertedSalary[field] !== null) {
          convertedSalary[field] = Math.round(Number(convertedSalary[field]) * 100) / 100;
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
    
    const gross = Math.round((salary.basicSalary + salary.hra + salary.da + salary.lta + salary.conveyance + salary.medical + salary.bonuses + salary.otherBenefits) * 100) / 100;
    const deductions = Math.round((salary.pf + salary.professionalTax + salary.incomeTax + salary.epf + salary.esic) * 100) / 100;
    const net = Math.round((gross - deductions) * 100) / 100;

    const data = [
      [getCompanyName(exportHeader ?? undefined)],
      [getCompanyAddress(exportHeader ?? undefined)],
      ['SALARY STRUCTURE / SALARY SLIP'],
      [''],
      ['Document Date:', formatExportDate()],
      [''],
      ['EMPLOYEE INFORMATION'],
      ['Employee Name', employeeName],
      ['Employee Code', (employees.find(e => e.id === selectedEmployee)?.emp_code) || selectedEmployee],
      ['Deductions Status', wantDeduction ? 'Applied' : 'Not Applied'],
      [''],
      ['MONTHLY EARNINGS', 'Amount (Rs)'],
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
      ['DEDUCTIONS', 'Amount (Rs)'],
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
      ['Generated from Enterprise Operations Management System (EOMS)'],
    ];
    
    const columnWidths = [40, 18];
    createProfessionalSalaryExcel(data, columnWidths, `${employeeName}_SalaryStructure_${getCurrentYear()}.xlsx`);
    
    toast({
      title: 'Success',
      description: `Excel downloaded for ${employeeName}`,
    });
  };

  const downloadSalaryPDF = () => {
    if (!salary || !selectedEmployee) return;
    
    const employee = employees.find(e => e.id === selectedEmployee);
    const employeeName = employee?.name || 'Employee';
    
    const gross = Math.round((salary.basicSalary + salary.hra + salary.da + salary.lta + salary.conveyance + salary.medical + salary.bonuses + salary.otherBenefits) * 100) / 100;
    const deductions = Math.round((salary.pf + salary.professionalTax + salary.incomeTax + salary.epf + salary.esic) * 100) / 100;
    const net = Math.round((gross - deductions) * 100) / 100;

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
    (pdf.setFont as any)(undefined, 'bold');
    pdf.text(String(getCompanyName(exportHeader ?? undefined)), pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    
    // Company Address
    if (getCompanyAddress(exportHeader ?? undefined)) {
      pdf.setFontSize(8);
      (pdf.setFont as any)(undefined, 'normal');
      pdf.text(String(getCompanyAddress(exportHeader ?? undefined)), pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }
    
    // Document Title
    pdf.setFontSize(12);
    pdf.text('SALARY STRUCTURE DOCUMENT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    // Date
    pdf.setFontSize(9);
    (pdf.setFont as any)(undefined, 'normal');
    pdf.text(`Date: ${formatExportDate()}`, margin, yPos);
    yPos += 8;
    
    // Divider line
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;
    
    // Employee Information Section
    pdf.setFontSize(10);
    (pdf.setFont as any)(undefined, 'bold');
    pdf.text('EMPLOYEE INFORMATION', margin, yPos);
    yPos += lineHeight;
    
    pdf.setFontSize(9);
    (pdf.setFont as any)(undefined, 'normal');
    pdf.text(`Name: ${String(employeeName)}`, margin + 2, yPos);
    yPos += lineHeight;
    pdf.text(`Employee Code: ${(employees.find(e => e.id === selectedEmployee)?.emp_code) || String(selectedEmployee)}`, margin + 2, yPos);
    yPos += lineHeight;
    pdf.text(`Deductions Status: ${wantDeduction ? 'Applied' : 'Not Applied'}`, margin + 2, yPos);
    yPos += 8;
    
    // Earnings Section
    pdf.setFontSize(10);
    (pdf.setFont as any)(undefined, 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text('EARNINGS', margin, yPos);
    yPos += lineHeight;
    
    (pdf.setFont as any)(undefined, 'normal');
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
      pdf.text(`Rs ${formatValue(value)}`, pageWidth - margin - 20, yPos);
      yPos += lineHeight;
    });
    
    (pdf.setFont as any)(undefined, 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text('Gross Salary', margin + 2, yPos);
    pdf.text(`Rs ${formatValue(gross)}`, pageWidth - margin - 20, yPos);
    yPos += 8;
    
    // Deductions Section
    (pdf.setFont as any)(undefined, 'bold');
    pdf.setTextColor(231, 76, 60);
    pdf.setFontSize(10);
    pdf.text('DEDUCTIONS', margin, yPos);
    yPos += lineHeight;
    
    (pdf.setFont as any)(undefined, 'normal');
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
      pdf.text(`Rs ${formatValue(value)}`, pageWidth - margin - 20, yPos);
      yPos += lineHeight;
    });
    
    (pdf.setFont as any)(undefined, 'bold');
    pdf.setTextColor(231, 76, 60);
    pdf.text('Total Deductions', margin + 2, yPos);
    pdf.text(`Rs ${formatValue(deductions)}`, pageWidth - margin - 20, yPos);
    yPos += 10;
    
    // Net Salary Section
    pdf.setFillColor(41, 128, 185);
    pdf.rect(margin, yPos - 5, pageWidth - (2 * margin), 12, 'F');
    
    pdf.setFontSize(11);
    (pdf.setFont as any)(undefined, 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('NET SALARY (Take Home Pay)', margin + 2, yPos + 2);
    pdf.text(`Rs ${formatValue(net)}`, pageWidth - margin - 20, yPos + 2);
    
    yPos += 18;
    
    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    (pdf.setFont as any)(undefined, 'normal');
    pdf.text('This is a system-generated document. No signature required.', margin, yPos);
    yPos += lineHeight;
    pdf.text('Generated from Enterprise Operations Management System (EOMS)', margin, yPos);
    
    pdf.save(`${employeeName}_SalaryStructure_${getCurrentYear()}.pdf`);
    
    toast({
      title: 'Success',
      description: `PDF downloaded for ${employeeName}`,
    });
  };

  // Sparkline helper: generate small recent net values (6 months) based on current net
  const getSparklineData = (): number[] => {
    const base = Math.max(0, Number(net) || 0);
    const data: number[] = [];
    for (let i = 5; i >= 0; i--) {
      // create slight monthly variation
      const jitter = (Math.sin(i) * 0.03 + (Math.random() - 0.5) * 0.02);
      const value = Math.round((base * (1 + jitter)) * 100) / 100;
      data.push(Math.max(0, value));
    }
    return data;
  };

  const renderSparkline = (values: number[], width = 120, height = 36) => {
    if (!values || values.length === 0) return null;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    const areaPath = `M0,${height} L${points} L${width},${height} Z`;
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto">
        <defs>
          <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sparkGrad)" />
        <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  };

  // State for modals
  const [openSaveConfirm, setOpenSaveConfirm] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);

  if (!salary) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
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
                      <SelectItem key={e.id} value={e.id}>{e.employeeCode ? `${e.employeeCode} — ${e.name}` : e.name}</SelectItem>
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

  const gross = Math.round((salary.basicSalary + salary.hra + salary.da + salary.lta + salary.conveyance + salary.medical + salary.bonuses + salary.otherBenefits) * 100) / 100;
  const deductions = Math.round((salary.pf + salary.professionalTax + salary.incomeTax + salary.epf + salary.esic) * 100) / 100;
  const net = Math.round((gross - deductions) * 100) / 100;

  const renderSalaryField = (field: keyof Omit<SalaryStructure, 'id' | 'employeeId' | 'wantDeduction'>, label: string) => {
    const isManuallyEdited = manuallyEdited.has(field);
    const formula = formulas[field as keyof typeof formulas];
    const isFixed = formula.type === 'fixed';
    const isDeductionField = ['pf', 'professionalTax', 'incomeTax', 'epf', 'esic'].includes(field);
    const isDisabled = isDeductionField && !wantDeduction;
    
    return (
      <div key={field} className="grid grid-cols-2 gap-2 items-start">
        <div className="min-w-0">
          <Label className="text-xs md:text-sm block">{label}</Label>
          <p className="text-xs text-muted-foreground">
            {formula.type === 'percentage' ? `${formula.value}% of Basic` : 'Fixed - Manual Entry'}
          </p>
        </div>
        <div className="flex gap-1 justify-end items-start">
          <Input 
            type="number" 
            step="0.01"
            disabled={isDisabled}
            value={String(formatValue(salary[field] as number))}
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
            className={`h-8 w-20 text-right text-xs ${isDisabled ? 'opacity-50 cursor-not-allowed' : isManuallyEdited ? 'border-blue-500' : isFixed ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
            placeholder="0"
          />
          {isManuallyEdited && !isDisabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => resetToFormula(field)}
              title="Reset to formula"
              className="text-xs h-8 px-1 whitespace-nowrap"
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-6xl mx-auto px-2 md:px-0">
      <div className={`transition-transform transition-opacity duration-700 ease-out transform ${heroMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}` }>
        <div className="flex items-start gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Salary Structure</h2>
            <p className="text-xs md:text-sm text-muted-foreground">Enter any of: Basic Salary, Gross Salary, or Net Salary - all other fields auto-calculate!</p>
          </div>
          <div className="ml-auto">
            {/* Theme-aware placeholder SVG: light / dark variants */}
            <div className="w-16 h-16">
              <svg className="block dark:hidden w-16 h-16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="64" height="64" rx="12" fill="#EEF2FF" />
                <path d="M16 44h32v4H16z" fill="#C7D2FE" />
                <path d="M20 34h24v6H20z" fill="#A78BFA" />
                <circle cx="24" cy="22" r="8" fill="#7C3AED" />
              </svg>
              <svg className="hidden dark:block w-16 h-16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="64" height="64" rx="12" fill="#0F172A" />
                <path d="M16 44h32v4H16z" fill="#1E293B" />
                <path d="M20 34h24v6H20z" fill="#374151" />
                <circle cx="24" cy="22" r="8" fill="#60A5FA" />
              </svg>
            </div>
          </div>
        </div>
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
                    <SelectItem key={e.id} value={e.id}>{e.emp_code ? `${e.emp_code} — ${e.name}` : e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Left: Main Form */}
        <div className="md:col-span-2 space-y-4">
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="text-sm md:text-base text-purple-900 dark:text-purple-100">Quick Input</CardTitle>
              <CardDescription className="text-xs md:text-sm">Fill any one field to auto-calculate all others</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div className="grid gap-2 md:gap-4 md:grid-cols-3">
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

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Earnings</CardTitle>
                <CardDescription className="text-xs md:text-sm">Allowances and Benefits (Auto-calculated)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {renderSalaryField('hra', 'HRA')}
                {renderSalaryField('da', 'DA')}
                {renderSalaryField('lta', 'LTA')}
                {renderSalaryField('conveyance', 'Conveyance')}
                {renderSalaryField('medical', 'Medical')}
                {renderSalaryField('bonuses', 'Bonuses')}
                {renderSalaryField('otherBenefits', 'Other Benefits')}
                <Separator />
                <div className="flex flex-col sm:flex-row sm:justify-between font-bold text-emerald-600 bg-green-50 dark:bg-green-950 p-2 md:p-3 rounded gap-2">
                  <span className="text-sm md:text-base">Gross Salary</span>
                  <span className="text-base md:text-lg">Rs {formatValue(gross)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Deductions</CardTitle>
                <CardDescription className="text-xs md:text-sm">Deductions and Taxes (Auto-calculated)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {renderSalaryField('pf', 'Provident Fund (PF)')}
                {renderSalaryField('professionalTax', 'Professional Tax')}
                {renderSalaryField('incomeTax', 'Income Tax (TDS)')}
                {renderSalaryField('epf', 'EPF')}
                {renderSalaryField('esic', 'ESIC')}
                <Separator />
                <div className="flex flex-col sm:flex-row sm:justify-between font-bold text-red-600 bg-red-50 dark:bg-red-950 p-2 md:p-3 rounded gap-2">
                  <span className="text-sm md:text-base">Total Deductions</span>
                  <span className="text-base md:text-lg">Rs {formatValue(deductions)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-primary/20">
            <CardContent className="p-3 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base md:text-lg font-semibold">Net Salary Payable</h3>
                <p className="text-xs md:text-sm text-muted-foreground">Amount to be credited to bank account</p>
              </div>
              <div className="text-2xl md:text-4xl font-bold text-primary">
                Rs {formatValue(net)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Employee Summary & Actions */}
        <div className="md:col-span-1">
          <Card className="sticky top-20">
            <CardContent className="flex flex-col items-center gap-4 text-center">
              <Avatar className="w-20 h-20">
                <AvatarFallback>{(employees.find(e => e.id === selectedEmployee)?.name || 'E').slice(0,2)}</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="text-lg font-semibold">{employees.find(e => e.id === selectedEmployee)?.name || 'Employee'}</h4>
                <p className="text-xs text-muted-foreground">Code: {(employees.find(e => e.id === selectedEmployee)?.emp_code) || (employees.find(e => e.id === selectedEmployee)?.id)}</p>
              </div>

              <div className="w-full bg-gray-50 dark:bg-slate-900 p-3 rounded">
                <div className="text-sm text-muted-foreground">Gross</div>
                <div className="font-semibold">Rs {formatValue(gross)}</div>
                <div className="mt-2">{renderSparkline(getSparklineData())}</div>
                <Separator className="my-2" />
                <div className="text-sm text-muted-foreground">Deductions</div>
                <div className="font-semibold text-red-600">Rs {formatValue(deductions)}</div>
                <Separator className="my-2" />
                <div className="text-sm text-muted-foreground">Net Payable</div>
                <div className="text-2xl font-bold text-primary">Rs {formatValue(net)}</div>
              </div>

              <div className="w-full flex flex-col gap-2">
                <Button onClick={downloadSalary} variant="outline"><Download className="mr-2 h-4 w-4" />Excel</Button>
                <Button onClick={() => setOpenPreview(true)} variant="outline"><Eye className="mr-2 h-4 w-4" />Preview</Button>
                <Button onClick={downloadSalaryPDF} variant="outline"><FileText className="mr-2 h-4 w-4" />PDF</Button>
                <Button onClick={() => setOpenSaveConfirm(true)} disabled={isSaving}><Save className="mr-2 h-4 w-4" />{isSaving ? 'Saving...' : 'Save'}</Button>
                <Button variant="ghost" onClick={() => { setSelectedEmployee(""); setSalary(null); setManuallyEdited(new Set()); }}><DollarSign className="mr-2 h-4 w-4" />Clear</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Confirmation AlertDialog */}
      <AlertDialog open={openSaveConfirm} onOpenChange={setOpenSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save Salary Structure</AlertDialogTitle>
            <div className="text-sm text-muted-foreground mt-1">Gross: Rs {formatValue(gross)} • Deductions: Rs {formatValue(deductions)} • Net: Rs {formatValue(net)}</div>
          </AlertDialogHeader>
          <div className="mt-4">
            <div className="text-sm">Are you sure you want to save this salary structure? This will update the employee's salary configuration.</div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialogCancel onClick={() => setOpenSaveConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { setOpenSaveConfirm(false); await saveSalary(); }}>Confirm Save</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Live Preview Dialog */}
      <Dialog open={openPreview} onOpenChange={setOpenPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Salary Slip Preview</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="p-4 border rounded">
              <div className="text-sm text-muted-foreground">{getCompanyName(exportHeader ?? undefined)}</div>
              <div className="text-xs text-muted-foreground">{getCompanyAddress(exportHeader ?? undefined)}</div>
              <div className="mt-3">
                <strong>{employees.find(e => e.id === selectedEmployee)?.name || 'Employee'}</strong>
                <div className="text-xs text-muted-foreground">Code: {(employees.find(e => e.id === selectedEmployee)?.emp_code) || (employees.find(e => e.id === selectedEmployee)?.id)}</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">Gross</div>
                  <div className="font-semibold">Rs {formatValue(gross)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Deductions</div>
                  <div className="font-semibold text-red-600">Rs {formatValue(deductions)}</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xs text-muted-foreground">Net</div>
                <div className="text-lg font-bold">Rs {formatValue(net)}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={downloadSalary}><Download className="mr-2" />Excel</Button>
              <Button variant="outline" onClick={downloadSalaryPDF}><FileText className="mr-2" />PDF</Button>
              <Button onClick={() => setOpenPreview(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
