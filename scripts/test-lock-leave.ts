import { storage } from '../server/storage';

async function main() {
  const employeeId = '3f67bab3-0656-49d0-ad25-1d0e481e820d';
  const month = 12;
  const year = 2025;
  const day = 10;

  console.log('[Test] Fetching attendance');
  const attendance = await storage.getEmployeeMonthlyAttendance(employeeId, month, year);
  let attendanceData: any = {};
  if (attendance && attendance.attendanceData) {
    attendanceData = typeof attendance.attendanceData === 'string' ? JSON.parse(attendance.attendanceData) : attendance.attendanceData;
  }

  attendanceData[day] = { status: 'leave', leaveType: 'CL', leaveId: 'test-lock-script', immutable: true };

  if (attendance) {
    await storage.updateAttendance(attendance.id, { attendanceData: JSON.stringify(attendanceData) });
    console.log('[Test] Updated attendance id', attendance.id);
  } else {
    const created = await storage.createAttendance({ employeeId, month, year, attendanceData: JSON.stringify(attendanceData) });
    console.log('[Test] Created attendance id', created.id);
  }

  const verify = await storage.getEmployeeMonthlyAttendance(employeeId, month, year);
  console.log('[Test] Verify attendanceData:', verify?.attendanceData);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});