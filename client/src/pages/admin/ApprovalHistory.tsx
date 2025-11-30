import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

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
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
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

  // Fetch all allowance records
  useEffect(() => {
    fetchApprovalHistory();
  }, [selectedMonth, selectedYear]);

  // Fetch employees list - with role-based filtering
  useEffect(() => {
    const fetchEmployeeList = async () => {
      const employeeRole = localStorage.getItem('employeeRole');
      const isAdmin = employeeRole !== 'user';
      const isReportingPerson = localStorage.getItem('isReportingPerson') === 'true';
      
      if (isAdmin) {
        // Admin can see ALL employees in the system
        try {
          const response = await fetch(`${getApiBaseUrl()}/api/employees?page=1&pageSize=500`);
          if (response.ok) {
            const data = await response.json();
            console.log('[ApprovalHistory] All employees from API:', data);
            const allEmployees = (data.data || [])
              .filter((e: any) => e.email !== 'superadmin@ems.local')
              .map((e: any) => ({ id: e.id, name: e.name }));
            console.log('[ApprovalHistory] Filtered employees:', allEmployees);
            setEmployees(allEmployees);
          } else {
            console.error('[ApprovalHistory] Failed to fetch employees, status:', response.status);
          }
        } catch (error) {
          console.error('Failed to fetch all employees:', error);
          // Fallback to records
          const employeesFromRecords = Array.from(
            new Map(records.map(r => [r.employeeId, { id: r.employeeId, name: r.employeeName }])).values()
          );
          setEmployees(employeesFromRecords);
        }
      } else {
        // Reporting person or regular employee - extract from records only
        const employeesFromRecords = Array.from(
          new Map(records.map(r => [r.employeeId, { id: r.employeeId, name: r.employeeName }])).values()
        );
        setEmployees(employeesFromRecords);
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
      
      const response = await fetch(url);
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

  // Apply filters to records
  const filteredRecords = useMemo(() => {
    return records.filter((record: AllowanceRecord) => {
      // Status filter
      if (!selectedStatuses.has(record.approvalStatus)) {
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
    pending: filteredRecords.filter(r => r.approvalStatus === 'pending').length,
    processing: filteredRecords.filter(r => r.approvalStatus === 'processing').length,
    approved: filteredRecords.filter(r => r.approvalStatus === 'approved').length,
    rejected: filteredRecords.filter(r => r.approvalStatus === 'rejected').length,
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

            const statusBg = STATUS_COLORS[record.approvalStatus as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800';

            return (
              <Card key={record.id} className="shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b">
                    <div>
                      <p className="text-xs text-muted-foreground">Employee</p>
                      <p className="text-sm font-semibold">{record.employeeName}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded font-semibold ${statusBg}`} data-testid={`status-${record.id}`}>
                      {record.approvalStatus.charAt(0).toUpperCase() + record.approvalStatus.slice(1)}
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
    </div>
  );
}
