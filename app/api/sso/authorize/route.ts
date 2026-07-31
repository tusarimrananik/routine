import { NextRequest, NextResponse } from "next/server";

import { auth, authConfigured } from "@/auth";
import {
  getAllowedSsoReturnOrigin,
  isStrongSsoSecret,
  isValidSsoState,
} from "@/lib/sso-policy";
import { createLabHandoffToken } from "@/lib/sso-token";

const DEFAULT_LAB_APP_URL = "https://ruet-lab-report-generator.vercel.app";

export async function GET(request: NextRequest) {
  const configuredAppUrl = process.env.LAB_REPORT_APP_URL ?? DEFAULT_LAB_APP_URL;
  const returnOrigin = getAllowedSsoReturnOrigin(
    request.nextUrl.searchParams.get("returnTo"),
    configuredAppUrl,
  );

  const state = request.nextUrl.searchParams.get("state");
  if (!returnOrigin || !isValidSsoState(state)) {
    return NextResponse.json(
      { error: "Invalid SSO request" },
      { status: 400 },
    );
  }

  const secret = process.env.SSO_SHARED_SECRET;
  if (!authConfigured || !isStrongSsoSecret(secret)) {
    return NextResponse.json({ error: "SSO is not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.email) {
    const callbackParams = new URLSearchParams({
      returnTo: returnOrigin,
      state,
    });
    const callbackUrl = `/api/sso/authorize?${callbackParams.toString()}`;
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  const token = createLabHandoffToken(
    {
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    },
    state,
    secret,
  );
  const callback = new URL("/api/sso/callback", returnOrigin);
  callback.searchParams.set("token", token);

  return NextResponse.redirect(callback);
}
