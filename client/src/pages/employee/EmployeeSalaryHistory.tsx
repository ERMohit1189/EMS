import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { authenticatedFetch } from '@/lib/fetchWithLoader';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Calendar, Printer } from 'lucide-react';
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
  epf?: number | null;
  esic?: number | null;
  fixedDeductions?: number | null;
  absentDaysDeduction?: number | null;
  presentDays?: number | null;
  absentDays?: number | null;
  halfDays?: number | null;
  leaveDays?: number | null;
  workingDays?: number | null;
  sundays?: number | null;
  holidays?: number | null;
  perDaySalary?: number | null;
  employeeCode?: string;
  totalDays?: number | null;
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
  const [selectedDeductionRecord, setSelectedDeductionRecord] = useState<SalaryHistory | null>(null);

  useEffect(() => {
    fetchSalaryHistory();
  }, []);

  const fetchSalaryHistory = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/salary-history`);
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

  const printDeductionDetails = async () => {
    if (!selectedDeductionRecord) return;
    try {
      const exportHeader = await fetchExportHeader();
      const userProfile = {
        name: localStorage.getItem('employeeName') || '',
        emp_code: selectedDeductionRecord.employeeCode || localStorage.getItem('employeeCode') || '',
        designation: localStorage.getItem('employeeDesignation') || '',
        department: localStorage.getItem('employeeDepartment') || '',
      };

      // Create print content HTML
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Deduction Details - ${formatMonth(selectedDeductionRecord.month)} ${selectedDeductionRecord.year}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .print-container {
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            /* Header */
            .header {
              background: linear-gradient(to right, #667eea, #764ba2);
              color: white;
              padding: 20px;
              text-align: center;
              margin-bottom: 20px;
              border-radius: 5px;
            }
            .header h1 {
              font-size: 24px;
              margin-bottom: 5px;
            }
            .header .company-details {
              font-size: 11px;
              line-height: 1.4;
            }
            /* Title */
            .title {
              font-size: 18px;
              font-weight: bold;
              color: #000080;
              margin: 20px 0 15px 0;
              border-bottom: 2px solid #667eea;
              padding-bottom: 8px;
            }
            /* Employee Info */
            .emp-info {
              background: #f5f5f5;
              padding: 15px;
              margin-bottom: 20px;
              border-left: 4px solid #667eea;
            }
            .emp-info-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              border-bottom: 1px solid #ddd;
            }
            .emp-info-row:last-child {
              border-bottom: none;
            }
            .emp-label {
              font-weight: bold;
              width: 35%;
            }
            /* Table Styles */
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            th {
              background: #667eea;
              color: white;
              padding: 10px;
              text-align: left;
              font-weight: bold;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #ddd;
            }
            tr:nth-child(even) {
              background: #f9f9f9;
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-weight: bold;
              font-size: 13px;
              margin: 15px 0 10px 0;
              color: #333;
            }
            /* Deduction Table Special Styles */
            .deduction-table th {
              background: #dc2626;
            }
            .net-salary-row {
              background: #dcfce7 !important;
              font-weight: bold;
              font-size: 14px;
            }
            .net-salary-row td {
              border: 2px solid #22c55e;
              padding: 12px;
            }
            /* Footer */
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 10px;
              color: #666;
              line-height: 1.5;
            }
            .amount-right {
              text-align: right;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .print-container {
                padding: 0;
                max-width: 100%;
              }
              .header {
                margin-bottom: 15px;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <!-- Header -->
            <div class="header">
              <h1>${exportHeader.companyName || 'Enterprise Operations Management System'}</h1>
              <div class="company-details">
                <div>${exportHeader.address || ''}</div>
                <div>${[exportHeader.contactEmail, exportHeader.contactPhone].filter(Boolean).join(' | ')}</div>
                <div>${exportHeader.gstin ? 'GSTIN: ' + exportHeader.gstin : ''} ${exportHeader.website || ''}</div>
              </div>
            </div>

            <!-- Title -->
            <h2 class="title">Deduction Details</h2>

            <!-- Employee Info -->
            <div class="emp-info">
              <div class="emp-info-row">
                <span class="emp-label">Employee Name:</span>
                <span>${userProfile.name}</span>
              </div>
              <div class="emp-info-row">
                <span class="emp-label">Employee Code:</span>
                <span>${userProfile.emp_code}</span>
              </div>
              <div class="emp-info-row">
                <span class="emp-label">Designation:</span>
                <span>${userProfile.designation}</span>
              </div>
              <div class="emp-info-row">
                <span class="emp-label">Department:</span>
                <span>${userProfile.department}</span>
              </div>
              <div class="emp-info-row">
                <span class="emp-label">Month/Year:</span>
                <span>${formatMonth(selectedDeductionRecord.month)} ${selectedDeductionRecord.year}</span>
              </div>
            </div>

            <!-- Attendance Details -->
            <div class="section">
              <div class="section-title">📋 Attendance Details</div>
              <table>
                <tr>
                  <th>Description</th>
                  <th class="amount-right">Count</th>
                </tr>
                <tr>
                  <td>Present Days</td>
                  <td class="amount-right">${selectedDeductionRecord.presentDays || 0}</td>
                </tr>
                <tr>
                  <td>Absent Days</td>
                  <td class="amount-right">${selectedDeductionRecord.absentDays || 0}</td>
                </tr>
                <tr>
                  <td>Half Days</td>
                  <td class="amount-right">${selectedDeductionRecord.halfDays || 0}</td>
                </tr>
                <tr>
                  <td>Leave Days</td>
                  <td class="amount-right">${selectedDeductionRecord.leaveDays || 0}</td>
                </tr>
                <tr>
                  <td>Sundays</td>
                  <td class="amount-right">${selectedDeductionRecord.sundays || 0}</td>
                </tr>
                <tr>
                  <td>Holidays</td>
                  <td class="amount-right">${selectedDeductionRecord.holidays || 0}</td>
                </tr>
                <tr style="font-weight: bold; background: #eff6ff;">
                  <td>Working Days</td>
                  <td class="amount-right">${Number(selectedDeductionRecord.workingDays || 0).toFixed(1)}</td>
                </tr>
              </table>
            </div>

            <!-- Salary Calculation -->
            <div class="section">
              <div class="section-title">💰 Salary Calculation</div>
              <table>
                <tr>
                  <th>Description</th>
                  <th class="amount-right">Value</th>
                </tr>
                <tr>
                  <td>Gross Salary ÷ Total Days in Month</td>
                  <td class="amount-right">Rs ${(selectedDeductionRecord.grossSalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ÷ ${selectedDeductionRecord.totalDays || 0}</td>
                </tr>
                <tr style="font-weight: bold;">
                  <td>Per Day Salary</td>
                  <td class="amount-right">Rs ${(selectedDeductionRecord.perDaySalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>Salary Days (Working + Holidays + Sundays)</td>
                  <td class="amount-right">${(selectedDeductionRecord.workingDays || 0).toFixed(1)} + ${selectedDeductionRecord.holidays || 0} + ${selectedDeductionRecord.sundays || 0} = ${((selectedDeductionRecord.workingDays || 0) + (selectedDeductionRecord.holidays || 0) + (selectedDeductionRecord.sundays || 0)).toFixed(1)}</td>
                </tr>
                <tr>
                  <td>Per Day Salary × Salary Days</td>
                  <td class="amount-right">Rs ${(selectedDeductionRecord.perDaySalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} × ${((selectedDeductionRecord.workingDays || 0) + (selectedDeductionRecord.holidays || 0) + (selectedDeductionRecord.sundays || 0)).toFixed(1)}</td>
                </tr>
                <tr style="font-weight: bold; background: #dcfce7;">
                  <td>Earned Salary</td>
                  <td class="amount-right">Rs ${(selectedDeductionRecord.earnedSalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                </tr>
              </table>
            </div>

            <!-- Deduction Breakdown -->
            <div class="section">
              <div class="section-title">📉 Deduction Breakdown</div>
              <table class="deduction-table">
                <tr>
                  <th>Description</th>
                  <th class="amount-right">Amount</th>
                </tr>
                <tr>
                  <td>Fixed Deductions (PF + Tax + EPF + ESIC)</td>
                  <td class="amount-right">Rs ${(selectedDeductionRecord.fixedDeductions || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td>Absent Days Deduction (${selectedDeductionRecord.absentDays || 0} days × Rs ${(selectedDeductionRecord.perDaySalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })})</td>
                  <td class="amount-right">Rs ${(selectedDeductionRecord.absentDaysDeduction || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                </tr>
                <tr style="font-weight: bold; background: #fee2e2;">
                  <td>Total Deductions</td>
                  <td class="amount-right">Rs ${(selectedDeductionRecord.totalDeductions || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                </tr>
              </table>
            </div>

            <!-- Net Salary -->
            <table>
              <tr class="net-salary-row">
                <td>Net Salary (Take Home)</td>
                <td class="amount-right">Rs ${(selectedDeductionRecord.netSalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
              </tr>
            </table>

            <!-- Footer -->
            <div class="footer">
              <div>${exportHeader.companyName || ''} | ${exportHeader.address || ''} | ${exportHeader.contactEmail || ''}</div>
              <div>Generated on: ${new Date().toLocaleString()}</div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Open print window
      const printWindow = window.open('', 'PrintDeductionDetails', 'height=600,width=900');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    } catch (error: any) {
      console.error('[Print] Error:', error);
      toast({ title: 'Error', description: 'Failed to generate print document', variant: 'destructive' });
    }
  };

  const downloadSalarySlip = async (id: string, month: number, year: number) => {
    try {
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/salary-slip/${id}`);

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
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-blue-200">
                    <th className="px-3 py-3 text-left font-semibold text-blue-900">Month</th>
                    <th className="px-3 py-3 text-left font-semibold text-blue-900">Year</th>
                    <th className="px-3 py-3 text-right font-semibold text-blue-900">Basic</th>
                    <th className="px-3 py-3 text-right font-semibold text-blue-900">HRA</th>
                    <th className="px-3 py-3 text-right font-semibold text-blue-900">DA</th>
                    <th className="px-3 py-3 text-right font-semibold text-blue-900">Gross</th>
                    <th className="px-3 py-3 text-right font-semibold text-blue-900">Earned</th>
                    <th className="px-3 py-3 text-right font-semibold text-orange-900">Fixed Ded.</th>
                    <th className="px-3 py-3 text-right font-semibold text-orange-900">Absent Ded.</th>
                    <th className="px-3 py-3 text-right font-semibold text-red-900">Total Ded.</th>
                    <th className="px-3 py-3 text-right font-semibold text-green-900">Net Salary</th>
                    <th className="px-3 py-3 text-center font-semibold text-blue-900">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryHistory.map((item, index) => {
                    const basic = Number(item.basicSalary || 0);
                    const hra = Number(item.hra || 0);
                    const da = Number(item.da || 0);
                    const gross = Number(item.grossSalary || 0);
                    const earned = Number(item.earnedSalary || 0);
                    const fixedDeductions = Number(item.fixedDeductions || 0);
                    const absentDaysDeduction = Number(item.absentDaysDeduction || 0);
                    const totalDeductions = Number(item.totalDeductions || 0);
                    const net = Number(item.netSalary || 0);

                    return (
                      <tr key={item.id} className={`border-b transition-colors hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-3 py-3 font-medium text-gray-900">{formatMonth(item.month)}</td>
                        <td className="px-3 py-3 text-gray-600">{item.year}</td>
                        <td className="px-3 py-3 text-right text-gray-700">Rs {basic.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="px-3 py-3 text-right text-gray-700">Rs {hra.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="px-3 py-3 text-right text-gray-700">Rs {da.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="px-3 py-3 text-right font-medium text-gray-900">Rs {gross.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="px-3 py-3 text-right font-medium text-blue-700">Rs {earned.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="px-3 py-3 text-right text-orange-700" title="PF + Tax + EPF + ESIC">Rs {fixedDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="px-3 py-3 text-right text-orange-700" title="Deduction for absent days">Rs {absentDaysDeduction.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="px-3 py-3 text-right font-semibold text-red-700 bg-red-50">
                          Rs {totalDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td
                          className="px-3 py-3 text-right font-bold text-green-700 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
                          onClick={() => setSelectedDeductionRecord(item)}
                          title="Click to see deduction details"
                        >
                          Rs {net.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs"
                            onClick={() => downloadSalarySlip(item.id, item.month, item.year)}
                          >
                            <Download className="h-3 w-3" />
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

      {/* Deduction Details Modal */}
      {selectedDeductionRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b sticky top-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-gray-800">
                  Deduction Details - {formatMonth(selectedDeductionRecord.month)} {selectedDeductionRecord.year}
                </CardTitle>
                <button
                  onClick={() => setSelectedDeductionRecord(null)}
                  className="text-gray-600 hover:text-gray-900 text-2xl"
                >
                  ×
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Attendance Details */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-4">📋 Attendance Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-white rounded border border-blue-100">
                    <div className="text-2xl font-bold text-green-600">{selectedDeductionRecord.presentDays || 0}</div>
                    <div className="text-xs text-gray-600">Present Days</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded border border-blue-100">
                    <div className="text-2xl font-bold text-orange-600">{selectedDeductionRecord.absentDays || 0}</div>
                    <div className="text-xs text-gray-600">Absent Days</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded border border-blue-100">
                    <div className="text-2xl font-bold text-yellow-600">{selectedDeductionRecord.halfDays || 0}</div>
                    <div className="text-xs text-gray-600">Half Days</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded border border-blue-100">
                    <div className="text-2xl font-bold text-purple-600">{selectedDeductionRecord.leaveDays || 0}</div>
                    <div className="text-xs text-gray-600">Leave Days</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded border border-blue-100">
                    <div className="text-2xl font-bold text-red-600">{selectedDeductionRecord.sundays || 0}</div>
                    <div className="text-xs text-gray-600">Sundays</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded border border-blue-100">
                    <div className="text-2xl font-bold text-pink-600">{selectedDeductionRecord.holidays || 0}</div>
                    <div className="text-xs text-gray-600">Holidays</div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white rounded border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-semibold">Working Days:</span>
                    <span className="text-xl font-bold text-blue-700">{Number(selectedDeductionRecord.workingDays || 0).toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Salary Calculation */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-900 mb-4">💰 Salary Calculation</h3>
                <div className="space-y-2">
                  {/* Per Day Salary Calculation */}
                  <div className="p-3 bg-white rounded border border-green-100">
                    <div className="text-sm text-gray-600 mb-2">Per Day Salary Calculation:</div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Gross Salary ÷ Total Days in Month</span>
                      <span className="font-semibold">Rs {(selectedDeductionRecord.grossSalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ÷ {selectedDeductionRecord.totalDays || 0} days</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-green-200 flex justify-between">
                      <span className="text-gray-700 font-semibold">Per Day Salary:</span>
                      <span className="text-lg font-bold text-green-700">Rs {(selectedDeductionRecord.perDaySalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Earned Salary Calculation */}
                  <div className="p-3 bg-white rounded border border-green-100">
                    <div className="text-sm text-gray-600 mb-2">Earned Salary Calculation:</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">Working Days:</span>
                        <span className="font-semibold">{(selectedDeductionRecord.workingDays || 0).toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">+ Holidays:</span>
                        <span className="font-semibold">+ {selectedDeductionRecord.holidays || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">+ Sundays:</span>
                        <span className="font-semibold">+ {selectedDeductionRecord.sundays || 0}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-blue-300 font-semibold">
                        <span className="text-gray-700">Salary Days (Total Paid Days):</span>
                        <span className="text-blue-700">{(selectedDeductionRecord.workingDays || 0) + (selectedDeductionRecord.holidays || 0) + (selectedDeductionRecord.sundays || 0)}</span>
                      </div>
                    </div>
                    <div className="mt-3 p-2 bg-blue-50 rounded border-t-2 border-green-200">
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-gray-700">Per Day Salary × Salary Days</span>
                        <span className="font-semibold">Rs {(selectedDeductionRecord.perDaySalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} × {((selectedDeductionRecord.workingDays || 0) + (selectedDeductionRecord.holidays || 0) + (selectedDeductionRecord.sundays || 0)).toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-green-300">
                        <span className="text-gray-700 font-semibold">Earned Salary:</span>
                        <span className="text-lg font-bold text-green-700">Rs {(selectedDeductionRecord.earnedSalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deduction Breakdown */}
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-900 mb-4">📉 Deduction Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-white rounded">
                    <span className="text-gray-700">Fixed Deductions (PF + Tax + EPF + ESIC):</span>
                    <span className="font-semibold text-orange-700">Rs {(selectedDeductionRecord.fixedDeductions || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded">
                    <span className="text-gray-700">Absent Days Deduction:</span>
                    <span className="text-xs text-gray-600 ml-2">({selectedDeductionRecord.absentDays} days × Rs {(selectedDeductionRecord.perDaySalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })})</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded">
                    <span className="text-gray-700 font-semibold">Absent Days Deduction:</span>
                    <span className="font-semibold text-orange-700">Rs {(selectedDeductionRecord.absentDaysDeduction || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-red-100 rounded border-t-2 border-red-300 font-semibold">
                    <span className="text-red-900">Total Deductions:</span>
                    <span className="text-lg text-red-700">Rs {(selectedDeductionRecord.totalDeductions || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>

              {/* Net Salary */}
              <div className="bg-gradient-to-r from-green-100 to-green-50 p-4 rounded-lg border-2 border-green-300">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-green-900">Net Salary (Take Home):</span>
                  <span className="text-3xl font-bold text-green-700">Rs {(selectedDeductionRecord.netSalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={printDeductionDetails}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button
                  onClick={() => setSelectedDeductionRecord(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
