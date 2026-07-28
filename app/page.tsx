import { redirect } from "next/navigation";

import { auth, authConfigured, signOut } from "@/auth";
import { RoutineTracker } from "@/components/routine-tracker";
import { getProtectedRouteRedirect } from "@/lib/auth-policy";
import { ensureSchema } from "@/lib/db";
import { getUserCurrentWeek } from "@/lib/week-settings";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function HomePage() {
  const session = authConfigured ? await auth() : null;
  const destination = getProtectedRouteRedirect({
    authConfigured,
    email: session?.user?.email,
  });

  if (destination) redirect(destination);

  const userEmail = session?.user?.email?.trim().toLowerCase();
  let initialWeek = 1;
  if (userEmail) {
    await ensureSchema();
    initialWeek = (await getUserCurrentWeek(userEmail)).currentWeek;
  }

  const user = {
    name: session?.user?.name || "Student",
    image: session?.user?.image || "",
  };

  return (
    <main className="app-shell">
      <RoutineTracker
        initialWeek={initialWeek}
        userImage={user.image}
        userName={user.name}
        signOutAction={signOutAction}
      />
      <aside className="related-project" aria-label="Related RUET tool">
        <div>
          <span className="related-project-label">RUET student tool</span>
          <strong>Need to prepare a lab report?</strong>
          <p>Create a structured report and export it as PDF.</p>
        </div>
        <a
          href="https://github.com/tusarimrananik/ruet-lab-report-generator"
          target="_blank"
          rel="noreferrer"
        >
          Open Lab Report Generator ↗
        </a>
      </aside>
    </main>
  );
}
