import { neon } from "@neondatabase/serverless";

type Statement = {
  sql: string;
  args?: unknown[];
};

function getClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  return neon(databaseUrl);
}

function postgresSql(sql: string) {
  let parameter = 0;
  return sql.replace(/\?/g, () => `$${++parameter}`);
}

export const db = {
  async execute(statement: Statement) {
    const rows = await getClient().query(
      postgresSql(statement.sql),
      statement.args || [],
    );
    return { rows };
  },

  async batch(statements: Statement[], _mode?: "write") {
    return Promise.all(statements.map((statement) => db.execute(statement)));
  },
};

let schemaPromise: Promise<unknown> | null = null;

export function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await db.execute({
        sql: `
          CREATE TABLE IF NOT EXISTS attendance (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            user_email TEXT NOT NULL,
            attendance_date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            course_code TEXT NOT NULL,
            course_name TEXT NOT NULL,
            session_type TEXT NOT NULL CHECK (session_type IN ('regular', 'ct')),
            status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent')),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (
              user_email,
              attendance_date,
              start_time,
              course_code,
              session_type
            )
          )
        `,
      });

      await db.execute({
        sql: `
          CREATE INDEX IF NOT EXISTS attendance_user_date_idx
          ON attendance (user_email, attendance_date)
        `,
      });

      await db.execute({
        sql: `
          CREATE TABLE IF NOT EXISTS user_settings (
            user_email TEXT PRIMARY KEY,
            current_week INTEGER NOT NULL DEFAULT 1 CHECK (current_week BETWEEN 1 AND 15),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      });
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  return schemaPromise;
}
