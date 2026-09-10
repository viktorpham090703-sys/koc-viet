const VIETNAM_DATE_TIME_OPTIONS = {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

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
    : date.toLocaleString("vi-VN", VIETNAM_DATE_TIME_OPTIONS);
}

export function formatPaymentTimeParts(value) {
  const formatted = formatPaymentTime(value);
  if (formatted === "—") return { time: "—", date: "" };
  const [time, ...dateParts] = formatted.trim().split(/\s+/);
  return { time, date: dateParts.join(" ") };
}
