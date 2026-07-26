import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { auth, authConfigured } from "@/auth";
import { ensureSchema } from "@/lib/db";
import { TOTAL_WEEKS } from "@/lib/semester";
import { getUserCurrentWeek, saveUserCurrentWeek } from "@/lib/week-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getUserEmail(session: Session | null) {
  return session?.user?.email?.trim().toLowerCase() || null;
}

export async function GET() {
  if (!authConfigured) return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  const userEmail = getUserEmail(await auth());
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  return NextResponse.json(await getUserCurrentWeek(userEmail));
}

export async function POST(request: Request) {
  if (!authConfigured) return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  const userEmail = getUserEmail(await auth());
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { currentWeek?: unknown };
  const currentWeek = Number(body.currentWeek);
  if (!Number.isInteger(currentWeek) || currentWeek < 1 || currentWeek > TOTAL_WEEKS) {
    return NextResponse.json({ error: "Current week must be between 1 and 15" }, { status: 400 });
  }

  await ensureSchema();
  return NextResponse.json(await saveUserCurrentWeek(userEmail, currentWeek));
}
