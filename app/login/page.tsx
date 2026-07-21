import { redirect } from "next/navigation";

import { auth, authConfigured, signIn } from "@/auth";

export default async function LoginPage() {
  if (authConfigured) {
    const session = await auth();
    if (session?.user) redirect("/");
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-mark">RA</div>
        <p className="login-eyebrow">2nd 30 · Even Semester</p>
        <h1>Routine Attendance</h1>
        <p className="login-description">
          Sign in to keep your class and CT attendance safely synced across devices.
        </p>

        {authConfigured ? (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button className="google-button" type="submit">
              <span className="google-letter">G</span>
              Continue with Google
            </button>
          </form>
        ) : (
          <div className="setup-notice">
            Deployment ready · Login setup pending
          </div>
        )}
      </section>
    </main>
  );
}
