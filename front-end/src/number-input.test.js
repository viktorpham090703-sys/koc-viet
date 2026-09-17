import test from "node:test";
import assert from "node:assert/strict";
import { parseIntegerInput, bindIntegerInputs } from "./number-input.js";

test("accepts plain and Vietnamese grouped integers without changing their value", () => {
  for (const value of ["1000000", "1.000.000", " 1.000.000 "])
    assert.equal(parseIntegerInput(value), 1_000_000);
  assert.equal(parseIntegerInput("1000"), 1_000);
  assert.equal(parseIntegerInput("1.000"), 1_000);
  assert.equal(parseIntegerInput(1000), 1_000);
  assert.equal(parseIntegerInput("200.000"), 200_000);
  assert.equal(parseIntegerInput("0"), 0);
  assert.equal(parseIntegerInput("2.000.000.000"), 2_000_000_000);
  for (const value of ["", " ", "1.5", "1..000", "1.000.00", "-1000", "1e6", "abc", "9007199254740992"])
    assert.ok(Number.isNaN(parseIntegerInput(value)), value);

  let onBlur;
  const input = { value: "1000000", addEventListener: (event, callback) => {
    assert.equal(event, "blur");
    onBlur = callback;
  }};
  bindIntegerInputs({ querySelectorAll: () => [input] });
  onBlur();
  assert.equal(input.value, "1.000.000");
  input.value = "1.5";
  onBlur();
  assert.equal(input.value, "1.5");
});
