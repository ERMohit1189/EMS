import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { fetchExportHeader, type ExportHeader } from "@/lib/exportUtils";
import jsPDF from 'jspdf';
import { Download } from "lucide-react";
import { SkeletonLoader } from "@/components/SkeletonLoader";

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
  const [exportHeader, setExportHeader] = useState<ExportHeader | null>(null);
  const employeeId = localStorage.getItem('employeeId');
  const employeeName = localStorage.getItem('employeeName');

  const loadExportHeader = async () => {
    try {
      const header = await fetchExportHeader();
      setExportHeader(header);
    } catch (error) {
      console.error("Failed to load export header:", error);
    }
  };

  const fetchSalaryData = async () => {
    if (!employeeId) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Parallel fetch: salary + employee data at same time
      const [salaryResponse, empResponse] = await Promise.all([
        fetch(`${getApiBaseUrl()}/api/employees/${employeeId}/salary`),
        fetch(`${getApiBaseUrl()}/api/employees/${employeeId}`)
      ]);

      if (salaryResponse.ok) {
        const salaryData = await salaryResponse.json();
        setSalary(salaryData);
      } else {
        toast({
          title: "Info",
          description: "Salary structure not yet configured",
        });
      }

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

  useEffect(() => {
    // Parallel fetch: salary data + export header at same time
    const loadInitialData = async () => {
      await Promise.all([
        fetchSalaryData(),
        loadExportHeader()
      ]);
    };
    loadInitialData();
  }, []);

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
      const doc = new jsPDF({
        format: 'a4',
        unit: 'mm'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const leftMargin = 15;
      const rightMargin = 15;
      const contentWidth = pageWidth - (leftMargin + rightMargin);
      let yPosition = 12;

      // Professional Header with Company Info
      const companyName = exportHeader?.companyName || 'Enterprise Management System';
      const companyAddress = exportHeader?.address || '';
      const contactPhone = exportHeader?.contactPhone || '';
      const contactEmail = exportHeader?.contactEmail || '';
      const gstin = exportHeader?.gstin || '';

      // Company Name - Large and Bold
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 30, 90);
      doc.text(companyName, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      // Company Details - Smaller
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(50, 50, 50);
      
      if (companyAddress) {
        doc.text(companyAddress, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 4;
      }

      const contactDetails = [];
      if (contactPhone) contactDetails.push(`Phone: ${contactPhone}`);
      if (contactEmail) contactDetails.push(`Email: ${contactEmail}`);
      if (gstin) contactDetails.push(`GSTIN: ${gstin}`);

      if (contactDetails.length > 0) {
        doc.text(contactDetails.join(' | '), pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 4;
      }

      yPosition += 3;

      // Horizontal Line
      doc.setDrawColor(0, 30, 90);
      doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
      yPosition += 6;

      // Title
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 30, 90);
      doc.text("SALARY STRUCTURE", pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      doc.setTextColor(0, 0, 0);

      // Employee Details Section
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      const detailsData = [
        { label: "Employee Name", value: employeeName || "N/A" },
        { label: "Employee ID", value: employeeId || "N/A" },
        { label: "Designation", value: localStorage.getItem('employeeDesignation') || "N/A" },
        { label: "Department", value: localStorage.getItem('employeeDepartment') || "N/A" },
      ];

      detailsData.forEach(detail => {
        doc.text(`${detail.label}:`, leftMargin, yPosition);
        doc.text(detail.value, leftMargin + 45, yPosition);
        yPosition += 5;
      });
      
      yPosition += 5;

      // Earnings Section with Colored Header
      const earningsHeaderY = yPosition;
      doc.setFillColor(34, 139, 34); // Forest Green
      doc.rect(leftMargin - 2, earningsHeaderY - 3.5, contentWidth + 4, 5, 'F');
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text("EARNINGS", leftMargin + 1, earningsHeaderY, { align: 'left' });
      doc.setTextColor(0, 0, 0);
      yPosition += 6;

      const earningsData = [
        ["Particulars", "Amount (Rs)"],
        ["Basic Salary", formatValue(salary.basicSalary)],
        ["HRA", formatValue(salary.hra)],
        ["DA", formatValue(salary.da)],
        ["LTA", formatValue(salary.lta)],
        ["Conveyance", formatValue(salary.conveyance)],
        ["Medical", formatValue(salary.medical)],
        ["Bonuses", formatValue(salary.bonuses)],
        ["Other Benefits", formatValue(salary.otherBenefits)],
      ];

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      let tableY = yPosition;
      
      earningsData.forEach((row, index) => {
        const isHeader = index === 0;
        
        // Alternating row colors
        if (!isHeader && index % 2 === 0) {
          doc.setFillColor(240, 255, 240); // Honeydew light green
          doc.rect(leftMargin - 2, tableY - 3.5, contentWidth + 4, 5, 'F');
        }
        
        if (isHeader) {
          doc.setFillColor(76, 175, 80); // Light Green header
          doc.rect(leftMargin - 2, tableY - 3.5, contentWidth + 4, 5, 'F');
          doc.setFont(undefined, 'bold');
          doc.setTextColor(255, 255, 255);
        } else {
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
        }
        
        doc.text(row[0], leftMargin + 1, tableY);
        doc.text(row[1], leftMargin + contentWidth - 21, tableY, { align: "right" });
        tableY += 5;
        
        if (isHeader) {
          doc.setTextColor(0, 0, 0);
        }
      });

      // Gross Salary line - Colored
      doc.setFillColor(34, 139, 34); // Forest Green
      doc.rect(leftMargin - 2, tableY - 3.5, contentWidth + 4, 5, 'F');
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("GROSS SALARY", leftMargin + 1, tableY);
      doc.text(formatValue(calculateGross()), leftMargin + contentWidth - 21, tableY, { align: "right" });
      doc.setTextColor(0, 0, 0);
      yPosition = tableY + 8;

      // Deductions Section
      if (salary.wantDeduction) {
        const deductionsHeaderY = yPosition;
        doc.setFillColor(220, 53, 69); // Red
        doc.rect(leftMargin - 2, deductionsHeaderY - 3.5, contentWidth + 4, 5, 'F');
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text("DEDUCTIONS", leftMargin + 1, deductionsHeaderY);
        doc.setTextColor(0, 0, 0);
        yPosition += 6;

        const deductionsData = [
          ["Particulars", "Amount (Rs)"],
          ["PF (Provident Fund)", formatValue(salary.pf)],
          ["Professional Tax", formatValue(salary.professionalTax)],
          ["Income Tax", formatValue(salary.incomeTax)],
          ["EPF", formatValue(salary.epf)],
          ["ESIC", formatValue(salary.esic)],
        ];

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        tableY = yPosition;
        
        deductionsData.forEach((row, index) => {
          const isHeader = index === 0;
          
          // Alternating row colors
          if (!isHeader && index % 2 === 0) {
            doc.setFillColor(255, 245, 245); // Light red/pink
            doc.rect(leftMargin - 2, tableY - 3.5, contentWidth + 4, 5, 'F');
          }
          
          if (isHeader) {
            doc.setFillColor(240, 80, 100); // Lighter red header
            doc.rect(leftMargin - 2, tableY - 3.5, contentWidth + 4, 5, 'F');
            doc.setFont(undefined, 'bold');
            doc.setTextColor(255, 255, 255);
          } else {
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
          }
          
          doc.text(row[0], leftMargin + 1, tableY);
          doc.text(row[1], leftMargin + contentWidth - 21, tableY, { align: "right" });
          tableY += 5;
          
          if (isHeader) {
            doc.setTextColor(0, 0, 0);
          }
        });

        // Total Deductions line - Colored
        doc.setFillColor(220, 53, 69); // Red
        doc.rect(leftMargin - 2, tableY - 3.5, contentWidth + 4, 5, 'F');
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text("TOTAL DEDUCTIONS", leftMargin + 1, tableY);
        doc.text(formatValue(calculateDeductions()), leftMargin + contentWidth - 21, tableY, { align: "right" });
        doc.setTextColor(0, 0, 0);
        yPosition = tableY + 8;
      }

      // Net Salary Section - Highlighted with Color
      const netSalaryBoxHeight = 8;
      doc.setFillColor(13, 110, 253); // Blue
      doc.rect(leftMargin - 2, yPosition - 4, contentWidth + 4, netSalaryBoxHeight + 1, 'F');
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text("NET SALARY (Monthly)", leftMargin + 1, yPosition + 1);
      doc.setFontSize(13);
      doc.text(`Rs ${formatValue(calculateNet())}`, leftMargin + contentWidth - 21, yPosition + 1, { align: "right" });
      doc.setTextColor(0, 0, 0);

      // Footer
      yPosition += 15;
      doc.setFontSize(8);
      doc.setFont(undefined, 'italic');
      doc.text("This is a computer-generated document. No signature required.", leftMargin, yPosition);

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
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>

        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              {i === 2 && <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2"></div>}
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
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

  if (isLoading) {
    return <SkeletonLoader type="dashboard" />;
  }

  if (!employeeId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-10">
            <p className="text-muted-foreground mb-4">You are not logged in as an employee.</p>
            <p className="text-sm text-muted-foreground">Please log in with your employee credentials to view your salary structure.</p>
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
                <span className="font-medium">Rs {formatValue(item.value)}</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex justify-between items-center bg-green-50 p-3 rounded-md">
            <span className="font-semibold text-green-900">Gross Salary</span>
            <span className="font-bold text-lg text-green-900">Rs {formatValue(gross)}</span>
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
                  <span className="font-medium">Rs {formatValue(item.value)}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between items-center bg-red-50 p-3 rounded-md">
              <span className="font-semibold text-red-900">Total Deductions</span>
              <span className="font-bold text-lg text-red-900">Rs {formatValue(deductions)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Net Salary */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-green-900">Net Salary</span>
            <span className="text-4xl font-bold text-green-600">Rs {formatValue(net)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
