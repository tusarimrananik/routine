import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import {
  AttendanceInput,
  AttendanceRecord,
  AttendanceStat,
  AttendanceSummary,
} from "@/lib/attendance";
import { db, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

function getUserEmail(session: Session | null) {
  return session?.user?.email?.trim().toLowerCase() || null;
}

function isValidSession(value: unknown): value is AttendanceInput {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.attendanceDate === "string" &&
    DATE_PATTERN.test(item.attendanceDate) &&
    typeof item.startTime === "string" &&
    TIME_PATTERN.test(item.startTime) &&
    typeof item.endTime === "string" &&
    TIME_PATTERN.test(item.endTime) &&
    typeof item.courseCode === "string" &&
    item.courseCode.length > 0 &&
    item.courseCode.length <= 30 &&
    typeof item.courseName === "string" &&
    item.courseName.length > 0 &&
    item.courseName.length <= 100 &&
    (item.sessionType === "regular" || item.sessionType === "ct") &&
    (item.status === undefined ||
      item.status === "present" ||
      item.status === "absent")
  );
}

function getDhakaNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Dhaka",
  }).formatToParts(new Date());

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function toStat(present: number, total: number): AttendanceStat {
  return {
    present,
    total,
    percentage: total ? Math.round((present / total) * 100) : 0,
  };
}

async function getAttendanceData(userEmail: string, from: string, to: string) {
  const [recordsResult, summaryResult] = await Promise.all([
    db.execute({
      sql: `
        SELECT
          attendance_date,
          start_time,
          end_time,
          course_code,
          course_name,
          session_type,
          status
        FROM attendance
        WHERE user_email = ?
          AND attendance_date BETWEEN ? AND ?
        ORDER BY attendance_date, start_time
      `,
      args: [userEmail, from, to],
    }),
    (() => {
      const now = getDhakaNow();
      return db.execute({
        sql: `
          SELECT
            session_type,
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present
          FROM attendance
          WHERE user_email = ?
            AND (
              attendance_date < ?
              OR (attendance_date = ? AND start_time <= ?)
            )
          GROUP BY session_type
        `,
        args: [userEmail, now.date, now.date, now.time],
      });
    })(),
  ]);

  const records: AttendanceRecord[] = recordsResult.rows.map((row) => ({
    attendanceDate: String(row.attendance_date),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    courseCode: String(row.course_code),
    courseName: String(row.course_name),
    sessionType: row.session_type === "ct" ? "ct" : "regular",
    status: row.status === "present" ? "present" : "absent",
  }));

  const counts = {
    regular: { present: 0, total: 0 },
    ct: { present: 0, total: 0 },
  };

  for (const row of summaryResult.rows) {
    const type = row.session_type === "ct" ? "ct" : "regular";
    counts[type] = {
      present: Number(row.present || 0),
      total: Number(row.total || 0),
    };
  }

  const regular = toStat(counts.regular.present, counts.regular.total);
  const ct = toStat(counts.ct.present, counts.ct.total);
  const summary: AttendanceSummary = {
    regular,
    ct,
    overall: toStat(regular.present + ct.present, regular.total + ct.total),
  };

  return { records, summary };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const userEmail = getUserEmail(session);

  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = request.nextUrl.searchParams.get("from") || "0000-01-01";
  const to = request.nextUrl.searchParams.get("to") || "9999-12-31";

  if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  await ensureSchema();
  return NextResponse.json(await getAttendanceData(userEmail, from, to));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userEmail = getUserEmail(session);

  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: "sync" | "update";
    sessions?: unknown[];
    record?: unknown;
    from?: string;
    to?: string;
  };

  const from = body.from || "0000-01-01";
  const to = body.to || "9999-12-31";

  if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  await ensureSchema();

  if (body.action === "sync") {
    if (
      !Array.isArray(body.sessions) ||
      body.sessions.length > 100 ||
      !body.sessions.every(isValidSession)
    ) {
      return NextResponse.json({ error: "Invalid sessions" }, { status: 400 });
    }

    if (body.sessions.length) {
      await db.batch(
        body.sessions.map((item) => ({
          sql: `
            INSERT INTO attendance (
              user_email,
              attendance_date,
              start_time,
              end_time,
              course_code,
              course_name,
              session_type,
              status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'absent')
            ON CONFLICT (
              user_email,
              attendance_date,
              start_time,
              course_code,
              session_type
            ) DO NOTHING
          `,
          args: [
            userEmail,
            item.attendanceDate,
            item.startTime,
            item.endTime,
            item.courseCode,
            item.courseName,
            item.sessionType,
          ],
        })),
        "write",
      );
    }
  } else if (body.action === "update" && isValidSession(body.record)) {
    const item = body.record;
    const status = item.status === "present" ? "present" : "absent";

    await db.execute({
      sql: `
        INSERT INTO attendance (
          user_email,
          attendance_date,
          start_time,
          end_time,
          course_code,
          course_name,
          session_type,
          status,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT (
          user_email,
          attendance_date,
          start_time,
          course_code,
          session_type
        ) DO UPDATE SET
          status = excluded.status,
          course_name = excluded.course_name,
          end_time = excluded.end_time,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [
        userEmail,
        item.attendanceDate,
        item.startTime,
        item.endTime,
        item.courseCode,
        item.courseName,
        item.sessionType,
        status,
      ],
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json(await getAttendanceData(userEmail, from, to));
}
