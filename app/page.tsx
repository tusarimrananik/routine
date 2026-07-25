import { redirect } from "next/navigation";

import { auth, authConfigured, signOut } from "@/auth";
import { RoutineTracker } from "@/components/routine-tracker";
import { getProtectedRouteRedirect } from "@/lib/auth-policy";

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

  const user = {
    name: session?.user?.name || "Student",
    image: session?.user?.image || "",
  };

  return (
    <main className="app-shell">
      <RoutineTracker
        userImage={user.image}
        userName={user.name}
        signOutAction={signOutAction}
      />
    </main>
  );
}
