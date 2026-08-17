import { Link } from 'react-router-dom'
import { Cards,Cta,Faq,Hero,LeadForm,Media,Section,Shell,Steps } from './LandingComponents'
const img={koc:'https://res.cloudinary.com/drxum5uxt/image/upload/v1785312036/BANNER_TRANG_KOC_qjho2n.jpg',business:'https://res.cloudinary.com/drxum5uxt/image/upload/v1785312034/booking_koc_d%E1%BB%85_d%C3%A0ng_nh%C6%B0_%C4%91%E1%BA%B7t_xe_jwapy0.jpg',market:'https://res.cloudinary.com/drxum5uxt/image/upload/v1785313898/c%E1%BA%A3_m%E1%BB%99t_th%E1%BB%8B_tr%C6%B0%E1%BB%9Dng_koc_trong_b%E1%BB%99_l%E1%BB%8Dc_ynzysz.jpg',ai:'https://res.cloudinary.com/drxum5uxt/image/upload/v1785313898/banner_ai_clone_av_i0rjqx.jpg',price:'https://res.cloudinary.com/drxum5uxt/image/upload/v1785313899/b%E1%BA%A3ng_gi%C3%A1_u79tuy.jpg',community:'https://res.cloudinary.com/drxum5uxt/image/upload/v1785313892/kh%C3%A1ch_h%C3%A0ng_t%E1%BB%89nh_n%C3%A0o-koc_t%E1%BB%89nh_%C4%91%C3%B3_psuq1g.jpg'}
const flow:Array<[string,string]>=[
  ['TÌM & CHỌN','Doanh nghiệp lọc KOC theo ngành hàng, tỉnh, hạng, giá; xem hồ sơ với chỉ số hiệu quả thật và bảng giá công khai.'],
  ['BOOKING & ĐẶT CỌC','Gửi yêu cầu kèm link dữ liệu sản phẩm để KOC kiểm tra. Thanh toán tạm giữ vào ví đảm bảo của nền tảng.'],
  ['SẢN XUẤT & ĐĂNG BÀI','KOC xác nhận, tự sản xuất content đúng chất giọng của mình và đăng bài kèm link affiliate riêng.'],
  ['ĐO LƯỜNG & CHI TRẢ','Hệ thống ghi nhận click, đơn hàng theo thời gian thực. Hoàn thành: KOC nhận 95% phí booking + hoa hồng; doanh nghiệp nhận báo cáo minh bạch.'],
]

