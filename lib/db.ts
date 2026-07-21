import { createClient } from "@libsql/client";

const databaseUrl = process.env.TURSO_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("TURSO_DATABASE_URL is not configured.");
}

export const db = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let schemaPromise: Promise<unknown> | null = null;

export function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        attendance_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        course_code TEXT NOT NULL,
        course_name TEXT NOT NULL,
        session_type TEXT NOT NULL CHECK (session_type IN ('regular', 'ct')),
        status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent')),
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (
          user_email,
          attendance_date,
          start_time,
          course_code,
          session_type
        )
      );

      CREATE INDEX IF NOT EXISTS attendance_user_date_idx
      ON attendance (user_email, attendance_date);
    `);
  }

  return schemaPromise;
}
