import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { authenticatedFetch } from '@/lib/fetchWithLoader';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

type AttendanceStatus = 'present' | 'absent' | 'leave' | 'holiday' | 'firsthalf' | 'secondhalf';

interface AttendanceRecord {
  [day: number]: {
    status: AttendanceStatus;
    leaveType?: string;
  };
}

interface LeaveType {
  code: string;
  name: string;
  allocated: number;
  used: number;
  remaining: number;
  disabled?: boolean;
}

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface Employee {
  id: string;
  employeeId?: string;
  name: string;
  email: string;
  departmentName?: string;
  designation?: string;
}

export default function MonthlyAttendance() {
    // Role-based access control
    const employeeRole = localStorage.getItem('employeeRole')?.toLowerCase() || '';
    const isSuperAdmin = employeeRole === 'superadmin';
    const isAdmin = employeeRole === 'admin';
    const isAllowed = employeeRole === 'admin' || employeeRole === 'user' || employeeRole === 'superadmin';
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
  const [attendance, setAttendance] = useState<AttendanceRecord>({});
  const [loading, setLoading] = useState(false); // Loading state for calendar/attendance data
  const [loadingEmployees, setLoadingEmployees] = useState(isAdmin || isSuperAdmin); // Loading state for employee dropdown

  // Team and employee selection
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>(isSuperAdmin ? 'all' : '');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');
  // Only fetch attendance on explicit selection by the user (or when refreshing month/year for loaded employee)
  const [shouldFetchOnSelect, setShouldFetchOnSelect] = useState<boolean>(false);
  const [loadedEmployeeId, setLoadedEmployeeId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [holidays, setHolidays] = useState<{ [day: number]: string }>({});
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const leaveAllotmentsCache = useRef<Record<string, LeaveType[]>>({});
  const [noSavedAttendance, setNoSavedAttendance] = useState(false);
  const [leaveDetails, setLeaveDetails] = useState<{ [key: string]: number }>({});
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [lockedAt, setLockedAt] = useState<string | null>(null);
  const [showLeaveDetails, setShowLeaveDetails] = useState(false);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const daysInMonth = new Date(year, month, 0).getDate();

  // Check if a day is Sunday
  const isSunday = (day: number) => {
    const date = new Date(year, month - 1, day);
    return date.getDay() === 0;
  };

  // Check if a day can be edited in this view (respect global lock, submission and per-day immutability)
  const canEditDay = (day: number) => {
    if (isLocked || isSubmitted) return false;
    const rec = attendance[day] as any;
    if (rec && rec.immutable) return false; // e.g., approved leave made it immutable
    return true;
  };

  useEffect(() => {
    if (isAdmin || isSuperAdmin) {
      fetchTeams();
      fetchAllEmployees();
    }
  }, []);

  // Removed auto-load on mount - data only loads when user selects employee

  useEffect(() => {
    if (!selectedTeam || selectedTeam === 'all') {
      // show all employees when no specific team is selected
      fetchAllEmployees();
      return;
    }
    fetchTeamEmployees(selectedTeam);
  }, [selectedTeam]);

  useEffect(() => {
    // When employee or month/year changes, refresh attendance only in two scenarios:
    // 1. The user explicitly selected an employee (shouldFetchOnSelect true)
    // 2. The loaded employee matches the selected employee and month/year changed
    const shouldRefreshForMonthChange = (loadedEmployeeId && loadedEmployeeId === selectedEmployee);

    if (shouldFetchOnSelect && selectedEmployee) {
      // Only clear state when actually fetching new data
      setAttendance({});
      setIsSubmitted(false);
      setLeaveTypes([]); // Clear previous employee's leave types
      fetchAttendance();
      fetchLeaveAllotments();
      setShouldFetchOnSelect(false);
      setLoadedEmployeeId(selectedEmployee);
      return;
    }

    if (shouldRefreshForMonthChange && selectedEmployee) {
      // Only clear state when actually fetching new data
      setAttendance({});
      setIsSubmitted(false);
      setLeaveTypes([]); // Clear previous employee's leave types
      fetchAttendance();
      fetchLeaveAllotments();
    }
  }, [month, year, selectedEmployee, shouldFetchOnSelect, loadedEmployeeId]);

  const fetchTeams = async () => {
    try {
      console.log('[MonthlyAttendance] fetchTeams - Debug Info:', {
        isAdmin,
        isSuperAdmin,
        employeeRole
      });

      // For superadmin: keep existing behavior and fetch all teams
      if (isSuperAdmin) {
        console.log('[MonthlyAttendance] SuperAdmin - fetching all teams');
        const response = await authenticatedFetch(`${getApiBaseUrl()}/api/teams`);
        if (response.ok) {
          const data = await response.json();
          console.log('[MonthlyAttendance] Teams received:', data);
          setTeams(Array.isArray(data) ? data : []);
        } else {
          setTeams([]);
        }

        return;
      }

      // For non-superadmins (admins and reporting users), only show teams where the
      // logged-in employee is a reporting person (RP1/RP2/RP3). Do not fall back to all teams.
      console.log('[MonthlyAttendance] Fetching teams where logged-in employee is a reporting person');
      const reportingResponse = await authenticatedFetch(`${getApiBaseUrl()}/api/teams/my-reporting-teams`);

      if (reportingResponse.ok) {
        const reportingTeams = await reportingResponse.json();
        console.log('[MonthlyAttendance] Reporting teams received:', reportingTeams);
        setTeams(Array.isArray(reportingTeams) ? reportingTeams : []);
      } else {
        console.error('[MonthlyAttendance] Failed to fetch reporting teams, status:', reportingResponse.status);
        setTeams([]);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      setTeams([]);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/employees`);
      if (response.ok) {
        const data = await response.json();
        const employeeList = Array.isArray(data) ? data : [];
        setEmployees(employeeList);
        // Don't auto-select any employee on initial load - wait for user to select team or employee
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchTeamEmployees = async (teamId: string) => {
    try {
      setLoadingEmployees(true);
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/teams/${teamId}/members`);
      if (response.ok) {
        const data = await response.json();
        const employeeList = Array.isArray(data) ? data : [];
        setEmployees(employeeList);
        // Only set selected employee to first member if current selection is not present or not in the new list
        // Use employeeId (from team_members.employeeId) not id (team_members.id)
        const currentSelectedExists = employeeList.find((e: any) => e.employeeId === selectedEmployee);
        if ((!selectedEmployee || selectedEmployee === '') || !currentSelectedExists) {
          if (employeeList.length > 0) {
            setSelectedEmployee(employeeList[0].employeeId); // Use employeeId, not id
            setSelectedEmployeeName(employeeList[0].name);
            // Programmatic auto-selection - trigger attendance load
            setShouldFetchOnSelect(true);
          }
        }
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error('Failed to fetch team employees:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchAttendance = async () => {
    if (!selectedEmployee) return;
    try {
      setLoading(true);
      setNoSavedAttendance(false);
      console.debug('[MonthlyAttendance] fetchAttendance: selectedEmployee:', selectedEmployee, 'month:', month, 'year:', year);

      // Fetch holidays from Holiday Master
      const holidaysResponse = await authenticatedFetch(
        `${getApiBaseUrl()}/api/holidays/month/${year}/${month}`
      );
      const holidaysData = holidaysResponse.ok ? await holidaysResponse.json() : [];
      
      // Create a map of holiday dates
      const holidayMap: { [day: number]: string } = {};
      holidaysData.forEach((holiday: any) => {
        const holidayDate = new Date(holiday.date);
        const day = holidayDate.getDate();
        holidayMap[day] = holiday.name;
      });
      setHolidays(holidayMap);

      // Initialize with Sundays and holidays from Holiday Master
      const initialAttendance: AttendanceRecord = {};
      for (let day = 1; day <= daysInMonth; day++) {
        if (isSunday(day) || holidayMap[day]) {
          initialAttendance[day] = { status: 'holiday' };
        }
      }

      const response = await authenticatedFetch(
        `${getApiBaseUrl()}/api/attendance/${selectedEmployee}/${month}/${year}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.debug('[MonthlyAttendance] fetchAttendance: response data:', data);
        // Set locked status (handle undefined gracefully)
        setIsLocked(data?.locked === true);
        setLockedBy(data?.lockedBy || null);
        setLockedAt(data?.lockedAt || null);
        
        if (data?.attendanceData) {
          const existingData = JSON.parse(data.attendanceData);
          const mergedDataRaw = { ...existingData };
          const mergedData: AttendanceRecord = {};
          // Normalize keys and status values to match client expectations
          Object.keys(mergedDataRaw).forEach((k) => {
            const rec = mergedDataRaw[k];
            if (!rec) return;
            // map shorthand statuses to canonical status strings if needed
            let status = rec.status;
            if (!status) {
              status = 'absent';
            } else if (typeof status === 'string') {
              const s = status.toLowerCase();
              if (s === 'p' || s === 'present') status = 'present';
              else if (s === 'a' || s === 'absent') status = 'absent';
              else if (s === '1h' || s === '1sthalf' || s === 'firsthalf') status = 'firsthalf';
              else if (s === '2h' || s === '2ndhalf' || s === 'secondhalf') status = 'secondhalf';
              else if (s === 'l' || s === 'leave') status = 'leave';
              else if (s === 'holiday') status = 'holiday';
            }
            const dayKey = Number(k);
            // Preserve immutable and leaveId (set by server when a leave is approved)
            mergedData[dayKey] = {
              status,
              ...(rec.leaveType ? { leaveType: rec.leaveType } : {}),
              ...(rec.leaveId ? { leaveId: rec.leaveId } : {}),
              ...(typeof rec.immutable !== 'undefined' ? { immutable: rec.immutable } : {}),
              ...(rec.holidayName ? { holidayName: rec.holidayName } : {}),
              ...(rec.holidayId ? { holidayId: rec.holidayId } : {}),
            } as any;
          });

          // Ensure Sundays and holidays remain as holidays (preserve any holidayName from stored data or holiday master)
          for (let day = 1; day <= daysInMonth; day++) {
            if (isSunday(day) || holidayMap[day]) {
              const existing = mergedData[day] || {} as any;
              // Preserve immutable / holidayId if present on existing record
              mergedData[day] = {
                status: 'holiday',
                holidayName: existing.holidayName || holidayMap[day] || undefined,
                ...(existing && typeof existing.immutable !== 'undefined' ? { immutable: existing.immutable } : {}),
                ...(existing && existing.holidayId ? { holidayId: existing.holidayId } : {}),
              } as any;
            }
          }

          setAttendance(mergedData);
          setNoSavedAttendance(false);
          setLoadedEmployeeId(selectedEmployee || null);
          setNoSavedAttendance(false);
          setIsSubmitted(data.submitted || false);

          // Calculate leave details
          calculateLeaveDetails(mergedData);
        } else {
          setAttendance(initialAttendance);
          setNoSavedAttendance(true);
          setIsSubmitted(false);
        }
      } else {
        console.warn('[MonthlyAttendance] fetchAttendance: response not ok', response.status, await response.text());
        setAttendance(initialAttendance);
        setNoSavedAttendance(true);
      }
    } catch (error) {
      console.error('[MonthlyAttendance] fetchAttendance: error', error);
      console.error('Failed to fetch attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendance data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateLeaveDetails = (attendanceData: AttendanceRecord) => {
    const leaveCounts: { [key: string]: number } = {};
    Object.values(attendanceData).forEach((record) => {
      if (record?.status === 'leave' && record.leaveType) {
        leaveCounts[record.leaveType] = (leaveCounts[record.leaveType] || 0) + 1;
      }
    });
    setLeaveDetails(leaveCounts);
  };

  const fetchLeaveAllotments = async () => {
    if (!selectedEmployee) return;
    try {
      const cacheKey = `${selectedEmployee}_${year}`;
      const cached = leaveAllotmentsCache.current[cacheKey];
      if (cached) {
        setLeaveTypes(cached);
        return;
      }
      const response = await authenticatedFetch(
        `${getApiBaseUrl()}/api/leave-allotments/employee/${selectedEmployee}/${year}`
      );

      if (response.ok) {
        const data = await response.json();
        // Transform backend response into LeaveType array
        const leaveTypeMap: Record<string, { code: string; name: string }> = {
          medicalLeave: { code: 'ML', name: 'Medical Leave' },
          casualLeave: { code: 'CL', name: 'Casual Leave' },
          earnedLeave: { code: 'EL', name: 'Earned Leave' },
          sickLeave: { code: 'SL', name: 'Sick Leave' },
          personalLeave: { code: 'PL', name: 'Personal Leave' },
          unpaidLeave: { code: 'UL', name: 'Unpaid Leave' },
          leaveWithoutPay: { code: 'LWP', name: 'Leave Without Pay' },
        };

        const types: LeaveType[] = Object.entries(leaveTypeMap).map(([key, { code, name }]) => ({
          code,
          name,
          allocated: data[key] || 0,
          used: leaveDetails[code] || 0,
          remaining: (data[key] || 0) - (leaveDetails[code] || 0),
          disabled: (data[key] || 0) === 0,
        }));

        leaveAllotmentsCache.current[cacheKey] = types;
        setLeaveTypes(types);
      }
    } catch (error) {
      console.error('Error fetching leave allotments:', error);
      setLeaveTypes([]);
    }
  };

    const createAttendanceForEmployee = async () => {
      if (!selectedEmployee) return;
      const payloadAttendance = { ...attendance };
      try {
        setLoading(true);
        const res = await authenticatedFetch(`${getApiBaseUrl()}/api/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: selectedEmployee,
            month,
            year,
            attendanceData: payloadAttendance,
          }),
        });
        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          if (body.skippedDays && body.skippedDays.length > 0) {
            toast({ title: 'Partial Success', description: body.message || `Some days were skipped: ${body.skippedDays.join(', ')}` });
          } else {
            toast({ title: 'Success', description: 'Attendance created.' });
          }
          // Re-fetch to get normalized data from server
          setShouldFetchOnSelect(true);
          // Clear cached leave allotments for this employee so the leave dialog will fetch fresh values
          try {
            const cacheKey = `${selectedEmployee}_${year}`;
            delete leaveAllotmentsCache.current[cacheKey];
            await fetchLeaveAllotments();
          } catch (e) {
            console.warn('Failed to clear/refresh leave allotments after creating attendance:', e);
          }
        } else {
          const err = await res.json().catch(() => ({ error: 'Failed'}));
          toast({ title: 'Error', description: err.error || 'Failed to create attendance', variant: 'destructive' });
        }
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || 'Failed to create attendance', variant: 'destructive' });
      } finally { setLoading(false); }
    };

  // Mark all working days as present (excluding Sundays and holidays)
  const markAllPresent = () => {
    if (isLocked || isSubmitted) {
      toast({
        title: 'Cannot Update',
        description: isLocked ? 'Attendance is locked' : 'Attendance already submitted',
        variant: 'destructive',
      });
      return;
    }
    const newAttendance: AttendanceRecord = { ...attendance };
    for (let day = 1; day <= daysInMonth; day++) {
      if (!isSunday(day) && !holidays[day]) {
        newAttendance[day] = { status: 'present' };
      }
    }
    setAttendance(newAttendance);
    toast({
      title: 'Success',
      description: 'All working days marked as present',
    });
  };

  const handleDayClick = async (day: number) => {
    const isHoliday = isSunday(day) || !!holidays[day];
    if (isHoliday || isSubmitted || isLocked) return;

    const current = attendance[day] as any;
    // Prevent editing if the day is immutable (approved leave)
    if (current && current.immutable) return;

    const status = current?.status;

    // Cycle through statuses: null → present → firsthalf → secondhalf → absent → leave → null
    if (status === 'present') {
      setAttendance({ ...attendance, [day]: { status: 'firsthalf' } });
    } else if (status === 'firsthalf') {
      setAttendance({ ...attendance, [day]: { status: 'secondhalf' } });
    } else if (status === 'secondhalf') {
      setAttendance({ ...attendance, [day]: { status: 'absent' } });
    } else if (status === 'absent') {
      // Show leave type dialog
      // Ensure we fetch fresh leave allotments for the selected employee (clear cache first)
      try {
        if (selectedEmployee) {
          const cacheKey = `${selectedEmployee}_${year}`;
          delete leaveAllotmentsCache.current[cacheKey];
          await fetchLeaveAllotments();
        }
      } catch (e) {
        console.warn('Failed to refresh leave allotments before opening leave dialog:', e);
      }

      setSelectedDay(day);
      setShowLeaveDialog(true);
    } else if (status === 'leave') {
      // Remove status (set to null/undefined)
      const newAttendance = { ...attendance };
      delete newAttendance[day];
      setAttendance(newAttendance);
    } else {
      // null or undefined → set to present
      setAttendance({ ...attendance, [day]: { status: 'present' } });
    }
  };

  const handleStatusChange = (status: AttendanceStatus) => {
    if (selectedDay === null) return;

    if (status === 'leave') {
      setShowLeaveDialog(true);
    } else {
      setAttendance({
        ...attendance,
        [selectedDay]: { status },
      });
      setSelectedDay(null);
    }
  };

  const handleLeaveTypeSelect = (leaveType: string) => {
    if (selectedDay !== null) {
      setAttendance({
        ...attendance,
        [selectedDay]: { status: 'leave', leaveType },
      });
      setShowLeaveDialog(false);
      setSelectedDay(null);
      toast({ 
        title: 'Success', 
        description: `Day ${selectedDay} marked as ${leaveType}` 
      });
    }
  };

  const handleLockAttendance = async () => {
    if (!selectedEmployee) {
      toast({
        title: 'Error',
        description: 'Employee not selected',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/attendance/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          month,
          year,
        }),
      });

      if (response.ok) {
        setIsLocked(true);
        toast({
          title: 'Success',
          description: 'Attendance locked successfully',
        });
        setShowLockDialog(false);
        fetchAttendance();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to lock attendance');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!selectedEmployee) {
      toast({
        title: 'Error',
        description: 'Employee not selected',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          month,
          year,
          attendanceData: attendance,
          submitted: true,
        }),
      });

      if (response.ok) {
        const body = await response.json().catch(() => ({}));
        if (body.skippedDays && body.skippedDays.length > 0) {
          toast({ title: 'Partial Success', description: body.message || `Some days were skipped: ${body.skippedDays.join(', ')}` });
        } else {
          toast({ 
            title: 'Success', 
            description: 'Monthly attendance submitted successfully and locked' 
          });
        }
        setIsSubmitted(true);
        setShowSubmitDialog(false);
        // Clear cache and refresh leave allotments so the leave dialog shows updated values without a full page reload
        try {
          const cacheKey = `${selectedEmployee}_${year}`;
          delete leaveAllotmentsCache.current[cacheKey];
          await fetchLeaveAllotments();
        } catch (e) {
          console.warn('Failed to clear/refresh leave allotments after final submit:', e);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit attendance');
      }
    } catch (error: any) {
      console.error('[Monthly Attendance Submit Error]', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit attendance',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate statistics
  const stats = {
    present: 0,
    firsthalf: 0,
    secondhalf: 0,
    absent: 0,
    leave: 0,
    holiday: 0,
  };

  Object.values(attendance).forEach((record) => {
    if (record?.status && record.status in stats) {
      stats[record.status as keyof typeof stats]++;
    }
  });

  // Detect if any day is marked immutable (approved leave) so we can show a legend
  const hasImmutable = Object.values(attendance).some((record: any) => record && (record as any).immutable);

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

    if (record.status === 'holiday') {
      // Prefer explicit holiday name if available (from attendance record or holiday master)
      return (record as any).holidayName || 'Holiday';
    }

    if (record.status === 'firsthalf') return '1H';
    if (record.status === 'secondhalf') return '2H';

    return record.status?.charAt(0).toUpperCase();
  };

  return (
    <div className="container mx-auto p-2 space-y-2">
      {/* Team and Employee Selection (Admin only) */}
      {(isAdmin || isSuperAdmin) && (
        <Card className="shadow-sm">
          <CardContent className="py-2 px-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">Filters:</span>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger id="team-select" className="h-8 text-sm">
                    <SelectValue placeholder={isSuperAdmin ? 'All Teams' : 'Select Team'} />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin && (
                      <SelectItem value="all">All Teams</SelectItem>
                    )}

                    {Array.isArray(teams) && teams.length === 0 && !isSuperAdmin && (
                      <SelectItem value="no-reporting-teams" disabled>No reporting teams assigned</SelectItem>
                    )}

                    {Array.isArray(teams) && teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedEmployee}
                  onValueChange={(value) => {
                    console.debug('[MonthlyAttendance] select employee changed:', value);
                    setSelectedEmployee(value);
                    setShouldFetchOnSelect(true);
                    // Team members have employeeId, regular employees use id
                    const emp = employees.find(e => (e.employeeId || e.id) === value);
                    if (emp) setSelectedEmployeeName(emp.name);
                  }}
                  disabled={loadingEmployees}
                >
                  <SelectTrigger id="employee-select" className="h-8 text-sm">
                    <SelectValue placeholder={loadingEmployees ? "⏳ Loading..." : "Select Employee"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingEmployees ? (
                      <div className="p-2 text-center text-xs text-gray-500">
                        <span className="animate-spin inline-block">⏳</span> Loading...
                      </div>
                    ) : (
                      Array.isArray(employees) && employees.map((employee) => (
                        <SelectItem
                            key={employee.employeeId || employee.id}
                            value={employee.employeeId || employee.id}
                          >
                            {employee.name} {employee.designation && `(${employee.designation})`}
                          </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locked Status Warning */}
      {isLocked && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="font-semibold text-amber-900 text-sm">Attendance Locked</p>
            <p className="text-xs text-amber-700 mt-1">
              This month's attendance has been locked {lockedAt && `on ${new Date(lockedAt).toLocaleDateString()}`}.
              No further changes can be made. Please contact admin if you need modifications.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
            <span>Monthly Attendance{selectedEmployeeName ? ` - ${selectedEmployeeName}` : ''}</span>
            <div className="flex items-center gap-2">
              {isLocked ? (
                <span className="text-xs font-normal bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  🔒 Locked
                </span>
              ) : isSubmitted ? (
                <span className="text-xs font-normal bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  ✓ Submitted & Locked
                </span>
              ) : null}

              {/* Lock Control (Admin only) */}
              {(isAdmin || isSuperAdmin) && !isLocked && (
                <Button
                  onClick={() => setShowLockDialog(true)}
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                >
                  🔒 Lock
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3 px-4">
          {/* Month Navigation */}
          <div className="flex justify-between items-center mb-2">
            <Button onClick={handlePrevMonth} variant="outline" size="sm">
              ← Previous
            </Button>
            <h3 className="text-base font-semibold">{monthName}</h3>
            <Button onClick={handleNextMonth} variant="outline" size="sm">
              Next →
            </Button>
          </div>

          {/* No employee selected message */}
          {!selectedEmployee && (isAdmin || isSuperAdmin) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2 text-center">
              <p className="text-sm text-blue-800 font-medium">Please select a team (optional) and an employee to view their attendance</p>
            </div>
          )}

          {/* Action Buttons */}
          {!isSubmitted && !isLocked && selectedEmployee && (
            <div className="flex gap-2 mb-2">
              <Button
                onClick={markAllPresent}
                variant="default"
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Mark All Present'}
              </Button>
              <Button
                onClick={() => setShowSubmitDialog(true)}
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={Object.keys(attendance).length === 0 || loading}
              >
                {loading ? 'Submitting...' : 'Final Submit'}
              </Button>
            </div>
          )}

          {/* No saved attendance message */}
          {noSavedAttendance && selectedEmployee && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
              <p className="text-sm text-yellow-800 font-medium">No saved attendance found for this employee in the selected month.</p>
              <p className="text-xs text-yellow-700 mt-1">You can mark attendance manually or copy from a previous month.</p>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <div className="bg-green-100 p-2 rounded text-center">
              <div className="text-lg font-bold text-green-700">{stats.present}</div>
              <div className="text-[10px] text-green-600">Present</div>
            </div>
            <div className="bg-teal-100 p-2 rounded text-center">
              <div className="text-lg font-bold text-teal-700">{stats.firsthalf}</div>
              <div className="text-[10px] text-teal-600">1st Half</div>
            </div>
            <div className="bg-cyan-100 p-2 rounded text-center">
              <div className="text-lg font-bold text-cyan-700">{stats.secondhalf}</div>
              <div className="text-[10px] text-cyan-600">2nd Half</div>
            </div>
            <div className="bg-red-100 p-2 rounded text-center">
              <div className="text-lg font-bold text-red-700">{stats.absent}</div>
              <div className="text-[10px] text-red-600">Absent</div>
            </div>
            <div className="bg-yellow-100 p-2 rounded text-center">
              <div className="text-lg font-bold text-yellow-700">{stats.leave}</div>
              <div className="text-[10px] text-yellow-600">Leave</div>
            </div>
            <div className="bg-blue-100 p-2 rounded text-center">
              <div className="text-lg font-bold text-blue-700">{stats.holiday}</div>
              <div className="text-[10px] text-blue-600">Holiday</div>
            </div>
          </div>

          {hasImmutable && (
            <div className="mb-2">
              <p className="text-xs text-red-700">🔒 Locked days indicate approved leave and cannot be edited.</p>
            </div>
          )}

          {/* Leave Details Section */}
          {Object.keys(leaveDetails).length < -1 && (
            <div className="mb-2" >
              <Button
                onClick={() => setShowLeaveDetails(!showLeaveDetails)}
                variant="outline"
                size="sm"
                className="w-full justify-between text-xs"
              >
                <span>Leave Details ({Object.keys(leaveDetails).length} types)</span>
                <span>{showLeaveDetails ? '▼' : '▶'}</span>
              </Button>
              {showLeaveDetails && (
                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2 space-y-1">
                  {Object.entries(leaveDetails).map(([leaveType, count]) => (
                    <div key={leaveType} className="flex justify-between text-xs">
                      <span className="font-medium">{leaveType}:</span>
                      <span className="text-yellow-700">{count} day{count > 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Calendar Grid */}
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    <span className="animate-spin inline-block">⏳</span>
                  </div>
                  <p className="text-sm font-medium text-blue-600">Loading attendance data...</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="text-center font-semibold text-xs py-1 bg-gray-100 rounded"
                >
                  {day}
                </div>
              ))}

            {/* Empty cells for days before month start */}
            {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const record = attendance[day];
              const status = record?.status;
              // treat a record with status 'holiday' as holiday (it may have been locked by script), or fallback to holiday master / Sunday
              const isHoliday = status === 'holiday' || isSunday(day) || !!holidays[day];
              const holidayName = (record && (record as any).holidayName) || holidays[day];

              return (
                <div key={day} className="relative">
                {(() => {
                  const isImmutable = !!(record && (record as any).immutable);
                  const isEditable = !isHoliday && !isSubmitted && !isLocked && !isImmutable;
                  return (
                    <>
                      <button
                        onClick={() => isEditable && handleDayClick(day)}
                        disabled={!isEditable}
                        aria-label={isImmutable ? `Day ${day} locked (approved leave)` : holidayName ? `Holiday: ${holidayName}` : `Day ${day}`}
                        title={isImmutable ? `${day} - Locked (Approved leave)` : holidayName ? `Holiday: ${holidayName}` : ''}
                        className={`
                          h-12 w-full rounded p-0.5 text-center relative flex flex-col items-center justify-center
                          ${getStatusColor(status)}
                          ${selectedDay === day ? 'ring-1 ring-blue-600' : ''}
                          ${!isEditable ? 'cursor-not-allowed opacity-75' : ''}
                        `}
                      >
                        <div className="text-[11px] font-semibold text-white leading-tight">{day}{isImmutable && <span className="ml-1 text-xs text-red-600">🔒</span>}</div>
                        {status && (
                          <div className="text-[9px] font-bold text-white leading-tight">
                            {getStatusLabel(day)}
                          </div>
                        )}
                      </button>

                      {!isImmutable && status && !isHoliday && !isSubmitted && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newAttendance = { ...attendance };
                            delete newAttendance[day];
                            setAttendance(newAttendance);
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-red-600 z-10"
                          title="Clear attendance"
                        >
                          ×
                        </button>
                      )}
                    </>
                  );
                })()}
                </div>
              );
            })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Type Selection Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
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
                    disabled={leave.disabled || leave.remaining <= 0}
                    className={`h-auto py-3 px-4 flex justify-between items-center text-left ${
                      leave.disabled || leave.remaining <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base">{leave.code}</span>
                        <span className="text-sm text-gray-700">{leave.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {leave.allocated === 999 ? (
                          <span className="text-green-600 font-medium">Unlimited</span>
                        ) : (
                          <>
                            Allocated: {leave.allocated} | Used: {leave.used} | 
                            <span className={leave.remaining > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                              {' '}Remaining: {leave.remaining}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {(leave.disabled || leave.remaining <= 0) && leave.allocated !== 999 && (
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
            <AlertDialogCancel onClick={() => setSelectedDay(null)}>
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Final Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Final Submit Attendance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will lock the attendance for {monthName}. You won't be able to make any changes after submission.
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <div className="font-semibold mb-2">Summary:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Present: {stats.present} days</div>
                  <div>Absent: {stats.absent} days</div>
                  <div>Leave: {stats.leave} days</div>
                  <div>Holiday: {stats.holiday} days</div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalSubmit}
              className="bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Submitting...
                </span>
              ) : (
                'Confirm Submit'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock Attendance Dialog */}
      <AlertDialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock Attendance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will lock the attendance for {selectedEmployeeName} for {monthName}.
              The employee won't be able to make any changes after locking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLockAttendance}
              className="bg-amber-600 hover:bg-amber-700"
              disabled={loading}
            >
              {loading ? 'Locking...' : 'Confirm Lock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
