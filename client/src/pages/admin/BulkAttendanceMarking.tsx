import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

type AttendanceStatus = 'present' | 'absent' | 'leave' | 'holiday' | 'firsthalf' | 'secondhalf';

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface Employee {
  id: string; // team_member id
  employeeId?: string; // base employee id (used by attendance API)
  employeeCode?: string; // public employee code (EMP00001)
  name: string;
  email: string;
  departmentName?: string;
  designationName?: string;
}

interface AttendanceRecord {
  [day: number]: {
    status: AttendanceStatus;
    leaveType?: string;
  };

  
}

interface LeaveType {
  code: string;
  name: string;
  allocated?: number;
  used?: number;
  remaining?: number;
  disabled?: boolean;
}

export default function BulkAttendanceMarking() {
  // Role-based access control
  const employeeRole = localStorage.getItem('employeeRole')?.toLowerCase() || '';
  const isAllowed = employeeRole === 'admin' || employeeRole === 'superadmin';

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalEmployees, setTotalEmployees] = useState<number>(0);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [attendanceByEmployee, setAttendanceByEmployee] = useState<{ [employeeId: string]: AttendanceRecord }>({});
  const [employeeLoading, setEmployeeLoading] = useState<Record<string, boolean>>({});
  const [employeeSaving, setEmployeeSaving] = useState<Record<string, boolean>>({});
  const [loadingAttendanceForGrid, setLoadingAttendanceForGrid] = useState(false);
  const [employeeLocked, setEmployeeLocked] = useState<Record<string, { locked: boolean; reason: string }>>({});
  const [attendance, setAttendance] = useState<AttendanceRecord>({});
  const [loading, setLoading] = useState(false);
  const [lockAfterSave, setLockAfterSave] = useState<boolean>(false);
  const [holidays, setHolidays] = useState<{ [day: number]: string }>({});
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const leaveAllotmentsCache = useRef<Record<string, LeaveType[]>>({});
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedEmployeeForLeave, setSelectedEmployeeForLeave] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [bulkMode, setBulkMode] = useState<'day' | 'month'>('day');
  const [selectedBulkDay, setSelectedBulkDay] = useState<number>(1);
  const compactSelect = true; // always compact

  // Pagination and table controls
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const pageSizeOptions = [10, 25, 50, 100];

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const daysInMonth = new Date(year, month, 0).getDate();

  // Check if a day is Sunday
  const isSunday = (day: number) => {
    const date = new Date(year, month - 1, day);
    return date.getDay() === 0;
  };

  useEffect(() => {
    fetchTeams();
    fetchLeaveTypes();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamEmployees(selectedTeam, page, pageSize);
    } else {
      setEmployees([]);
      setSelectedEmployees([]);
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamEmployees(selectedTeam, page, pageSize);
    }
  }, [page, pageSize]);

  useEffect(() => {
    setAttendance({});
    fetchHolidays();

    // Reinitialize attendanceByEmployee when month/year changes
    if (employees.length > 0) {
      const initial = createInitialAttendance();
      const byEmp: { [k: string]: AttendanceRecord } = {};
      employees.forEach((e: any) => {
        const key = e.employeeId || e.id;
        byEmp[key] = { ...initial };
      });
      setAttendanceByEmployee(byEmp);
    }
  }, [month, year]);

  // Ensure selectedBulkDay is clamped within the current month when month/year changes
  useEffect(() => {
    if (selectedBulkDay > daysInMonth) {
      setSelectedBulkDay(daysInMonth);
    }
    if (selectedBulkDay < 1) {
      setSelectedBulkDay(1);
    }
  }, [month, year, daysInMonth]);

  // When switching modes, ensure the selected day is valid for day-mode
  useEffect(() => {
    if (bulkMode === 'day') {
      if (!selectedBulkDay || selectedBulkDay < 1 || selectedBulkDay > daysInMonth) {
        setSelectedBulkDay(1);
      }
    }
  }, [bulkMode, daysInMonth]);

  // Keyboard navigation: left/right arrows change day when in day mode
  const handlePrevMonth = () => {
    if (bulkMode === 'day') {
      const currentDay = selectedBulkDay || 1;
      if (currentDay > 1) {
        setSelectedBulkDay(currentDay - 1);
      } else {
        // move to previous month, and set day to last day of that month
        const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const prevDays = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
        setCurrentDate(prevMonthDate);
        setSelectedBulkDay(prevDays);
      }
    } else {
      setCurrentDate(new Date(year, month - 2, 1));
    }
  };
  
  const handleNextMonth = () => {
    if (bulkMode === 'day') {
      const currentDay = selectedBulkDay || 1;
      if (currentDay < daysInMonth) {
        setSelectedBulkDay(currentDay + 1);
      } else {
        // move to next month, and set day to first day
        const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        setCurrentDate(nextMonthDate);
        setSelectedBulkDay(1);
      }
    } else {
      setCurrentDate(new Date(year, month, 1));
    }
  };
  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (bulkMode !== 'day') return;
      if (e.key === 'ArrowLeft') {
        handlePrevMonth();
      } else if (e.key === 'ArrowRight') {
        handleNextMonth();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [bulkMode, selectedBulkDay, currentDate]);

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/teams`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTeams(Array.isArray(data) ? data : []);
      } else {
        setTeams([]);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      setTeams([]);
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive',
      });
    }
  };

  const createInitialAttendance = (): AttendanceRecord => {
    const initialAttendance: AttendanceRecord = {};
    for (let day = 1; day <= daysInMonth; day++) {
      if (isSunday(day) || holidays[day]) {
        initialAttendance[day] = { status: 'holiday' };
      }
    }
    return initialAttendance;
  };

  const fetchTeamEmployees = async (teamId: string, pageParam = page, pageSizeParam = pageSize) => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/api/teams/${teamId}/members?page=${pageParam}&pageSize=${pageSizeParam}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const empList = Array.isArray(data) ? data : (data.members || []);
        const total = typeof data.total === 'number' ? data.total : empList.length;
        setEmployees(empList);
        setTotalEmployees(total);
        // Default to select all team members when a team is chosen
        setSelectedEmployees(empList.map((e: any) => e.employeeId || e.id));

        // Initialize attendance for each employee (keyed by base employee id)
        const initial = createInitialAttendance();
        const byEmp: { [k: string]: AttendanceRecord } = {};
        empList.forEach((e: any) => {
          const key = e.employeeId || e.id;
          byEmp[key] = { ...initial };
        });
        setAttendanceByEmployee(byEmp);

        // Reset pagination to page 1
        setPage(1);
        // Automatically load attendance for employees on the current page
        loadAllEmployeeAttendanceForPage(empList);
      } else {
        setEmployees([]);
        setSelectedEmployees([]);
        setAttendanceByEmployee({});
        setTotalEmployees(0);
      }
    } catch (error) {
      console.error('Failed to fetch team employees:', error);
      setEmployees([]);
      setSelectedEmployees([]);
      setAttendanceByEmployee({});
      toast({
        title: 'Error',
        description: 'Failed to load team employees',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllEmployeeAttendanceForPage = async (empList?: Employee[]) => {
    const list = empList || employees;
    if (!list || list.length === 0) return;
    setLoadingAttendanceForGrid(true);
    try {
      // Kick off parallel loads but limit concurrency if needed
      await Promise.all(
        list.map((emp) => {
          const id = emp.employeeId || emp.id;
          return loadEmployeeAttendance(id);
        })
      );
    } catch (error) {
      console.error('Failed to load page attendance:', error);
    } finally {
      setLoadingAttendanceForGrid(false);
    }
  };

  const loadEmployeeAttendance = async (employeeId: string) => {
    if (!employeeId) return;
    const key = employeeId;
    setEmployeeLoading((prev) => ({ ...prev, [key]: true }));
    try {
      // Check if salary exists for this employee
      const salaryResp = await fetch(`${getApiBaseUrl()}/api/salary/check/${employeeId}/${month}/${year}`, { credentials: 'include' });
      const salaryExists = salaryResp.ok && (await salaryResp.json())?.exists;

      const resp = await fetch(`${getApiBaseUrl()}/api/attendance/${employeeId}/${month}/${year}`, { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();

        // Check if locked or salary exists
        const isLocked = data?.locked === true;

        if (salaryExists) {
          setEmployeeLocked((prev) => ({ ...prev, [key]: { locked: true, reason: 'Salary generated' } }));
          // Remove from selected employees if salary exists
          setSelectedEmployees((prev) => prev.filter(id => id !== key));
        } else if (isLocked) {
          setEmployeeLocked((prev) => ({ ...prev, [key]: { locked: true, reason: 'Attendance locked' } }));
          // Remove from selected employees if locked
          setSelectedEmployees((prev) => prev.filter(id => id !== key));
        } else {
          setEmployeeLocked((prev) => ({ ...prev, [key]: { locked: false, reason: '' } }));
        }

        if (data) {
          // data.attendanceData may be a JSON string
          const parsed = typeof data.attendanceData === 'string' ? JSON.parse(data.attendanceData) : (data.attendanceData || {});
          setAttendanceByEmployee((prev) => ({ ...prev, [key]: parsed }));
        } else {
          // No attendance found - initialize
          const initial = createInitialAttendance();
          setAttendanceByEmployee((prev) => ({ ...prev, [key]: initial }));
        }

        // Only select employee if not locked
        if (!salaryExists && !isLocked) {
          setSelectedEmployees((prev) => (prev.includes(key) ? prev : [...prev, key]));
        }
      } else {
        // initialize empty
        const initial = createInitialAttendance();
        setAttendanceByEmployee((prev) => ({ ...prev, [key]: initial }));
      }
    } catch (error) {
      console.error('Failed to load employee attendance:', error);
    } finally {
      setEmployeeLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const saveEmployeeAttendance = async (employeeId: string) => {
    if (!employeeId) return;
    const key = employeeId;
    setEmployeeSaving((prev) => ({ ...prev, [key]: true }));
    try {
      const empAttendance = attendanceByEmployee[key] || {};
      const response = await fetch(`${getApiBaseUrl()}/api/attendance`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: key,
          month,
          year,
          attendanceData: empAttendance,
        }),
      });
      if (response.ok) {
        const json = await response.json();
        toast({ title: 'Success', description: `Attendance saved for ${employeeId}` });
        // Clear cached leave allotments for this employee so leave popup will show fresh data
        try {
          const cacheKey = `${employeeId}_${year}`;
          delete leaveAllotmentsCache.current[cacheKey];
          if (showLeaveDialog && selectedEmployeeForLeave === employeeId) {
            await fetchLeaveAllotmentsForEmployee(employeeId);
          }
        } catch (e) {
          console.warn('Failed to clear/refresh leave allotments cache after individual save:', e);
        }
      } else {
        const err = await response.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Failed to save attendance');
      }
    } catch (error: any) {
      console.error('Failed to save employee attendance:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save attendance', variant: 'destructive' });
    } finally {
      setEmployeeSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const fetchHolidays = async () => {
    try {
      const holidaysResponse = await fetch(
        `${getApiBaseUrl()}/api/holidays/month/${year}/${month}`
      );
      const holidaysData = holidaysResponse.ok ? await holidaysResponse.json() : [];

      const holidayMap: { [day: number]: string } = {};
      holidaysData.forEach((holiday: any) => {
        const holidayDate = new Date(holiday.date);
        const day = holidayDate.getDate();
        holidayMap[day] = holiday.name;
      });
      setHolidays(holidayMap);

      // Initialize with Sundays and holidays
      const initialAttendance: AttendanceRecord = {};
      for (let day = 1; day <= daysInMonth; day++) {
        if (isSunday(day) || holidayMap[day]) {
          initialAttendance[day] = { status: 'holiday' };
        }
      }
      setAttendance(initialAttendance);

      // Initialize per-employee attendance as well
      if (employees.length > 0) {
        const byEmp: { [k: string]: AttendanceRecord } = {};
        employees.forEach((e: any) => {
          const key = e.employeeId || e.id;
          byEmp[key] = { ...initialAttendance };
        });
        setAttendanceByEmployee(byEmp);
      }
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/leave-types`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setLeaveTypes(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    }
  };

  const fetchLeaveAllotmentsForEmployee = async (employeeId: string) => {
    if (!employeeId) return;
    try {
      setLeaveLoading(true);
      const cacheKey = `${employeeId}_${year}`;
      const cached = leaveAllotmentsCache.current[cacheKey];
      if (cached) {
        setLeaveTypes(cached);
        setLeaveLoading(false);
        return;
      }
      const response = await fetch(`${getApiBaseUrl()}/api/leave-allotments/employee/${employeeId}/${year}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        // The API returns { leaveTypes: [...] }
        const types = data.leaveTypes || data || [];
        leaveAllotmentsCache.current[cacheKey] = Array.isArray(types) ? types : [];
        setLeaveTypes(Array.isArray(types) ? types : []);
      } else {
        setLeaveTypes([]);
      }
    } catch (error) {
      console.error('Failed to fetch leave allotments for employee:', error);
      setLeaveTypes([]);
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleEmployeeSelection = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    } else {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(employees.map(emp => emp.employeeId || emp.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  // Helper: check if a specific day is immutable (approved leave) for a given employee attendance record
  const isDayImmutable = (empAttendance: AttendanceRecord | undefined, day: number) => {
    if (!empAttendance) return false;
    const rec = (empAttendance as any)[day];
    return !!(rec && rec.immutable === true);
  };

  const handleEmployeeDayClick = (employeeId: string, day: number) => {
    if (loadingAttendanceForGrid) return; // Prevent interaction while page attendance is loading
    if (bulkMode === 'day' && day !== selectedBulkDay) return; // Only selected day is interactive in day mode
    const isHoliday = isSunday(day) || !!holidays[day];
    if (isHoliday) return;

    const empAttendance = attendanceByEmployee[employeeId] || {};

    // If the day is marked immutable (approved leave), prevent edits and notify
    if (isDayImmutable(empAttendance, day)) {
      toast({ title: 'Locked', description: `Day ${day} is locked (approved leave) for this employee`, variant: 'default' });
      return;
    }

    const status = empAttendance[day]?.status;

    const newEmpAttendance = { ...empAttendance };

    if (status === 'present') {
      newEmpAttendance[day] = { status: 'firsthalf' };
    } else if (status === 'firsthalf') {
      newEmpAttendance[day] = { status: 'secondhalf' };
    } else if (status === 'secondhalf') {
      newEmpAttendance[day] = { status: 'absent' };
    } else if (status === 'absent') {
      setSelectedDay(day);
      setSelectedEmployeeForLeave(employeeId);
      // Fetch leave types for the selected employee before showing dialog
      fetchLeaveAllotmentsForEmployee(employeeId);
      setShowLeaveDialog(true);
    } else if (status === 'leave') {
      delete newEmpAttendance[day];
    } else {
      newEmpAttendance[day] = { status: 'present' };
    }

    setAttendanceByEmployee({ ...attendanceByEmployee, [employeeId]: newEmpAttendance });
  };

  const handleLeaveTypeSelect = (leaveType: string) => {
    if (selectedDay !== null && selectedEmployeeForLeave) {
      const empAttendance = { ...(attendanceByEmployee[selectedEmployeeForLeave] || {}) };

      // Prevent setting leave on an immutable day
      if (isDayImmutable(empAttendance, selectedDay)) {
        toast({ title: 'Locked', description: `Day ${selectedDay} is locked and cannot be modified`, variant: 'default' });
        setShowLeaveDialog(false);
        setSelectedDay(null);
        setSelectedEmployeeForLeave(null);
        return;
      }

      empAttendance[selectedDay] = { status: 'leave', leaveType };
      setAttendanceByEmployee({ ...attendanceByEmployee, [selectedEmployeeForLeave]: empAttendance });
      setShowLeaveDialog(false);
      setSelectedDay(null);
      setSelectedEmployeeForLeave(null);
      toast({
        title: 'Success',
        description: `Day ${selectedDay} marked as ${leaveType}`
      });
    }
  };

  const markAllPresent = () => {
    // For all selected employees mark all working days as present, but skip immutable days
    const newByEmployee = { ...attendanceByEmployee };
    let skipped = 0;
    for (const empId of selectedEmployees) {
      const empAttendance = { ...(newByEmployee[empId] || {}) };
      if (bulkMode === 'day') {
        const day = selectedBulkDay;
        if (day && !isSunday(day) && !holidays[day]) {
          if (isDayImmutable(empAttendance, day)) skipped++;
          else empAttendance[day] = { status: 'present' };
        }
      } else {
        for (let day = 1; day <= daysInMonth; day++) {
          if (!isSunday(day) && !holidays[day]) {
            if (isDayImmutable(empAttendance, day)) skipped++;
            else empAttendance[day] = { status: 'present' };
          }
        }
      }
      newByEmployee[empId] = empAttendance;
    }
    setAttendanceByEmployee(newByEmployee);
    const msg = skipped > 0 ? `All working days marked as present for selected employees (skipped ${skipped} locked day(s))` : 'All working days marked as present for selected employees';
    toast({
      title: 'Success',
      description: msg,
    });
  };

  const markDayForAll = (day: number, status: AttendanceStatus) => {
    const newByEmployee = { ...attendanceByEmployee };
    let skipped = 0;
    for (const empId of selectedEmployees) {
      const empAttendance = { ...(newByEmployee[empId] || {}) };
      if (isDayImmutable(empAttendance, day)) {
        skipped++;
      } else {
        empAttendance[day] = { status };
      }
      newByEmployee[empId] = empAttendance;
    }
    setAttendanceByEmployee(newByEmployee);
    const msg = skipped > 0 ? `Day ${day} marked as ${status} for selected employees (skipped ${skipped} locked day(s))` : `Day ${day} marked as ${status} for selected employees`;
    toast({
      title: 'Success',
      description: msg,
    });
  };

  const handleBulkSubmit = async () => {
    if (selectedEmployees.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one employee',
        variant: 'destructive',
      });
      return;
    }

    if (Object.keys(attendanceByEmployee).length === 0 || selectedEmployees.every(s => !attendanceByEmployee[s] || Object.keys(attendanceByEmployee[s] || {}).length === 0)) {
      toast({
        title: 'Error',
        description: 'Please mark attendance before submitting',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Build attendance map per employee - ensure proper format
      const attendanceData: { [employeeId: string]: AttendanceRecord } = {};
      for (const empId of selectedEmployees) {
        const empAttendance = attendanceByEmployee[empId] || {};
        // Clean the attendance data - remove any undefined/null entries
        const cleanedAttendance: AttendanceRecord = {};
        Object.keys(empAttendance).forEach((dayKey) => {
          const day = Number(dayKey);
          const record = empAttendance[day];
          if (record && record.status) {
            cleanedAttendance[day] = {
              status: record.status,
              ...(record.leaveType ? { leaveType: record.leaveType } : {})
            };
          }
        });
        attendanceData[empId] = cleanedAttendance;
        console.log(`[BulkAttendance] Employee ${empId}: ${Object.keys(cleanedAttendance).length} days marked`, cleanedAttendance);
      }

      console.log('[BulkAttendance] Submitting data:', {
        employeeCount: selectedEmployees.length,
        firstEmployee: selectedEmployees[0],
        firstEmployeeData: attendanceData[selectedEmployees[0]],
        mode: bulkMode,
        day: bulkMode === 'day' ? selectedBulkDay : undefined
      });

      const response = await fetch(`${getApiBaseUrl()}/api/attendance/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          employeeIds: selectedEmployees,
          month,
          year,
          attendanceData,
          mode: bulkMode,
          day: bulkMode === 'day' ? selectedBulkDay : undefined,
          lockAfterSave: lockAfterSave
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Failed to submit bulk attendance');
      }

      const result = await response.json();
      const successCount = result.summary?.successful || 0;
      const failedCount = result.summary?.failed || 0;

      // Show skipped info if present
      const skipped = result.results?.skipped || result.skipped || {};
      const skippedEmployees = Object.keys(skipped || {});

      if (failedCount > 0 || skippedEmployees.length > 0 || result.lockedCount) {
        let msg = `Attendance saved for ${successCount} employee(s). ${failedCount} failed.`;
        if (skippedEmployees.length > 0) {
          msg += ` Skipped locked days for ${skippedEmployees.length} employee(s).`;
        }
        if (result.lockedCount) {
          msg += ` Locked ${result.lockedCount} attendance record(s).`;
        }
        toast({ title: 'Partial Success', description: msg, variant: 'default' });
        // Optionally show details for skipped (first few)
        if (skippedEmployees.length > 0) {
          const details = skippedEmployees.slice(0, 5).map(id => `${id}: ${skipped[id].join(', ')}`).join('; ');
          toast({ title: 'Skipped Days', description: details, variant: 'default' });
        }
      } else {
        toast({ title: 'Success', description: `Attendance saved for ${successCount} employee(s)` });
      }

      setShowSubmitDialog(false);
      // Reload attendance for all employees to show saved data
      await loadAllEmployeeAttendanceForPage();

      // Clear cached leave allotments for affected employees so leave popup will refetch latest values
      try {
        for (const empId of selectedEmployees) {
          const cacheKey = `${empId}_${year}`;
          delete leaveAllotmentsCache.current[cacheKey];
        }
        // If leave dialog is open for an affected employee, refresh their leave allotments immediately
        if (showLeaveDialog && selectedEmployeeForLeave && selectedEmployees.includes(selectedEmployeeForLeave)) {
          await fetchLeaveAllotmentsForEmployee(selectedEmployeeForLeave);
        }
      } catch (e) {
        console.warn('Failed to clear/refresh leave allotments cache after bulk submit:', e);
      }
    } catch (e: any) {
      console.error('Bulk submit failed:', e);
      toast({ title: 'Error', description: e?.message || 'Failed to submit bulk attendance', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async (all = false) => {
    try {
      const headers = ["Name", "Employee Code", ...Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`), "Present", "Absent", "Leave"];
      const rows: string[][] = [];

      let filteredEmployees = employees.filter(e => selectedEmployees.includes(e.employeeId || e.id));
      if (all && selectedTeam) {
        // If user asked for 'all', request all team members and filter by selected employees
        const resp = await fetch(`${getApiBaseUrl()}/api/teams/${selectedTeam}/members?page=1&pageSize=${Math.max(totalEmployees, 1)}`, { credentials: 'include' });
        if (resp.ok) {
          const rs = await resp.json();
          const allMembers = Array.isArray(rs) ? rs : (rs.members || []);
          filteredEmployees = allMembers.filter((e: any) => selectedEmployees.includes(e.employeeId || e.id));
        }
      }

      filteredEmployees.forEach(emp => {
        const empKey = emp.employeeId || emp.id; // internal db id used for lookups/saves
        const empKeyExport = emp.employeeCode || ''; // public code for export
        const empAttendance = attendanceByEmployee[empKey] || {};
        const row: string[] = [emp.name, empKeyExport];
        for (let d = 1; d <= daysInMonth; d++) {
          const r = empAttendance[d];
          if (!r) row.push('');
          else if (r.status === 'present') row.push('P');
          else if (r.status === 'absent') row.push('A');
          else if (r.status === 'firsthalf') row.push('1H');
          else if (r.status === 'secondhalf') row.push('2H');
          else if (r.status === 'leave') row.push(r.leaveType || 'L');
          else if (r.status === 'holiday') row.push('H');
        }
        row.push(String(Object.values(empAttendance).filter(x => x.status === 'present').length));
        row.push(String(Object.values(empAttendance).filter(x => x.status === 'absent').length));
        row.push(String(Object.values(empAttendance).filter(x => x.status === 'leave').length));
        rows.push(row);
      });

      const csvContent = [headers, ...rows].map(e => e.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk-attendance-${month}-${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Success', description: 'CSV exported' });
    } catch (err) {
      console.error('Failed to export CSV', err);
      toast({ title: 'Error', description: 'Failed to export CSV', variant: 'destructive' });
    }
  };

  const handleExportXLSX = async (all = false) => {
    try {
      let filteredEmployees = employees.filter(e => selectedEmployees.includes(e.employeeId || e.id));
      if (all && selectedTeam) {
        const resp = await fetch(`${getApiBaseUrl()}/api/teams/${selectedTeam}/members?page=1&pageSize=${Math.max(totalEmployees, 1)}`, { credentials: 'include' });
        if (resp.ok) {
          const rs = await resp.json();
          const allMembers = Array.isArray(rs) ? rs : (rs.members || []);
          filteredEmployees = allMembers.filter((ee: any) => selectedEmployees.includes(ee.employeeId || ee.id));
        }
      }

      const headers = ["Name", "Employee Code", ...Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`), "Present", "Absent", "Leave"];
      const rows: any[][] = [];
      filteredEmployees.forEach(emp => {
        const empKey = emp.employeeId || emp.id; // internal db id
        const empKeyExport = emp.employeeCode || ''; // public code for export
        const empAttendance = attendanceByEmployee[empKey] || {};
        const row: any[] = [emp.name, empKeyExport];
        for (let d = 1; d <= daysInMonth; d++) {
          const r = empAttendance[d];
          if (!r) row.push('');
          else if (r.status === 'present') row.push('P');
          else if (r.status === 'absent') row.push('A');
          else if (r.status === 'firsthalf') row.push('1H');
          else if (r.status === 'secondhalf') row.push('2H');
          else if (r.status === 'leave') row.push(r.leaveType || 'L');
          else if (r.status === 'holiday') row.push('H');
        }
        row.push(String(Object.values(empAttendance).filter(x => (x as any).status === 'present').length));
        row.push(String(Object.values(empAttendance).filter(x => (x as any).status === 'absent').length));
        row.push(String(Object.values(empAttendance).filter(x => (x as any).status === 'leave').length));
        rows.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `bulk-attendance-${month}-${year}.xlsx`);
      toast({ title: 'Success', description: 'XLSX exported' });
    } catch (err) {
      console.error('Failed to export XLSX', err);
      toast({ title: 'Error', description: 'Failed to export XLSX', variant: 'destructive' });
    }
  };

  const handlePrint = async (all = false) => {
    const filteredEmployees = employees.filter(e => selectedEmployees.includes(e.employeeId || e.id));
    let employeesToPrint = filteredEmployees;
    if (all && selectedTeam) {
      const resp = await fetch(`${getApiBaseUrl()}/api/teams/${selectedTeam}/members?page=1&pageSize=${Math.max(totalEmployees, 1)}`, { credentials: 'include' });
      if (resp.ok) {
        const rs = await resp.json();
        const allMembers = Array.isArray(rs) ? rs : (rs.members || []);
        employeesToPrint = allMembers.filter((e: any) => selectedEmployees.includes(e.employeeId || e.id));
      }
    }
    const printableTable = document.createElement('table');
    printableTable.style.borderCollapse = 'collapse';
    printableTable.style.width = '100%';
    const thead = printableTable.createTHead();
    const headerRow = thead.insertRow();
    const addTH = (txt: string) => { const th = document.createElement('th'); th.style.border = '1px solid #ddd'; th.style.padding = '8px'; th.innerText = txt; headerRow.appendChild(th); };
    addTH('Name'); addTH('Employee Code');
    for (let d = 1; d <= daysInMonth; d++) addTH(String(d));
    addTH('Present'); addTH('Absent'); addTH('Leave');

    const tbody = printableTable.createTBody();
    employeesToPrint.forEach(emp => {
      const empKey = emp.employeeId || emp.id; // internal id for attendance lookup
      const empExportKey = emp.employeeCode || ''; // public code
      const empAttendance = attendanceByEmployee[empKey] || {};
      const row = tbody.insertRow();
      const addTD = (txt: string) => { const td = row.insertCell(); td.style.border = '1px solid #ddd'; td.style.padding = '4px'; td.style.fontSize = '12px'; td.innerText = txt; };
      addTD(emp.name); addTD(empExportKey);
      for (let d = 1; d <= daysInMonth; d++) {
        const r = empAttendance[d];
        if (!r) addTD('');
        else if (r.status === 'present') addTD('P');
        else if (r.status === 'absent') addTD('A');
        else if (r.status === 'firsthalf') addTD('1H');
        else if (r.status === 'secondhalf') addTD('2H');
        else if (r.status === 'leave') addTD(r.leaveType || 'L');
        else if (r.status === 'holiday') addTD('H');
      }
      addTD(String(Object.values(empAttendance).filter(x => x.status === 'present').length));
      addTD(String(Object.values(empAttendance).filter(x => x.status === 'absent').length));
      addTD(String(Object.values(empAttendance).filter(x => x.status === 'leave').length));
    });

    const newWin = window.open('', '', 'width=1400,height=900');
    if (!newWin) return toast({ title: 'Error', description: 'Unable to open print window', variant: 'destructive' });
    const style = `
      <style>
        @page { size: landscape; margin: 8mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 6px; font-size: 12px; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        th { background: #f3f4f6; }
      </style>
    `;
    newWin.document.write('<html><head><title>Bulk Attendance</title>' + style + '</head><body>');
    newWin.document.write(printableTable.outerHTML);
    newWin.document.write('</body></html>');
    newWin.document.close();
    newWin.focus();
    newWin.print();
    newWin.close();
  };

  // Handlers moved above so they're available to the keyboard navigation effect.

  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const getStatusColor = (status?: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return 'bg-green-500 hover:bg-green-600';
      case 'firsthalf':
        return 'bg-teal-500 hover:bg-teal-600';
      case 'secondhalf':
        return 'bg-cyan-500 hover:bg-cyan-600';
      case 'absent':
        return 'bg-red-500 hover:bg-red-600';
      case 'leave':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'holiday':
        return 'bg-blue-500 cursor-not-allowed';
      default:
        return 'bg-gray-200 hover:bg-gray-300';
    }
  };

  const getStatusLabel = (day: number) => {
    const record = attendance[day];
    if (!record) return '';

    if (record.status === 'leave' && record.leaveType) {
      return record.leaveType;
    }

    if (record.status === 'firsthalf') return '1H';
    if (record.status === 'secondhalf') return '2H';

    return record.status?.charAt(0).toUpperCase();
  };

  // Helper moved earlier to be available to handlers declared before it.

  if (loading && teams.length === 0) {
    return <SkeletonLoader />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="container mx-auto p-4 space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Bulk Attendance Marking</h2>
        <p className="text-sm text-muted-foreground">Mark attendance for team or individual employees</p>
        {bulkMode === 'day' && (
          <p className="text-sm text-yellow-700 mt-1">Single day mode — only Day {selectedBulkDay} is editable.</p>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Select Team & Employees</CardTitle>
          <CardContent className={`${compactSelect ? 'space-y-2' : 'space-y-4'}`}>
            <div className="grid grid-cols-4 gap-4 items-start">
              <div className="col-span-1 space-y-2">
                <Label htmlFor="team-select">Select Team</Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger id="team-select">
                    <SelectValue placeholder="Choose a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label htmlFor="marking-mode-select">Marking Mode</Label>
                <Select value={bulkMode} onValueChange={(v) => setBulkMode(v as 'day' | 'month')}>
                  <SelectTrigger id="marking-mode-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Single Day</SelectItem>
                    <SelectItem value="month">Whole Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Select Employees ({selectedEmployees.length}/{totalEmployees || employees.length})</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox id="select-all" checked={selectedEmployees.length === employees.length} onCheckedChange={handleSelectAll} />
                      <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">Select Page</label>
                    </div>
                  </div>
                  <div className={`border rounded-lg p-3 overflow-y-auto space-y-2 ${compactSelect ? 'max-h-40' : 'max-h-64'}`}>
                    {selectedTeam && employees.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">No members found in this team.</div>
                    ) : (
                      employees.map((employee) => (
                        <div key={employee.employeeId || employee.id} className={`flex items-center gap-2 ${compactSelect ? 'p-1' : 'p-2'} hover:bg-gray-50 rounded`}>
                          <Checkbox id={`emp-${employee.employeeId || employee.id}`} checked={selectedEmployees.includes(employee.employeeId || employee.id)} onCheckedChange={(checked) => handleEmployeeSelection(employee.employeeId || employee.id, checked as boolean)} />
                          <label htmlFor={`emp-${employee.employeeId || employee.id}`} className="flex-1 cursor-pointer text-sm">
                            <div className={`${compactSelect ? 'font-medium text-sm' : 'font-medium'}`}>{employee.name}</div>
                            <div className="text-xs text-gray-500 truncate">{employee.email} {employee.departmentName && (<span className="ml-2">• {employee.departmentName}</span>)} {employee.designationName && (<span className="ml-2">• {employee.designationName}</span>)}{employee.employeeCode && (<span className="ml-2 text-xs font-mono">{employee.employeeCode}</span>)}</div>
                          </label>
                          <div className="flex gap-1 items-center">
                            <Button size="sm" variant="default" onClick={() => saveEmployeeAttendance(employee.employeeId || employee.id)} disabled={employeeSaving[employee.employeeId || employee.id] === true || loadingAttendanceForGrid || employeeLoading[employee.employeeId || employee.id] === true}>{employeeSaving[employee.employeeId || employee.id] ? 'Saving' : 'Save'}</Button>
                            {employeeLoading[employee.employeeId || employee.id] === true && (<div className="text-xs text-gray-500 ml-2">Loading...</div>)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handlePrevMonth} variant="outline" size="sm">← Previous</Button>
                    <Button onClick={handleNextMonth} variant="outline" size="sm">Next →</Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-500" /> Present</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-500" /> Absent</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-yellow-500" /> Leave</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-teal-500" /> 1H</div>
                </div>
                {bulkMode === 'day' && (<div className="px-4 pb-3 text-xs text-muted-foreground">Use ← / → or Prev/Next buttons to change the selected day.</div>)}
              </div>
            </div>
          </CardContent>
        </CardHeader>
          <CardContent className="py-3 px-4 space-y-3">
            {/* Action Buttons */}
            {selectedTeam && employees.length > 0 ? (
              <div className="flex gap-2 flex-wrap items-center w-full">
              <div className="flex items-center gap-2">
                <Button
                  onClick={markAllPresent}
                  variant="default"
                  size="sm"
                  disabled={loading || loadingAttendanceForGrid}
                >
                  Mark All Present
                </Button>
                {bulkMode === 'day' && (
                  <>
                    <Button
                      onClick={() => markDayForAll(selectedBulkDay, 'present')}
                      variant="outline"
                      size="sm"
                      className="bg-green-100"
                      disabled={loading || loadingAttendanceForGrid}
                    >
                      Present
                    </Button>
                    <Button
                      onClick={() => markDayForAll(selectedBulkDay, 'absent')}
                      variant="outline"
                      size="sm"
                      className="bg-red-100"
                      disabled={loading || loadingAttendanceForGrid}
                    >
                      Absent
                    </Button>
                  </>
                )}
              </div>

              {/* Export & Print Controls - shown only when a team is selected and has members */}
              {selectedTeam && employees.length > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => loadAllEmployeeAttendanceForPage()} disabled={loadingAttendanceForGrid}>Reload Attendance</Button>
                  <Button onClick={() => handleExportCSV()} size="sm" variant="outline" disabled={loadingAttendanceForGrid}>Export CSV (Page)</Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => handleExportCSV(true)} size="sm" variant="outline" disabled={loadingAttendanceForGrid}>Export CSV (All)</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">Exports all team members (attendance for non-loaded employees may be empty).</div>
                    </TooltipContent>
                  </Tooltip>
                  <Button onClick={() => handleExportXLSX()} size="sm" variant="outline" disabled={loadingAttendanceForGrid}>Export XLSX (Page)</Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => handleExportXLSX(true)} size="sm" variant="outline" disabled={loadingAttendanceForGrid}>Export XLSX (All)</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">Exports all team members (attendance for non-loaded employees may be empty).</div>
                    </TooltipContent>
                  </Tooltip>
                  <Button onClick={() => handlePrint()} size="sm" variant="outline" disabled={loadingAttendanceForGrid}>Print (Page)</Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => handlePrint(true)} size="sm" variant="outline" disabled={loadingAttendanceForGrid}>Print (All)</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">Print all selected team members (attendance for non-loaded employees may be empty).</div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
            ) : null }

            {/* Per-employee grid and related controls - show only when a team with members is selected */}
            {selectedTeam && employees.length > 0 ? (
              <>
                {loadingAttendanceForGrid && (
                  <div className="mb-2 p-2 bg-blue-50 border border-blue-100 rounded flex items-center gap-2 text-blue-700 text-sm">
                    <span className="animate-spin inline-block">⏳</span>
                    <div>Loading attendance for page...</div>
                  </div>
                )}
                <div className="overflow-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="sticky top-0 z-20 p-2 font-medium border-b bg-primary text-primary-foreground text-[13px]">
                        <th className="sticky top-0 left-0 z-20 bg-primary text-primary-foreground border p-2 min-w-[180px] text-left">Employee Name</th>
                        <th className="sticky top-0 left-[180px] z-20 bg-primary text-primary-foreground border p-2 min-w-[120px]">Employee Code</th>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                          const headerSelected = bulkMode === 'day' && day === selectedBulkDay;
                          return (
                            <th key={`h-${day}`} className={`border px-2 py-1 text-[10px] text-center ${headerSelected ? 'bg-indigo-50' : ''}`}>{day}</th>
                          );
                        })}
                        <th className="border px-3 py-2 text-center">Present</th>
                        <th className="border px-3 py-2 text-center">Absent</th>
                        <th className="border px-3 py-2 text-center">Leave</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => {
                        const empKey = emp.employeeId || emp.id;
                        const isEmployeeLocked = employeeLocked[empKey]?.locked === true;
                        const lockReason = employeeLocked[empKey]?.reason || '';
                        return (
                          <tr key={empKey} className={`hover:bg-gray-50 ${isEmployeeLocked ? 'bg-red-50' : ''}`}>
                            <td className={`sticky left-0 top-0 z-10 border p-2 min-w-[180px] ${isEmployeeLocked ? 'bg-red-50' : 'bg-white'}`}>
                              <div className="flex items-center gap-2 min-w-0 justify-between">
                                <div className="font-medium text-sm truncate flex-1 min-w-0">{emp.name}</div>
                                {isEmployeeLocked && (
                                  <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1" title={lockReason}>
                                    🔒 {lockReason === 'Salary generated' ? 'Salary' : 'Locked'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className={`sticky left-[180px] top-0 z-10 border p-2 text-xs font-mono min-w-[120px] ${isEmployeeLocked ? 'bg-red-50' : 'bg-white'}`}>{emp.employeeCode || ''}</td>
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                              const empAttendance = attendanceByEmployee[empKey] || {};
                              const status = empAttendance[day]?.status;
                              const isHoliday = isSunday(day) || !!holidays[day];
                              const isImmutableDay = !!((empAttendance as any)[day] && (empAttendance as any)[day].immutable === true);
                              const disabledByMode = bulkMode === 'day' && day !== selectedBulkDay;
                              const cellDisabled = disabledByMode || loadingAttendanceForGrid || isHoliday || isEmployeeLocked || isImmutableDay;
                              const label = (() => {
                                if (!status) return '';
                                if (status === 'leave' && empAttendance[day]?.leaveType) return empAttendance[day].leaveType;
                                if (status === 'firsthalf') return '1H';
                                if (status === 'secondhalf') return '2H';
                                return status.charAt(0).toUpperCase();
                              })();

                              return (
                                <td
                                  key={`${empKey}-${day}`}
                                  className={`border p-1 text-center ${cellDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                  onClick={!cellDisabled ? () => handleEmployeeDayClick(empKey, day) : undefined}
                                >
                                  <div className={`h-8 w-8 rounded flex items-center justify-center text-xs ${getStatusColor(status)} ${cellDisabled ? 'opacity-60' : ''}`} title={isImmutableDay ? `Locked (Approved leave)` : ''}>
                                    {isHoliday ? 'H' : label}
                                    {isImmutableDay && !isHoliday && <span className="ml-1 text-xs">🔒</span>}
                                  </div>
                                </td>
                              );
                            })}

                            {/* Totals */}
                            <td className="border px-2 py-1 text-center">{Object.values(attendanceByEmployee[empKey] || {}).filter(r => r.status === 'present').length}</td>
                            <td className="border px-2 py-1 text-center">{Object.values(attendanceByEmployee[empKey] || {}).filter(r => r.status === 'absent').length}</td>
                            <td className="border px-2 py-1 text-center">{Object.values(attendanceByEmployee[empKey] || {}).filter(r => r.status === 'leave').length}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Lock after save option */}
                <div className="flex items-center gap-3 mb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={lockAfterSave} onChange={(e) => setLockAfterSave(e.target.checked)} />
                    <span>Lock attendance after save</span>
                  </label>
                  <div className="text-sm text-muted-foreground">If enabled, attendance records successfully saved will be locked to prevent further edits.</div>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={() => setShowSubmitDialog(true)}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={Object.keys(attendanceByEmployee).length === 0 || loading || loadingAttendanceForGrid}
                >
                  {loading ? 'Submitting...' : loadingAttendanceForGrid ? 'Loading attendance...' : `Submit for ${selectedEmployees.length} Employee(s)`}
                </Button>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between gap-2 mt-3">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-600">Rows per page:</div>
                    <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                      <SelectTrigger className="h-7 w-24 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pageSizeOptions.map((opt) => (
                          <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-600">{`Showing ${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, totalEmployees)} of ${totalEmployees}`}</div>
                    <Button disabled={page === 1} variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
                    <Button disabled={page * pageSize >= totalEmployees} variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              </>
            ) : null }
          </CardContent>
        </Card>
      

      {/* Leave Type Selection Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={(open) => {
        setShowLeaveDialog(open);
        if (!open) {
          setSelectedDay(null);
          setSelectedEmployeeForLeave(null);
        }
      }}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Select Leave Type</AlertDialogTitle>
            <AlertDialogDescription>
              Choose the type of leave for Day {selectedDay}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-1 gap-2 my-4 max-h-96 overflow-y-auto">
            {leaveTypes.length > 0 ? (
              <>
                {leaveTypes.some(l => l.allocated === 0 && l.disabled) && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-2">
                    <p className="text-xs text-yellow-800">
                      ⚠️ No leave allotment found for {year}. Only unpaid leaves are available.
                      <br />Please contact admin for leave allotment.
                    </p>
                  </div>
                )}
                {leaveTypes.map((leave) => (
                  <Button
                    key={leave.code}
                    onClick={() => handleLeaveTypeSelect(leave.code)}
                    variant="outline"
                    disabled={leave.disabled || (leave.remaining ?? 0) <= 0}
                    className={`h-auto py-3 px-4 flex justify-between items-center text-left ${
                      leave.disabled || (leave.remaining ?? 0) <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base">{leave.code}</span>
                        <span className="text-sm text-gray-700">{leave.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {(leave.allocated ?? 0) === 999 ? (
                          <span className="text-green-600 font-medium">Unlimited</span>
                        ) : (
                          <>
                            Allocated: {leave.allocated ?? 0} | Used: {leave.used ?? 0} |
                            <span className={(leave.remaining ?? 0) > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                              {' '}Remaining: {leave.remaining ?? 0}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {(leave.disabled || (leave.remaining ?? 0) <= 0) && (leave.allocated ?? 0) !== 999 && (
                      <span className="text-xs text-red-600 font-medium">Not allocated</span>
                    )}
                  </Button>
                ))}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No leave types available</p>
                <p className="text-xs mt-2">Please contact admin</p>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setSelectedDay(null); setSelectedEmployeeForLeave(null); }}>
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Bulk Attendance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark attendance for {selectedEmployees.length} employee(s) for {bulkMode === 'day' ? `day ${selectedBulkDay}` : 'the entire month'} of {monthName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkSubmit}
              className="bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Confirm Submit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
