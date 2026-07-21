import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, authConfigured } from "@/auth";
import { AttendanceAnalytics } from "@/components/attendance-analytics";

export default async function AnalyticsPage() {
  const session = authConfigured ? await auth() : null;

  if (authConfigured && !session?.user?.email) redirect("/login");

  return (
    <main className="analytics-page">
      <header className="analytics-header">
        <div>
          <p>2nd 30 · Even Semester</p>
          <h1>Attendance Analytics</h1>
        </div>
        <Link className="back-link" href="/">← Routine</Link>
      </header>

      <AttendanceAnalytics demoMode={!authConfigured} />
    </main>
  );
}
