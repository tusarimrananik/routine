import assert from "node:assert/strict";
import test from "node:test";

import {
  canSignInWithGoogle,
  getLoginRouteRedirect,
  getProtectedRouteRedirect,
} from "../lib/auth-policy.ts";

test("protected pages send visitors to login when authentication is not configured", () => {
  assert.equal(
    getProtectedRouteRedirect({ authConfigured: false, email: null }),
    "/login",
  );
});

test("protected pages send anonymous visitors to login", () => {
  assert.equal(
    getProtectedRouteRedirect({ authConfigured: true, email: null }),
    "/login",
  );
});

test("protected pages allow authenticated visitors", () => {
  assert.equal(
    getProtectedRouteRedirect({ authConfigured: true, email: "student@example.com" }),
    null,
  );
});

test("login page stays visible while authentication setup is pending", () => {
  assert.equal(
    getLoginRouteRedirect({ authConfigured: false, email: null }),
    null,
  );
});

test("login page sends authenticated visitors home", () => {
  assert.equal(
    getLoginRouteRedirect({ authConfigured: true, email: "student@example.com" }),
    "/",
  );
});

test("Google sign-in accepts any account with a verified email", () => {
  assert.equal(
    canSignInWithGoogle({ email: "anyone@example.com", email_verified: true }),
    true,
  );
});

test("Google sign-in rejects profiles without a verified email", () => {
  assert.equal(
    canSignInWithGoogle({ email: "anyone@example.com", email_verified: false }),
    false,
  );
  assert.equal(canSignInWithGoogle({ email_verified: true }), false);
});
