# Routine Attendance Tracker

A Vercel-ready Next.js version of the 2nd 30 routine with Google OAuth, date-based attendance storage, normal-class attendance, CT attendance, and overall percentage reporting.

## Stack

- Next.js 16
- Auth.js / NextAuth v5 with Google OAuth
- Turso/libSQL (SQLite-compatible persistent database)
- Vercel

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Generate an Auth.js secret with `npx auth secret`.
3. Add a Google OAuth web application and use this callback locally:

   `http://localhost:3000/api/auth/callback/google`

4. For local development, keep `TURSO_DATABASE_URL=file:local.db`.
5. Run:

   ```bash
   npm install
   npm run dev
   ```

## Vercel setup

Add these environment variables in the Vercel project:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

In Google Cloud Console, add the production callback:

`https://YOUR-VERCEL-DOMAIN/api/auth/callback/google`

Use a Turso database URL in production. A local SQLite file is not durable on Vercel serverless functions.

The database table and index are created automatically on the first authenticated attendance request.
