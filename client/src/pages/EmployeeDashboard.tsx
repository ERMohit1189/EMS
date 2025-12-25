import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRef, useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { User, Briefcase, Activity, Calendar, DollarSign, Mail, Zap, Shield, Loader2, IndianRupee, ClipboardCheck } from 'lucide-react';
 
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { performanceMonitor } from '@/lib/performanceMonitor';
import { getApiBaseUrl } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchExportHeader, getCompanyName, getCompanyAddress, formatExportDate } from '@/lib/exportUtils';

export default function EmployeeDashboard() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [printPopupBlocked, setPrintPopupBlocked] = useState(false);
  const { toast } = useToast();

  // Print helper: open printable content in a new window and print
  const printElement = (elementId: string) => {
    try {
      const el = document.getElementById(elementId);
      if (!el) return window.print();
      const printWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (!printWindow) return window.print();

      // Collect only stylesheet links and style tags to avoid scripts
      const headNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')) as HTMLElement[];
      const headHtml = headNodes.map(n => n.outerHTML).join('\n');
      // Minimal fallback styles to ensure white background and readable fonts
      const fallbackStyles = `
        <style>
          body { background: #fff; color: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
          table { border-collapse: collapse; }
          table, th, td { border: 1px solid #ddd; }
        </style>`;

      const baseTag = document.querySelector('base') ? document.querySelector('base')!.outerHTML : '';
      printWindow.document.write(`<!doctype html><html><head>${baseTag}${headHtml}${fallbackStyles}</head><body><div id="print-root">${el.outerHTML}</div></body></html>`);
      printWindow.document.close();
      printWindow.focus();

      // Wait briefly for styles to apply, then print
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (err) {
          console.error('Print window print() failed', err);
        }
      }, 600);
    } catch (e) {
      console.error('Print failed, falling back to window.print()', e);
      window.print();
    }
  };

  // Open a dedicated print route that reads data from sessionStorage and auto-prints
  const openPrintPage = async () => {
    setPrintLoading(true);
    try {
      // Ensure we have the latest export header before opening the print page
      let header = exportHeader;
      try {
        header = await fetchExportHeader();
        setExportHeader(header);
      } catch (err) {
        console.warn('Could not fetch export header before print, using existing header state', err);
      }

      const payload = { userProfile, salarySlip, exportHeader: header };
      sessionStorage.setItem('printSalaryData', JSON.stringify(payload));
      const w = window.open('/print-salary', '_blank');
      if (w) {
        toast({ title: 'Print tab opened', description: 'A new tab was opened for printing.' });
        setPrintPopupBlocked(false);
      } else {
        toast({ title: 'Popup blocked', description: 'Please allow popups or use the "Open printable page" link below.' });
        setPrintPopupBlocked(true);
      }
    } catch (e) {
      console.error('Failed to open print page', e);
      // fallback to previous helper
      printElement('printable-salary-slip');
    } finally {
      setPrintLoading(false);
    }
  };
  const [perfMetrics, setPerfMetrics] = useState<any>(null);
  const [salarySlip, setSalarySlip] = useState<any>(null);
  const [exportHeader, setExportHeader] = useState<any>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [salaryNotifVisible, setSalaryNotifVisible] = useState(false);
  const [salaryNotifDismissed, setSalaryNotifDismissed] = useState(false);
  const employeeRole = localStorage.getItem('employeeRole');
  const isUserEmployee = employeeRole === 'user';
  const [isReportingPerson, setIsReportingPerson] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/session`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && typeof data?.isReportingPerson !== 'undefined') setIsReportingPerson(Boolean(data.isReportingPerson));
      } catch (e) {
        // ignore - leave as null
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Download salary slip as PDF
  const handleDownloadSalarySlip = async () => {
    if (!salarySlip) return;
    setPdfLoading(true);
    try {
      const { fetchExportHeader } = await import('@/lib/exportUtils');
      const exportHeader = await fetchExportHeader();
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;

      // Header - Company Info (light blue background)
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
      doc.text(`Pay Slip for  ${salarySlip.month}-${salarySlip.year}`, 15, 40);

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
            { content: userProfile?.emp_code || userProfile?.id || '', styles: { halign: 'left' } },
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
            { content: salarySlip.totalDays, styles: { halign: 'left' } },
            { content: 'Paid Days', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: salarySlip.workingDays, styles: { halign: 'left' } },
          ],
          [
            { content: 'LOP days', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: salarySlip.absentDays, styles: { halign: 'left' } },
            { content: 'Leaves Taken', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: salarySlip.leaveDays, styles: { halign: 'left' } },
          ],
        ],
        theme: 'grid',
        styles: { fontSize: 10 },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
        columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 45 }, 2: { cellWidth: 45 }, 3: { cellWidth: 45 } },
      });

      // ...existing code for earnings/deductions tables and signatures...
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

      doc.save(`Salary_Slip_${salarySlip.month}_${salarySlip.year}.pdf`);
    } catch (e) {
      console.error('Error generating PDF', e);
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' });
    } finally {
      setPdfLoading(false);
    }
  };

  useEffect(() => {
    // Load user profile (extracted into a function so it can be invoked on events)
    const loadProfile = () => {
      const employeeId = localStorage.getItem('employeeId');
      const employeeName = localStorage.getItem('employeeName');
      const employeeEmail = localStorage.getItem('employeeEmail');
      const employeeDepartment = localStorage.getItem('employeeDepartment');
      const employeeDesignation = localStorage.getItem('employeeDesignation');
      const employeeCode = localStorage.getItem('employeeCode');
      const role = localStorage.getItem('employeeRole');

      console.log('[EmployeeDashboard] ===== PROFILE LOADING =====');
      console.log('[EmployeeDashboard] Role from localStorage:', role);
      console.log('[EmployeeDashboard] Employee ID:', employeeId);
      console.log('[EmployeeDashboard] Employee Name:', employeeName);
      console.log('[EmployeeDashboard] Employee Code:', employeeCode);

      if (employeeId) {
        const employeePhoto = localStorage.getItem('employeePhoto') || '';
        const profileData = {
          id: employeeId,
          name: employeeName,
          email: employeeEmail,
          emp_code: employeeCode,
          department: employeeDepartment || 'Not Assigned',
          designation: employeeDesignation || 'Not Specified',
          role: role || 'user',
          photo: employeePhoto,
        };
        console.log('[EmployeeDashboard] Setting profile:', profileData);
        setUserProfile(profileData);

        // Fetch latest salary slip for this employee whenever we load profile
        fetch(`${getApiBaseUrl()}/api/employee/salary-slip?employeeId=${employeeId}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && !data.error) {
              setSalarySlip(data);
              // Update profile with emp_code from salary slip if available
              if (data.emp_code) {
                setUserProfile(prev => prev ? { ...prev, emp_code: data.emp_code } : prev);
              }
            }
          })
          .catch(err => console.warn('[EmployeeDashboard] Failed to fetch salary slip:', err));
      }
    };

    // Initial load
    loadProfile();

    // Update profile on login/storage events
    const handleLoginEvent = () => {
      console.log('[EmployeeDashboard] login event received, reloading profile');
      setTimeout(loadProfile, 50);
    };
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('employee')) {
        console.log('[EmployeeDashboard] storage event for key:', e.key, ' — reloading profile');
        setTimeout(loadProfile, 50);
      }
    };

    window.addEventListener('login', handleLoginEvent);
    window.addEventListener('storage', handleStorageEvent);
    // Respond to explicit user updates (profile/photo changed in same tab)
    const handleUserUpdated = () => {
      console.log('[EmployeeDashboard] user-updated event received, reloading profile');
      setTimeout(loadProfile, 50);
    };
    window.addEventListener('user-updated', handleUserUpdated);

    // salary slip is fetched inside loadProfile when employeeId is available

    // Clear any previous notification dismissal when profile changes
    setSalaryNotifDismissed(false);

    // Capture performance metrics immediately on next tick
    setTimeout(() => {
      try {
        const metrics = performanceMonitor.getMetrics();
        const assessment = performanceMonitor.getAssessment(metrics);
        setPerfMetrics({ metrics, assessment });
      } catch (e) {
        console.error('Error capturing metrics:', e);
      }
    }, 0);

    return () => {
      window.removeEventListener('login', handleLoginEvent);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('user-updated', handleUserUpdated);
    };
  }, []);

  // Show notification when salary slip for current month is present
  useEffect(() => {
    if (!salarySlip || salaryNotifDismissed) return;
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const slipMonth = Number(salarySlip.month);
    const slipYear = Number(salarySlip.year);
    if (slipMonth === currentMonth && slipYear === currentYear) {
      const key = `salaryNotifDismissed_${slipYear}_${slipMonth}`;
      const dismissed = localStorage.getItem(key) === '1';
      if (!dismissed) {
        setSalaryNotifVisible(true);
        try {
          const monthName = new Date(slipYear, slipMonth - 1).toLocaleString('en-IN', { month: 'long' });
          toast({ title: 'Salary available', description: `Salary for ${monthName} ${slipYear} is now available.` });
        } catch (e) {}
      } else {
        setSalaryNotifDismissed(true);
      }
    }
  }, [salarySlip, salaryNotifDismissed]);

  const dismissSalaryNotification = () => {
    if (!salarySlip) return;
    const slipMonth = Number(salarySlip.month);
    const slipYear = Number(salarySlip.year);
    const key = `salaryNotifDismissed_${slipYear}_${slipMonth}`;
    try {
      localStorage.setItem(key, '1');
    } catch (e) {
      console.warn('Could not persist dismissal', e);
    }
    setSalaryNotifDismissed(true);
    setSalaryNotifVisible(false);
  };

  // Fetch export header when print modal opens so printable content includes company header
  useEffect(() => {
    if (!showPrintModal) return;
    let mounted = true;
    (async () => {
      try {
        const header = await fetchExportHeader();
        if (mounted) setExportHeader(header);
      } catch (e) {
        console.error('Failed to fetch export header for print preview', e);
      }
    })();
    return () => { mounted = false; };
  }, [showPrintModal]);

  // User role employees see restricted menu
  const showLeaveApprovals = (employeeRole === 'admin') || (isReportingPerson === true);

  // Pending approvals count for approvers (show badge on dashboard Leave Approvals card)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [pulseActive, setPulseActive] = useState<boolean>(false);
  const prevPendingCountRef = useRef<number>(0);
  const pulseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchPending = async () => {
      try {
        if (!showLeaveApprovals) return;
        const res = await fetch(`${getApiBaseUrl()}/api/leaves/pending`, { credentials: 'include' });
        if (!res.ok) return;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;
        const data = await res.json();
        const count = Array.isArray(data) ? data.length : 0;

        const prev = prevPendingCountRef.current || 0;
        if (!cancelled && count > prev) {
          setPulseActive(true);
          if (pulseTimeoutRef.current) {
            clearTimeout(pulseTimeoutRef.current);
          }
          pulseTimeoutRef.current = window.setTimeout(() => {
            setPulseActive(false);
            pulseTimeoutRef.current = null;
          }, 3000);
        }

        prevPendingCountRef.current = count;
        if (!cancelled) setPendingApprovalsCount(count);
      } catch (e) {
        console.error('[EmployeeDashboard] failed to fetch pending leaves', e);
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 60 * 1000);
    return () => {
      cancelled = true;
      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
        pulseTimeoutRef.current = null;
      }
      clearInterval(interval);
    };
  }, [showLeaveApprovals]);

  const baseMenu = [
    { title: 'My Profile', icon: User, href: '/employee/my-profile', color: 'text-blue-500' },
    { title: 'Salary Structure', icon: DollarSign, href: '/employee/salary', color: 'text-emerald-500' },
    { title: 'Attendance', icon: Calendar, href: '/employee/attendance', color: 'text-orange-500' },
    { title: 'Allowances', icon: Activity, href: '/employee/allowances', color: 'text-purple-500' },
  ];

  // Add Leave Approvals after Allowances when visible to admin or reporting person
  const menuItems = isUserEmployee ? (
    showLeaveApprovals ? [...baseMenu.slice(0,4), { title: 'Leave Approvals', icon: ClipboardCheck, href: '/employee/leave-approvals', color: 'text-yellow-500' }] : baseMenu
  ) : (
    showLeaveApprovals ? [...baseMenu.slice(0,4), { title: 'Leave Approvals', icon: ClipboardCheck, href: '/employee/leave-approvals', color: 'text-yellow-500' }] : baseMenu
  );

  // Performance metrics card
  const perfCard = useMemo(() => {
    if (!perfMetrics) return null;
    const { metrics, assessment } = perfMetrics;
    return (
      <Card className="border-l-4 border-l-blue-600 shadow-md bg-gradient-to-r from-blue-50 to-cyan-50" data-testid="card-performance-metrics">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center bg-opacity-10 ${assessment.color}`}>
                  <Zap className={`h-6 w-6 ${assessment.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Page Load Performance</h3>
                  <p className={`text-sm font-semibold ${assessment.color}`}>{assessment.score}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4">{assessment.message}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-slate-600">Total Load Time</p>
                  <p className="text-lg font-bold text-slate-900" data-testid="metric-page-load-time">{metrics.pageLoadTime}ms</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-slate-600">DOM Interactive</p>
                  <p className="text-lg font-bold text-slate-900">{metrics.domInteractive}ms</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-slate-600">Resources Loaded</p>
                  <p className="text-lg font-bold text-slate-900">{metrics.resourceCount}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-slate-600">Total Size</p>
                  <p className="text-lg font-bold text-slate-900">{metrics.totalResourceSize}KB</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }, [perfMetrics]);

  const showPerf = perfMetrics?.assessment?.score === 'Poor';

  return (
    <div className="space-y-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-lg p-6">
      {/* Performance Metrics Card (only show on Poor assessment) */}
      {showPerf && perfCard}
              
              {/* Print styles */}
              <style>{`
                @media print {
                  @page {
                    margin: 0.5in;
                  }
                  
                  body {
                    margin: 0;
                    padding: 0;
                  }
                  
                  .no-print {
                    display: none !important;
                  }
                  
                  #printable-salary-slip {
                    display: block !important;
                    page-break-inside: avoid;
                  }
                  
                  #printable-salary-slip table {
                    page-break-inside: avoid;
                  }
                  
                  /* Hide everything except the printable content */
                  body > *:not(#printable-salary-slip) {
                    display: none !important;
                  }
                  
                  /* Make sure the modal container shows only the print content */
                  .print-content {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    background: white !important;
                  }
                }
              `}</style>
        

      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-8 text-white shadow-lg">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2">Welcome to Employee Portal</h2>
          <p className="text-green-100">Manage your employee information and documents</p>
        </div>
      </div>

      {/* Salary Available Notification Banner */}
      {salaryNotifVisible && salarySlip && (
        <div className="bg-white border-l-4 border-l-emerald-500 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm text-emerald-800 font-semibold">Salary available for {new Date(Number(salarySlip.year), Number(salarySlip.month) - 1).toLocaleString('en-IN', { month: 'long' })} {salarySlip.year}</div>
            <div className="text-xs text-slate-600">Net Salary: <span className="font-bold">Rs {Number(salarySlip.netSalary).toLocaleString()}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSalarySlip}
              disabled={pdfLoading}
              className={`bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-2 rounded shadow transition ${pdfLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {pdfLoading ? (<><Loader2 className="w-4 h-4 animate-spin mr-2 inline-block align-middle" />Generating</>) : 'Download'}
            </button>
            <button
              onClick={() => openPrintPage()}
              disabled={printLoading}
              className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded shadow transition ${printLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {printLoading ? (<><Loader2 className="w-4 h-4 animate-spin mr-2 inline-block align-middle" />Opening</>) : 'Print'}
            </button>
            <button onClick={dismissSalaryNotification} className="text-sm text-slate-600 underline ml-2">Dismiss</button>
          </div>
        </div>
      )}

      {/* User Profile Card */}
      {userProfile && (
        <Card className="border-l-4 border-l-green-600 shadow-md bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-green-600/20 flex items-center justify-center">
                    {userProfile.photo ? (
                      <img src={userProfile.photo} alt={userProfile.name} className="h-12 w-12 object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-slate-900" data-testid="text-employee-name">{userProfile.name}</h3>
                      {userProfile.emp_code && <span className="text-sm text-slate-500 font-medium">({userProfile.emp_code})</span>}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        style={{
                          display: 'inline-block',
                          paddingLeft: '12px',
                          paddingRight: '12px',
                          paddingTop: '6px',
                          paddingBottom: '6px',
                          borderRadius: '9999px',
                          fontWeight: '600',
                          color: 'white',
                          fontSize: '14px',
                          backgroundColor: userProfile?.role === 'admin' ? '#9333ea' : '#2563eb',
                        }}
                        data-testid="badge-employee-role"
                      >
                        {userProfile?.role?.toUpperCase() || 'USER'}
                      </span>
                      <p className="text-sm text-slate-600">{userProfile.designation}</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-600">Email</p>
                      <p className="text-sm font-medium text-slate-900" data-testid="text-employee-email">{userProfile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-600">Department</p>
                      <p className="text-sm font-medium text-slate-900">{userProfile.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-600">Role</p>
                      <Badge variant="default" className={`text-xs ${userProfile?.role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'}`} data-testid="badge-employee-role">
                        {userProfile?.role?.toUpperCase() || 'USER'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-600">Status</p>
                      <Badge variant="default" className="text-xs bg-green-600">
                        Active
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      

      {/* Quick Links Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {menuItems.map((item) => (
          <Link key={item.title} href={item.href}>
            <Card className="relative hover:shadow-xl hover:border-green-600 cursor-pointer transition-all duration-300 h-full border-t-4 border-t-transparent hover:border-t-green-600">
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${item.color} bg-opacity-10`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                {/* Pending approvals badge for Leave Approvals */}
                {item.href === '/employee/leave-approvals' && pendingApprovalsCount > 0 && (
                  <span title={`${pendingApprovalsCount} pending approvals`} className={`absolute top-3 right-3 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-semibold ${pulseActive ? 'animate-pulse ring-2 ring-red-300' : ''}`}>
                    {pendingApprovalsCount}
                  </span>
                )}
                <h3 className="font-semibold text-slate-900 text-sm">{item.title}</h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Latest Salary Slip inserted after Quick Links */}
      {salarySlip && (
        <Card className="border-l-4 border-l-emerald-600 shadow-md bg-gradient-to-r from-emerald-50 to-green-50 animate-fade-in mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <IndianRupee className="h-6 w-6 text-emerald-600" /> Latest Salary Slip
            </CardTitle>
            <CardDescription className="text-emerald-800 font-semibold">
              {salarySlip.month}/{salarySlip.year} — <span className="text-green-700">Net Salary: Rs {Number(salarySlip.netSalary).toLocaleString()}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-slate-500">Gross Salary</div>
              <div className="text-lg font-bold text-green-700">Rs {Number(salarySlip.grossSalary).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Earned Salary</div>
              <div className="text-lg font-bold text-blue-700">Rs {Number(salarySlip.earnedSalary).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Deductions</div>
              <div className="text-lg font-bold text-orange-700">Rs {Number(salarySlip.totalDeductions).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Net Salary</div>
              <div className="text-lg font-bold text-purple-700">Rs {Number(salarySlip.netSalary).toLocaleString()}</div>
            </div>
          </CardContent>
          <div className="flex justify-end gap-2 pb-4 pr-4">
            <button
              onClick={handleDownloadSalarySlip}
              disabled={pdfLoading}
              className={`bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded shadow transition ${pdfLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {pdfLoading ? (<><Loader2 className="w-4 h-4 animate-spin mr-2 inline-block align-middle" />Generating PDF...</>) : 'Download Salary Slip (PDF)'}
            </button>
            <button
              onClick={() => openPrintPage()}
              disabled={printLoading}
              className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow transition ${printLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {printLoading ? (<><Loader2 className="w-4 h-4 animate-spin mr-2 inline-block align-middle" />Opening print...</>) : 'Print'}
            </button>
          </div>
        </Card>
      )}

      {/* Important Links Card - Only for non-user employees */}
      {!isUserEmployee && (
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-lg">
            <CardTitle className="text-lg">Important Information</CardTitle>
            <CardDescription>Quick access to important documents and policies</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Link href="/employee/privacy-policy">
                <div className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <h4 className="font-semibold text-slate-900 mb-1">Privacy Policy</h4>
                  <p className="text-sm text-slate-600">Read our privacy policy and data protection practices</p>
                </div>
              </Link>
              <Link href="/settings">
                <div className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <h4 className="font-semibold text-slate-900 mb-1">Settings</h4>
                  <p className="text-sm text-slate-600">Manage your account preferences and contact details</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
