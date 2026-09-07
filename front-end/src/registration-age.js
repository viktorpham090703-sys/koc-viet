export function registrationAgeError(value, today = new Date()) {
  if (!value) return "Chọn ngày sinh";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Ngày sinh không hợp lệ";
  const [year, month, day] = value.split("-").map(Number);
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day)
    return "Ngày sinh không hợp lệ";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(today);
  const current = Object.fromEntries(parts.map(part => [part.type, Number(part.value)]));
  if (year * 10000 + month * 100 + day > current.year * 10000 + current.month * 100 + current.day)
    return "Ngày sinh không được ở tương lai";
  const age = current.year - year - (current.month < month || (current.month === month && current.day < day) ? 1 : 0);
  return age < 18 ? "Bạn chưa đủ 18 tuổi để đăng ký" : "";
}
