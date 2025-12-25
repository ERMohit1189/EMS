import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Calendar } from 'lucide-react';
import { fetchExportHeader } from '@/lib/exportUtils';

interface SalaryHistory {
  id: string;
  month: number;
  year: number;
  netSalary: number | null;
  grossSalary: number | null;
  totalDeductions: number | null;
  basicSalary?: number | null;
  earnedSalary?: number | null;
  hra?: number | null;
  da?: number | null;
  lta?: number | null;
  conveyance?: number | null;
  medical?: number | null;
  bonuses?: number | null;
  otherBenefits?: number | null;
  pf?: number | null;
  professionalTax?: number | null;
  incomeTax?: number | null;
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatMonth = (monthNum: number): string => {
  const num = typeof monthNum === 'string' ? parseInt(monthNum, 10) : monthNum;
  return monthNames[num - 1] || `Month ${num}`;
};

export default function EmployeeSalaryHistory() {
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
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalaryHistory();
  }, []);

  const fetchSalaryHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/salary-history`);
      if (!response.ok) {
        // Try to read text for HTML error page
        const text = await response.text();
        if (text.startsWith('<!DOCTYPE')) {
          throw new Error('API endpoint not found or server error.');
        }
        throw new Error('Failed to fetch salary history');
      }
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error('Invalid response format. Please contact support.');
      }
      setSalaryHistory(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setSalaryHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadSalarySlip = async (id: string, month: number, year: number) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/salary-slip/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text();
        if (text.startsWith('<!DOCTYPE')) {
          throw new Error('API endpoint not found or server error.');
        }
        throw new Error(`Failed to fetch salary slip: ${response.statusText}`);
      }

      let salarySlip;
      try {
        salarySlip = await response.json();
      } catch (jsonErr) {
        throw new Error('Invalid response format. Please contact support.');
      }

      // Get user profile from localStorage
      const userProfile = {
        name: localStorage.getItem('employeeName') || '',
        emp_code: localStorage.getItem('employeeCode') || '',
        designation: localStorage.getItem('employeeDesignation') || '',
        department: localStorage.getItem('employeeDepartment') || '',
      };

      // Fetch export header (company info)
      const exportHeader = await fetchExportHeader();

      // Generate PDF using same logic as EmployeeDashboard
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;

      // Header - Company Info (blue background)
      doc.setFillColor(102, 126, 234); // blue
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(exportHeader.companyName || 'Enterprise Operations Management System (EOMS)', pageWidth / 2, yPos, { align: 'center' });
      yPos += 7;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (exportHeader.address) {
        doc.text(exportHeader.address, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
      if (exportHeader.contactEmail || exportHeader.contactPhone) {
        doc.text([exportHeader.contactEmail, exportHeader.contactPhone].filter(Boolean).join(' | '), pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
      if (exportHeader.gstin || exportHeader.website) {
        doc.text([exportHeader.gstin ? `GSTIN: ${exportHeader.gstin}` : '', exportHeader.website].filter(Boolean).join(' | '), pageWidth / 2, yPos, { align: 'center' });
      }

      doc.setFontSize(16);
      doc.setTextColor(0, 0, 128);
      doc.text(`Pay Slip for  ${formatMonth(month)}-${year}`, 15, 40);

      // Employee details table
      autoTable(doc, {
        startY: 45,
        head: [
          [
            { content: 'Name', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: userProfile?.name || '', styles: { halign: 'left' } },
            { content: 'UAN', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: '', styles: { halign: 'left' } },
          ],
          [
            { content: 'Employee Code', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: userProfile?.emp_code || '', styles: { halign: 'left' } },
            { content: 'PF No', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: '', styles: { halign: 'left' } },
          ],
          [
            { content: 'Designation', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: userProfile?.designation || '', styles: { halign: 'left' } },
            { content: 'ESI No', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: '', styles: { halign: 'left' } },
          ],
          [
            { content: 'DOJ', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: '', styles: { halign: 'left' } },
            { content: 'Bank A/C No', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: '', styles: { halign: 'left' } },
          ],
          [
            { content: 'Gross Wage', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: `Rs ${Number(salarySlip.grossSalary).toLocaleString()}`, styles: { halign: 'left' } },
            { content: '', styles: { halign: 'left' } },
            { content: '', styles: { halign: 'left' } },
          ],
          [
            { content: 'Total Working Days', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: salarySlip.totalDays || '-', styles: { halign: 'left' } },
            { content: 'Paid Days', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: salarySlip.workingDays || '-', styles: { halign: 'left' } },
          ],
          [
            { content: 'LOP days', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: salarySlip.absentDays || '-', styles: { halign: 'left' } },
            { content: 'Leaves Taken', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: salarySlip.leaveDays || '-', styles: { halign: 'left' } },
          ],
        ],
        theme: 'grid',
        styles: { fontSize: 10 },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
        columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 45 }, 2: { cellWidth: 45 }, 3: { cellWidth: 45 } },
      });

      // Earnings and Deductions Table
      const _lastAutoY = (doc as any).lastAutoTable?.finalY ?? 45;
      autoTable(doc, {
        startY: _lastAutoY + 2,
        head: [
          [
            { content: 'Earnings', styles: { halign: 'center', fontStyle: 'bold' } },
            { content: '', styles: { halign: 'center' } },
            { content: 'Deductions', styles: { halign: 'center', fontStyle: 'bold' } },
            { content: '', styles: { halign: 'center' } },
          ],
        ],
        body: [
          ['Basic Wage', `Rs ${Number(salarySlip.basicSalary).toLocaleString()}`, 'EPF', `Rs ${Number(salarySlip.pf).toLocaleString()}`],
          ['HRA', `Rs ${Number(salarySlip.hra).toLocaleString()}`, 'ESI / Health Insurance', `Rs ${Number(salarySlip.esic).toLocaleString()}`],
          ['Conveyance Allowances', `Rs ${Number(salarySlip.conveyance).toLocaleString()}`, 'Professional Tax', `Rs ${Number(salarySlip.professionalTax).toLocaleString()}`],
          ['Medical Allowances', `Rs ${Number(salarySlip.medical).toLocaleString()}`, 'Loan Recovery', 'Rs 0'],
          ['Other Allowances', `Rs ${Number(salarySlip.otherBenefits).toLocaleString()}`, '', ''],
          ['Total Earnings', `Rs ${Number(salarySlip.grossSalary).toLocaleString()}`, 'Total Deductions', `Rs ${Number(salarySlip.totalDeductions).toLocaleString()}`],
          [
            { content: 'Net Salary', styles: { fontStyle: 'bold', halign: 'center' } },
            { content: '', styles: { halign: 'center' } },
            { content: '', styles: { halign: 'center' } },
            { content: `Rs ${Number(salarySlip.netSalary).toLocaleString()}`, styles: { fontStyle: 'bold', halign: 'center' } }
          ],
        ],
        theme: 'grid',
        styles: { fontSize: 11 },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
        columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 45 }, 2: { cellWidth: 45 }, 3: { cellWidth: 45 } },
      });

      // Signature lines
      doc.setFontSize(10);
      const _sigY = (doc as any).lastAutoTable?.finalY ?? _lastAutoY;
      doc.text('-------------------------------', 15, _sigY + 15);
      doc.text('Employer Signature', 15, _sigY + 22);
      doc.text('-------------------------------', 150, _sigY + 15);
      doc.text('Employee Signature', 150, _sigY + 22);

      doc.save(`Salary_Slip_${formatMonth(month)}_${year}.pdf`);
      toast({ title: 'Success', description: 'Salary slip downloaded successfully.' });
    } catch (error: any) {
      console.error('[SalaryHistory] Download error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-xl text-gray-800">Salary History</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-gray-600 text-sm">Loading salary history...</p>
              </div>
            </div>
          ) : salaryHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No salary history found</p>
              <p className="text-gray-400 text-sm mt-1">Your salary records will appear here once generated</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-blue-200">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-blue-900">Month</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-blue-900">Year</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-blue-900">Gross Salary</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-blue-900">Net Salary</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-blue-900">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryHistory.map((item, index) => {
                    const gross = Number(item.grossSalary || 0);
                    const net = Number(item.netSalary || 0);
                    return (
                      <tr key={item.id} className={`border-b transition-colors hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatMonth(item.month)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.year}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-700 font-medium">Rs {gross.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-green-700">Rs {net.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                            onClick={() => downloadSalarySlip(item.id, item.month, item.year)}
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </td>
                      </tr>
                    );
                  })}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
