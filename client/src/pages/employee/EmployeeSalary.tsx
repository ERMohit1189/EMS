import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import jsPDF from 'jspdf';
import { Download } from "lucide-react";

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

const formatValue = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
};

export default function EmployeeSalary() {
  const { toast } = useToast();
  const [salary, setSalary] = useState<SalaryStructure | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const employeeId = localStorage.getItem('employeeId');
  const employeeName = localStorage.getItem('employeeName');

  useEffect(() => {
    fetchSalaryData();
  }, []);

  const fetchSalaryData = async () => {
    if (!employeeId) return;
    
    try {
      setIsLoading(true);
      
      // Fetch salary
      const salaryResponse = await fetch(`${getApiBaseUrl()}/api/employees/${employeeId}/salary`);
      if (salaryResponse.ok) {
        const salaryData = await salaryResponse.json();
        setSalary(salaryData);
      } else {
        toast({
          title: "Info",
          description: "Salary structure not yet configured",
        });
      }

      // Fetch employee data
      const empResponse = await fetch(`${getApiBaseUrl()}/api/employees/${employeeId}`);
      if (empResponse.ok) {
        const empData = await empResponse.json();
        setEmployeeData(empData);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load salary data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateGross = (): number => {
    if (!salary) return 0;
    return (
      Number(salary.basicSalary) +
      Number(salary.hra) +
      Number(salary.da) +
      Number(salary.lta) +
      Number(salary.conveyance) +
      Number(salary.medical) +
      Number(salary.bonuses) +
      Number(salary.otherBenefits)
    );
  };

  const calculateDeductions = (): number => {
    if (!salary) return 0;
    if (!salary.wantDeduction) return 0;
    
    return (
      Number(salary.pf) +
      Number(salary.professionalTax) +
      Number(salary.incomeTax) +
      Number(salary.epf) +
      Number(salary.esic)
    );
  };

  const calculateNet = (): number => {
    return calculateGross() - calculateDeductions();
  };

  const downloadPDF = () => {
    if (!salary) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 10;

      // Title
      doc.setFontSize(16);
      doc.text("SALARY STRUCTURE", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 10;

      // Employee Details
      doc.setFontSize(11);
      doc.text(`Employee Name: ${employeeName || "N/A"}`, 10, yPosition);
      yPosition += 7;
      doc.text(`Employee ID: ${employeeId || "N/A"}`, 10, yPosition);
      yPosition += 7;
      doc.text(`Designation: ${localStorage.getItem('employeeDesignation') || "N/A"}`, 10, yPosition);
      yPosition += 7;
      doc.text(`Department: ${localStorage.getItem('employeeDepartment') || "N/A"}`, 10, yPosition);
      yPosition += 10;

      // Earnings Section
      doc.setFontSize(12);
      doc.text("EARNINGS", 10, yPosition);
      yPosition += 7;
      
      const earningsData = [
        ["Particulars", "Amount"],
        ["Basic Salary", `₹ ${formatValue(salary.basicSalary)}`],
        ["HRA", `₹ ${formatValue(salary.hra)}`],
        ["DA", `₹ ${formatValue(salary.da)}`],
        ["LTA", `₹ ${formatValue(salary.lta)}`],
        ["Conveyance", `₹ ${formatValue(salary.conveyance)}`],
        ["Medical", `₹ ${formatValue(salary.medical)}`],
        ["Bonuses", `₹ ${formatValue(salary.bonuses)}`],
        ["Other Benefits", `₹ ${formatValue(salary.otherBenefits)}`],
        ["GROSS SALARY", `₹ ${formatValue(calculateGross())}`],
      ];

      doc.setFontSize(10);
      let tableY = yPosition;
      earningsData.forEach((row, index) => {
        const isHeader = index === 0;
        const isGross = index === earningsData.length - 1;
        
        if (isHeader) doc.setFont(undefined, 'bold');
        if (isGross) doc.setFont(undefined, 'bold');
        
        doc.text(row[0], 10, tableY);
        doc.text(row[1], 100, tableY, { align: "right" });
        tableY += 7;
        
        if (isHeader || isGross) doc.setFont(undefined, 'normal');
      });

      yPosition = tableY + 5;

      // Deductions Section
      if (salary.wantDeduction) {
        doc.setFontSize(12);
        doc.text("DEDUCTIONS", 10, yPosition);
        yPosition += 7;

        const deductionsData = [
          ["Particulars", "Amount"],
          ["PF", `₹ ${formatValue(salary.pf)}`],
          ["Professional Tax", `₹ ${formatValue(salary.professionalTax)}`],
          ["Income Tax", `₹ ${formatValue(salary.incomeTax)}`],
          ["EPF", `₹ ${formatValue(salary.epf)}`],
          ["ESIC", `₹ ${formatValue(salary.esic)}`],
          ["TOTAL DEDUCTIONS", `₹ ${formatValue(calculateDeductions())}`],
        ];

        doc.setFontSize(10);
        tableY = yPosition;
        deductionsData.forEach((row, index) => {
          const isHeader = index === 0;
          const isTotal = index === deductionsData.length - 1;
          
          if (isHeader) doc.setFont(undefined, 'bold');
          if (isTotal) doc.setFont(undefined, 'bold');
          
          doc.text(row[0], 10, tableY);
          doc.text(row[1], 100, tableY, { align: "right" });
          tableY += 7;
          
          if (isHeader || isTotal) doc.setFont(undefined, 'normal');
        });

        yPosition = tableY + 5;
      }

      // Net Salary
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("NET SALARY: ", 10, yPosition);
      doc.text(`₹ ${formatValue(calculateNet())}`, 100, yPosition, { align: "right" });

      // Save PDF
      doc.save(`${employeeName}_salary_structure.pdf`);
      
      toast({
        title: "Success",
        description: "Salary structure downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading salary structure...</div>;
  }

  if (!salary) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-10">
            <p className="text-muted-foreground">No salary structure configured yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const gross = calculateGross();
  const deductions = calculateDeductions();
  const net = calculateNet();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Salary Structure</h2>
          <p className="text-muted-foreground mt-1">View your current salary breakdown</p>
        </div>
        <Button onClick={downloadPDF} data-testid="button-download-salary-pdf">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Employee Info */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{employeeName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Employee ID</p>
              <p className="font-medium">{employeeId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Department</p>
              <p className="font-medium">{localStorage.getItem('employeeDepartment') || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Designation</p>
              <p className="font-medium">{localStorage.getItem('employeeDesignation') || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings</CardTitle>
          <CardDescription>Monthly salary components</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              { label: "Basic Salary", value: salary.basicSalary },
              { label: "HRA", value: salary.hra },
              { label: "DA", value: salary.da },
              { label: "LTA", value: salary.lta },
              { label: "Conveyance", value: salary.conveyance },
              { label: "Medical", value: salary.medical },
              { label: "Bonuses", value: salary.bonuses },
              { label: "Other Benefits", value: salary.otherBenefits },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">₹ {formatValue(item.value)}</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex justify-between items-center bg-green-50 p-3 rounded-md">
            <span className="font-semibold text-green-900">Gross Salary</span>
            <span className="font-bold text-lg text-green-900">₹ {formatValue(gross)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Deductions */}
      {salary.wantDeduction && (
        <Card>
          <CardHeader>
            <CardTitle>Deductions</CardTitle>
            <CardDescription>Monthly deductions from salary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                { label: "PF", value: salary.pf },
                { label: "Professional Tax", value: salary.professionalTax },
                { label: "Income Tax", value: salary.incomeTax },
                { label: "EPF", value: salary.epf },
                { label: "ESIC", value: salary.esic },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">₹ {formatValue(item.value)}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between items-center bg-red-50 p-3 rounded-md">
              <span className="font-semibold text-red-900">Total Deductions</span>
              <span className="font-bold text-lg text-red-900">₹ {formatValue(deductions)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Net Salary */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-green-900">Net Salary</span>
            <span className="text-4xl font-bold text-green-600">₹ {formatValue(net)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
