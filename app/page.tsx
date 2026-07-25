import { redirect } from "next/navigation";
import Link from "next/link";

import { auth, authConfigured, signOut } from "@/auth";
import { RoutineTracker } from "@/components/routine-tracker";
import { getProtectedRouteRedirect } from "@/lib/auth-policy";

export default async function HomePage() {
  const session = authConfigured ? await auth() : null;
  const destination = getProtectedRouteRedirect({
    authConfigured,
    email: session?.user?.email,
  });

  if (destination) redirect(destination);

  const user = {
    name: session?.user?.name || "Student",
    email: session?.user?.email || "",
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
        </div>
      </div>

      <RoutineTracker />
    </main>
  );
}
