# Routine Attendance Tracker

A Vercel-ready Next.js version of the 2nd 30 routine with Google OAuth, date-based attendance storage, normal-class attendance, CT attendance, and overall percentage reporting.

## Stack

- Next.js 16
- Auth.js / NextAuth v5 with Google OAuth
- Neon serverless Postgres
- Vercel

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Generate an Auth.js secret with `npx auth secret`.
3. Add a Google OAuth web application and use this callback locally:

   `http://localhost:3000/api/auth/callback/google`

4. Set `DATABASE_URL` to a Neon Postgres connection string.
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
- `DATABASE_URL`

In Google Cloud Console, add the production callback:

`https://YOUR-VERCEL-DOMAIN/api/auth/callback/google`

Use the pooled Neon Postgres connection URL in production.

The database table and index are created automatically on the first authenticated attendance request.

The app requires Google sign-in before the routine or analytics pages can be used. Until the Auth.js variables are configured, visitors are sent to `/login`, which displays a setup-pending notice. Attendance API requests remain unavailable.

Any Google account with a verified email address can sign in. Attendance records are isolated by the normalized Google email address. Attendance is stored durably in Neon Postgres.
