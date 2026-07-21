import { redirect } from "next/navigation";
import Link from "next/link";

import { auth, authConfigured, signOut } from "@/auth";
import { RoutineTracker } from "@/components/routine-tracker";

export default async function HomePage() {
  const session = authConfigured ? await auth() : null;

  if (authConfigured && !session?.user?.email) redirect("/login");

  const user = authConfigured
    ? {
        name: session?.user?.name || "Student",
        email: session?.user?.email || "",
      }
    : {
        name: "Demo User",
        email: "Attendance is saved on this device",
      };

  return (
    <main className="app-shell">
      <div className="user-bar">
        <div className="user-copy">
          <span className="user-name">{user.name}</span>
          <span className="user-email">{user.email}</span>
        </div>

        <div className="user-actions">
          <Link className="analytics-link" href="/analytics">Analytics</Link>
          {authConfigured ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="sign-out-button" type="submit">
                Sign out
              </button>
            </form>
          ) : (
            <span className="demo-badge">Demo mode</span>
          )}
        </div>
      </div>

      <RoutineTracker demoMode={!authConfigured} />
    </main>
  );
}
