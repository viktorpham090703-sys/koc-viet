// SQL condition for the "hình thức hợp tác" tabs on the KOC portal. The bookings
// table must be aliased as `b`. Every list filtered by `?type=` shares this so a
// booking lands in the same tab on the Booking, Nội dung and Hoa hồng pages.
export function bookingKindFilter(kind: unknown) {
  const type = String(kind ?? '');
  if (!type) return null;
  if (type === 'aiclone') return { sql: "b.type='aiclone'", bindings: [] as string[] };
  if (type === 'review' || type === 'advertising') {
    return {
      sql: "b.type!='aiclone' AND COALESCE(b.booking_type,'ad')='ad' AND COALESCE(b.content_type,'review')=?",
      bindings: [type],
    };
  }
  return { sql: 'b.booking_type=?', bindings: [type] };
}
