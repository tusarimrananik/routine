import { redirect } from "next/navigation";

import { auth, authConfigured, signIn } from "@/auth";
import { getLoginRouteRedirect } from "@/lib/auth-policy";
import { getSafeCallbackUrl } from "@/lib/sso-policy";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requestedCallback = Array.isArray(params.callbackUrl)
    ? params.callbackUrl[0]
    : params.callbackUrl;
  const callbackUrl = getSafeCallbackUrl(requestedCallback);
  const session = authConfigured ? await auth() : null;
  const destination = getLoginRouteRedirect({
    authConfigured,
    email: session?.user?.email,
  });

  if (destination) redirect(callbackUrl);

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
              await signIn("google", { redirectTo: callbackUrl });
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
