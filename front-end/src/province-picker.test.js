import test from "node:test";
import assert from "node:assert/strict";
import { bindProvincePicker } from "./province-picker.js";

test("province picker opens all choices, filters only on typing, and supports selection and reopening", () => {
  const element = (props = {}) => ({
    hidden: false, attributes: {}, listeners: {}, classList: { add() {}, remove() {} },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    dispatchEvent(event) { this.listeners[event.type]?.(event); },
    scrollIntoView() {}, select() {}, focus() {},
    ...props,
  });
  const input = element({ value: "Tỉnh An Giang" });
  const panel = element({ hidden: true });
  const toggle = element();
  const empty = element();
  const options = ["Tỉnh An Giang", "Thành phố Hà Nội", "Thành phố Đà Nẵng"].map((textContent, i) => element({ textContent, id: `province-${i}` }));
  const picker = element({
    querySelector: selector => ({ input, "[data-province-panel]": panel, "[data-province-toggle]": toggle, "[data-province-empty]": empty })[selector],
    querySelectorAll: () => options,
    contains: target => target === input,
  });
  const key = key => input.listeners.keydown({ key, preventDefault() {} });
  const type = value => { input.value = value; input.dispatchEvent(new Event("input")); };
  bindProvincePicker(picker);
  input.listeners.focus();
  assert.equal(panel.hidden, false);
  assert.ok(options.every(option => !option.hidden));
  type("da nang");
  assert.deepEqual(options.map(option => option.hidden), [true, true, false]);
  key("ArrowDown");
  assert.equal(input.attributes["aria-activedescendant"], "province-2");
  key("Enter");
  assert.equal(input.value, "Thành phố Đà Nẵng");
  assert.equal(panel.hidden, true);
  input.listeners.click();
  assert.ok(options.every(option => !option.hidden));
  type("không tồn tại");
  assert.equal(empty.hidden, false);
  key("ArrowDown");
  assert.equal(input.attributes["aria-activedescendant"], undefined);
  type("");
  assert.ok(options.every(option => !option.hidden));
  assert.equal(empty.hidden, true);
  options[0].listeners.click();
  assert.equal(input.value, "Tỉnh An Giang");
  toggle.listeners.click();
  assert.equal(panel.hidden, false);
  key("Escape");
  assert.equal(panel.hidden, true);
  input.listeners.focus();
  picker.listeners.focusout({ relatedTarget: null });
  assert.equal(panel.hidden, true);
});
