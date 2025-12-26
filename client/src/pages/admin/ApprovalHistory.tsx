import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ChevronLeft, ChevronRight, Filter, Download, Printer, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fetchExportHeader } from '@/lib/exportUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AllowanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  teamId: string;
  teamName: string;
  date: string;
  allowanceData: string;
  approvalStatus: 'approved' | 'rejected' | 'pending' | 'processing';
  approvalCount?: number;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  submittedAt?: string;
  createdAt?: string;
}

interface Employee {
  id: string;
  name: string;
}

const STATUS_OPTIONS = ['pending', 'processing', 'approved', 'rejected'] as const;
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function ApprovalHistory() {
    // Role-based access control
    const employeeRole = localStorage.getItem('employeeRole')?.toLowerCase() || '';
    const isSuperAdmin = employeeRole === 'superadmin';
    const isAdmin = employeeRole === 'admin';
    const isAllowed = isSuperAdmin || isAdmin;
    if (!isAllowed) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="max-w-md w-full bg-white shadow rounded p-8">
            <h2 className="text-xl font-bold mb-2">Not Authorized</h2>
            <p className="mb-4">You do not have permission to view this page.</p>
            <Button variant="outline" onClick={() => window.location.href = '/'}>Go to Dashboard</Button>
          </div>
        </div>
      );
    }
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AllowanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId] = useState(localStorage.getItem('employeeId') || '');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set(STATUS_OPTIONS));
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [requiredApprovals, setRequiredApprovals] = useState(1);
  
  // History dialog states
  const [selectedRecord, setSelectedRecord] = useState<AllowanceRecord | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [approverNames, setApproverNames] = useState<{ [key: string]: string }>({});

  // Access control
  useEffect(() => {
    const isReportingPerson = localStorage.getItem('isReportingPerson') === 'true';
    const employeeRole = localStorage.getItem('employeeRole');
    const isAdmin = employeeRole !== 'user';
    
    if (!isAdmin && !isReportingPerson) {
      console.log('[ApprovalHistory] Access denied - redirecting to dashboard');
      setLocation('/employee/dashboard');
      return;
    }
    console.log('[ApprovalHistory] Access granted - isAdmin:', isAdmin, 'isReportingPerson:', isReportingPerson);
  }, [setLocation]);

  // Initialize date range to current month
  useEffect(() => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth);
    const firstDay = new Date(year, month - 1, 1);
    // Get last day of the month by going to first day of next month and subtracting 1 day
    const lastDay = new Date(year, month, 0);
    
    console.log('[ApprovalHistory] Calculated dates - Month:', month, 'Year:', year);
    console.log('[ApprovalHistory] First day:', firstDay.toISOString());
    console.log('[ApprovalHistory] Last day:', lastDay.toISOString());
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, [selectedMonth, selectedYear]);

  // Fetch app settings
  useEffect(() => {
    const fetchAppSettings = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/app-settings`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setRequiredApprovals(data.approvalsRequiredForAllowance || 1);
        }
      } catch (error) {
        console.error('Error fetching app settings:', error);
      }
    };
    fetchAppSettings();
  }, []);

  // Fetch all allowance records
  useEffect(() => {
    fetchApprovalHistory();
  }, [selectedMonth, selectedYear]);

  // Fetch employees list on mount - with role-based filtering
  useEffect(() => {
    const fetchEmployeeList = async () => {
      const employeeRole = localStorage.getItem('employeeRole');
      const isAdmin = employeeRole !== 'user';
      const isReportingPerson = localStorage.getItem('isReportingPerson') === 'true';
      const storedEmployeeId = localStorage.getItem('employeeId');
      
      console.log('[ApprovalHistory] fetchEmployeeList - isAdmin:', isAdmin, 'isReportingPerson:', isReportingPerson, 'employeeId:', storedEmployeeId);
      
      if (isAdmin) {
        // Admin can see ALL employees in the system
        try {
          console.log('[ApprovalHistory] Fetching all employees from API');
          const response = await fetch(`${getApiBaseUrl()}/api/employees?page=1&pageSize=500`, { credentials: 'include' });
          if (response.ok) {
            const data = await response.json();
            console.log('[ApprovalHistory] All employees from API:', data);
            const allEmployees = (data.data || [])
              .filter((e: any) => e.email !== 'superadmin@eoms.local')
              .map((e: any) => ({ id: e.id, name: e.name }));
            console.log('[ApprovalHistory] Filtered employees for admin:', allEmployees);
            console.table(allEmployees);
            setEmployees(allEmployees);
          } else {
            console.error('[ApprovalHistory] Failed to fetch employees, status:', response.status);
          }
        } catch (error) {
          console.error('[ApprovalHistory] Failed to fetch all employees:', error);
        }
      } else if (isReportingPerson || employeeRole === 'user') {
        // For reporting person or regular employee - fetch their team members from allowances
        try {
          console.log('[ApprovalHistory] Fetching team members for non-admin user');
          const url = `${getApiBaseUrl()}/api/allowances/pending?employeeId=${storedEmployeeId}`;
          const response = await fetch(url, { credentials: 'include' });
          if (response.ok) {
            const data = await response.json();
            const teamRecords = data.data || [];
            console.log('[ApprovalHistory] Team records fetched:', teamRecords);
            
            // Extract unique team members
            const teamMembers = Array.from(
              new Map(teamRecords.map((r: any) => [r.employeeId, { id: r.employeeId, name: r.employeeName }])).values()
            );
            console.log('[ApprovalHistory] Team members extracted:', teamMembers);
            console.table(teamMembers);
            setEmployees(teamMembers as Employee[]);
          } else {
            console.error('[ApprovalHistory] Failed to fetch team members, status:', response.status);
          }
        } catch (error) {
          console.error('[ApprovalHistory] Failed to fetch team members:', error);
        }
      }
    };
    
    fetchEmployeeList();
  }, []);

  const fetchApprovalHistory = async () => {
    setLoading(true);
    try {
      const employeeRole = localStorage.getItem('employeeRole');
      const isAdmin = employeeRole !== 'user';
      const isReportingPerson = localStorage.getItem('isReportingPerson') === 'true';
      
      let url: string;
      if (isAdmin) {
        // Admin sees ALL allowances from all employees (all statuses)
        url = `${getApiBaseUrl()}/api/allowances/all`;
      } else if (isReportingPerson && employeeId) {
        // Reporting person sees team members' allowances
        url = `${getApiBaseUrl()}/api/allowances/pending?employeeId=${employeeId}`;
      } else if (employeeId) {
        // Regular employee sees only their own allowances
        url = `${getApiBaseUrl()}/api/allowances/${employeeId}?month=${selectedMonth}&year=${selectedYear}`;
      } else {
        return;
      }
      
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const allRecords = data.data || [];
        
        // Filter by month/year if needed (only for non-admins or for date filtering)
        const filtered = allRecords.filter((record: AllowanceRecord) => {
          const recordDate = new Date(record.date);
          const recordMonth = String(recordDate.getMonth() + 1).padStart(2, '0');
          const recordYear = String(recordDate.getFullYear());
          const matchesDate = (isAdmin)
            ? recordMonth === selectedMonth && recordYear === selectedYear
            : (isReportingPerson ? recordMonth === selectedMonth && recordYear === selectedYear : true);
          return matchesDate;
        });
        
        setRecords(filtered);
      } else {
        toast({ title: "Error", description: "Failed to fetch approval history", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to fetch history", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch approver names from IDs
  const fetchApproverNames = async (approverIds: string[]) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/employees?page=1&pageSize=500`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const allEmployees = data.data || [];
        const nameMap: { [key: string]: string } = {};
        approverIds.forEach(id => {
          const emp = allEmployees.find((e: any) => e.id === id);
          if (emp) {
            nameMap[id] = emp.name;
          }
        });
        setApproverNames(nameMap);
      }
    } catch (error) {
      console.error('Failed to fetch approver names:', error);
    }
  };

  // Handle row click to show history
  const handleRecordClick = async (record: AllowanceRecord) => {
    setSelectedRecord(record);
    setShowHistoryDialog(true);
    
    // Fetch approver names if we have approvers
    if (record.approvedBy) {
      try {
        const approvers = JSON.parse(record.approvedBy);
        if (Array.isArray(approvers) && approvers.length > 0) {
          await fetchApproverNames(approvers);
        }
      } catch (e) {
        console.error('Failed to parse approvedBy:', e);
      }
    }
  };

  // Export single record history to PDF
  const handleExportRecordPDF = async () => {
    if (!selectedRecord) return;
    
    setExporting(true);
    try {
      const header = await fetchExportHeader();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;
      
      // Add company header
      doc.setFillColor(102, 126, 234);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(header.companyName || 'Enterprise Operations Management System (EOMS)', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 7;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (header.address) {
        doc.text(header.address, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
      if (header.contactEmail || header.contactPhone) {
        doc.text([header.contactEmail, header.contactPhone].filter(Boolean).join(' | '), pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
      if (header.gstin || header.website) {
        doc.text([header.gstin ? `GSTIN: ${header.gstin}` : '', header.website].filter(Boolean).join(' | '), pageWidth / 2, yPos, { align: 'center' });
      }
      
      // Report Title
      yPos = 45;
      doc.setTextColor(44, 62, 80);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Allowance Approval History', pageWidth / 2, yPos, { align: 'center' });
      
      // Employee and allowance details
      let allowanceObj: any = {};
      try {
        allowanceObj = JSON.parse(selectedRecord.allowanceData);
      } catch (e) {
        console.error('Failed to parse allowance data:', e);
      }
      
      const total = (
        (allowanceObj.travelAllowance || 0) +
        (allowanceObj.foodAllowance || 0) +
        (allowanceObj.accommodationAllowance || 0) +
        (allowanceObj.mobileAllowance || 0) +
        (allowanceObj.internetAllowance || 0) +
        (allowanceObj.utilitiesAllowance || 0) +
        (allowanceObj.parkingAllowance || 0) +
        (allowanceObj.miscAllowance || 0)
      ).toFixed(2);
      
      // Employee and Record Details
      yPos = 55;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      doc.text(`Employee: ${selectedRecord.employeeName}`, 15, yPos);
      yPos += 6;
      doc.text(`Email: ${selectedRecord.employeeEmail}`, 15, yPos);
      yPos += 6;
      doc.text(`Team: ${selectedRecord.teamName || '—'}`, 15, yPos);
      yPos += 6;
      doc.text(`Date: ${new Date(selectedRecord.date).toLocaleDateString()}`, 15, yPos);
      yPos += 6;
      doc.text(`Total Amount: Rs ${total}`, 15, yPos);
      yPos += 10;
      
      // Timeline section
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Approval Timeline', 15, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Submission
      const submittedDate = selectedRecord.submittedAt || selectedRecord.createdAt || selectedRecord.date;
      doc.setFont('helvetica', 'bold');
      doc.text('• Submitted:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(submittedDate).toLocaleString(), 50, yPos);
      yPos += 8;
      
      // Approvals
      if (selectedRecord.approvedBy) {
        try {
          const approvers = JSON.parse(selectedRecord.approvedBy);
          if (Array.isArray(approvers) && approvers.length > 0) {
            approvers.forEach((approverId, index) => {
              const approverName = approverNames[approverId] || `Approver ${index + 1}`;
              doc.setFont('helvetica', 'bold');
              doc.text(`• Approval ${index + 1}:`, 20, yPos);
              doc.setFont('helvetica', 'normal');
              doc.text(`${approverName}`, 50, yPos);
              yPos += 6;
              if (selectedRecord.approvedAt && index === approvers.length - 1) {
                doc.text(`  ${new Date(selectedRecord.approvedAt).toLocaleString()}`, 50, yPos);
                yPos += 8;
              } else {
                yPos += 2;
              }
            });
          }
        } catch (e) {
          console.error('Failed to parse approvers:', e);
        }
      }
      
      // Final status
      doc.setFont('helvetica', 'bold');
      doc.text('• Final Status:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      const statusText = selectedRecord.approvalStatus.charAt(0).toUpperCase() + selectedRecord.approvalStatus.slice(1);
      doc.text(statusText, 50, yPos);
      yPos += 6;
      
      if (selectedRecord.rejectionReason) {
        doc.text('  Reason: ' + selectedRecord.rejectionReason, 50, yPos);
        yPos += 6;
      }
      
      // Allowance breakdown table
      yPos += 5;
      const tableData = [
        ['Travel Allowance', `Rs ${(allowanceObj.travelAllowance || 0).toFixed(2)}`],
        ['Food Allowance', `Rs ${(allowanceObj.foodAllowance || 0).toFixed(2)}`],
        ['Accommodation Allowance', `Rs ${(allowanceObj.accommodationAllowance || 0).toFixed(2)}`],
        ['Mobile Allowance', `Rs ${(allowanceObj.mobileAllowance || 0).toFixed(2)}`],
        ['Internet Allowance', `Rs ${(allowanceObj.internetAllowance || 0).toFixed(2)}`],
        ['Utilities Allowance', `Rs ${(allowanceObj.utilitiesAllowance || 0).toFixed(2)}`],
        ['Parking Allowance', `Rs ${(allowanceObj.parkingAllowance || 0).toFixed(2)}`],
        ['Miscellaneous', `Rs ${(allowanceObj.miscAllowance || 0).toFixed(2)}`],
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [['Allowance Type', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 98, 255], textColor: 255 },
        styles: { fontSize: 9 },
      });
      
      doc.save(`Allowance_History_${selectedRecord.employeeName}_${new Date(selectedRecord.date).toLocaleDateString().replace(/\//g, '-')}.pdf`);
      
      toast({ title: "Success", description: "PDF exported successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to export PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // Print single record history
  const handlePrintRecord = async () => {
    if (!selectedRecord) return;
    
    setPrinting(true);
    
    try {
      const exportHeader = await fetchExportHeader();
      
      let allowanceObj: any = {};
      try {
        allowanceObj = JSON.parse(selectedRecord.allowanceData);
      } catch (e) {
        console.error('Failed to parse allowance data:', e);
      }
      
      const total = (
        (allowanceObj.travelAllowance || 0) +
        (allowanceObj.foodAllowance || 0) +
        (allowanceObj.accommodationAllowance || 0) +
        (allowanceObj.mobileAllowance || 0) +
        (allowanceObj.internetAllowance || 0) +
        (allowanceObj.utilitiesAllowance || 0) +
        (allowanceObj.parkingAllowance || 0) +
        (allowanceObj.miscAllowance || 0)
      ).toFixed(2);
      
      const submittedDate = selectedRecord.submittedAt || selectedRecord.createdAt || selectedRecord.date;
      
      let approversHtml = '';
      if (selectedRecord.approvedBy) {
        try {
          const approvers = JSON.parse(selectedRecord.approvedBy);
          if (Array.isArray(approvers) && approvers.length > 0) {
            approvers.forEach((approverId, index) => {
              const approverName = approverNames[approverId] || `Approver ${index + 1}`;
              approversHtml += `
                <div style="margin: 8px 0; padding-left: 20px;">
                  <strong>• Approval ${index + 1}:</strong> ${approverName}
                  ${selectedRecord.approvedAt && index === approvers.length - 1 ? `<br/>&nbsp;&nbsp;${new Date(selectedRecord.approvedAt).toLocaleString()}` : ''}
                </div>
              `;
            });
          }
        } catch (e) {
          console.error('Failed to parse approvers:', e);
        }
      }
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({ title: "Error", description: "Failed to open print window", variant: "destructive" });
        setPrinting(false);
        return;
      }
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Allowance History - ${selectedRecord.employeeName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
            .header { text-align: center; margin-bottom: 30px; padding: 25px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
            .header h1 { margin: 0 0 10px 0; font-size: 28px; font-weight: bold; }
            .header-info { font-size: 11px; margin: 3px 0; }
            .report-title { text-align: center; margin: 20px 0; font-size: 20px; font-weight: bold; color: #2c3e50; }
            .details { margin: 20px 0; }
            .details-row { margin: 8px 0; }
            .timeline { margin: 20px 0; }
            .timeline-item { margin: 12px 0; padding-left: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #667eea; color: white; }
            .total-row { font-weight: bold; background-color: #f0f0f0; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${exportHeader.companyName || 'Enterprise Management System'}</h1>
            ${exportHeader.address ? `<div class="header-info">${exportHeader.address}</div>` : ''}
            ${exportHeader.contactEmail || exportHeader.contactPhone ? `<div class="header-info">${[exportHeader.contactEmail, exportHeader.contactPhone].filter(Boolean).join(' | ')}</div>` : ''}
            ${exportHeader.gstin || exportHeader.website ? `<div class="header-info">${[exportHeader.gstin ? `GSTIN: ${exportHeader.gstin}` : '', exportHeader.website].filter(Boolean).join(' | ')}</div>` : ''}
          </div>
          
          <div class="report-title">Allowance Approval History</div>
          
          <div class="details">
            <div class="details-row"><strong>Employee:</strong> ${selectedRecord.employeeName}</div>
            <div class="details-row"><strong>Email:</strong> ${selectedRecord.employeeEmail}</div>
            <div class="details-row"><strong>Team:</strong> ${selectedRecord.teamName || '—'}</div>
            <div class="details-row"><strong>Date:</strong> ${new Date(selectedRecord.date).toLocaleDateString()}</div>
            <div class="details-row"><strong>Total Amount:</strong> Rs ${total}</div>
          </div>
          
          <div class="timeline">
            <h3>Approval Timeline</h3>
            <div class="timeline-item">
              <strong>• Submitted:</strong> ${new Date(submittedDate).toLocaleString()}
            </div>
            ${approversHtml}
            <div class="timeline-item">
              <strong>• Final Status:</strong> ${selectedRecord.approvalStatus.charAt(0).toUpperCase() + selectedRecord.approvalStatus.slice(1)}
              ${selectedRecord.rejectionReason ? `<br/>&nbsp;&nbsp;Reason: ${selectedRecord.rejectionReason}` : ''}
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Allowance Type</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Travel Allowance</td><td>Rs ${(allowanceObj.travelAllowance || 0).toFixed(2)}</td></tr>
              <tr><td>Food Allowance</td><td>Rs ${(allowanceObj.foodAllowance || 0).toFixed(2)}</td></tr>
              <tr><td>Accommodation Allowance</td><td>Rs ${(allowanceObj.accommodationAllowance || 0).toFixed(2)}</td></tr>
              <tr><td>Mobile Allowance</td><td>Rs ${(allowanceObj.mobileAllowance || 0).toFixed(2)}</td></tr>
              <tr><td>Internet Allowance</td><td>Rs ${(allowanceObj.internetAllowance || 0).toFixed(2)}</td></tr>
              <tr><td>Utilities Allowance</td><td>Rs ${(allowanceObj.utilitiesAllowance || 0).toFixed(2)}</td></tr>
              <tr><td>Parking Allowance</td><td>Rs ${(allowanceObj.parkingAllowance || 0).toFixed(2)}</td></tr>
              <tr><td>Miscellaneous</td><td>Rs ${(allowanceObj.miscAllowance || 0).toFixed(2)}</td></tr>
              <tr class="total-row"><td>Total</td><td>Rs ${total}</td></tr>
            </tbody>
          </table>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      
      toast({ title: "Success", description: "Opening print dialog..." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to print", variant: "destructive" });
    } finally {
      setPrinting(false);
    }
  };

  // Export all filtered records to PDF
  const handleBulkExportPDF = async () => {
    if (filteredRecords.length === 0) {
      toast({ title: "No Records", description: "No records to export", variant: "destructive" });
      return;
    }
    
    setExporting(true);
    try {
      const header = await fetchExportHeader();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;
      
      // Add company header
      doc.setFillColor(102, 126, 234);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(header.companyName || 'Enterprise Management System', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 7;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (header.address) {
        doc.text(header.address, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
      if (header.contactEmail || header.contactPhone) {
        doc.text([header.contactEmail, header.contactPhone].filter(Boolean).join(' | '), pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
      if (header.gstin || header.website) {
        doc.text([header.gstin ? `GSTIN: ${header.gstin}` : '', header.website].filter(Boolean).join(' | '), pageWidth / 2, yPos, { align: 'center' });
      }
      
      // Report Title
      yPos = 45;
      doc.setTextColor(44, 62, 80);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Approval History Report', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Period: ${monthName}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.text(`Total Records: ${filteredRecords.length}`, pageWidth / 2, yPos, { align: 'center' });
      
      // Prepare table data
      const tableData = filteredRecords.map(record => {
        let allowanceObj: any = {};
        try {
          allowanceObj = JSON.parse(record.allowanceData);
        } catch (e) {
          console.error('Failed to parse allowance data:', e);
        }
        
        const total = (
          (allowanceObj.travelAllowance || 0) +
          (allowanceObj.foodAllowance || 0) +
          (allowanceObj.accommodationAllowance || 0) +
          (allowanceObj.mobileAllowance || 0) +
          (allowanceObj.internetAllowance || 0) +
          (allowanceObj.utilitiesAllowance || 0) +
          (allowanceObj.parkingAllowance || 0) +
          (allowanceObj.miscAllowance || 0)
        ).toFixed(2);
        
        const approvalCount = record.approvalCount || 0;
        const savedStatus = record.approvalStatus;
        const maxApprovals = (record as any).requiredApprovals || requiredApprovals;
        
        let displayStatus: string;
        if (savedStatus && (savedStatus === 'approved' || savedStatus === 'rejected')) {
          displayStatus = savedStatus;
        } else {
          if (approvalCount >= maxApprovals && maxApprovals > 0) {
            displayStatus = 'approved';
          } else if (approvalCount > 0) {
            displayStatus = 'processing';
          } else {
            displayStatus = 'pending';
          }
        }
        
        return [
          new Date(record.date).toLocaleDateString(),
          record.employeeName,
          record.teamName || '—',
          `Rs ${total}`,
          displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1),
          `${approvalCount}/${maxApprovals}`,
        ];
      });
      
      autoTable(doc, {
        startY: yPos + 5,
        head: [['Date', 'Employee', 'Team', 'Amount', 'Status', 'Approvals']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 50 },
          2: { cellWidth: 30 },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 28 },
          5: { cellWidth: 20, halign: 'center' },
        },
      });
      
      doc.save(`Approval_History_${monthName.replace(/\s/g, '_')}.pdf`);
      
      toast({ title: "Success", description: "PDF exported successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to export PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // Print all filtered records
  const handleBulkPrint = async () => {
    if (filteredRecords.length === 0) {
      toast({ title: "No Records", description: "No records to print", variant: "destructive" });
      return;
    }
    
    setPrinting(true);
    
    try {
      const exportHeader = await fetchExportHeader();
      
      let tableRows = '';
      filteredRecords.forEach(record => {
        let allowanceObj: any = {};
        try {
          allowanceObj = JSON.parse(record.allowanceData);
        } catch (e) {
          console.error('Failed to parse allowance data:', e);
        }
        
        const total = (
          (allowanceObj.travelAllowance || 0) +
          (allowanceObj.foodAllowance || 0) +
          (allowanceObj.accommodationAllowance || 0) +
          (allowanceObj.mobileAllowance || 0) +
          (allowanceObj.internetAllowance || 0) +
          (allowanceObj.utilitiesAllowance || 0) +
          (allowanceObj.parkingAllowance || 0) +
          (allowanceObj.miscAllowance || 0)
        ).toFixed(2);
        
        const approvalCount = record.approvalCount || 0;
        const savedStatus = record.approvalStatus;
        const maxApprovals = (record as any).requiredApprovals || requiredApprovals;
        
        let displayStatus: string;
        if (savedStatus && (savedStatus === 'approved' || savedStatus === 'rejected')) {
          displayStatus = savedStatus;
        } else {
          if (approvalCount >= maxApprovals && maxApprovals > 0) {
            displayStatus = 'approved';
          } else if (approvalCount > 0) {
            displayStatus = 'processing';
          } else {
            displayStatus = 'pending';
          }
        }
        
        const statusColor = 
          displayStatus === 'approved' ? '#10b981' :
          displayStatus === 'rejected' ? '#ef4444' :
          displayStatus === 'processing' ? '#3b82f6' :
          '#eab308';
        
        tableRows += `
          <tr>
            <td>${new Date(record.date).toLocaleDateString()}</td>
            <td>${record.employeeName}</td>
            <td>${record.teamName || '—'}</td>
            <td style="text-align: right;">Rs ${total}</td>
            <td style="color: ${statusColor}; font-weight: bold;">${displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}</td>
            <td style="text-align: center;">${approvalCount}/${maxApprovals}</td>
          </tr>
        `;
      });
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({ title: "Error", description: "Failed to open print window", variant: "destructive" });
        setPrinting(false);
        return;
      }
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Approval History Report - ${monthName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
            .header { text-align: center; margin-bottom: 30px; padding: 25px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
            .header h1 { margin: 0 0 10px 0; font-size: 28px; font-weight: bold; }
            .header-info { font-size: 11px; margin: 3px 0; }
            .report-title { text-align: center; margin: 20px 0; font-size: 20px; font-weight: bold; color: #2c3e50; }
            .report-info { text-align: center; margin: 10px 0; font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #667eea; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${exportHeader.companyName || 'Enterprise Management System'}</h1>
            ${exportHeader.address ? `<div class="header-info">${exportHeader.address}</div>` : ''}
            ${exportHeader.contactEmail || exportHeader.contactPhone ? `<div class="header-info">${[exportHeader.contactEmail, exportHeader.contactPhone].filter(Boolean).join(' | ')}</div>` : ''}
            ${exportHeader.gstin || exportHeader.website ? `<div class="header-info">${[exportHeader.gstin ? `GSTIN: ${exportHeader.gstin}` : '', exportHeader.website].filter(Boolean).join(' | ')}</div>` : ''}
          </div>
          
          <div class="report-title">Approval History Report</div>
          <div class="report-info">Period: ${monthName}</div>
          <div class="report-info">Total Records: ${filteredRecords.length}</div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Team</th>
                <th style="text-align: right;">Amount</th>
                <th>Status</th>
                <th style="text-align: center;">Approvals</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      
      toast({ title: "Success", description: "Opening print dialog..." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to print", variant: "destructive" });
    } finally {
      setPrinting(false);
    }
  };


  // Apply filters to records
  const filteredRecords = useMemo(() => {
    return records.filter((record: AllowanceRecord) => {
      const approvalCount = record.approvalCount || 0;
      const savedStatus = record.approvalStatus;
      // Use locked requiredApprovals if set, otherwise use current setting
      const maxApprovals = (record as any).requiredApprovals || requiredApprovals;
      
      // For finalized records (saved approved/rejected status), use the saved database value
      // For non-finalized records (pending/processing), compute dynamically
      let displayStatus: string;
      if (savedStatus && (savedStatus === 'approved' || savedStatus === 'rejected')) {
        // Finalized - use saved database status
        displayStatus = savedStatus;
      } else {
        // Non-finalized - compute based on current approval count vs locked max
        if (approvalCount >= maxApprovals && maxApprovals > 0) {
          displayStatus = 'approved';
        } else if (approvalCount > 0) {
          displayStatus = 'processing';
        } else {
          displayStatus = 'pending';
        }
      }
      
      // Status filter
      if (!selectedStatuses.has(displayStatus)) {
        return false;
      }
      
      // Employee filter
      if (selectedEmployees.size > 0 && !selectedEmployees.has(record.employeeId)) {
        return false;
      }
      
      // Date range filter
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      if (startDate && recordDate < startDate) {
        return false;
      }
      if (endDate && recordDate > endDate) {
        return false;
      }
      
      return true;
    });
  }, [records, selectedStatuses, selectedEmployees, startDate, endDate]);

  const handlePreviousMonth = () => {
    let month = parseInt(selectedMonth);
    let year = parseInt(selectedYear);
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
    setSelectedMonth(String(month).padStart(2, '0'));
    setSelectedYear(String(year));
  };

  const handleNextMonth = () => {
    let month = parseInt(selectedMonth);
    let year = parseInt(selectedYear);
    month++;
    if (month === 13) {
      month = 1;
      year++;
    }
    setSelectedMonth(String(month).padStart(2, '0'));
    setSelectedYear(String(year));
  };

  const toggleEmployee = (empId: string) => {
    const newSet = new Set(selectedEmployees);
    if (newSet.has(empId)) {
      newSet.delete(empId);
    } else {
      newSet.add(empId);
    }
    setSelectedEmployees(newSet);
  };

  const toggleStatus = (status: string) => {
    const newSet = new Set(selectedStatuses);
    if (newSet.has(status)) {
      newSet.delete(status);
    } else {
      newSet.add(status);
    }
    setSelectedStatuses(newSet);
  };

  const stats = {
    pending: filteredRecords.filter(r => {
      const approvalCount = r.approvalCount || 0;
      const savedStatus = r.approvalStatus;
      // Only count as pending if not finalized (not approved/rejected)
      if (savedStatus === 'approved' || savedStatus === 'rejected') {
        return false;
      }
      return approvalCount === 0;
    }).length,
    processing: filteredRecords.filter(r => {
      const approvalCount = r.approvalCount || 0;
      const savedStatus = r.approvalStatus;
      const maxApprovals = (r as any).requiredApprovals || requiredApprovals;
      // Only count as processing if not finalized (not approved/rejected)
      if (savedStatus === 'approved' || savedStatus === 'rejected') {
        return false;
      }
      return approvalCount > 0 && approvalCount < maxApprovals;
    }).length,
    approved: filteredRecords.filter(r => {
      const savedStatus = r.approvalStatus;
      const approvalCount = r.approvalCount || 0;
      const maxApprovals = (r as any).requiredApprovals || requiredApprovals;
      if (savedStatus && savedStatus === 'approved') {
        return true;
      }
      return !savedStatus && approvalCount >= maxApprovals && maxApprovals > 0;
    }).length,
    rejected: filteredRecords.filter(r => {
      const savedStatus = r.approvalStatus;
      return savedStatus && savedStatus === 'rejected';
    }).length,
  };

  const monthName = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading) {
    return <SkeletonLoader type="list" count={5} />;
  }

  return (
    <div className="space-y-4">
      <div className="pb-1">
        <h2 className="text-2xl font-bold">Approval History</h2>
        <p className="text-xs text-muted-foreground mt-0.5">View all allowances with complete workflow history</p>
      </div>

      {/* Month Navigation */}
      <Card className="shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <button onClick={handlePreviousMonth} className="p-1 hover:bg-gray-100 rounded" data-testid="button-prev-month">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center flex-1">
              <p className="text-sm font-semibold">{monthName}</p>
            </div>
            <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded" data-testid="button-next-month">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Status Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-yellow-600" data-testid="text-pending-count">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Processing</p>
            <p className="text-2xl font-bold text-blue-600" data-testid="text-processing-count">{stats.processing}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-green-600" data-testid="text-approved-count">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold text-red-600" data-testid="text-rejected-count">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-semibold hover:opacity-80 transition"
            data-testid="button-toggle-filters"
          >
            <Filter className="h-4 w-4" />
            Advanced Filters {showFilters ? '▼' : '▶'}
          </button>

          {showFilters && (
            <div className="mt-4 space-y-4">
              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold block">Date Range</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">From</p>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      data-testid="input-start-date"
                      className="text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">To</p>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      data-testid="input-end-date"
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold block">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map(status => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedStatuses.has(status)}
                        onCheckedChange={() => toggleStatus(status)}
                        data-testid={`checkbox-status-${status}`}
                      />
                      <span className="text-sm capitalize">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Employee Filter */}
              {employees.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold block">Employees</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                    {employees.map(emp => (
                      <label key={emp.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedEmployees.has(emp.id)}
                          onCheckedChange={() => toggleEmployee(emp.id)}
                          data-testid={`checkbox-employee-${emp.id}`}
                        />
                        <span className="text-sm truncate">{emp.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export and Print Buttons */}
      {filteredRecords.length > 0 && (
        <div className="flex gap-2">
          <Button
            onClick={handleBulkExportPDF}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2"
            variant="default"
          >
            {exporting ? (
              <>
                <span className="animate-spin">⏳</span>
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export All to PDF
              </>
            )}
          </Button>
          <Button
            onClick={handleBulkPrint}
            disabled={printing}
            className="flex-1 flex items-center justify-center gap-2"
            variant="outline"
          >
            {printing ? (
              <>
                <span className="animate-spin">⏳</span>
                Printing...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4" />
                Print All
              </>
            )}
          </Button>
        </div>
      )}

      {/* Records List */}
      {filteredRecords.length === 0 && (
        <Card className="shadow-sm border-dashed">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">No records match the selected filters</p>
          </CardContent>
        </Card>
      )}

      {filteredRecords.length > 0 && (
        <div className="space-y-2">
          {filteredRecords.map((record) => {
            let allowanceObj: any = {};
            try {
              allowanceObj = JSON.parse(record.allowanceData);
            } catch (e) {
              console.error('Failed to parse allowance data:', e);
            }

            const total = (
              (allowanceObj.travelAllowance || 0) +
              (allowanceObj.foodAllowance || 0) +
              (allowanceObj.accommodationAllowance || 0) +
              (allowanceObj.mobileAllowance || 0) +
              (allowanceObj.internetAllowance || 0) +
              (allowanceObj.utilitiesAllowance || 0) +
              (allowanceObj.parkingAllowance || 0) +
              (allowanceObj.miscAllowance || 0)
            ).toFixed(2);

            const approvalCount = record.approvalCount || 0;
            const savedStatus = record.approvalStatus;
            // Use locked requiredApprovals if set, otherwise use current setting
            const maxApprovals = (record as any).requiredApprovals || requiredApprovals;
            
            // For finalized records (saved approved/rejected status), show the saved database value
            // For non-finalized records (pending/processing), compute dynamically
            let displayStatus: string;
            if (savedStatus && (savedStatus === 'approved' || savedStatus === 'rejected')) {
              // Finalized - use saved database status
              displayStatus = savedStatus;
            } else {
              // Non-finalized - compute based on current approval count vs locked max
              if (approvalCount >= maxApprovals && maxApprovals > 0) {
                displayStatus = 'approved';
              } else if (approvalCount > 0) {
                displayStatus = 'processing';
              } else {
                displayStatus = 'pending';
              }
            }
            
            const statusBg = STATUS_COLORS[displayStatus as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800';

            return (
              <Card 
                key={record.id} 
                className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleRecordClick(record)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b">
                    <div>
                      <p className="text-xs text-muted-foreground">Employee</p>
                      <p className="text-sm font-semibold">{record.employeeName}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded font-semibold ${statusBg}`} data-testid={`status-${record.id}`}>
                      {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                      {approvalCount > 0 ? ` (${approvalCount}/${maxApprovals})` : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p className="font-semibold">{new Date(record.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Team</p>
                      <p className="font-semibold">{record.teamName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-semibold text-green-600">Rs {total}</p>
                    </div>
                  </div>
                  {record.rejectionReason && (
                    <div className="mt-2 text-xs bg-red-50 p-2 rounded border border-red-200">
                      <p className="text-muted-foreground">Rejection Reason:</p>
                      <p className="text-red-700">{record.rejectionReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* History Detail Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Approval History Details</span>
              <button 
                onClick={() => setShowHistoryDialog(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecord && (() => {
            let allowanceObj: any = {};
            try {
              allowanceObj = JSON.parse(selectedRecord.allowanceData);
            } catch (e) {
              console.error('Failed to parse allowance data:', e);
            }
            
            const total = (
              (allowanceObj.travelAllowance || 0) +
              (allowanceObj.foodAllowance || 0) +
              (allowanceObj.accommodationAllowance || 0) +
              (allowanceObj.mobileAllowance || 0) +
              (allowanceObj.internetAllowance || 0) +
              (allowanceObj.utilitiesAllowance || 0) +
              (allowanceObj.parkingAllowance || 0) +
              (allowanceObj.miscAllowance || 0)
            ).toFixed(2);
            
            const submittedDate = selectedRecord.submittedAt || selectedRecord.createdAt || selectedRecord.date;
            
            let approvers: string[] = [];
            if (selectedRecord.approvedBy) {
              try {
                approvers = JSON.parse(selectedRecord.approvedBy);
                if (!Array.isArray(approvers)) approvers = [];
              } catch (e) {
                console.error('Failed to parse approvers:', e);
              }
            }
            
            const approvalCount = selectedRecord.approvalCount || 0;
            const savedStatus = selectedRecord.approvalStatus;
            const maxApprovals = (selectedRecord as any).requiredApprovals || requiredApprovals;
            
            let displayStatus: string;
            if (savedStatus && (savedStatus === 'approved' || savedStatus === 'rejected')) {
              displayStatus = savedStatus;
            } else {
              if (approvalCount >= maxApprovals && maxApprovals > 0) {
                displayStatus = 'approved';
              } else if (approvalCount > 0) {
                displayStatus = 'processing';
              } else {
                displayStatus = 'pending';
              }
            }
            
            const statusBg = STATUS_COLORS[displayStatus as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800';
            
            return (
              <div className="space-y-4">
                {/* Record Details */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Employee</p>
                      <p className="font-semibold">{selectedRecord.employeeName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Email</p>
                      <p className="font-semibold truncate">{selectedRecord.employeeEmail}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Team</p>
                      <p className="font-semibold">{selectedRecord.teamName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p className="font-semibold">{new Date(selectedRecord.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Total Amount</p>
                      <p className="font-semibold text-green-600">Rs {total}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Status</p>
                      <span className={`text-xs px-2 py-1 rounded font-semibold inline-block ${statusBg}`}>
                        {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                        {approvalCount > 0 ? ` (${approvalCount}/${maxApprovals})` : ''}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Approval Timeline */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="text-blue-600">📋</span> Approval Timeline
                  </h3>
                  <div className="space-y-3 pl-4 border-l-2 border-blue-200">
                    {/* Submitted */}
                    <div className="relative">
                      <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
                      <div>
                        <p className="font-semibold text-sm">Submitted</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(submittedDate).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {/* Approvals */}
                    {approvers.length > 0 && approvers.map((approverId, index) => {
                      const approverName = approverNames[approverId] || `Approver ${index + 1}`;
                      return (
                        <div key={index} className="relative">
                          <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
                          <div>
                            <p className="font-semibold text-sm">Approval {index + 1}</p>
                            <p className="text-xs">{approverName}</p>
                            {selectedRecord.approvedAt && index === approvers.length - 1 && (
                              <p className="text-xs text-muted-foreground">
                                {new Date(selectedRecord.approvedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Final Status */}
                    <div className="relative">
                      <div className={`absolute -left-[25px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                        displayStatus === 'approved' ? 'bg-green-600' :
                        displayStatus === 'rejected' ? 'bg-red-600' :
                        displayStatus === 'processing' ? 'bg-blue-600' :
                        'bg-yellow-600'
                      }`}></div>
                      <div>
                        <p className="font-semibold text-sm">Final Status</p>
                        <p className="text-sm">
                          {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                        </p>
                        {selectedRecord.rejectionReason && (
                          <div className="mt-1 text-xs bg-red-50 p-2 rounded border border-red-200">
                            <p className="text-red-700">{selectedRecord.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Allowance Breakdown */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="text-green-600">💰</span> Allowance Breakdown
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Travel</span>
                      <span className="font-semibold">Rs {(allowanceObj.travelAllowance || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Food</span>
                      <span className="font-semibold">Rs {(allowanceObj.foodAllowance || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Accommodation</span>
                      <span className="font-semibold">Rs {(allowanceObj.accommodationAllowance || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Mobile</span>
                      <span className="font-semibold">Rs {(allowanceObj.mobileAllowance || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Internet</span>
                      <span className="font-semibold">Rs {(allowanceObj.internetAllowance || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Utilities</span>
                      <span className="font-semibold">Rs {(allowanceObj.utilitiesAllowance || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Parking</span>
                      <span className="font-semibold">Rs {(allowanceObj.parkingAllowance || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Miscellaneous</span>
                      <span className="font-semibold">Rs {(allowanceObj.miscAllowance || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-between items-center">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-green-600 text-lg">Rs {total}</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleExportRecordPDF}
                    disabled={exporting}
                    className="flex-1 flex items-center justify-center gap-2"
                    variant="default"
                  >
                    {exporting ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Export PDF
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handlePrintRecord}
                    disabled={printing}
                    className="flex-1 flex items-center justify-center gap-2"
                    variant="outline"
                  >
                    {printing ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Printing...
                      </>
                    ) : (
                      <>
                        <Printer className="h-4 w-4" />
                        Print
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
