import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { RoutineTracker } from "@/components/routine-tracker";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.email) redirect("/login");

  return (
    <main className="app-shell">
      <div className="user-bar">
        <div className="user-copy">
          <span className="user-name">{session.user.name || "Student"}</span>
          <span className="user-email">{session.user.email}</span>
        </div>

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

      <RoutineTracker />
    </main>
  );
}
