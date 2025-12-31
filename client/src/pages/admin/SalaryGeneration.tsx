import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { authenticatedFetch } from '@/lib/fetchWithLoader';
import { fetchExportHeader, getCompanyName, getCompanyAddress, formatExportDate } from '@/lib/exportUtils';
import { Loader2 } from 'lucide-react';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EmployeeSalaryData {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  totalDays: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  leaveDays: number;
  sundays: number;
  holidays?: number;
  workingDays: number;
  salaryDays?: number;
  basicSalary: number;
  hra: number;
  da: number;
  lta: number;
  conveyance: number;
  medical: number;
  bonuses: number;
  otherBenefits: number;
  grossSalary: number;
  perDaySalary: number;
  earnedSalary: number;
  pf: number;
  professionalTax: number;
  incomeTax: number;
  epf: number;
  esic: number;
  fixedDeductions: number;
  absentDaysDeduction: number;
  totalDeductions: number;
  netSalary: number;
}

export default function SalaryGeneration() {
  const { toast } = useToast();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [salaryData, setSalaryData] = useState<EmployeeSalaryData[]>([]);
  const [generating, setGenerating] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [attendanceModal, setAttendanceModal] = useState<{ open: boolean; employee?: EmployeeSalaryData; days?: any[] }>({ open: false });
  const [deductionModal, setDeductionModal] = useState<{ open: boolean; employee?: EmployeeSalaryData }>({ open: false });
  const [tokenLoadingMap, setTokenLoadingMap] = useState<Record<string, boolean>>({});

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fetch day-wise attendance for an employee
  const fetchDaywiseAttendance = async (employeeId: string) => {
    try {
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/attendance/${employeeId}/${month}/${year}`);
      if (!response.ok) throw new Error('Failed to fetch attendance');
      const data = await response.json();
      let days: { day: number; status: string; leaveType?: string }[] = [];
      if (data && data.attendanceData) {
        let attendanceData: Record<string, any> = {};
        try {
          attendanceData = typeof data.attendanceData === 'string' ? JSON.parse(data.attendanceData) : data.attendanceData;
        } catch {}
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const dayData = attendanceData[d.toString()];
          let status = '';
          let leaveType = '';
          if (dayData && typeof dayData === 'object') {
            status = dayData.status || '';
            leaveType = dayData.leaveType || '';
          } else {
            status = dayData || '';
          }
          days.push({ day: d, status, leaveType });
        }
      }
      return days;
    } catch (e) {
      return [];
    }
  };

  const [onlyMissing, setOnlyMissing] = useState<boolean>(false);

  const generateSalaries = async () => {
    try {
      setGenerating(true);
      const url = new URL(`${getApiBaseUrl()}/api/salary/generate`);
      url.searchParams.set('month', String(month));
      url.searchParams.set('year', String(year));
      if (onlyMissing) url.searchParams.set('missingOnly', 'true');

      const response = await authenticatedFetch(url.toString(), {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        // Handle both response formats
        let salaries: any[] = [];
        if (data && data.generated && Array.isArray(data.generated)) {
          // Response format: { generated: [...], generatedCount, skippedCount }
          salaries = data.generated;
          toast({ title: 'Success', description: `Generated ${data.generatedCount || salaries.length || 0} salaries. Skipped ${data.skippedCount || 0}.` });
        } else if (Array.isArray(data)) {
          // Response format: [...]
          salaries = data;
          toast({ title: 'Success', description: `Generated salary for ${salaries.length} employees` });
        } else {
          // Handle unexpected response format
          console.warn('Unexpected response format:', data);
          salaries = [];
          toast({ title: 'Warning', description: 'Unexpected response format from server' });
        }
        setSalaryData(salaries);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate salaries');
      }
    } catch (error: any) {
      console.error('Error generating salaries:', error);
      toast({ title: 'Error', description: error.message || 'Failed to generate salaries', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      salaryData.map((emp) => ({
        'Employee Code': emp.employeeCode,
        'Employee Name': emp.employeeName,
        'Department': emp.department,
        'Designation': emp.designation,
        'Total Days': emp.totalDays,
        'Present': emp.presentDays,
        'Half Days': emp.halfDays,
        'Absent': emp.absentDays,
        'Leave': emp.leaveDays,
        'Working Days': emp.workingDays,
        'Salary Days': emp.salaryDays || emp.workingDays,
        'Basic Salary': emp.basicSalary,
        'HRA': emp.hra,
        'DA': emp.da,
        'LTA': emp.lta,
        'Conveyance': emp.conveyance,
        'Medical': emp.medical,
        'Bonuses': emp.bonuses,
        'Other Benefits': emp.otherBenefits,
        'Gross Salary': emp.grossSalary,
        'Per Day Salary': (emp.perDaySalary || 0).toFixed(2),
        'Earned Salary': emp.earnedSalary,
        'PF': emp.pf,
        'Professional Tax': emp.professionalTax,
        'Income Tax': emp.incomeTax,
        'EPF': emp.epf,
        'ESIC': emp.esic,
        'Total Deductions': emp.totalDeductions,
        'Net Salary': emp.netSalary,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Report');
    XLSX.writeFile(workbook, `Salary_Report_${monthNames[month - 1]}_${year}.xlsx`);

    toast({
      title: 'Success',
      description: 'Salary report exported to Excel',
    });
  };

  const exportToPDF = async () => {
    setPdfLoading(true);
    try {
      const header = await fetchExportHeader();
      const doc = new jsPDF('landscape');

      // Company header
      doc.setFontSize(16);
      doc.text(getCompanyName(header), 14, 18);
      doc.setFontSize(10);
      const address = getCompanyAddress(header);
      if (address) doc.text(address, 14, 24);
      const metaLine = `${monthNames[month - 1]} ${year} • ${formatExportDate()}`;
      doc.setFontSize(12);
      doc.text('Salary Report', 14, 34);
      doc.setFontSize(10);
      doc.text(metaLine, 14, 40);

      const tableData = salaryData.map((emp, index) => [
        index + 1,
        emp.employeeCode,
        emp.employeeName,
        emp.department,
        emp.workingDays,
        (emp.grossSalary || 0).toFixed(2),
        (emp.earnedSalary || 0).toFixed(2),
        (emp.totalDeductions || 0).toFixed(2),
        (emp.netSalary || 0).toFixed(2),
      ]);

      autoTable(doc, {
        startY: 46,
        head: [['#', 'Code', 'Employee', 'Department', 'Working Days', 'Gross', 'Earned', 'Deductions', 'Net Salary']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      doc.save(`Salary_Report_${monthNames[month - 1]}_${year}.pdf`);

      toast({
        title: 'Success',
        description: 'Salary report exported to PDF',
      });
    } catch (e) {
      console.error('Failed to export PDF', e);
      toast({ title: 'Error', description: 'Failed to export PDF', variant: 'destructive' });
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrint = async () => {
    setPrintLoading(true);
    try {
      const header = await fetchExportHeader();
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const tableRows = salaryData.map((emp, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${emp.employeeCode}</td>
          <td>${emp.employeeName}</td>
          <td>${emp.department}</td>
          <td>${emp.designation}</td>
          <td>${emp.workingDays}</td>
          <td>Rs ${(emp.grossSalary || 0).toFixed(2)}</td>
          <td>Rs ${(emp.earnedSalary || 0).toFixed(2)}</td>
          <td>Rs ${(emp.totalDeductions || 0).toFixed(2)}</td>
          <td>Rs ${(emp.netSalary || 0).toFixed(2)}</td>
        </tr>
      `).join('');

      const companyName = getCompanyName(header);
      const companyAddress = getCompanyAddress(header);
      const logoUrl = (header as any)?.logoUrl;
      const logoHtml = logoUrl
        ? `<img src="${logoUrl}" alt="Company Logo" style="width:56px;height:56px;border-radius:8px;object-fit:cover;" />`
        : `<div class="logo">${companyName ? companyName.charAt(0) : ''}</div>`;

      printWindow.document.write(`
        <html>
          <head>
            <title>Salary Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .brand-bar { height:8px; background: linear-gradient(90deg,#e0f7ff,#bae6fd); border-radius:4px; margin-bottom:12px }
              .company { display:flex; align-items:center; gap:12px; justify-content:center; }
              .logo { width:56px; height:56px; border-radius:8px; background:#0ea5e9; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:20px }
              .company h1 { margin:0; font-size:20px; }
              .company .addr { margin:0; font-size:12px; color:#444; }
              h2 { text-align: center; margin-top:8px; margin-bottom: 16px; font-size: 14px; color: #666; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px; }
              th { background-color: #3b82f6; color: white; font-weight: bold; }
              tr:nth-child(even) { background-color: #f9fafb; }
              img { display:block; }
            </style>
          </head>
          <body>
            <div class="brand-bar"></div>
            <div class="company">
              ${logoHtml}
              <div>
                <h1>${companyName}</h1>
                <div class="addr">${companyAddress}</div>
                <div class="addr">${header?.contactEmail || ''}${header?.contactPhone ? ' | ' + header.contactPhone : ''}</div>
              </div>
            </div>
            <h2>${monthNames[month - 1]} ${year} • ${formatExportDate()}</h2>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Code</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Working Days</th>
                  <th>Gross</th>
                  <th>Earned</th>
                  <th>Deductions</th>
                  <th>Net Salary</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try { printWindow.print(); } catch (e) { console.error('Print failed', e); }
        try { printWindow.close(); } catch (e) { /* ignore */ }
      }, 250);

      toast({
        title: 'Success',
        description: 'Print dialog opened',
      });
    } catch (e) {
      console.error('Print failed', e);
      toast({ title: 'Error', description: 'Failed to open print dialog', variant: 'destructive' });
    } finally {
      setPrintLoading(false);
    }
  };

  const totals = Array.isArray(salaryData) ? salaryData.reduce(
    (acc, emp) => ({
      grossSalary: acc.grossSalary + (emp.grossSalary || 0),
      earnedSalary: acc.earnedSalary + (emp.earnedSalary || 0),
      totalDeductions: acc.totalDeductions + (emp.totalDeductions || 0),
      netSalary: acc.netSalary + (emp.netSalary || 0),
    }),
    { grossSalary: 0, earnedSalary: 0, totalDeductions: 0, netSalary: 0 }
  ) : { grossSalary: 0, earnedSalary: 0, totalDeductions: 0, netSalary: 0 };

  //--- Generated salaries (saved) listing with paging & search ---
  const [generatedData, setGeneratedData] = useState<any[]>([]);
  const [generatedTotal, setGeneratedTotal] = useState<number>(0);
  const [genPage, setGenPage] = useState<number>(1);
  const [genPageSize, setGenPageSize] = useState<number>(20);
  const [genLoading, setGenLoading] = useState<boolean>(false);
  const [searchEmployee, setSearchEmployee] = useState<string>('');

  const fetchGeneratedSalaries = async (page = genPage, pageSize = genPageSize, search = searchEmployee) => {
    try {
      setGenLoading(true);
      const url = new URL(`${getApiBaseUrl()}/api/reports/salary-generated/${year}/${month}`);
      url.searchParams.set('page', String(page));
      url.searchParams.set('pageSize', String(pageSize));
      if (search) url.searchParams.set('search', search);
      const response = await authenticatedFetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch generated salaries');
      const body = await response.json();
      setGeneratedData(body.data || []);
      setGeneratedTotal(Number(body.total || 0));
      setGenPage(Number(body.page || page));
      setGenPageSize(Number(body.pageSize || pageSize));
    } catch (e) {
      console.error('Failed to load generated salaries', e);
      setGeneratedData([]);
      setGeneratedTotal(0);
    } finally {
      setGenLoading(false);
    }
  };

  // Refresh generated listing when month/year/page/search changes
  useEffect(() => {
    if (!year || !month) return;
    fetchGeneratedSalaries(1, genPageSize, searchEmployee);
  }, [month, year]);

  const handleServerPrint = async (employeeId: string) => {
    try {
      setTokenLoadingMap(m => ({ ...m, [employeeId]: true }));
      const resp = await authenticatedFetch(`${getApiBaseUrl()}/api/print-token/${employeeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to request print token');
      }
      const data = await resp.json();
      const url = data.url;
      const newWin = window.open(url, '_blank');
      if (!newWin) {
        try {
          await navigator.clipboard.writeText(url);
          toast({ title: 'Popup blocked', description: 'Print link copied to clipboard', variant: 'destructive' });
        } catch {
          toast({ title: 'Popup blocked', description: 'Could not open print window. Copy this link: ' + url, variant: 'destructive' });
        }
      } else {
        toast({ title: 'Print', description: 'Opened print window' });
      }
    } catch (error: any) {
      console.error('Print token error', error);
      toast({ title: 'Error', description: error.message || 'Failed to open print', variant: 'destructive' });
    } finally {
      setTokenLoadingMap(m => ({ ...m, [employeeId]: false }));
    }
  };

  if (loading) {
    return <SkeletonLoader type="table" />;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generate Employee Salaries</CardTitle>
          <p className="text-sm text-muted-foreground">
            Auto-calculate salaries based on attendance and salary structure. Attendance is automatically locked when salaries are saved.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="month">Month</Label>
              <select
                id="month"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
              >
                {monthNames.map((name, index) => (
                  <option key={index} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                min="2020"
                max="2100"
              />
            </div>
            <div className="flex items-end gap-3">
              <Button 
                onClick={generateSalaries} 
                className="w-full"
                disabled={generating || (generatedTotal > 0 && !onlyMissing)}
                title={generatedTotal > 0 && !onlyMissing ? 'Salaries already saved for selected month and year. Delete saved records to regenerate or enable "Generate missing only".' : undefined}
              >
                {generating ? 'Generating...' : '💰 Generate Salaries'}
              </Button>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
                <span>Generate missing only</span>
              </label>
            </div>
            {generatedTotal > 0 && !onlyMissing && (
              <div className="text-sm text-yellow-700 mt-1">Salaries already saved for the selected month/year. Enable "Generate missing only" to generate only the missing employee salaries, or delete saved salaries to regenerate all.</div>
            )}
          </div>

          {/* Export Buttons */}
          {salaryData.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Button onClick={exportToExcel} variant="outline" className="flex-1 min-w-[120px]">
                📊 Export to Excel
              </Button>
              <Button onClick={exportToPDF} variant="outline" className="flex-1 min-w-[120px]" disabled={pdfLoading}>
                {pdfLoading ? (<><Loader2 className="w-4 h-4 animate-spin mr-2 inline-block align-middle" />Generating PDF...</>) : '📄 Export to PDF'}
              </Button>
              <Button onClick={handlePrint} variant="outline" className="flex-1 min-w-[120px]" disabled={printLoading}>
                {printLoading ? (<><Loader2 className="w-4 h-4 animate-spin mr-2 inline-block align-middle" />Opening print...</>) : '🖨️ Print'}
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setLoading(true);
                    const response = await authenticatedFetch(`${getApiBaseUrl()}/api/salary/save`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ month, year, salaries: salaryData })
                    });
                    if (response.ok) {
                      toast({ title: 'Success', description: 'Salaries saved and attendance locked automatically.' });
                      // Clear generated results (return UI to initial state)
                      setSalaryData([]);
                      // Refresh generated list (saved records)
                      fetchGeneratedSalaries(1, genPageSize, searchEmployee);
                    } else {
                      const error = await response.json();
                      throw new Error(error.error || 'Failed to save salaries');
                    }
                  } catch (error: any) {
                    toast({ title: 'Error', description: error.message || 'Failed to save salaries', variant: 'destructive' });
                  } finally {
                    setLoading(false);
                  }
                }} 
                variant="default" 
                className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700 text-white"
                disabled={loading}
              >
                {loading ? (<><Loader2 className="w-4 h-4 animate-spin mr-2 inline-block" />Saving...</>) : '💾 Save'}
              </Button>
            </div>
          )}

          {/* Generated (saved) salaries moved to a separate card below */}

          {/* Results Table */}
          {salaryData.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="border p-2 text-left">#</th>
                      <th className="border p-2 text-left">Code</th>
                      <th className="border p-2 text-left">Employee</th>
                      <th className="border p-2 text-left">Department</th>
                      <th className="border p-2 text-center">Working Days</th>
                      <th className="border p-2 text-center">Salary Days</th>
                      <th className="border p-2 text-right">Gross Salary</th>
                      <th className="border p-2 text-right">Earned Salary</th>
                      <th className="border p-2 text-right">Deductions</th>
                      <th className="border p-2 text-right">Net Salary</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {salaryData.map((emp, index) => (
                      <tr key={emp.employeeId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border p-2">{index + 1}</td>
                        <td className="border p-2 font-semibold">{emp.employeeCode}</td>
                        <td className="border p-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">{emp.employeeName}</div>
                              <div className="text-xs text-muted-foreground">{emp.designation}</div>
                            </div>
                            <div>
                              <button
                                title="Server print"
                                onClick={() => handleServerPrint(emp.employeeId)}
                                className="text-sm"
                              >
                                {tokenLoadingMap[emp.employeeId] ? '…' : '🖨️'}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="border p-2">{emp.department}</td>
                        <td className="border p-2 text-center">
                          <button
                            className="underline text-blue-600 hover:text-blue-800"
                            title="View day-wise attendance"
                            onClick={async () => {
                              setAttendanceModal({ open: true, employee: emp, days: undefined });
                              const days = await fetchDaywiseAttendance(emp.employeeId);
                              setAttendanceModal({ open: true, employee: emp, days });
                            }}
                          >
                            {emp.workingDays}
                          </button>
                        </td>
                        <td className="border p-2 text-center font-semibold text-green-700">
                          {emp.salaryDays || emp.workingDays}
                        </td>
                        <td className="border p-2 text-right">Rs {(emp.grossSalary || 0).toFixed(2)}</td>
                        <td className="border p-2 text-right">Rs {(emp.earnedSalary || 0).toFixed(2)}</td>
                        <td
                          className="border p-2 text-right cursor-pointer hover:bg-blue-100 transition"
                          onClick={() => setDeductionModal({ open: true, employee: emp })}
                          title="Click to view deduction breakdown"
                        >
                          Rs {(emp.totalDeductions || 0).toFixed(2)}
                        </td>
                        <td className="border p-2 text-right font-semibold">Rs {(emp.netSalary || 0).toFixed(2)}</td>
                      </tr>
                    ))}

                    {/* Totals row */}
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={5} className="border p-2 text-right">Total:</td>
                      <td className="border p-2 text-right">Rs {(totals.grossSalary || 0).toFixed(2)}</td>
                      <td className="border p-2 text-right">Rs {(totals.earnedSalary || 0).toFixed(2)}</td>
                      <td className="border p-2 text-right">Rs {(totals.totalDeductions || 0).toFixed(2)}</td>
                      <td className="border p-2 text-right">Rs {(totals.netSalary || 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>



              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-green-600 font-medium">Total Gross Salary</p>
                    <p className="text-2xl font-bold text-green-700">Rs {(totals.grossSalary || 0).toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-blue-600 font-medium">Total Earned Salary</p>
                    <p className="text-2xl font-bold text-blue-700">Rs {(totals.earnedSalary || 0).toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-orange-600 font-medium">Total Deductions</p>
                    <p className="text-2xl font-bold text-orange-700">Rs {(totals.totalDeductions || 0).toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-purple-600 font-medium">Total Net Salary</p>
                    <p className="text-2xl font-bold text-purple-700">Rs {(totals.netSalary || 0).toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {salaryData.length === 0 && !generating && (
            <div className="text-center py-8 text-muted-foreground">
              Select month and year, then click "Generate Salaries" to calculate all employee salaries
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated Salaries</CardTitle>
          <p className="text-sm text-muted-foreground">Search and view previously generated (saved) salaries.</p>
        </CardHeader>
        <CardContent>
          {/* Search Section */}
          <div className="mb-4 p-3 bg-white rounded border">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Generated Salaries</h3>

              <div className="ml-4 flex items-center gap-2">
                <Input
                  placeholder="Search employee"
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchGeneratedSalaries(1, genPageSize, searchEmployee); }}
                  className="w-64"
                />
                <Button onClick={() => fetchGeneratedSalaries(1, genPageSize, searchEmployee)} disabled={genLoading}>Search</Button>
                <Button variant="ghost" onClick={() => { setSearchEmployee(''); fetchGeneratedSalaries(1, genPageSize, ''); }}>Reset</Button>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Per page:</span>
                <select value={genPageSize} onChange={(e) => { setGenPageSize(Number(e.target.value)); fetchGeneratedSalaries(1, Number(e.target.value), searchEmployee); }} className="p-1 border rounded">
                  {[10,20,50,100].map(n => (<option key={n} value={n}>{n}</option>))}
                </select>
                <Button size="sm" onClick={() => fetchGeneratedSalaries(genPage, genPageSize, searchEmployee)}>Refresh</Button>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="mt-2">
            <div className="overflow-x-auto bg-white rounded border">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-sm">
                    <th className="p-2 border text-left">#</th>
                    <th className="p-2 border text-left">Code</th>
                    <th className="p-2 border text-left">Employee</th>
                    <th className="p-2 border text-right">Gross</th>
                    <th className="p-2 border text-right">Net</th>
                    <th className="p-2 border text-right">Deductions</th>
                    <th className="p-2 border text-left">Generated At</th>
                    <th className="p-2 border text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {genLoading ? (
                    <tr><td colSpan={8} className="p-4 text-center">Loading...</td></tr>
                  ) : generatedData.length === 0 ? (
                    <tr><td colSpan={8} className="p-4 text-center">No records</td></tr>
                  ) : (
                    generatedData.map((row, idx) => (
                      <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-2 border">{(genPage - 1) * genPageSize + idx + 1}</td>
                        <td className="p-2 border font-semibold">{row.employeeCode}</td>
                        <td className="p-2 border">{row.employeeName}</td>
                        <td className="p-2 border text-right">Rs {(Number(row.grossSalary) || 0).toFixed(2)}</td>
                        <td className="p-2 border text-right">Rs {(Number(row.netSalary) || 0).toFixed(2)}</td>
                        <td className="p-2 border text-right">Rs {(Number(row.totalDeductions) || 0).toFixed(2)}</td>
                        <td className="p-2 border">{new Date(row.createdAt).toLocaleString()}</td>
                        <td className="p-2 border text-center flex items-center justify-center gap-2">
                          <Button size="sm" variant="outline" onClick={async () => {
                            setAttendanceModal({ open: true, employee: row, days: undefined });
                            const days = await fetchDaywiseAttendance(row.employeeId);
                            setAttendanceModal({ open: true, employee: row, days });
                          }}>View</Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={async () => {
                            if (!confirm('Are you sure you want to delete this generated salary? This will also unlock attendance for the employee.')) return;
                            try {
                              setGenLoading(true);
                              const resp = await authenticatedFetch(`${getApiBaseUrl()}/api/reports/salary-generated/${row.id}`, { method: 'DELETE' });
                              if (!resp.ok) {
                                const err = await resp.json().catch(() => ({}));
                                throw new Error(err.error || 'Failed to delete generated salary');
                              }
                              toast({ title: 'Deleted', description: 'Generated salary deleted and attendance unlocked.' });
                              // Refresh list
                              fetchGeneratedSalaries(genPage, genPageSize, searchEmployee);
                            } catch (e: any) {
                              toast({ title: 'Error', description: e.message || 'Failed to delete generated salary', variant: 'destructive' });
                            } finally {
                              setGenLoading(false);
                            }
                          }}>Delete</Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paging controls */}
            <div className="flex items-center justify-between mt-3">
              <div className="text-sm text-muted-foreground">Showing {(genPage - 1) * genPageSize + 1} - {Math.min(genPage * genPageSize, generatedTotal)} of {generatedTotal}</div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => { if (genPage > 1) { fetchGeneratedSalaries(genPage - 1, genPageSize, searchEmployee); } }} disabled={genPage <= 1}>Prev</Button>
                <div className="px-2">Page {genPage}</div>
                <Button size="sm" onClick={() => { if ((genPage * genPageSize) < generatedTotal) { fetchGeneratedSalaries(genPage + 1, genPageSize, searchEmployee); } }} disabled={(genPage * genPageSize) >= generatedTotal}>Next</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Modal */}
      <Dialog open={attendanceModal.open} onOpenChange={open => setAttendanceModal(v => ({ ...v, open }))}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Day-wise Attendance for {attendanceModal.employee?.employeeName}</DialogTitle>
          </DialogHeader>
          {/* Summary Section */}
          {attendanceModal.days && attendanceModal.days.length > 0 && (
            (() => {
              let present = 0, paidLeave = 0, unpaidLeave = 0, holiday = 0, absent = 0, half = 0;
              const paidLeaveTypes = ['CL','ML','EL','SL','PL'];
              attendanceModal.days.forEach(d => {
                if (d.status === 'present') present++;
                else if (d.status === 'firsthalf' || d.status === 'secondhalf') half++;
                else if (d.status === 'absent') absent++;
                else if (d.status === 'holiday') holiday++;
                else if (d.status === 'leave') {
                  if (paidLeaveTypes.includes(d.leaveType)) paidLeave++;
                  else unpaidLeave++;
                }
              });
              const workingDays = present + holiday + paidLeave + half * 0.5;
              return (
                <div className="mb-2">
                  <div className="grid grid-cols-3 gap-1 mb-1">
                    <div className="flex flex-col items-center bg-green-50 rounded p-1 shadow-sm min-w-[70px]">
                      <span className="text-green-600 text-base font-bold leading-tight">{present}</span>
                      <span className="text-[10px] text-green-800 flex items-center gap-1"><span role='img' aria-label='present'>✅</span>Present</span>
                    </div>
                    <div className="flex flex-col items-center bg-blue-50 rounded p-1 shadow-sm min-w-[70px]">
                      <span className="text-blue-600 text-base font-bold leading-tight">{paidLeave}</span>
                      <span className="text-[10px] text-blue-800 flex items-center gap-1"><span role='img' aria-label='paid leave'>🟦</span>Paid Leave</span>
                    </div>
                    <div className="flex flex-col items-center bg-gray-50 rounded p-1 shadow-sm min-w-[70px]">
                      <span className="text-gray-600 text-base font-bold leading-tight">{unpaidLeave}</span>
                      <span className="text-[10px] text-gray-800 flex items-center gap-1"><span role='img' aria-label='unpaid leave'>⬜</span>Unpaid Leave</span>
                    </div>
                    <div className="flex flex-col items-center bg-yellow-50 rounded p-1 shadow-sm min-w-[70px]">
                      <span className="text-yellow-600 text-base font-bold leading-tight">{holiday}</span>
                      <span className="text-[10px] text-yellow-800 flex items-center gap-1"><span role='img' aria-label='holiday'>🎉</span>Holidays</span>
                    </div>
                    <div className="flex flex-col items-center bg-red-50 rounded p-1 shadow-sm min-w-[70px]">
                      <span className="text-red-600 text-base font-bold leading-tight">{absent}</span>
                      <span className="text-[10px] text-red-800 flex items-center gap-1"><span role='img' aria-label='absent'>❌</span>Absent</span>
                    </div>
                    <div className="flex flex-col items-center bg-purple-50 rounded p-1 shadow-sm min-w-[70px]">
                      <span className="text-purple-600 text-base font-bold leading-tight">{half}</span>
                      <span className="text-[10px] text-purple-800 flex items-center gap-1"><span role='img' aria-label='half day'>🌓</span>Half Days</span>
                    </div>
                  </div>
                  <div className="rounded bg-indigo-100 p-2 text-center mt-1 shadow-inner">
                    <span className="text-indigo-700 font-semibold text-sm flex items-center justify-center gap-2">
                      <span role='img' aria-label='working days'>🗓️</span>
                      Working Days (for salary): <span className="ml-1 text-lg font-bold">{workingDays}</span>
                    </span>
                  </div>
                </div>
              );
            })()
          )}
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full border text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-1">Day</th>
                  <th className="border p-1">Status</th>
                  <th className="border p-1">Leave Type</th>
                </tr>
              </thead>
              <tbody>
                {attendanceModal.days?.length ? attendanceModal.days.map((d) => (
                  <tr key={d.day} className="text-center">
                    <td className="border p-1">{d.day}</td>
                    <td className="border p-1">{d.status ? d.status.charAt(0).toUpperCase() + d.status.slice(1) : '-'}</td>
                    <td className="border p-1">{d.leaveType || '-'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="text-center p-2">{attendanceModal.days ? 'No attendance data' : 'Loading...'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <DialogClose asChild>
            <Button variant="outline" className="mt-4 w-full">Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>

      {/* Deduction Breakdown Modal */}
      <Dialog open={deductionModal.open} onOpenChange={(open) => setDeductionModal({ ...deductionModal, open })}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deduction Breakdown - {deductionModal.employee?.employeeName}</DialogTitle>
          </DialogHeader>

          {deductionModal.employee && (
            <div className="space-y-4">
              {/* Absent Days Deduction */}
              <div className="border rounded p-4 bg-orange-50">
                <h3 className="font-semibold text-orange-800 mb-2">Absent Days Deduction</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Absent Days:</span>
                    <span className="font-semibold">{deductionModal.employee.absentDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Per Day Salary:</span>
                    <span className="font-semibold">Rs {(deductionModal.employee.perDaySalary || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between bg-orange-100 px-2 py-2 rounded">
                    <span className="font-semibold">Absent Days Deduction:</span>
                    <span className="font-bold text-orange-700">Rs {(deductionModal.employee.absentDaysDeduction || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Fixed Deductions */}
              <div className="border rounded p-4 bg-red-50">
                <h3 className="font-semibold text-red-800 mb-2">Fixed Deductions</h3>
                <div className="space-y-1 text-sm">
                  {deductionModal.employee.pf > 0 && (
                    <div className="flex justify-between">
                      <span>PF (Provident Fund):</span>
                      <span>Rs {(deductionModal.employee.pf || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {deductionModal.employee.professionalTax > 0 && (
                    <div className="flex justify-between">
                      <span>Professional Tax:</span>
                      <span>Rs {(deductionModal.employee.professionalTax || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {deductionModal.employee.incomeTax > 0 && (
                    <div className="flex justify-between">
                      <span>Income Tax:</span>
                      <span>Rs {(deductionModal.employee.incomeTax || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {deductionModal.employee.epf > 0 && (
                    <div className="flex justify-between">
                      <span>EPF (Employee Provident Fund):</span>
                      <span>Rs {(deductionModal.employee.epf || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {deductionModal.employee.esic > 0 && (
                    <div className="flex justify-between">
                      <span>ESIC (Employee State Insurance):</span>
                      <span>Rs {(deductionModal.employee.esic || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2 flex justify-between bg-red-100 px-2 py-2 rounded">
                    <span className="font-semibold">Total Fixed Deductions:</span>
                    <span className="font-bold text-red-700">Rs {(deductionModal.employee.fixedDeductions || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Total Deductions Summary */}
              <div className="border-2 border-gray-800 rounded p-4 bg-gray-100">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Absent Days Deduction:</span>
                    <span>Rs {(deductionModal.employee.absentDaysDeduction || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Fixed Deductions:</span>
                    <span>Rs {(deductionModal.employee.fixedDeductions || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t-2 pt-2 flex justify-between text-lg font-bold">
                    <span>Total Deductions:</span>
                    <span className="text-red-700">Rs {(deductionModal.employee.totalDeductions || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Salary Calculation Breakdown */}
              <div className="border rounded p-4 bg-green-50">
                <h3 className="font-semibold text-green-800 mb-3">Final Salary Calculation</h3>
                <div className="space-y-3">
                  {/* Salary Days Calculation */}
                  <div className="bg-white p-3 rounded border-l-4 border-blue-600">
                    <div className="text-xs text-gray-600 mb-3 font-semibold">Salary Days Breakdown:</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Working Days (Present + Half + Leave):</span>
                        <span className="font-semibold">{deductionModal.employee.workingDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sundays (Paid Days):</span>
                        <span className="font-semibold">+ {deductionModal.employee.sundays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Holidays (Paid Days):</span>
                        <span className="font-semibold">+ {deductionModal.employee.holidays || 0}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between bg-blue-50 px-2 py-2 rounded">
                        <span className="font-bold text-blue-700">Total Salary Days:</span>
                        <span className="font-bold text-blue-700">{deductionModal.employee.salaryDays || deductionModal.employee.workingDays}</span>
                      </div>
                    </div>

                    {/* Earned Salary Calculation */}
                    <div className="mt-3 border-t pt-3">
                      <div className="text-xs text-gray-600 mb-2 font-semibold">Earned Salary Calculation:</div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Gross Salary:</span>
                        <span className="font-semibold">Rs {(deductionModal.employee.grossSalary || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span className="text-xs">Per Day: Rs {(deductionModal.employee.perDaySalary || 0).toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        × {deductionModal.employee.salaryDays || deductionModal.employee.workingDays} salary days
                      </div>
                      <div className="border-t pt-2 flex justify-between bg-blue-100 px-2 py-2 rounded">
                        <span className="font-semibold">Earned Salary:</span>
                        <span className="font-bold text-blue-600">Rs {(deductionModal.employee.earnedSalary || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Final Calculation */}
                  <div className="border-2 border-green-600 bg-white p-3 rounded">
                    <div className="flex justify-between text-sm font-semibold mb-3">
                      <span>Earned Salary:</span>
                      <span className="text-blue-600">Rs {(deductionModal.employee.earnedSalary || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-red-600 mb-3">
                      <span>Minus: Total Deductions:</span>
                      <span>Rs {(deductionModal.employee.totalDeductions || 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t-2 border-green-600 pt-3 flex justify-between">
                      <span className="text-lg font-bold text-green-700">Net Salary:</span>
                      <span className="text-lg font-bold text-green-700">Rs {(deductionModal.employee.netSalary || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="bg-blue-50 p-2 rounded text-xs text-blue-800">
                    <p>💡 <strong>Note:</strong> Deductions are calculated on Earned Salary (after accounting for working days, absences, and leaves)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogClose asChild>
            <Button variant="outline" className="mt-4 w-full">Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
