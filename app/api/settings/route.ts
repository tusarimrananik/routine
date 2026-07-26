import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { auth, authConfigured } from "@/auth";
import { db, ensureSchema } from "@/lib/db";
import { getRegularSessionsThroughWeek, TOTAL_WEEKS } from "@/lib/semester";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getUserEmail(session: Session | null) {
  return session?.user?.email?.trim().toLowerCase() || null;
}

async function getCurrentWeek(userEmail: string) {
  const result = await db.execute({
    sql: "SELECT current_week FROM user_settings WHERE user_email = ?",
    args: [userEmail],
  });
  return Number(result.rows[0]?.current_week || 1);
}

export async function GET() {
  if (!authConfigured) {
    return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  }

  const userEmail = getUserEmail(await auth());
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureSchema();
  return NextResponse.json({ currentWeek: await getCurrentWeek(userEmail) });
}

export async function POST(request: Request) {
  if (!authConfigured) {
    return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  }

  const userEmail = getUserEmail(await auth());
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { currentWeek?: unknown };
  const currentWeek = Number(body.currentWeek);
  if (!Number.isInteger(currentWeek) || currentWeek < 1 || currentWeek > TOTAL_WEEKS) {
    return NextResponse.json({ error: "Current week must be between 1 and 15" }, { status: 400 });
  }

  await ensureSchema();
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
        args: [
          userEmail,
          item.attendanceDate,
          item.startTime,
          item.endTime,
          item.courseCode,
          item.courseName,
        ],
      })),
      "write",
    );
  }

  await db.execute({
    sql: `
      INSERT INTO user_settings (user_email, current_week, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT (user_email) DO UPDATE SET
        current_week = excluded.current_week,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [userEmail, currentWeek],
  });

  return NextResponse.json({ currentWeek });
}
