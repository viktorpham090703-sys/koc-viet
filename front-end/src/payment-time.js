export function formatPaymentTime(value) {
  if (value == null || String(value).trim() === "") return "—";
  const numeric = Number(value);
  const date = new Date(
    Number.isFinite(numeric)
      ? numeric > 1e11 ? numeric : numeric * 1000
      : value,
  );
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}
