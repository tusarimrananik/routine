import assert from "node:assert/strict";
import test from "node:test";

import { createLabHandoffToken } from "../lib/sso-token.ts";

function decodePayload(token: string) {
  const payload = token.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

test("handoff token is scoped to the lab app and expires after one minute", () => {
  const token = createLabHandoffToken(
    { email: "student@example.com", name: "Student", image: null },
    "state-state-state-state-state-state-state-state",
    "s".repeat(48),
    1_800_000_000,
  );
  const payload = decodePayload(token);

  assert.equal(payload.iss, "routine-attendance-tracker");
  assert.equal(payload.aud, "ruet-lab-report-generator");
  assert.equal(payload.exp, 1_800_000_060);
  assert.equal(payload.user.email, "student@example.com");
  assert.equal(
    payload.state,
    "state-state-state-state-state-state-state-state",
  );
  assert.equal(token.split(".").length, 3);
});
