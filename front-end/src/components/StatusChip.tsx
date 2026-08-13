const labels: Record<string, string> = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', producing: 'Đang sản xuất',
  posted: 'Đã đăng', completed: 'Hoàn thành', rejected: 'Từ chối', active: 'Hoạt động',
  settled: 'Đã đối soát', paid: 'Đã thanh toán', open: 'Đang mở', approved: 'Đã duyệt',
}
export function StatusChip({ status }: { status: string }) {
  return <span className={`chip ${['completed','active','approved','paid'].includes(status) ? 'g' : status === 'rejected' ? 'r' : 'b'}`}>{labels[status] ?? status}</span>
}
