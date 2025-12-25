import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AttendanceStatus = 'present' | 'absent' | 'leave' | 'holiday' | 'firsthalf' | 'secondhalf' | null;
type EmployeeRole = 'admin' | 'user' | 'superadmin';

interface AttendanceDay {
  status: AttendanceStatus;
  leaveType?: string;
}

interface AttendanceRecord {
  [day: number]: AttendanceDay | AttendanceStatus;
}

interface LeaveType {
  code: string;
  name: string;
  allocated: number;
  used: number;
  remaining: number;
  disabled?: boolean;
}

export default function Attendance() {
  const [employeeRole] = useState<EmployeeRole>(localStorage.getItem('employeeRole') as EmployeeRole || 'user');
  // Removed duplicate declaration of employeeRole
  if (employeeRole !== 'admin' && employeeRole !== 'user' && employeeRole !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-xl font-bold mb-2">Not Authorized</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord>({});
  const [loading, setLoading] = useState(!!localStorage.getItem('employeeId'));
  const [employeeId] = useState(localStorage.getItem('employeeId') || '');
  const [employeeName] = useState(localStorage.getItem('employeeName') || '');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [lockedAt, setLockedAt] = useState<string | null>(null);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const daysInMonth = new Date(year, month, 0).getDate();
  
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const isCurrentMonth = month === currentMonth && year === currentYear;

  // Function to check if a day is Sunday
  const isSunday = (day: number) => {
    const date = new Date(year, month - 1, day);
    return date.getDay() === 0;
  };

  // Check if day can be edited based on employee role, immutability and lock status
  const canEditDay = (day: number): boolean => {
    // Global attendance lock prevents all edits
    if (isLocked) return false;

    // If the individual day is marked immutable (e.g., reflects an approved leave or administratively locked), prevent editing
    const dayValue = attendance[day] as any;
    if (dayValue && typeof dayValue === 'object' && dayValue.immutable) return false;

    // Admins can edit (unless globally or individually locked)
    if (employeeRole === 'admin' || employeeRole === 'superadmin') return true;

    // Regular users can only edit the current day in the current month
    if (!isCurrentMonth) return false;
    return day === currentDay;
  };

  useEffect(() => {
    // Clear attendance when month changes to prevent data from previous month showing
    setAttendance({});
    fetchAttendance();
    fetchLeaveAllotments();
  }, [month, year]);

  const fetchAttendance = async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      
      // Always initialize with Sundays marked as holidays
      const initialAttendance: AttendanceRecord = {};
      for (let day = 1; day <= daysInMonth; day++) {
        if (isSunday(day)) {
          initialAttendance[day] = 'holiday';
        }
      }
      
      const response = await fetch(
        `${getApiBaseUrl()}/api/attendance/${employeeId}/${month}/${year}`
      );
      if (response.ok) {
        const data = await response.json();
        // Set locked status (handle undefined gracefully)
        setIsLocked(data?.locked === true);
        setLockedBy(data?.lockedBy || null);
        setLockedAt(data?.lockedAt || null);
        
        if (data?.attendanceData) {
          // Merge existing data with Sundays as holidays
          const existingData = JSON.parse(data.attendanceData);
          // Ensure Sundays remain as holidays, but keep other existing data
          const mergedData = { ...existingData };
          for (let day = 1; day <= daysInMonth; day++) {
            if (isSunday(day)) {
              mergedData[day] = 'holiday';
            }
          }
          setAttendance(mergedData);
        } else {
          // No existing data, just use Sundays as holidays
          setAttendance(initialAttendance);
        }
      } else {
        // If API call fails, use Sundays as holidays initialization
        setAttendance(initialAttendance);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      // Fallback: Initialize with Sundays marked as holidays
      const fallbackAttendance: AttendanceRecord = {};
      for (let day = 1; day <= daysInMonth; day++) {
        if (isSunday(day)) {
          fallbackAttendance[day] = 'holiday';
        }
      }
      setAttendance(fallbackAttendance);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveAllotments = async () => {
    if (!employeeId) return;
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/leave-allotments/employee/${employeeId}/${year}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setLeaveTypes(data.leaveTypes || []);
      }
    } catch (error) {
      console.error('Error fetching leave allotments:', error);
      setLeaveTypes([]);
    }
  };

  const getStatus = (dayValue: any): AttendanceStatus => {
    if (!dayValue) return null;
    return typeof dayValue === 'string' ? (dayValue as AttendanceStatus) : dayValue.status;
  };

  const getLeaveType = (dayValue: any): string | undefined => {
    if (!dayValue || typeof dayValue === 'string') return undefined;
    return dayValue.leaveType;
  };

  const handleDayClick = async (day: number) => {
    // Check if user can edit this day (for user role: only current day)
    if (!canEditDay(day)) {
      return;
    }
    
    const current = attendance[day];
    const status = getStatus(current);
    
    if (status === 'present') {
      setAttendance({ ...attendance, [day]: 'firsthalf' });
    } else if (status === 'firsthalf') {
      setAttendance({ ...attendance, [day]: 'secondhalf' });
    } else if (status === 'secondhalf') {
      setAttendance({ ...attendance, [day]: 'absent' });
    } else if (status === 'absent') {
      // Show leave type dialog
      // Fetch latest leave allotments before opening the dialog so values are up-to-date
      try {
        await fetchLeaveAllotments();
      } catch (e) {
        console.warn('Failed to refresh leave allotments before opening leave dialog:', e);
      }
      setSelectedDay(day);
      setShowLeaveDialog(true);
    } else if (status === 'leave') {
      setAttendance({ ...attendance, [day]: 'holiday' });
    } else if (status === 'holiday') {
      setAttendance({ ...attendance, [day]: null });
    } else {
      setAttendance({ ...attendance, [day]: 'present' });
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
      toast({ title: 'Success', description: `Leave marked as ${leaveType}` });
    }
  };

  const handleSubmit = async () => {
    if (!employeeId) {
      toast({ title: 'Error', description: 'Employee ID not found', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      
      // For user role, only send today's attendance data
      let attendanceToSubmit = attendance;
      if (employeeRole === 'user' && isCurrentMonth) {
        attendanceToSubmit = {};
        if (attendance[currentDay] !== undefined) {
          attendanceToSubmit[currentDay] = attendance[currentDay];
        }
      }
      
      const response = await fetch(`${getApiBaseUrl()}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          month,
          year,
          attendanceData: attendanceToSubmit,
        }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Attendance submitted successfully' });
        // Refresh leave allotments so the leave dialog reflects updated used/remaining values immediately
        try {
          await fetchLeaveAllotments();
        } catch (e) {
          console.warn('Failed to refresh leave allotments after submit:', e);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to submit attendance' }));
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
    } catch (error: any) {
      console.error('[Attendance Submit Error]', error);
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

  const presentCount = Object.values(attendance).filter((v) => getStatus(v) === 'present').length;
  const firstHalfCount = Object.values(attendance).filter((v) => getStatus(v) === 'firsthalf').length;
  const secondHalfCount = Object.values(attendance).filter((v) => getStatus(v) === 'secondhalf').length;
  const absentCount = Object.values(attendance).filter((v) => getStatus(v) === 'absent').length;
  const leaveCount = Object.values(attendance).filter((v) => getStatus(v) === 'leave').length;
  const holidayCount = Object.values(attendance).filter((v) => getStatus(v) === 'holiday').length;

  if (loading) {
    return <SkeletonLoader type="cards" count={4} />;
  }

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="pb-1 md:pb-2 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Attendance</h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1 truncate">
            {employeeName} • {monthName}
          </p>
        </div>
        {employeeRole === 'user' && (
          <div className="flex items-center gap-2">
            <a href="/employee/leave-apply">
              <Button variant="secondary" size="sm">Apply Leave</Button>
            </a>
          </div>
        )}
      </div>

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

      <Card className="shadow-sm">
        <CardHeader className="pb-2 md:pb-3 px-3 md:px-4 pt-3 md:pt-4">
          <div className="flex items-center justify-between gap-1 md:gap-2">
            <CardTitle className="text-base md:text-lg truncate">{monthName}</CardTitle>
            <div className="flex gap-0.5 md:gap-1">
              <Button variant="outline" size="sm" onClick={handlePrevMonth} className="h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm">
                ← Prev
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm">
                Next →
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 md:space-y-3 p-2 md:p-3">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-2">
            <div className="bg-green-50 p-1.5 md:p-2 rounded border border-green-200">
              <p className="text-xs text-green-600 font-medium">Present</p>
              <p className="text-base md:text-lg font-bold text-green-700">{presentCount}</p>
            </div>
            <div className="bg-teal-50 p-1.5 md:p-2 rounded border border-teal-200">
              <p className="text-xs text-teal-600 font-medium">First Half</p>
              <p className="text-base md:text-lg font-bold text-teal-700">{firstHalfCount}</p>
            </div>
            <div className="bg-cyan-50 p-1.5 md:p-2 rounded border border-cyan-200">
              <p className="text-xs text-cyan-600 font-medium">Second Half</p>
              <p className="text-base md:text-lg font-bold text-cyan-700">{secondHalfCount}</p>
            </div>
            <div className="bg-red-50 p-1.5 md:p-2 rounded border border-red-200">
              <p className="text-xs text-red-600 font-medium">Absent</p>
              <p className="text-base md:text-lg font-bold text-red-700">{absentCount}</p>
            </div>
            <div className="bg-yellow-50 p-1.5 md:p-2 rounded border border-yellow-200">
              <p className="text-xs text-yellow-600 font-medium">Leave</p>
              <p className="text-base md:text-lg font-bold text-yellow-700">{leaveCount}</p>
            </div>
            <div className="bg-purple-50 p-1.5 md:p-2 rounded border border-purple-200">
              <p className="text-xs text-purple-600 font-medium">Holiday</p>
              <p className="text-base md:text-lg font-bold text-purple-700">{holidayCount}</p>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0.5 md:gap-1 overflow-x-auto">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-semibold text-muted-foreground text-xs md:text-sm p-0.5 md:p-1 min-w-8 md:min-w-auto">
                {day}
              </div>
            ))}
            
            {/* Empty cells for days before month starts */}
            {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => (
              <div key={`empty-${i}`}></div>
            ))}
            
            {/* Calendar days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayValue = attendance[day];
              const status = getStatus(dayValue);
              const leaveType = getLeaveType(dayValue);

              const bgColor =
                status === 'present'
                  ? 'bg-green-100 border-green-300'
                  : status === 'firsthalf'
                    ? 'bg-teal-100 border-teal-300'
                    : status === 'secondhalf'
                      ? 'bg-cyan-100 border-cyan-300'
                      : status === 'absent'
                        ? 'bg-red-100 border-red-300'
                        : status === 'leave'
                          ? 'bg-yellow-100 border-yellow-300'
                          : status === 'holiday'
                            ? 'bg-purple-100 border-purple-300'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100';

              const statusEmoji = status === 'present' ? '✓' : status === 'firsthalf' ? '🌅' : status === 'secondhalf' ? '🌆' : status === 'absent' ? '✗' : status === 'leave' ? '🎯' : status === 'holiday' ? '🎉' : '';
              const holidayName = (dayValue as any)?.holidayName;

              const isEditable = canEditDay(day);
              const disabledClass = !isEditable ? 'opacity-50 cursor-not-allowed bg-gray-200 border-gray-300' : '';
              
              return (
                <div key={day} className="relative group">
                  <button
                    onClick={() => isEditable && handleDayClick(day)}
                    disabled={loading || !isEditable}
                    aria-label={(dayValue && (dayValue as any).immutable) ? `Day ${day} locked due to approved leave` : `Day ${day} - ${status || 'Unmarked'}`}
                    className={`w-full h-12 md:h-16 p-0.5 border rounded font-semibold transition-colors flex flex-col items-center justify-center text-xs md:text-sm min-w-8 md:min-w-auto ${isEditable ? `cursor-pointer ${bgColor}` : disabledClass}`}
                    title={
                      (dayValue && (dayValue as any).immutable)
                        ? `${day} - Locked (Approved leave)`
                        : !isEditable
                          ? employeeRole === 'user'
                            ? 'User role: Only current date allowed'
                            : 'Not editable'
                          : leaveType
                            ? `${day} - Leave (${leaveType})`
                            : status
                              ? (status === 'holiday' ? `${day} - ${holidayName || 'Holiday'}` : `${day} - ${status.charAt(0).toUpperCase() + status.slice(1)}`)
                              : `Day ${day} - Click to mark`
                    }
                    data-testid={`button-attendance-day-${day}`}
                  >
                    <span className="text-xs md:text-base leading-none">{day}{(dayValue && (dayValue as any).immutable) && <span className="ml-1 text-xs text-red-600">🔒</span>}</span>
                    <div className="flex items-center justify-center gap-0.5 h-3 md:h-4">
                      {statusEmoji && <span className="text-xs md:text-base leading-none">{statusEmoji}</span>}
                      {leaveType && <span className="text-xs font-bold text-yellow-700 leading-none">{leaveType}</span>}
                      {status === 'holiday' && holidayName && <span className="text-xs font-bold text-purple-700 leading-none">{holidayName}</span>}
                    </div>
                  </button>
                  {status && isEditable && (
                    <button
                      onClick={() => {
                        setAttendance({
                          ...attendance,
                          [day]: null,
                        });
                      }}
                      disabled={loading}
                      className="absolute top-0 right-0 hidden group-hover:block bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition-colors"
                      title="Clear this day"
                      data-testid={`button-clear-day-${day}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Leave Type Dialog */}
          <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
            <AlertDialogContent className="max-w-lg w-11/12 mx-auto">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm md:text-base">Select Leave Type</AlertDialogTitle>
                <AlertDialogDescription className="text-xs md:text-sm">
                  Choose the type of leave for Day {selectedDay}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid grid-cols-1 gap-1.5 max-h-64 md:max-h-80 overflow-y-auto pr-2">
                {leaveTypes.length > 0 ? (
                  <>
                    {leaveTypes.some(l => l.allocated === 0 && l.disabled) && (
                      <div className="bg-yellow-50 border border-yellow-200 p-2 rounded mb-1">
                        <p className="text-[10px] md:text-xs text-yellow-800">
                          ⚠️ No leave allotment for {year}. Only unpaid leaves available.
                        </p>
                      </div>
                    )}
                    {leaveTypes.map((leave) => (
                      <button
                        key={leave.code}
                        onClick={() => handleLeaveTypeSelect(leave.code)}
                        disabled={leave.disabled || leave.remaining <= 0}
                        className={`px-3 py-2.5 text-left text-xs md:text-sm border rounded transition-colors ${
                          leave.disabled || leave.remaining <= 0 
                            ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                            : 'hover:bg-blue-50 hover:border-blue-300'
                        }`}
                        data-testid={`button-leave-type-${leave.code}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-600 text-sm">{leave.code}</span>
                              <span className="text-gray-700 text-xs md:text-sm">{leave.name}</span>
                            </div>
                            <div className="text-[10px] md:text-xs text-gray-500 mt-1">
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
                            <span className="text-[10px] text-red-600 font-medium whitespace-nowrap">Not allocated</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p className="text-xs md:text-sm">No leave types available</p>
                    <p className="text-[10px] md:text-xs mt-2">Please contact admin</p>
                  </div>
                )}
              </div>
              <AlertDialogCancel className="text-xs md:text-sm h-8 md:h-9">Cancel</AlertDialogCancel>
            </AlertDialogContent>
          </AlertDialog>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 p-1.5 md:p-2 rounded text-xs space-y-0.5">
            <p className="text-blue-900 font-semibold text-xs md:text-sm">Quick Guide:</p>
            <ul className="text-blue-900 space-y-0.5 ml-2 md:ml-3 text-xs">
              <li>• Sundays = Holidays (🎉)</li>
              <li>• Click: Not marked → ✓ → ✗ → 🎯 → 🎉</li>
              <li>• Absent → Leave Type</li>
              <li>• Hover to clear</li>
            </ul>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={loading || isLocked}
            className="w-full bg-blue-600 hover:bg-blue-700 h-8 md:h-9 text-xs md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-submit-attendance"
          >
            {loading ? 'Submitting...' : isLocked ? 'Locked' : 'Submit'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
