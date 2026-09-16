import { Link, Navigate, useSearchParams } from "react-router-dom";

export function RegisterPortalPage() {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  if (roleParam === "business") {
    return <Navigate to="/business-register" replace />;
  }
  if (roleParam === "koc") {
    return <Navigate to="/tuyen-koc" replace />;
  }

  return (
    <div className="reg-portal-page">
      <header className="reg-portal-header">
        <div className="koc-recruit-container reg-portal-header-inner">
          <Link to="/trang-chu" className="lp-logo" aria-label="KOC Việt">
            <img src="https://res.cloudinary.com/drxum5uxt/image/upload/v1785865656/LogoDaXoaNen_r82hx2.png" alt="KOC Việt" />
          </Link>
          <div className="koc-recruit-header-actions">
            <Link to="/trang-chu" className="koc-recruit-back">
              <span aria-hidden="true">←</span>
              <span>Quay lại trang chủ</span>
            </Link>
            <Link to="/login" className="btn primary sm">
              Đăng nhập
            </Link>
          </div>
        </div>
      </header>

      <main className="koc-recruit-container">
        <div className="reg-portal-hero">
          <span className="reg-portal-eyebrow">CỔNG ĐĂNG KÝ KOC VIỆT</span>
          <h1 className="reg-portal-title">Chọn vai trò bạn muốn đăng ký</h1>
          <p className="reg-portal-sub">
            Nền tảng kết nối trực tiếp KOC/KOLs và Doanh nghiệp trên toàn quốc. Chọn đúng vai trò để bắt đầu hành trình của bạn.
          </p>
        </div>

        <div className="reg-portal-grid">
          {/* Card 1: KOC */}
          <article className="reg-portal-card card-koc">
            <span className="reg-portal-badge">Dành cho Creator</span>
            <div className="reg-portal-card-header">
              <div className="reg-portal-icon-wrap" aria-hidden="true">🎤</div>
              <div>
                <h2 className="reg-portal-card-title">Đăng ký KOC / Creator</h2>
              </div>
            </div>
            <p className="reg-portal-card-desc">
              Biến sức ảnh hưởng thành nguồn thu nhập bền vững. Chủ động niêm yết bảng giá theo 5 hạng, nhận booking trực tiếp từ nhãn hàng và nhận hoa hồng tiếp thị liên kết.
            </p>
            <ul className="reg-portal-features">
              <li><span className="reg-portal-check">✓</span><span><b>Nhận 95% phí booking</b> khi hoàn thành hợp đồng</span></li>
              <li><span className="reg-portal-check">✓</span><span><b>Chủ động bảng giá</b> và toàn quyền lựa chọn booking</span></li>
              <li><span className="reg-portal-check">✓</span><span><b>Hoa hồng bán hàng (affiliate)</b> phát sinh trên mỗi đơn</span></li>
              <li><span className="reg-portal-check">✓</span><span><b>Ký hợp đồng điện tử</b> pháp lý minh bạch, an tâm hợp tác</span></li>
              <li><span className="reg-portal-check">✓</span><span><b>Ví tự động đối soát</b>, hỗ trợ rút tiền nhanh chóng</span></li>
            </ul>
            <div className="reg-portal-actions">
              <Link to="/tuyen-koc" className="btn grad nv-lift" style={{width:"100%",fontSize:"15px",fontWeight:700,padding:"14px",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",textDecoration:"none"}}>
                Đăng ký trở thành KOC <span aria-hidden="true">→</span>
              </Link>
              <p className="reg-portal-note">Miễn phí tạo tài khoản · Hoàn tất hồ sơ trong 15 phút</p>
            </div>
          </article>

          {/* Card 2: Business */}
          <article className="reg-portal-card card-biz">
            <span className="reg-portal-badge">Dành cho Nhãn hàng</span>
            <div className="reg-portal-card-header">
              <div className="reg-portal-icon-wrap" aria-hidden="true">🏢</div>
              <div>
                <h2 className="reg-portal-card-title">Đăng ký Doanh nghiệp</h2>
              </div>
            </div>
            <p className="reg-portal-card-desc">
              Tiếp cận mạng lưới hàng nghìn KOC/KOLs xác minh trên toàn quốc. Đặt booking trực tiếp theo giá công khai và bảo vệ dòng tiền qua ví ký quỹ NetViet.
            </p>
            <ul className="reg-portal-features">
              <li><span className="reg-portal-check">✓</span><span><b>Xem bảng giá công khai</b> của KOC, không phí trung gian</span></li>
              <li><span className="reg-portal-check">✓</span><span><b>Bộ lọc thông minh</b> theo ngành hàng, tỉnh thành và ngân sách</span></li>
              <li><span className="reg-portal-check">✓</span><span><b>Ví ký quỹ đảm bảo</b>, nghiệm thu nội dung trước giải ngân</span></li>
              <li><span className="reg-portal-check">✓</span><span><b>Xuất hóa đơn VAT</b> và hợp đồng điện tử hợp pháp</span></li>
              <li><span className="reg-portal-check">✓</span><span><b>Đội ngũ NetViet đồng hành</b> hỗ trợ triển khai chiến dịch</span></li>
            </ul>
            <div className="reg-portal-actions">
              <Link to="/business-register" className="btn primary nv-lift" style={{width:"100%",fontSize:"15px",fontWeight:700,padding:"14px",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",background:"#0b1f3a",color:"#fff",border:"none",textDecoration:"none"}}>
                Đăng ký tài khoản Doanh nghiệp <span aria-hidden="true">→</span>
              </Link>
              <p className="reg-portal-note">Miễn phí đăng ký · Ban quản trị kích hoạt nhanh chóng</p>
            </div>
          </article>
        </div>

        <div className="reg-portal-footer-banner">
          <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
            <span style={{fontSize:"24px"}}>💬</span>
            <div>
              <div style={{fontWeight:700,color:"var(--navy)",fontSize:"15px"}}>Bạn cần hỗ trợ tư vấn trước khi đăng ký?</div>
              <div style={{fontSize:"13px",color:"var(--muted)"}}>Hotline tư vấn miễn phí: <b>0812 98 68 98</b> – <b>0813 487 686</b> · Email: kocviet@netviettv.com.vn</div>
            </div>
          </div>
          <div>
            <Link to="/login" className="btn ghost sm" style={{fontWeight:600}}>Đã có tài khoản? Đăng nhập →</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
