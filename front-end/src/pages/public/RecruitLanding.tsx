import { Link } from 'react-router-dom'

const benefits = [
  ['01', 'Tự đặt giá', 'Niêm yết mức phí theo ngành hàng và hạng KOC của bạn.'],
  ['02', 'Toàn quyền lựa chọn', 'Xem brief, sản phẩm và thời hạn trước khi nhận booking.'],
  ['03', 'Thêm thu nhập từ tiếp thị liên kết', 'Chia sẻ đường dẫn sản phẩm và nhận hoa hồng từ đơn phát sinh.'],
  ['04', 'Ví và đối soát minh bạch', 'Theo dõi từng khoản thu, trạng thái và lịch sử rút tiền.'],
]

export function RecruitLanding() {
  return <div className="koc-recruit">
    <header className="koc-recruit-header">
      <div className="koc-recruit-container koc-recruit-header-inner">
        <Link to="/trang-chu" className="logo" aria-label="KOC Việt">KOC Việt</Link>
        <div className="koc-recruit-header-actions">
          <Link to="/trang-chu" className="koc-recruit-back"><span aria-hidden="true">←</span><span>Quay lại trang chủ</span></Link>
          <Link to="/login" className="btn primary sm">Đăng nhập</Link>
        </div>
      </div>
    </header>
    <main>
      <section className="koc-recruit-hero">
        <div className="koc-recruit-container koc-recruit-hero-grid">
          <div className="koc-recruit-hero-copy">
            <span className="koc-recruit-eyebrow">CỘNG ĐỒNG KOC VIỆT</span>
            <h1>Biến sức ảnh hưởng thành nguồn thu nhập bền vững</h1>
            <p>Chủ động niêm yết bảng giá, chọn booking phù hợp và theo dõi thanh toán minh bạch trên một nền tảng duy nhất.</p>
            <div className="koc-recruit-hero-actions"><Link className="btn grad nv-lift" to="/login">Bắt đầu đăng ký miễn phí <span aria-hidden="true">→</span></Link><a href="#koc-how-it-works" className="koc-recruit-text-link">Xem cách hoạt động</a></div>
            <div className="koc-recruit-trust"><span>✓ Đăng ký miễn phí</span><span>✓ Chủ động bảng giá</span><span>✓ Hợp đồng điện tử</span></div>
          </div>
          <div className="koc-recruit-preview" aria-label="Tổng quan quyền lợi KOC">
            <div className="koc-recruit-preview-top"><span className="koc-recruit-preview-badge">Tổng quan KOC</span><span className="koc-recruit-live"><i/> Minh bạch theo thời gian thực</span></div>
            <div className="koc-recruit-earning"><span>Thu nhập của bạn</span><strong>Booking + Hoa hồng bán hàng</strong><small>Chủ động kiểm soát từng nguồn thu</small></div>
            <div className="koc-recruit-mini-grid"><div><span>Nhận booking</span><b>Tự quyết định</b></div><div><span>Phí dịch vụ</span><b>Niêm yết rõ ràng</b></div><div><span>Đối soát</span><b>Theo từng giao dịch</b></div><div><span>Hỗ trợ</span><b>Từ đội ngũ NetViet</b></div></div>
          </div>
        </div>
      </section>
      <section className="koc-recruit-benefits"><div className="koc-recruit-container"><div className="koc-recruit-section-head"><span>QUYỀN LỢI DÀNH CHO BẠN</span><h2>Làm nội dung theo cách của bạn</h2><p>KOC Việt giúp bạn tập trung vào chất lượng nội dung, còn quy trình booking và thanh toán được chuẩn hóa.</p></div><div className="koc-recruit-benefit-grid">{benefits.map(([number,title,body])=><article className="koc-recruit-benefit-card" key={number}><span className="koc-recruit-card-number">{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>
      <section className="koc-recruit-steps" id="koc-how-it-works"><div className="koc-recruit-container"><div className="koc-recruit-section-head light"><span>BẮT ĐẦU CHỈ VỚI 3 BƯỚC</span><h2>Từ hồ sơ đến booking đầu tiên</h2></div><div className="koc-recruit-step-grid"><article><b>1</b><div><h3>Tạo hồ sơ KOC</h3><p>Xác thực email, khai báo kênh mạng xã hội và lĩnh vực nội dung.</p></div></article><article><b>2</b><div><h3>Hoàn tất xác minh</h3><p>Xác minh danh tính, thiết lập bảng giá và ký hợp đồng điện tử.</p></div></article><article><b>3</b><div><h3>Nhận booking</h3><p>Sau khi được duyệt, hồ sơ của bạn xuất hiện trên trang khám phá.</p></div></article></div></div></section>
      <section className="koc-recruit-final"><div className="koc-recruit-container koc-recruit-final-box"><div><span>SẴN SÀNG BẮT ĐẦU?</span><h2>Xây dựng sự nghiệp KOC cùng KOC Việt</h2><p>Hoàn thiện hồ sơ trong khoảng 15 phút. Bạn có thể chủ động kiểm soát mọi booking.</p></div><Link className="btn grad nv-lift" to="/login">Đăng ký trở thành KOC <span aria-hidden="true">→</span></Link></div></section>
    </main>
  </div>
}
