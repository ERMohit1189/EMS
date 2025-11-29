import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';

interface AttendanceRecord {
  [day: number]: 'present' | 'absent' | 'leave' | null;
}

export default function Attendance() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceRecord>({});
  const [loading, setLoading] = useState(false);
  const [employeeId] = useState(localStorage.getItem('employeeId') || '');
  const [employeeName] = useState(localStorage.getItem('employeeName') || '');

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const daysInMonth = new Date(year, month, 0).getDate();

  useEffect(() => {
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
          setAttendance({});
        }
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = (day: number) => {
    console.log('📅 Clicked day:', day, 'Current status:', attendance[day]);
    const current = attendance[day];
    let next: 'present' | 'absent' | 'leave' | null;
    
    if (current === 'present') {
      next = 'absent';
    } else if (current === 'absent') {
      next = 'leave';
    } else {
      next = 'present';
    }
    
    console.log('📅 New status:', next);
    const newAttendance = {
      ...attendance,
      [day]: next,
    };
    setAttendance(newAttendance);
    console.log('📅 Updated attendance:', newAttendance);
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

  const presentCount = Object.values(attendance).filter((v) => v === 'present').length;
  const absentCount = Object.values(attendance).filter((v) => v === 'absent').length;
  const leaveCount = Object.values(attendance).filter((v) => v === 'leave').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Monthly Attendance</h2>
        <p className="text-muted-foreground mt-2">
          {employeeName} - Mark your daily attendance for {monthName}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{monthName}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrevMonth}>
                ← Previous
              </Button>
              <Button variant="outline" onClick={handleNextMonth}>
                Next →
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 font-medium">Present</p>
              <p className="text-2xl font-bold text-green-700">{presentCount}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-red-600 font-medium">Absent</p>
              <p className="text-2xl font-bold text-red-700">{absentCount}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-600 font-medium">Leave</p>
              <p className="text-2xl font-bold text-yellow-700">{leaveCount}</p>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-semibold text-muted-foreground text-sm p-2">
                {day}
              </div>
            ))}
            
            {/* Empty cells for days before month starts */}
            {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="p-3"></div>
            ))}
            
            {/* Calendar days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const status = attendance[day];
              const bgColor =
                status === 'present'
                  ? 'bg-green-100 border-green-300'
                  : status === 'absent'
                    ? 'bg-red-100 border-red-300'
                    : status === 'leave'
                      ? 'bg-yellow-100 border-yellow-300'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100';

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  disabled={loading}
                  className={`p-3 border-2 rounded-lg font-semibold transition-colors cursor-pointer ${bgColor}`}
                  title={
                    status
                      ? `${day} - ${status.charAt(0).toUpperCase() + status.slice(1)}`
                      : `Click to mark ${day}`
                  }
                  data-testid={`button-attendance-day-${day}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>How to use:</strong> Click on any day to cycle through Present → Absent → Leave → Not marked. Click the Submit button to save your attendance for the month.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
            data-testid="button-submit-attendance"
          >
            {loading ? 'Submitting...' : 'Submit Attendance'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
