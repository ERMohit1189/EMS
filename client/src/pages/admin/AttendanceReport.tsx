import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AttendanceData {
  employeeId: string;
  employeeCode?: string;
  employeeName: string;
  department: string;
  designation: string;
  present: number;
  firstHalf: number;
  secondHalf: number;
  absent: number;
  leave: number;
  holiday: number;
  total: number;
  locked?: boolean;
}

export default function AttendanceReport() {
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
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [isLocking, setIsLocking] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchAttendanceReport();
  }, []);

  const fetchAttendanceReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${getApiBaseUrl()}/api/reports/attendance?month=${month}&year=${year}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setAttendanceData(data);
      } else {
        throw new Error('Failed to fetch attendance report');
      }
    } catch (error: any) {
      console.error('Error fetching attendance report:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch attendance report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    fetchAttendanceReport();
  };

  const handleLockAttendance = async () => {
    if (!window.confirm(`Lock attendance for ${monthNames[month - 1]} ${year}? This will prevent all employees from making further changes.`)) {
      return;
    }

    try {
      setIsLocking(true);
      const response = await fetch(
        `${getApiBaseUrl()}/api/attendance/lock`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ month, year, lockAll: true }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: data.message || `Attendance locked for ${monthNames[month - 1]} ${year}`,
        });
        fetchAttendanceReport();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to lock attendance');
      }
    } catch (error: any) {
      console.error('Error locking attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to lock attendance',
        variant: 'destructive',
      });
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlockAttendance = async () => {
    if (!window.confirm(`Unlock attendance for ${monthNames[month - 1]} ${year}? This will allow employees to make changes again.`)) {
      return;
    }

    try {
      setIsLocking(true);
      const response = await fetch(
        `${getApiBaseUrl()}/api/attendance/unlock`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ month, year, unlockAll: true }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: data.message || `Attendance unlocked for ${monthNames[month - 1]} ${year}`,
        });
        fetchAttendanceReport();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlock attendance');
      }
    } catch (error: any) {
      console.error('Error unlocking attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to unlock attendance',
        variant: 'destructive',
      });
    } finally {
      setIsLocking(false);
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      attendanceData.map((emp) => ({
        'Employee Code': emp.employeeCode || '',
        'Employee Name': emp.employeeName,
        'Department': emp.department,
        'Designation': emp.designation,
        'Present': emp.present,
        'First Half': emp.firstHalf,
        'Second Half': emp.secondHalf,
        'Absent': emp.absent,
        'Leave': emp.leave,
        'Holiday': emp.holiday,
        'Total Days': emp.total,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
    XLSX.writeFile(workbook, `Attendance_Report_${monthNames[month - 1]}_${year}.xlsx`);

    toast({
      title: 'Success',
      description: 'Attendance report exported to Excel',
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text('Attendance Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`${monthNames[month - 1]} ${year}`, 14, 28);

    // Table
    const tableData = attendanceData.map((emp) => [
      emp.employeeCode || '',
      emp.employeeName,
      emp.department,
      emp.designation,
      emp.present.toString(),
      emp.firstHalf.toString(),
      emp.secondHalf.toString(),
      emp.absent.toString(),
      emp.leave.toString(),
      emp.holiday.toString(),
      emp.total.toString(),
    ]);

    autoTable(doc, {
      head: [['Employee Code', 'Employee', 'Department', 'Designation', 'P', '1H', '2H', 'A', 'L', 'H', 'Total']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`Attendance_Report_${monthNames[month - 1]}_${year}.pdf`);

    toast({
      title: 'Success',
      description: 'Attendance report exported to PDF',
    });
  };

  const handlePrint = () => {
    const printContent = document.getElementById('attendance-report-table');
    if (!printContent) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Attendance Report</title>');
    printWindow.document.write(`
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { text-align: center; margin-bottom: 10px; }
        h2 { text-align: center; margin-bottom: 20px; font-size: 16px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #3b82f6; color: white; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .total-row { font-weight: bold; background-color: #e5e7eb !important; }
      </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h1>Attendance Report</h1>');
    printWindow.document.write(`<h2>${monthNames[month - 1]} ${year}</h2>`);
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);

    toast({
      title: 'Success',
      description: 'Print dialog opened',
    });
  };

  const totals = attendanceData.reduce(
    (acc, emp) => ({
      present: acc.present + emp.present,
      firstHalf: acc.firstHalf + emp.firstHalf,
      secondHalf: acc.secondHalf + emp.secondHalf,
      absent: acc.absent + emp.absent,
      leave: acc.leave + emp.leave,
      holiday: acc.holiday + emp.holiday,
      total: acc.total + emp.total,
    }),
    { present: 0, firstHalf: 0, secondHalf: 0, absent: 0, leave: 0, holiday: 0, total: 0 }
  );

  if (loading) {
    return <SkeletonLoader type="table" />;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Attendance Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="flex items-end">
              <Button onClick={handleGenerate} className="w-full">
                Generate Report
              </Button>
            </div>
          </div>

          {/* Lock/Unlock and Export Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-2">
              <Button 
                onClick={handleLockAttendance} 
                variant="destructive" 
                className="flex-1"
                disabled={isLocking}
              >
                🔒 Lock Month
              </Button>
              <Button 
                onClick={handleUnlockAttendance} 
                variant="outline" 
                className="flex-1"
                disabled={isLocking}
              >
                🔓 Unlock Month
              </Button>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={exportToExcel} variant="outline" className="flex-1" title="Export to Excel">
                📊 Excel
              </Button>
              <Button onClick={exportToPDF} variant="outline" className="flex-1" title="Export to PDF">
                📄 PDF
              </Button>
              <Button onClick={handlePrint} variant="outline" className="flex-1" title="Print">
                🖨️ Print
              </Button>
            </div>
          </div>

          {/* Report Table */}
          <div className="overflow-x-auto">
            <div id="attendance-report-table">
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      S.No
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      Lock
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Employee Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Designation
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      Present
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      1st Half
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      2nd Half
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      Absent
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      Leave
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      Holiday
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      Total Days
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                        No attendance records found for {monthNames[month - 1]} {year}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {attendanceData.map((emp, index) => (
                        <tr key={emp.employeeId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {emp.locked ? (
                              <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">🔒</span>
                            ) : (
                              <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-full">✓</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {emp.locked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  if (!window.confirm('Unlock attendance for this employee?')) return;
                                  try {
                                    setIsLocking(true);
                                    const resp = await fetch(`${getApiBaseUrl()}/api/attendance/unlock`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      credentials: 'include',
                                      body: JSON.stringify({ month, year, employeeId: emp.employeeId }),
                                    });
                                    if (!resp.ok) {
                                      const err = await resp.json().catch(() => ({}));
                                      throw new Error(err.error || 'Failed to unlock');
                                    }
                                    toast({ title: 'Success', description: 'Attendance unlocked' });
                                    fetchAttendanceReport();
                                  } catch (e: any) {
                                    toast({ title: 'Error', description: e.message || 'Unlock failed', variant: 'destructive' });
                                  } finally {
                                    setIsLocking(false);
                                  }
                                }}
                              >
                                🔓 Unlock
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div>{emp.employeeName}{emp.employeeCode && (<span className="ml-2 text-xs font-mono text-gray-500">{emp.employeeCode}</span>)}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {emp.department}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {emp.designation}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-green-600 font-medium">
                            {emp.present}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-teal-600 font-medium">
                            {emp.firstHalf}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-cyan-600 font-medium">
                            {emp.secondHalf}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-red-600 font-medium">
                            {emp.absent}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-yellow-600 font-medium">
                            {emp.leave}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-purple-600 font-medium">
                            {emp.holiday}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold text-gray-900">
                            {emp.total}
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-gray-200 font-bold total-row">
                        <td colSpan={6} className="px-4 py-3 text-sm text-right">
                          Total:
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-green-700">
                          {totals.present}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-teal-700">
                          {totals.firstHalf}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-cyan-700">
                          {totals.secondHalf}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-red-700">
                          {totals.absent}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-yellow-700">
                          {totals.leave}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-purple-700">
                          {totals.holiday}
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-bold">
                          {totals.total}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          {attendanceData.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-4">
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-xs text-green-600 font-medium">Total Present</p>
                <p className="text-xl font-bold text-green-700">{totals.present}</p>
              </div>
              <div className="bg-teal-50 p-3 rounded border border-teal-200">
                <p className="text-xs text-teal-600 font-medium">Total 1st Half</p>
                <p className="text-xl font-bold text-teal-700">{totals.firstHalf}</p>
              </div>
              <div className="bg-cyan-50 p-3 rounded border border-cyan-200">
                <p className="text-xs text-cyan-600 font-medium">Total 2nd Half</p>
                <p className="text-xl font-bold text-cyan-700">{totals.secondHalf}</p>
              </div>
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <p className="text-xs text-red-600 font-medium">Total Absent</p>
                <p className="text-xl font-bold text-red-700">{totals.absent}</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <p className="text-xs text-yellow-600 font-medium">Total Leave</p>
                <p className="text-xl font-bold text-yellow-700">{totals.leave}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded border border-purple-200">
                <p className="text-xs text-purple-600 font-medium">Total Holiday</p>
                <p className="text-xl font-bold text-purple-700">{totals.holiday}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
