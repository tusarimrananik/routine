import assert from "node:assert/strict";
import test from "node:test";

import {
  getAllowedSsoReturnOrigin,
  getSafeCallbackUrl,
  isValidSsoState,
  isStrongSsoSecret,
} from "../lib/sso-policy.ts";

test("SSO accepts the configured lab-report origin", () => {
  assert.equal(
    getAllowedSsoReturnOrigin(
      "https://ruet-lab-report-generator.vercel.app",
      "https://ruet-lab-report-generator.vercel.app",
    ),
    "https://ruet-lab-report-generator.vercel.app",
  );
});

test("SSO rejects untrusted and malformed return URLs", () => {
  assert.equal(
    getAllowedSsoReturnOrigin(
      "https://evil.example",
      "https://ruet-lab-report-generator.vercel.app",
    ),
    null,
  );
  assert.equal(
    getAllowedSsoReturnOrigin(
      "not-a-url",
      "https://ruet-lab-report-generator.vercel.app",
    ),
    null,
  );
});

test("SSO secret requires at least 256 bits of key material", () => {
  assert.equal(isStrongSsoSecret("s".repeat(32)), true);
  assert.equal(isStrongSsoSecret("too-short"), false);
  assert.equal(isStrongSsoSecret(undefined), false);
});

test("SSO state accepts high-entropy URL-safe values only", () => {
  assert.equal(isValidSsoState("a".repeat(43)), true);
  assert.equal(isValidSsoState("short"), false);
  assert.equal(isValidSsoState("a".repeat(42) + "!"), false);
});

test("login callback allows local paths and rejects open redirects", () => {
  assert.equal(
    getSafeCallbackUrl(
      "/api/sso/authorize?returnTo=https%3A%2F%2Fruet-lab-report-generator.vercel.app",
    ),
    "/api/sso/authorize?returnTo=https%3A%2F%2Fruet-lab-report-generator.vercel.app",
  );
  assert.equal(getSafeCallbackUrl("https://evil.example"), "/");
  assert.equal(getSafeCallbackUrl("//evil.example"), "/");
  assert.equal(getSafeCallbackUrl("/\\evil.example"), "/");
  assert.equal(getSafeCallbackUrl("/%5Cevil.example"), "/");
  assert.equal(getSafeCallbackUrl("/%255Cevil.example"), "/");
  assert.equal(getSafeCallbackUrl("/%252F%252Fevil.example"), "/");
  assert.equal(
    getSafeCallbackUrl("/%25252525252F%25252525252Fevil.example"),
    "/",
  );
});
