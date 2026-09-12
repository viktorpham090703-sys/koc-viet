export function parseIntegerInput(value) {
  const text = String(value ?? "").trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(text)) return NaN;
  const number = Number(text.replace(/\./g, ""));
  return Number.isSafeInteger(number) ? number : NaN;
}

// Format after editing so typing separators or editing in the middle keeps the caret stable.
export function bindIntegerInputs(root) {
  root.querySelectorAll("[data-integer-input]").forEach(input => {
    input.addEventListener("blur", () => {
      const number = parseIntegerInput(input.value);
      if (Number.isFinite(number)) input.value = number.toLocaleString("vi-VN");
    });
  });
}
