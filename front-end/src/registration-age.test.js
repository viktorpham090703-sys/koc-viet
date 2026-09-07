import test from "node:test";
import assert from "node:assert/strict";
import { registrationAgeError } from "./registration-age.js";

test("registration requires the eighteenth birthday in Vietnam", () => {
  const today = new Date("2026-09-06T17:00:00Z");
  assert.equal(registrationAgeError("2008-09-07", today), "");
  assert.notEqual(registrationAgeError("2008-09-08", today), "");
  assert.equal(registrationAgeError("2000-01-01", today), "");
});

test("rejects missing, invalid and future birth dates", () => {
  const today = new Date("2026-09-07T05:00:00Z");
  for (const value of ["", "invalid", "2000-02-30", "2001-02-29", "2027-01-01"])
    assert.notEqual(registrationAgeError(value, today), "");
});

test("leap-day birthdays reach eighteen on March 1 in a non-leap year", () => {
  assert.notEqual(registrationAgeError("2008-02-29", new Date("2026-02-28T05:00:00Z")), "");
  assert.equal(registrationAgeError("2008-02-29", new Date("2026-03-01T05:00:00Z")), "");
});
