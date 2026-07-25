import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const tracker = readFileSync(join(root, "components", "routine-tracker.tsx"), "utf8");
const analytics = readFileSync(join(root, "components", "attendance-analytics.tsx"), "utf8");
const css = readFileSync(join(root, "app", "globals.css"), "utf8");

test("routine exposes an account menu and compact week switcher", () => {
  assert.match(tracker, /className="profile-menu"/);
  assert.match(tracker, /className="profile-action" href="\/analytics"/);
  assert.match(tracker, /profile-sign-out/);
  assert.match(tracker, /className="week-display"/);
  assert.match(tracker, /aria-label="Previous week"/);
  assert.match(tracker, /aria-label="Next week"/);
  assert.doesNotMatch(tracker, /className="week-select"/);
  assert.match(css, /\.profile-menu\s*\{/);
  assert.match(css, /\.week-switcher\s*\{/);
  assert.match(css, /@media \(max-width: 879px\)/);
});

test("routine keeps attendance details out of the schedule view", () => {
  assert.doesNotMatch(tracker, /Overall Attendance/);
  assert.doesNotMatch(tracker, /attendance-panel/);
  assert.doesNotMatch(tracker, /summary-modal/);
  assert.doesNotMatch(tracker, /subject-attendance/);
});

test("analytics remains the single home for attendance totals and subject details", () => {
  assert.match(analytics, /Overall Attendance/);
  assert.match(analytics, /Regular Classes/);
  assert.match(analytics, /CT Attendance/);
  assert.match(analytics, /Attendance by Subject/);
  assert.match(analytics, /Present/);
  assert.match(analytics, /Absent/);
  assert.match(analytics, /Total/);
});
