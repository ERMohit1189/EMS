import 'dotenv/config';
import { db } from '../server/db';
import { storage } from '../server/storage';
import { holidays } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

(async function main() {
  try {
    const args = process.argv.slice(2);
    const autoYes = args.includes('--yes') || args.includes('-y');

    console.log('[Script] Lock Holidays - starting');

    // Fetch active holidays
    const holidayRows: any[] = await db.select().from(holidays).where(eq(holidays.isActive, true));
    if (!holidayRows || holidayRows.length === 0) {
      console.log('[Script] No active holidays found. Nothing to do.');
      process.exit(0);
    }

    console.log(`[Script] Found ${holidayRows.length} active holiday(s):`);
    holidayRows.forEach(h => console.log(` - ${h.id}: ${new Date(h.date).toISOString().slice(0,10)} ${h.name ? '- ' + h.name : ''}`));

    // Count employees
    const totalEmployees = await storage.getEmployeeCount();
    console.log(`[Script] Total employees: ${totalEmployees}`);

    if (!autoYes) {
      console.log('\nThis script will create or update monthly attendance records for each employee for every active holiday listed above, marking the day as a holiday and setting immutable=true.');
      console.log('Run this script with --yes to proceed, e.g. `tsx scripts/lock-holidays.ts --yes`');
      process.exit(0);
    }

    const pageSize = 200;
    let offset = 0;

    let processedEmployees = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    while (true) {
      const emps = await storage.getEmployees(pageSize, offset);
      if (!emps || emps.length === 0) break;

      for (const emp of emps) {
        processedEmployees++;
        const empId = emp.id;

        for (const hr of holidayRows) {
          const date = new Date(hr.date);
          const day = date.getDate();
          const month = date.getMonth() + 1;
          const year = date.getFullYear();

          try {
            let attendance = await storage.getEmployeeMonthlyAttendance(empId, month, year);
            let attendanceData: any = {};
            if (attendance && attendance.attendanceData) {
              attendanceData = typeof attendance.attendanceData === 'string' ? JSON.parse(attendance.attendanceData) : attendance.attendanceData;
            }

            const existing = attendanceData[day];
            if (existing && existing.immutable) {
              // If immutable but missing holidayName, add holidayName without changing immutable flag
              if (!existing.holidayName) {
                existing.holidayName = hr.name || null;
                existing.holidayId = hr.id;
                attendanceData[day] = existing;
                if (attendance) {
                  await storage.updateAttendance(attendance.id, { attendanceData: JSON.stringify(attendanceData) });
                  updatedCount++;
                }
              } else {
                skippedCount++;
              }
              continue;
            }

            attendanceData[day] = { status: 'holiday', immutable: true, holidayId: hr.id, holidayName: hr.name || null };

            if (attendance) {
              await storage.updateAttendance(attendance.id, { attendanceData: JSON.stringify(attendanceData) });
              updatedCount++;
            } else {
              await storage.createAttendance({ employeeId: empId, month, year, attendanceData: JSON.stringify(attendanceData) });
              createdCount++;
            }
          } catch (e) {
            console.error(`[Script] Error processing employee ${empId} for holiday ${hr.date}:`, e?.message || e);
          }
        }
      }

      offset += emps.length;
    }

    console.log('[Script] Done');
    console.log(`[Script] Processed employees: ${processedEmployees}`);
    console.log(`[Script] Attendance records created: ${createdCount}`);
    console.log(`[Script] Attendance records updated: ${updatedCount}`);
    console.log(`[Script] Days skipped due to existing immutable entries: ${skippedCount}`);
    process.exit(0);
  } catch (error: any) {
    console.error('[Script] Error running lock-holidays:', error?.message || error);
    process.exit(1);
  }
})();