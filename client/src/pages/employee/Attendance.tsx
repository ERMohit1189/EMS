import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AttendanceStatus = 'present' | 'absent' | 'leave' | 'holiday' | null;

interface AttendanceDay {
  status: AttendanceStatus;
  leaveType?: string;
}

interface AttendanceRecord {
  [day: number]: AttendanceDay | AttendanceStatus;
}

const LEAVE_TYPES = [
  { code: 'ML', name: 'Medical Leave' },
  { code: 'CL', name: 'Casual Leave' },
  { code: 'EL', name: 'Earned Leave' },
  { code: 'SL', name: 'Sick Leave' },
  { code: 'PL', name: 'Personal Leave' },
  { code: 'UL', name: 'Unpaid Leave' },
  { code: 'LWP', name: 'Leave Without Pay' },
];

export default function Attendance() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceRecord>({});
  const [loading, setLoading] = useState(false);
  const [employeeId] = useState(localStorage.getItem('employeeId') || '');
  const [employeeName] = useState(localStorage.getItem('employeeName') || '');
  const [employeeRole] = useState(localStorage.getItem('employeeRole') || 'user');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

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

  // Check if day can be edited based on employee role
  const canEditDay = (day: number): boolean => {
    if (employeeRole === 'admin') return true; // Admin can edit any day
    // User role: only current day (today) is editable
    if (!isCurrentMonth) return false;
    return day === currentDay; // Only today, not previous or future dates
  };

  useEffect(() => {
    // Clear attendance when month changes to prevent data from previous month showing
    setAttendance({});
    fetchAttendance();
  }, [month, year]);

  const fetchAttendance = async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const response = await fetch(
        `${getApiBaseUrl()}/api/attendance/${employeeId}/${month}/${year}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data?.attendanceData) {
          setAttendance(JSON.parse(data.attendanceData));
        } else {
          // Initialize with Sundays marked as holidays
          const initialAttendance: AttendanceRecord = {};
          for (let day = 1; day <= daysInMonth; day++) {
            if (isSunday(day)) {
              initialAttendance[day] = 'holiday';
            }
          }
          setAttendance(initialAttendance);
        }
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (dayValue: any): AttendanceStatus => {
    if (!dayValue) return null;
    return typeof dayValue === 'string' ? dayValue : dayValue.status;
  };

  const getLeaveType = (dayValue: any): string | undefined => {
    if (!dayValue || typeof dayValue === 'string') return undefined;
    return dayValue.leaveType;
  };

  const handleDayClick = (day: number) => {
    // Check if user can edit this day (for user role: only current day)
    if (!canEditDay(day)) {
      return;
    }
    
    const current = attendance[day];
    const status = getStatus(current);
    
    if (status === 'present') {
      setAttendance({ ...attendance, [day]: 'absent' });
    } else if (status === 'absent') {
      // Show leave type dialog
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
      const response = await fetch(`${getApiBaseUrl()}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          month,
          year,
          attendanceData: attendance,
        }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Attendance submitted successfully' });
      } else {
        throw new Error('Failed to submit attendance');
      }
    } catch (error: any) {
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
  const absentCount = Object.values(attendance).filter((v) => getStatus(v) === 'absent').length;
  const leaveCount = Object.values(attendance).filter((v) => getStatus(v) === 'leave').length;
  const holidayCount = Object.values(attendance).filter((v) => getStatus(v) === 'holiday').length;

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="pb-1 md:pb-2">
        <h2 className="text-xl md:text-2xl font-bold">Attendance</h2>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1 truncate">
          {employeeName} • {monthName}
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2 md:pb-3 px-3 md:px-4 pt-3 md:pt-4">
          <div className="flex items-center justify-between gap-1 md:gap-2">
            <CardTitle className="text-base md:text-lg truncate">{monthName}</CardTitle>
            <div className="flex gap-0.5 md:gap-1">
              <Button variant="outline" size="xs" onClick={handlePrevMonth} className="h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm">
                ← Prev
              </Button>
              <Button variant="outline" size="xs" onClick={handleNextMonth} className="h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm">
                Next →
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 md:space-y-3 p-2 md:p-3">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2">
            <div className="bg-green-50 p-1.5 md:p-2 rounded border border-green-200">
              <p className="text-xs text-green-600 font-medium">Present</p>
              <p className="text-base md:text-lg font-bold text-green-700">{presentCount}</p>
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
                  : status === 'absent'
                    ? 'bg-red-100 border-red-300'
                    : status === 'leave'
                      ? 'bg-yellow-100 border-yellow-300'
                      : status === 'holiday'
                        ? 'bg-purple-100 border-purple-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100';

              const statusEmoji = status === 'present' ? '✓' : status === 'absent' ? '✗' : status === 'leave' ? '🎯' : status === 'holiday' ? '🎉' : '';

              const isEditable = canEditDay(day);
              const disabledClass = !isEditable ? 'opacity-50 cursor-not-allowed bg-gray-200 border-gray-300' : '';
              
              return (
                <div key={day} className="relative group">
                  <button
                    onClick={() => isEditable && handleDayClick(day)}
                    disabled={loading || !isEditable}
                    className={`w-full h-12 md:h-16 p-0.5 border rounded font-semibold transition-colors flex flex-col items-center justify-center text-xs md:text-sm min-w-8 md:min-w-auto ${isEditable ? `cursor-pointer ${bgColor}` : disabledClass}`}
                    title={
                      !isEditable
                        ? employeeRole === 'user' 
                          ? 'User role: Only current date allowed'
                          : 'Not editable'
                        : leaveType
                        ? `${day} - Leave (${leaveType})`
                        : status
                          ? `${day} - ${status.charAt(0).toUpperCase() + status.slice(1)}`
                          : `Day ${day} - Click to mark`
                    }
                    data-testid={`button-attendance-day-${day}`}
                  >
                    <span className="text-xs md:text-base leading-none">{day}</span>
                    <div className="flex items-center justify-center gap-0.5 h-3 md:h-4">
                      {statusEmoji && <span className="text-xs md:text-base leading-none">{statusEmoji}</span>}
                      {leaveType && <span className="text-xs font-bold text-yellow-700 leading-none">{leaveType}</span>}
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
            <AlertDialogContent className="max-w-sm w-11/12 mx-auto">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm md:text-base">Leave Type</AlertDialogTitle>
                <AlertDialogDescription className="text-xs md:text-sm">
                  Day {selectedDay}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid grid-cols-1 gap-1 max-h-40 md:max-h-48 overflow-y-auto">
                {LEAVE_TYPES.map((leave) => (
                  <button
                    key={leave.code}
                    onClick={() => handleLeaveTypeSelect(leave.code)}
                    className="px-2 md:px-3 py-1.5 md:py-2 text-left text-xs md:text-sm border rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    data-testid={`button-leave-type-${leave.code}`}
                  >
                    <span className="font-bold text-blue-600">{leave.code}</span> <span className="hidden md:inline">{leave.name}</span>
                  </button>
                ))}
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
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 h-8 md:h-9 text-xs md:text-sm"
            data-testid="button-submit-attendance"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