export function HomeLanding(){
  return (
    <Shell className="lp-home">
      {/* Hero Section (Image 1) */}
      <section className="lp-hero-home">
        <div className="lp-hero-home-inner">
          <div className="lp-hero-content">
            <div className="lp-hero-eyebrow-wrap">
              <span className="lp-hero-eyebrow-dash" />
              <span className="lp-hero-eyebrow">NỀN TẢNG CỔNG BOOKING KOC / KOC VIỆT</span>
            </div>
            <h1 className="lp-hero-title">
              Booking KOC<br />
              dễ như đặt xe.<br />
              <span className="coral">Giá công khai.</span>
              <span className="coral">Hiệu quả đo được.</span>
            </h1>
            <p className="lp-hero-sub">
              KOC Việt kết nối doanh nghiệp với KOC/KOL phù hợp nhất.<br />
              Giá công khai, minh bạch. Hiệu quả đo được –<br />
              giá KOC cho chiến dịch của bạn.
            </p>
            <div className="lp-hero-cta">
              <Link to="/tuyen-koc" className="btn btn-primary">Đăng ký KOC miễn phí</Link>
              <Link to="/explore" className="btn btn-secondary">Tìm KOC cho chiến dịch</Link>
            </div>
          </div>
          <div className="lp-hero-visual">
            <div className="lp-hero-brush-arc" aria-hidden="true" />
            <img src="/images/home-hero-user-seamless.png" alt="Booking KOC Việt minh bạch và dễ dàng" fetchPriority="high" />
          </div>
        </div>

        {/* Stats Strip directly on Hero background (Image 2) */}
        <div className="lp-hero-stats-wrap">
          <div className="lp-hero-stats-grid">
            <div className="lp-hero-stat-item">
              <div className="lp-stat-icon-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div className="lp-stat-info">
                <span className="lp-stat-num">300.000+</span>
                <span className="lp-stat-lbl">KOC/KOL</span>
              </div>
            </div>
            <div className="lp-hero-stat-item">
              <div className="lp-stat-icon-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>
              </div>
              <div className="lp-stat-info">
                <span className="lp-stat-num">200.000+</span>
                <span className="lp-stat-lbl">Doanh nghiệp</span>
              </div>
            </div>
            <div className="lp-hero-stat-item">
              <div className="lp-stat-icon-circle">
                <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <div className="lp-stat-info">
                <span className="lp-stat-num">34</span>
                <span className="lp-stat-lbl">Tỉnh thành</span>
              </div>
            </div>
            <div className="lp-hero-stat-item">
              <div className="lp-stat-icon-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
              </div>
              <div className="lp-stat-info">
                <span className="lp-stat-num">5%+</span>
                <span className="lp-stat-lbl">Mức phí dịch vụ duy nhất</span>
              </div>
            </div>
          </div>
        </div>

        {/* Organic Wave divider (đường lượn sóng) */}
        <div className="lp-hero-wave-divider" aria-hidden="true">
          <svg viewBox="0 0 1440 90" preserveAspectRatio="none" fill="#ffffff">
            <path d="M0,45 C280,75 560,18 840,42 C1080,62 1280,72 1440,32 L1440,90 L0,90 Z" />
          </svg>
        </div>
      </section>

      {/* Split Section: Hoạt động & Dành cho doanh nghiệp / KOC (Image 2) */}
      <section className="lp-split-section" aria-label="Hoạt động và Đối tượng KOC Việt">
        <div className="lp-split-container">
          {/* Left: Hoạt động Booking & KOC mới nhất */}
          <div className="lp-activity-col">
            <div className="lp-activity-head-bar">
              <div className="lp-activity-title-wrap">
                <h3 className="lp-activity-title">Hoạt động Booking &amp; KOC mới nhất</h3>
                <span className="lp-activity-underline-accent" />
              </div>
              <Link to="/explore" className="lp-activity-all-link">Xem tất cả →</Link>
            </div>
            <div className="lp-activity-table">
              <article className="lp-activity-row-item">
                <div className="lp-cat-pill"><span className="lp-cat-dot green" /><span>Thực phẩm</span></div>
                <div className="lp-user-cell"><img className="lp-user-avatar" src="/default-avatar.svg" alt="Kim L." /><span className="lp-user-name">Kim L.</span></div>
                <div className="lp-activity-desc">Booking 50C cực hạn/ mẹt hàn và thương hiệu chống dính công nghệ mới</div>
                <div className="lp-activity-timestamp">16 phút trước</div>
              </article>
              <article className="lp-activity-row-item">
                <div className="lp-cat-pill"><span className="lp-cat-dot red" /><span>Thời trang</span></div>
                <div className="lp-user-cell"><img className="lp-user-avatar" src="/default-avatar.svg" alt="Ngọc A." /><span className="lp-user-name">Ngọc A.</span></div>
                <div className="lp-activity-desc">Booking &amp; 03 cpc</div>
                <div className="lp-activity-timestamp">17 phút trước</div>
              </article>
              <article className="lp-activity-row-item">
                <div className="lp-cat-pill"><span className="lp-cat-dot green" /><span>Trước công</span></div>
                <div className="lp-user-cell"><img className="lp-user-avatar" src="/default-avatar.svg" alt="Minh T." /><span className="lp-user-name">Minh T.</span></div>
                <div className="lp-activity-desc">Săn hàng</div>
                <div className="lp-activity-timestamp">26 phút trước</div>
              </article>
              <article className="lp-activity-row-item">
                <div className="lp-cat-pill"><span className="lp-cat-dot green" /><span>Thực phẩm</span></div>
                <div className="lp-user-cell"><img className="lp-user-avatar" src="/default-avatar.svg" alt="Lan H." /><span className="lp-user-name">Lan H.</span></div>
                <div className="lp-activity-desc">Review hũ ốc cháy — nghêu, ghẹ, sụ,... đồng nghìn &amp; 500 đồng.</div>
                <div className="lp-activity-timestamp">1 giờ trước</div>
              </article>
              <article className="lp-activity-row-item">
                <div className="lp-cat-pill"><span className="lp-cat-dot red" /><span>Thác Đăng</span></div>
                <div className="lp-user-cell"><img className="lp-user-avatar" src="/default-avatar.svg" alt="Quang D." /><span className="lp-user-name">Quang D.</span></div>
                <div className="lp-activity-desc">Đo lường &amp; chi trả</div>
                <div className="lp-activity-timestamp">1 giờ trước</div>
              </article>
            </div>
          </div>

          {/* Right: Dành cho doanh nghiệp & KOC */}
          <div className="lp-audience-col">
            <h2 className="lp-audience-heading">
              Dành cho<br />
              <span className="lp-coral-text">doanh nghiệp &amp; KOC</span>
            </h2>
            <p className="lp-audience-sub">
              KOC Việt là cầu nối giúp chiến dịch hiệu quả hơn.<br />Minh bạch hơn. Dễ dàng hơn cho cả hai phía.
            </p>
            <div className="lp-audience-cards-grid">
              <div className="lp-audience-box">
                <div className="lp-audience-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 7v14M21 7v14M6 11h2M6 15h2M10 11h2M10 15h2M14 11h2M14 15h2M9 3h6v4H9z"/></svg>
                </div>
                <h3 className="lp-audience-box-title">Dành cho doanh nghiệp</h3>
                <ul className="lp-audience-list">
                  <li><span className="chk">✓</span> Tìm KOC phù hợp nhanh chóng</li>
                  <li><span className="chk">✓</span> Giá công khai, dễ so sánh</li>
                  <li><span className="chk">✓</span> Quản lý chiến dịch &amp; đo lường hiệu quả</li>
                </ul>
                <Link to="/doanh-nghiep" className="lp-audience-action-link">Tìm hiểu thêm →</Link>
              </div>

              <div className="lp-audience-box">
                <div className="lp-audience-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8l2 2 4-4"/></svg>
                </div>
                <h3 className="lp-audience-box-title">Dành cho KOC</h3>
                <ul className="lp-audience-list">
                  <li><span className="chk">✓</span> Nhận chiến dịch phù hợp</li>
                  <li><span className="chk">✓</span> Thu nhập minh bạch, thanh toán nhanh</li>
                  <li><span className="chk">✓</span> Xây dựng thương hiệu cá nhân bền vững</li>
                </ul>
                <Link to="/koc" className="lp-audience-action-link">Trở thành KOC ngay →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 bước cho một chiến dịch trọn vẹn */}
      <section className="lp-home-campaign-steps" aria-label="4 bước cho một chiến dịch trọn vẹn">
        <div className="lp-home-campaign-steps-inner">
          <div className="lp-section-head">
            <h2 className="lp-steps-heading">4 bước cho một chiến dịch trọn vẹn</h2>
          </div>

          <div className="lp-steps-video-wrap">
            <div className="lp-desk-video-card">
              <video src="https://quankle2004.quankle2004.workers.dev/videos/how-it-works.mp4" controls playsInline poster="https://res.cloudinary.com/drxum5uxt/image/upload/v1785312034/booking_koc_d%E1%BB%85_d%C3%A0ng_nh%C6%B0_%C4%91%E1%BA%B7t_xe_jwapy0.jpg" />
            </div>
          </div>

          <div className="lp-grid-4 lp-steps-cards-grid">
            <article className="lp-step-card">
              <div className="lp-step-badge">1</div>
              <h4>TÌM &amp; CHỌN</h4>
              <p>Doanh nghiệp lọc KOC theo ngành hàng, tỉnh, hạng, giá; xem hồ sơ với chỉ số hiệu quả thật và bảng giá công khai.</p>
            </article>
            <article className="lp-step-card">
              <div className="lp-step-badge">2</div>
              <h4>BOOKING &amp; ĐẶT CỌC</h4>
              <p>Gửi yêu cầu kèm link dữ liệu sản phẩm để KOC kiểm tra. Thanh toán tạm giữ vào ví đảm bảo của nền tảng.</p>
            </article>
            <article className="lp-step-card">
              <div className="lp-step-badge">3</div>
              <h4>SẢN XUẤT &amp; ĐĂNG BÀI</h4>
              <p>KOC xác nhận, tự sản xuất content đúng chất giọng của mình và đăng bài kèm link affiliate riêng.</p>
            </article>
            <article className="lp-step-card">
              <div className="lp-step-badge">4</div>
              <h4>ĐO LƯỜNG &amp; CHI TRẢ</h4>
              <p>Hệ thống ghi nhận click, đơn hàng theo thời gian thực. Hoàn thành: KOC nhận 95% phí booking + hoa hồng; doanh nghiệp nhận báo cáo minh bạch.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Điều mà thị trường booking KOC đang thiếu */}
      <section className="lp-home-proof">
        <div className="lp-home-proof-inner">
          <div className="lp-section-head">
            <h2>Điều mà thị trường booking KOC đang thiếu — chúng tôi làm trước tiên</h2>
          </div>
          <div className="lp-grid-4">
            <article className="lp-card">
              <p><strong>Giá niêm yết công khai</strong> — Lần đầu tiên tại Việt Nam, phí booking KOC minh bạch, phân theo 4 hạng Nano – Micro – Mid – Macro.</p>
            </article>
            <article className="lp-card">
              <p><strong>Thanh toán an toàn</strong> — Doanh nghiệp không sợ mất tiền, KOC không sợ bị chậm phí. Tiền chỉ được chuyển khi hai bên xác nhận hoàn thành.</p>
            </article>
            <article className="lp-card">
              <p><strong>Hiệu quả bằng số thật</strong> — Khả năng tạo đơn của mỗi KOC được tính từ dữ liệu bán hàng thực tế, không dựa trên tự khai báo hoặc số người theo dõi ảo.</p>
            </article>
            <article className="lp-card">
              <p><strong>Đánh giá hai chiều</strong> — Doanh nghiệp chấm điểm KOC, KOC chấm điểm doanh nghiệp. Uy tín tích luỹ quyết định thứ hạng hiển thị.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Phủ mọi ngành hàng đang tăng trưởng */}
      <section className="lp-home-categories">
        <div className="lp-home-categories-inner">
          <div className="lp-section-head">
            <h2>Phủ mọi ngành hàng đang tăng trưởng</h2>
          </div>
          <div className="lp-section-media lp-reveal">
            <Media src="https://res.cloudinary.com/drxum5uxt/image/upload/v1785488594/Thi%E1%BA%BFt_k%E1%BA%BF_ch%C6%B0a_c%C3%B3_t%C3%AAn_3_n84ryp.jpg" alt="Minh hoạ các ngành hàng đang tăng trưởng" ratio="21/9" />
          </div>
          <div className="lp-chip-row">
            {['Mỹ phẩm & Làm đẹp','Mẹ & Bé','Ẩm thực F&B','Thời trang','Điện tử gia dụng','Sức khoẻ','Du lịch địa phương','Tài chính cá nhân','Giáo dục','Thương mại điện tử'].map(c => (
              <span className="lp-chip" key={c}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Dịch vụ AI Clone Avatar */}
      <section className="lp-home-spotlight">
        <div className="lp-home-spotlight-inner">
          <div className="lp-banner">
            <h3>Mới: Dịch vụ video đại diện — không cần tự quay mỗi ngày</h3>
            <p>NetViet tiếp nhận booking và sản xuất video cho bạn. Bạn xem, duyệt và đăng, đồng thời vẫn nhận phí booking cùng hoa hồng bán hàng.</p>
            <Link to="/ai-clone" className="btn">Tìm hiểu dịch vụ →</Link>
          </div>
        </div>
      </section>

      {/* Đánh giá / Testimonials */}
      <section className="lp-home-stories">
        <div className="lp-home-stories-inner">
          <div className="lp-grid-2">
            <div className="lp-quote">
              <div className="stars">★★★★★</div>
              <p className="lp-quote-body">“Trước đây mình mất cả tuần đàm phán giá với từng nhãn. Giờ nhãn tự đến vì giá của mình treo sẵn trên hồ sơ — tháng cao điểm mình nhận 11 booking.”</p>
              <div className="lp-quote-author">
                <img className="lp-quote-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80" alt="Linh Chi" loading="lazy" />
                <div className="lp-quote-info">
                  <div className="lp-quote-name-row">
                    <strong className="lp-quote-name">Linh Chi</strong>
                    <span className="lp-role-badge koc">KOC</span>
                  </div>
                  <span className="lp-quote-role">Micro KOC ngành Làm đẹp · Đà Nẵng</span>
                </div>
              </div>
            </div>
            <div className="lp-quote">
              <div className="stars">★★★★★</div>
              <p className="lp-quote-body">“Chi 30 triệu cho 8 KOC qua KOC Việt, chúng tôi biết chính xác từng đồng tạo ra bao nhiêu đơn. Điều đó chưa agency nào làm được cho chúng tôi.”</p>
              <div className="lp-quote-author">
                <img className="lp-quote-avatar" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80" alt="Trần Minh Hoàng" loading="lazy" />
                <div className="lp-quote-info">
                  <div className="lp-quote-name-row">
                    <strong className="lp-quote-name">Trần Minh Hoàng</strong>
                    <span className="lp-role-badge business">Doanh nghiệp</span>
                  </div>
                  <span className="lp-quote-role">Giám đốc Marketing · Thương hiệu Mỹ phẩm nội địa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA (Orange Background) */}
      <section className="lp-cta-final">
        <div className="lp-cta-final-inner">
          <h2>Booking minh bạch. Thanh toán an tâm. Kết nối bền vững.</h2>
          <div className="lp-hero-cta">
            <Link to="/tuyen-koc" className="btn navy nv-lift">Đăng ký làm KOC — miễn phí</Link>
            <Link to="/explore" className="btn ghost nv-lift">Booking KOC ngay hôm nay</Link>
          </div>
        </div>
      </section>
    </Shell>
  )
}
export function KocLanding(){return <Shell><Hero eyebrow="DÀNH CHO KOC/KOLs" title="Bạn định giá. Nền tảng mang booking đến. Ví tự cộng tiền." sub="Mở hồ sơ năng lực, niêm yết phí theo ngành hàng và nhận thêm hoa hồng bán hàng." image={img.koc} primary={['Đăng ký làm KOC','/tuyen-koc']}/><Section title="Một bài đăng — hai dòng thu nhập"><Cards columns={2} items={[["95% phí booking","Nhận phần lớn giá trị booking khi hoàn thành."],["Hoa hồng bán hàng","Tiếp tục nhận thu nhập từ đơn hàng."]]}/></Section><Section title="5 bước để bắt đầu — dưới 15 phút" tint><Steps items={[["TẠO TÀI KHOẢN","Xác thực email."],["KHAI BÁO KÊNH","Thêm mạng xã hội."],["NIÊM YẾT GIÁ","Chọn ngành và phí."],["KÝ HỢP ĐỒNG","Ký điện tử."],["NHẬN BOOKING","Bật trạng thái hợp tác."]]}/></Section><Section title="Càng làm tốt, khung giá càng mở"><Cards columns={4} items={[["Nano","Uy tín gần gũi."],["Micro","Tối ưu chuyển đổi."],["Mid","Độ phủ toàn quốc."],["Macro","Chiến dịch lớn."]]}/></Section><Section title="Câu hỏi thường gặp"><Faq items={[["Đăng ký có mất phí không?","Không thu phí đăng ký hoặc thành viên."],["Khi nào nhận tiền?","Sau khi booking hoàn thành và đối soát."],["Ai quyết định giá?","KOC niêm yết trong khung giá theo hạng."]]}/></Section><Cta title="Biến sức ảnh hưởng thành thu nhập minh bạch." primary={['Trở thành KOC','/tuyen-koc']}/></Shell>}
export function BusinessLanding(){return <Shell><Hero eyebrow="DÀNH CHO DOANH NGHIỆP & NHÃN HÀNG" title="Chọn người — Hợp giá — Chốt ngay." sub="Mọi KOC niêm yết giá công khai theo ngành hàng, kèm chỉ số hiệu quả thật." image={img.business} primary={['Tìm KOC ngay','/explore']} secondary={['Nhận tư vấn','/ho-tro']}/><Section title="Giải quyết bằng thiết kế, không bằng lời hứa"><Cards items={[["Tìm đúng người","Lọc theo ngành, tỉnh, hạng và hiệu suất.","🔎"],["Biết đúng giá","Giá công khai trước khi booking.","💵"],["Đo đúng kết quả","Báo cáo và đối soát cùng hệ thống.","📊"]]}/></Section><Section title="Hai cách hợp tác — tuỳ quy mô" tint><Cards columns={2} items={[["TỰ CHỌN VÀ ĐẶT KOC","Phù hợp doanh nghiệp vừa, nhỏ và chiến dịch đơn lẻ."],["NETVIET ĐIỀU PHỐI","Phù hợp chiến dịch lớn, nhiều KOC."]]}/></Section><Section title="Booking trong 5 phút"><Steps items={flow}/></Section><LeadForm source="landing-business"/><Cta title="Mỗi đồng chi ra đều đo được kết quả." primary={['Khám phá KOC','/explore']}/></Shell>}
export function MarketplaceLanding(){return <Shell><Hero eyebrow="KHÁM PHÁ KOC/KOL" title="Cả một thị trường KOC trong một bộ lọc." sub="Hồ sơ được xác minh — lọc theo ngành, tỉnh, hạng, giá và hiệu quả thật." image={img.market} primary={['Khám phá KOC','/explore']}/><Section title="Lọc thông minh cho từng chiến dịch"><Cards items={[["Theo ngành hàng","Làm đẹp, thời trang, ẩm thực, công nghệ."],["Theo địa phương","Đúng tiếng nói tại thị trường mục tiêu."],["Theo ngân sách","So sánh giá ngay trên hồ sơ."]]}/></Section><Section title="Mỗi hồ sơ là một bản chào hàng đầy đủ" tint><Media src="https://res.cloudinary.com/drxum5uxt/image/upload/v1785383806/h%E1%BB%93_s%C6%A1_koc_ihq9lf.jpg" alt="Hồ sơ KOC"/></Section><Cta title="Từ hồ sơ đến bài đăng — một đường thẳng." primary={['Tìm KOC ngay','/explore']}/></Shell>}
export function AiCloneLanding(){return <Shell><Hero eyebrow="DỊCH VỤ CỘNG THÊM DÀNH CHO KOC" title="Thu nhập vẫn chạy — kể cả ngày bạn không quay video." sub="NetViet sản xuất video AI Clone Avatar. Bạn duyệt và đăng — thu nhập vẫn về ví." image={img.ai}/><Section title="NetViet lo phần nặng — bạn giữ phần quyết"><Steps items={[["NHẬN BRIEF","Tiếp nhận yêu cầu."],["SẢN XUẤT AI","Tạo kịch bản và bản dựng."],["BẠN DUYỆT","Yêu cầu chỉnh sửa."],["ĐĂNG & NHẬN TIỀN","Duyệt, đăng và nhận thu nhập."]]}/></Section><Section title="Ba lớp bảo vệ hình ảnh"><Cards items={[["Đồng ý rõ ràng","Chỉ dùng trong phạm vi cho phép."],["Duyệt trước đăng","Không phát hành khi chưa duyệt."],["Theo dõi sử dụng","Lưu lịch sử và phiên bản."]]}/></Section><Cta title="Nguồn thu nhập mới với chính hình ảnh của bạn."/></Shell>}
export function PricingLanding(){return <Shell><Hero eyebrow="BẢNG GIÁ & CHÍNH SÁCH" title="Một mức phí duy nhất: 5%." sub="Không phí thành viên, không phí ẩn. Chỉ có giao dịch thành công mới có phí." image={img.price}/><Section title="Khung giá niêm yết theo 4 hạng"><div className="lp-pricing-grid">{[['Nano','200.000đ – 1.500.000đ'],['Micro','1.000.000đ – 5.000.000đ'],['Mid','4.000.000đ – 20.000.000đ'],['Macro','15.000.000đ – 80.000.000đ']].map(([n,p],i)=><article className={`lp-pricing-card ${i===1?'featured':''}`} key={n}>{i===1&&<span className="badge-popular">Phổ biến nhất</span>}<h3>{n}</h3><strong>{p}</strong><p>Mỗi bài, tuỳ ngành hàng.</p></article>)}</div></Section><Section title="Chính sách thanh toán" tint><Cards items={[["Doanh nghiệp","Nạp ví hoặc thanh toán trực tuyến."],["KOC","Nhận 95% phí booking."],["Nền tảng","Thu 5% khi thành công."]]}/></Section><LeadForm source="landing-pricing" title="Nhận báo giá riêng"/><Cta title="Giá rõ ràng trước khi hợp tác."/></Shell>}
export function CommunityLanding(){return <Shell><Hero eyebrow="CỘNG ĐỒNG KOC 34 TỈNH THÀNH" title="Khách hàng ở tỉnh nào — KOC ở tỉnh đó." sub="Doanh nghiệp tìm đúng tiếng nói địa phương; KOC có cộng đồng và người dẫn dắt." image={img.community} primary={['Tham gia cộng đồng','/tuyen-koc']}/><Section title="Sức mạnh của KOC cùng quê"><Cards items={[["Hiểu văn hoá","Thông điệp gần gũi khách hàng."],["Chi phí hợp lý","Triển khai theo từng khu vực."],["Kết nối bền vững","Trưởng nhóm hỗ trợ cộng đồng."]]}/></Section><Section title="Lộ trình phủ 34 tỉnh thành" tint><Steps items={[["XÂY NHÓM NÒNG CỐT","Tìm người dẫn dắt."],["KẾT NỐI KOC","Mở rộng theo ngành."],["KẾT NỐI DOANH NGHIỆP","Đưa nhu cầu thật vào."],["NHÂN RỘNG","Chuẩn hoá toàn quốc."]]}/></Section><Cta title="Xây cộng đồng KOC mạnh tại quê hương bạn."/></Shell>}
export function SupportLanding(){return <Shell><section className="lp-hero"><div className="lp-hero-inner"><span className="lp-eyebrow">TRUNG TÂM HỖ TRỢ</span><h1>Chúng tôi có thể giúp gì?</h1><p className="lp-sub">Tài khoản, booking, thanh toán, hoa hồng bán hàng và video đại diện.</p></div></section><Section title="Câu hỏi thường gặp"><Faq items={[["Đăng ký KOC thế nào?","Xác thực email, khai báo kênh, bảng giá và ký hợp đồng."],["Doanh nghiệp thanh toán thế nào?","Nạp ví hoặc thanh toán trực tuyến cho từng booking."],["Khi nào KOC được nhận tiền?","Sau khi nội dung được duyệt và booking hoàn thành."],["Nếu có tranh chấp?","Tạo khiếu nại trong chi tiết booking."],["Hoa hồng bán hàng tính thế nào?","Đơn từ đường dẫn riêng được đối soát theo trạng thái."]]}/></Section><LeadForm source="landing-support" title="Chưa tìm thấy câu trả lời?"/><Cta title="NetViet phản hồi trong giờ làm việc." primary={['Gửi yêu cầu','#contact-form']}/></Shell>}
