type RouteAuthState = {
  authConfigured: boolean;
  email?: string | null;
};

type GoogleProfile = {
  email?: string | null;
  email_verified?: boolean | null;
};

export function getProtectedRouteRedirect({
  authConfigured,
  email,
}: RouteAuthState) {
  return authConfigured && email ? null : "/login";
}

export function getLoginRouteRedirect({
  authConfigured,
  email,
}: RouteAuthState) {
  return authConfigured && email ? "/" : null;
}

export function canSignInWithGoogle(profile?: GoogleProfile) {
  return Boolean(profile?.email && profile.email_verified === true);
}
