import test from "node:test";
import assert from "node:assert/strict";
import { formatPaymentTime } from "./payment-time.js";

test("payment history shows the same Vietnam time for Unix seconds, BIGINT strings, milliseconds and ISO dates", () => {
  const iso = "2026-09-08T03:04:05.000Z";
  const milliseconds = Date.parse(iso);
  const expected = new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  for (const value of [milliseconds / 1000, String(milliseconds / 1000), milliseconds, String(milliseconds), iso]) {
    assert.equal(formatPaymentTime(value), expected);
  }
  assert.match(expected, /10:04:05/);
});

test("missing or invalid payment times never render Invalid Date", () => {
  for (const value of [null, undefined, "", "  ", "invalid", NaN, Infinity, 1e20]) {
    assert.equal(formatPaymentTime(value), "—");
  }
});
