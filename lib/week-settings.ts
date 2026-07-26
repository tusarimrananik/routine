import { db } from "@/lib/db";
import {
  getEffectiveCurrentWeek,
  getNextSaturdayDate,
  getRegularSessionsThroughWeek,
} from "@/lib/semester";

async function seedRegularAttendance(userEmail: string, currentWeek: number) {
  const sessions = getRegularSessionsThroughWeek(currentWeek);
  for (let index = 0; index < sessions.length; index += 50) {
    await db.batch(
      sessions.slice(index, index + 50).map((item) => ({
        sql: `
          INSERT INTO attendance (
            user_email, attendance_date, start_time, end_time,
            course_code, course_name, session_type, status
          ) VALUES (?, ?, ?, ?, ?, ?, 'regular', 'absent')
          ON CONFLICT (
            user_email, attendance_date, start_time, course_code, session_type
          ) DO NOTHING
        `,
        args: [userEmail, item.attendanceDate, item.startTime, item.endTime, item.courseCode, item.courseName],
      })),
      "write",
    );
  }
}

export async function getUserCurrentWeek(userEmail: string) {
  const result = await db.execute({
    sql: "SELECT current_week, next_week_start_date FROM user_settings WHERE user_email = ?",
    args: [userEmail],
  });
  const row = result.rows[0];
  if (!row) return { currentWeek: 1, nextWeekStartDate: null as string | null };

  const storedWeek = Number(row.current_week);
  const storedNextStart = row.next_week_start_date ? String(row.next_week_start_date) : null;
  if (!storedNextStart && storedWeek < 15) {
    const nextWeekStartDate = getNextSaturdayDate();
    await db.execute({
      sql: "UPDATE user_settings SET next_week_start_date = ?, updated_at = CURRENT_TIMESTAMP WHERE user_email = ?",
      args: [nextWeekStartDate, userEmail],
    });
    return { currentWeek: storedWeek, nextWeekStartDate };
  }

  const effective = getEffectiveCurrentWeek(storedWeek, storedNextStart);
  if (effective.currentWeek !== storedWeek || effective.nextWeekStartDate !== storedNextStart) {
    await seedRegularAttendance(userEmail, effective.currentWeek);
    await db.execute({
      sql: `
        UPDATE user_settings
        SET current_week = ?, next_week_start_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_email = ?
      `,
      args: [effective.currentWeek, effective.nextWeekStartDate, userEmail],
    });
  }
  return effective;
}

export async function saveUserCurrentWeek(userEmail: string, currentWeek: number) {
  const nextWeekStartDate = currentWeek < 15 ? getNextSaturdayDate() : null;
  await seedRegularAttendance(userEmail, currentWeek);
  await db.execute({
    sql: `
      INSERT INTO user_settings (user_email, current_week, next_week_start_date, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT (user_email) DO UPDATE SET
        current_week = excluded.current_week,
        next_week_start_date = excluded.next_week_start_date,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [userEmail, currentWeek, nextWeekStartDate],
  });
  return { currentWeek, nextWeekStartDate };
}
