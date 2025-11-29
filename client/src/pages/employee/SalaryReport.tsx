import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { fetchExportHeader, getCompanyName, getCompanyAddress, formatExportDate, getCurrentYear, createProfessionalSalaryExcel, type ExportHeader } from '@/lib/exportUtils';

interface SalaryData {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  basicSalary: number;
  hra: number;
  da: number;
  lta: number;
  conveyance: number;
  medical: number;
  bonuses: number;
  otherBenefits: number;
  gross: number;
  pf: number;
  professionalTax: number;
  incomeTax: number;
  epf: number;
  esic: number;
  deductions: number;
  net: number;
  wantDeduction: boolean;
}

const formatValue = (value: number | string): string | number => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 0;
  const rounded = parseFloat(num.toFixed(2));
  return rounded % 1 === 0 ? Math.floor(rounded) : rounded;
};

export default function SalaryReport() {
  const { toast } = useToast();
  const [salaryData, setSalaryData] = useState<SalaryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'gross' | 'net'>('name');
  const [exportHeader, setExportHeader] = useState<ExportHeader | null>(null);

  useEffect(() => {
    fetchSalaryReport();
    loadExportHeader();
  }, []);

  const loadExportHeader = async () => {
    const header = await fetchExportHeader();
    setExportHeader(header);
  };

  const fetchSalaryReport = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/salary-report`);
      if (response.ok) {
        const data = await response.json();
        setSalaryData(data);
      } else {
        throw new Error('Failed to fetch salary report');
      }
    } catch (error) {
      console.error('Error fetching salary report:', error);
      toast({
        title: 'Error',
        description: 'Failed to load salary report',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = salaryData
    .filter(item =>
      item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.department.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.employeeName.localeCompare(b.employeeName);
      if (sortBy === 'gross') return b.gross - a.gross;
      if (sortBy === 'net') return b.net - a.net;
      return 0;
    });

  const totalGross = filteredData.reduce((sum, item) => sum + item.gross, 0);
  const totalDeductions = filteredData.reduce((sum, item) => sum + item.deductions, 0);
  const totalNet = filteredData.reduce((sum, item) => sum + item.net, 0);

  const downloadExcelReport = () => {
    const data: any[] = [
      [getCompanyName(exportHeader)],
      [getCompanyAddress(exportHeader)],
      [''],
      ['SALARY REPORT'],
      ['Generated on:', formatExportDate()],
      [''],
      ['Employee Name', 'Department', 'Designation', 'Basic', 'HRA', 'DA', 'LTA', 'Conveyance', 'Medical', 'Bonuses', 'Other Benefits', 'Gross Salary', 'PF', 'Professional Tax', 'Income Tax', 'EPF', 'ESIC', 'Total Deductions', 'Net Salary'],
    ];

    filteredData.forEach(item => {
      data.push([
        item.employeeName,
        item.department,
        item.designation,
        item.basicSalary,
        item.hra,
        item.da,
        item.lta,
        item.conveyance,
        item.medical,
        item.bonuses,
        item.otherBenefits,
        item.gross,
        item.pf,
        item.professionalTax,
        item.incomeTax,
        item.epf,
        item.esic,
        item.deductions,
        item.net,
      ]);
    });

    data.push(['']);
    data.push(['TOTAL', '', '', '', '', '', '', '', '', '', '', totalGross, '', '', '', '', '', totalDeductions, totalNet]);

    const columnWidths = Array(19).fill(14);
    createProfessionalSalaryExcel(data, columnWidths, `SalaryReport_${getCurrentYear()}.xlsx`);

    toast({
      title: 'Success',
      description: 'Salary report downloaded as Excel',
    });
  };

  const downloadPDFReport = () => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 15;

    // Company Header
    pdf.setFontSize(12);
    (pdf.setFont as any)(undefined, 'bold');
    pdf.text(String(getCompanyName(exportHeader)), pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    if (getCompanyAddress(exportHeader)) {
      pdf.setFontSize(9);
      (pdf.setFont as any)(undefined, 'normal');
      pdf.text(String(getCompanyAddress(exportHeader)), pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }

    yPos += 3;

    // Report Title and Date
    pdf.setFontSize(11);
    (pdf.setFont as any)(undefined, 'bold');
    pdf.text('SALARY REPORT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;

    pdf.setFontSize(9);
    (pdf.setFont as any)(undefined, 'normal');
    pdf.text(`Generated on: ${formatExportDate()}`, margin, yPos);
    yPos += 8;

    pdf.setFontSize(8);
    const headers = ['Name', 'Department', 'Designation', 'Basic', 'Gross', 'PF', 'Prof Tax', 'Income Tax', 'EPF', 'ESIC', 'Deductions', 'Net'];
    const colWidth = (pageWidth - 30) / headers.length;

    headers.forEach((header, index) => {
      pdf.setFont(undefined, 'bold');
      pdf.text(header, 15 + index * colWidth, yPos);
    });

    pdf.line(15, yPos + 2, pageWidth - 15, yPos + 2);
    yPos += 6;

    pdf.setFont(undefined, 'normal');
    filteredData.forEach(item => {
      if (yPos > 250) {
        pdf.addPage();
        yPos = 15;
      }

      pdf.text(item.employeeName, 15, yPos);
      pdf.text(item.department, 15 + colWidth, yPos);
      pdf.text(item.designation, 15 + colWidth * 2, yPos);
      pdf.text(`Rs ${formatValue(item.basicSalary)}`, 15 + colWidth * 3, yPos);
      pdf.text(`Rs ${formatValue(item.gross)}`, 15 + colWidth * 4, yPos);
      pdf.text(`Rs ${formatValue(item.pf)}`, 15 + colWidth * 5, yPos);
      pdf.text(`Rs ${formatValue(item.professionalTax)}`, 15 + colWidth * 6, yPos);
      pdf.text(`Rs ${formatValue(item.incomeTax)}`, 15 + colWidth * 7, yPos);
      pdf.text(`Rs ${formatValue(item.epf)}`, 15 + colWidth * 8, yPos);
      pdf.text(`Rs ${formatValue(item.esic)}`, 15 + colWidth * 9, yPos);
      pdf.text(`Rs ${formatValue(item.deductions)}`, 15 + colWidth * 10, yPos);
      pdf.text(`Rs ${formatValue(item.net)}`, 15 + colWidth * 11, yPos);

      yPos += 5;
    });

    pdf.setFont(undefined, 'bold');
    pdf.line(15, yPos, pageWidth - 15, yPos);
    yPos += 5;
    pdf.text('TOTAL', 15, yPos);
    pdf.text(`Rs ${formatValue(totalGross)}`, 15 + colWidth * 4, yPos);
    pdf.text(`Rs ${formatValue(totalDeductions)}`, 15 + colWidth * 10, yPos);
    pdf.text(`Rs ${formatValue(totalNet)}`, 15 + colWidth * 11, yPos);

    pdf.save(`SalaryReport_${getCurrentYear()}.pdf`);

    toast({
      title: 'Success',
      description: 'Salary report downloaded as PDF',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Salary Report</h2>
        <p className="text-muted-foreground">View and manage all employee salary structures</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Filters & Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Search by Name or Department</Label>
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-salary"
              />
            </div>
            <div className="space-y-2">
              <Label>Sort By</Label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'gross' | 'net')}
                className="w-full px-3 py-2 border rounded-md bg-background"
                data-testid="select-sort-salary"
              >
                <option value="name">Employee Name</option>
                <option value="gross">Gross Salary (High to Low)</option>
                <option value="net">Net Salary (High to Low)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={fetchSalaryReport} disabled={isLoading} className="w-full">
                {isLoading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salary Structure Report</CardTitle>
          <CardDescription>{filteredData.length} employees | {isLoading && 'Loading...'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold">Employee Name</th>
                  <th className="text-left py-2 px-3 font-semibold">Department</th>
                  <th className="text-left py-2 px-3 font-semibold">Designation</th>
                  <th className="text-right py-2 px-3 font-semibold">Basic</th>
                  <th className="text-right py-2 px-3 font-semibold">Gross</th>
                  <th className="text-right py-2 px-3 font-semibold">Deductions</th>
                  <th className="text-right py-2 px-3 font-semibold">Net Salary</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="py-2 px-3">{item.employeeName}</td>
                    <td className="py-2 px-3">{item.department}</td>
                    <td className="py-2 px-3">{item.designation}</td>
                    <td className="text-right py-2 px-3">Rs {formatValue(item.basicSalary)}</td>
                    <td className="text-right py-2 px-3 font-semibold text-green-600">Rs {formatValue(item.gross)}</td>
                    <td className="text-right py-2 px-3 font-semibold text-red-600">Rs {formatValue(item.deductions)}</td>
                    <td className="text-right py-2 px-3 font-semibold text-blue-600">Rs {formatValue(item.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No salary data found. Please try adjusting your search.
            </div>
          )}

          {filteredData.length > 0 && (
            <div className="mt-6 pt-4 border-t space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded">
                  <p className="text-sm text-muted-foreground">Total Gross Salary</p>
                  <p className="text-2xl font-bold text-green-600">Rs {formatValue(totalGross)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950 p-4 rounded">
                  <p className="text-sm text-muted-foreground">Total Deductions</p>
                  <p className="text-2xl font-bold text-red-600">Rs {formatValue(totalDeductions)}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded">
                  <p className="text-sm text-muted-foreground">Total Net Salary</p>
                  <p className="text-2xl font-bold text-blue-600">Rs {formatValue(totalNet)}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={downloadExcelReport} data-testid="button-download-report-excel">
                  Download Excel
                </Button>
                <Button variant="outline" onClick={downloadPDFReport} data-testid="button-download-report-pdf">
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
