// The 8 public marketing landing pages, rendered client-side into #app for their
// pathnames. Content is verbatim per spec — layout/markup is the only creative freedom.
import {
  lpHeader,
  lpFooter,
  lpHero,
  lpCtaFinal,
  lpAccordion,
  lpContactForm,
  lpQuoteCta,
  lpMedia,
  lpFeatureRow,
  lpVideoPlayer,
} from "./shared.js";

export const LANDING_ROUTES = [
  "/trang-chu",
  "/koc",
  "/doanh-nghiep",
  "/marketplace",
  "/ai-clone",
  "/bang-gia",
  "/cong-dong",
  "/ho-tro",
];

// ---------- 1. Trang chủ (/home) ----------
function pageHome() {
  const hero = `<section class="lp-hero-home">
    <div class="lp-hero-home-inner">
      <div class="lp-hero-content">
        <div class="lp-hero-eyebrow-wrap">
          <span class="lp-hero-eyebrow-dash"></span>
          <span class="lp-hero-eyebrow">NỀN TẢNG CỔNG BOOKING KOC / KOC VIỆT</span>
        </div>
        <h1 class="lp-hero-title">
          Booking KOC<br>
          dễ như đặt xe.<br>
          <span class="coral">Giá công khai.</span>
          <span class="coral">Hiệu quả đo được.</span>
        </h1>
        <p class="lp-hero-sub">
          KOC Việt kết nối doanh nghiệp với KOC/KOL phù hợp nhất.<br>
          Giá công khai, minh bạch. Hiệu quả đo được –<br>
          giá KOC cho chiến dịch của bạn.
        </p>
        <div class="lp-hero-cta">
          <a href="/#/tuyen-koc" class="btn btn-primary">Đăng ký KOC miễn phí</a>
          <a href="/#/explore" class="btn btn-secondary">Tìm KOC cho chiến dịch</a>
        </div>
      </div>
      <div class="lp-hero-visual">
        <div class="lp-hero-brush-arc" aria-hidden="true"></div>
        <img src="/images/home-hero-user-seamless.png" alt="Booking KOC Việt minh bạch và dễ dàng" fetchpriority="high" decoding="async">
      </div>
    </div>
    
    <!-- Stats Strip directly on Hero background -->
    <div class="lp-hero-stats-wrap">
      <div class="lp-hero-stats-grid">
        <div class="lp-hero-stat-item">
          <div class="lp-stat-icon-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="lp-stat-info">
            <span class="lp-stat-num">300.000+</span>
            <span class="lp-stat-lbl">KOC/KOL</span>
          </div>
        </div>
        <div class="lp-hero-stat-item">
          <div class="lp-stat-icon-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>
          </div>
          <div class="lp-stat-info">
            <span class="lp-stat-num">200.000+</span>
            <span class="lp-stat-lbl">Doanh nghiệp</span>
          </div>
        </div>
        <div class="lp-hero-stat-item">
          <div class="lp-stat-icon-circle">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div class="lp-stat-info">
            <span class="lp-stat-num">34</span>
            <span class="lp-stat-lbl">Tỉnh thành</span>
          </div>
        </div>
        <div class="lp-hero-stat-item">
          <div class="lp-stat-icon-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
          </div>
          <div class="lp-stat-info">
            <span class="lp-stat-num">5%+</span>
            <span class="lp-stat-lbl">Mức phí dịch vụ duy nhất</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Organic Wave divider -->
    <div class="lp-hero-wave-divider" aria-hidden="true">
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" fill="#ffffff">
        <path d="M0,45 C280,75 560,18 840,42 C1080,62 1280,72 1440,32 L1440,90 L0,90 Z"></path>
      </svg>
    </div>
  </section>`;

  const splitSection = `<section class="lp-split-section" aria-label="Hoạt động và Đối tượng KOC Việt">
    <div class="lp-split-container">
      <!-- Left: Hoạt động Booking & KOC mới nhất -->
      <div class="lp-activity-col">
        <div class="lp-activity-head-bar">
          <div class="lp-activity-title-wrap">
            <h3 class="lp-activity-title">Hoạt động Booking &amp; KOC mới nhất</h3>
            <span class="lp-activity-underline-accent"></span>
          </div>
          <a href="/#/explore" class="lp-activity-all-link">Xem tất cả →</a>
        </div>
        <div class="lp-activity-table" data-koc-activity-list>
          <article class="lp-activity-row-item">
            <div class="lp-cat-pill"><span class="lp-cat-dot green"></span><span>Thực phẩm</span></div>
            <div class="lp-user-cell"><img class="lp-user-avatar" src="/default-avatar.svg" alt="Kim L." /><span class="lp-user-name">Kim L.</span></div>
            <div class="lp-activity-desc">Booking 50C cực hạn/ mẹt hàn và thương hiệu chống dính công nghệ mới</div>
            <div class="lp-activity-timestamp">8 giây trước</div>
          </article>
          <article class="lp-activity-row-item">
            <div class="lp-cat-pill"><span class="lp-cat-dot red"></span><span>Thời trang</span></div>
            <div class="lp-user-cell"><img class="lp-user-avatar" src="/default-avatar.svg" alt="Ngọc A." /><span class="lp-user-name">Ngọc A.</span></div>
            <div class="lp-activity-desc">Booking &amp; 03 cpc</div>
            <div class="lp-activity-timestamp">30 giây trước</div>
          </article>
          <article class="lp-activity-row-item">
            <div class="lp-cat-pill"><span class="lp-cat-dot green"></span><span>Trước công</span></div>
            <div class="lp-user-cell"><img class="lp-user-avatar" src="/default-avatar.svg" alt="Minh T." /><span class="lp-user-name">Minh T.</span></div>
            <div class="lp-activity-desc">Săn hàng</div>
            <div class="lp-activity-timestamp">52 giây trước</div>
          </article>
          <article class="lp-activity-row-item">
            <div class="lp-cat-pill"><span class="lp-cat-dot green"></span><span>Thực phẩm</span></div>
            <div class="lp-user-cell"><img class="lp-user-avatar" src="/default-avatar.svg" alt="Lan H." /><span class="lp-user-name">Lan H.</span></div>
            <div class="lp-activity-desc">Review hũ ốc cháy — nghêu, ghẹ, sụ,... đồng nghìn &amp; 500 đồng.</div>
            <div class="lp-activity-timestamp">1 phút trước</div>
          </article>
          <article class="lp-activity-row-item">
            <div class="lp-cat-pill"><span class="lp-cat-dot red"></span><span>Thác Đăng</span></div>
            <div class="lp-user-cell"><img class="lp-user-avatar" src="/default-avatar.svg" alt="Quang D." /><span class="lp-user-name">Quang D.</span></div>
            <div class="lp-activity-desc">Đo lường &amp; chi trả</div>
            <div class="lp-activity-timestamp">1 phút trước</div>
          </article>
        </div>
      </div>

      <!-- Right: Dành cho doanh nghiệp & KOC -->
      <div class="lp-audience-col">
        <h2 class="lp-audience-heading">
          Dành cho<br>
          <span class="lp-coral-text">doanh nghiệp &amp; KOC</span>
        </h2>
        <p class="lp-audience-sub">
          KOC Việt là cầu nối giúp chiến dịch hiệu quả hơn.<br>Minh bạch hơn. Dễ dàng hơn cho cả hai phía.
        </p>
        <div class="lp-audience-cards-grid">
          <div class="lp-audience-box">
            <div class="lp-audience-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 11h2M6 15h2M10 11h2M10 15h2M14 11h2M14 15h2M9 3h6v4H9z"/></svg>
            </div>
            <h3 class="lp-audience-box-title">Dành cho doanh nghiệp</h3>
            <ul class="lp-audience-list">
              <li><span class="chk">✓</span> Tìm KOC phù hợp nhanh chóng</li>
              <li><span class="chk">✓</span> Giá công khai, dễ so sánh</li>
              <li><span class="chk">✓</span> Quản lý chiến dịch &amp; đo lường hiệu quả</li>
            </ul>
            <a href="/#/doanh-nghiep" class="lp-audience-action-link">Tìm hiểu thêm →</a>
          </div>

          <div class="lp-audience-box">
            <div class="lp-audience-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8l2 2 4-4"/></svg>
            </div>
            <h3 class="lp-audience-box-title">Dành cho KOC</h3>
            <ul class="lp-audience-list">
              <li><span class="chk">✓</span> Nhận chiến dịch phù hợp</li>
              <li><span class="chk">✓</span> Thu nhập minh bạch, thanh toán nhanh</li>
              <li><span class="chk">✓</span> Xây dựng thương hiệu cá nhân bền vững</li>
            </ul>
            <a href="/#/koc" class="lp-audience-action-link">Trở thành KOC ngay →</a>
          </div>
        </div>
      </div>
    </div>
  </section>`;

  const campaignDeskSection = `<section class="lp-home-campaign-steps" aria-label="4 bước cho một chiến dịch trọn vẹn">
    <div class="lp-home-campaign-steps-inner">
      <div class="lp-section-head">
        <h2 class="lp-steps-heading">4 bước cho một chiến dịch trọn vẹn</h2>
      </div>

      <div class="lp-steps-video-wrap">
        ${lpVideoPlayer({
          src: "/videos/how-it-works.mp4",
          poster: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785312034/booking_koc_d%E1%BB%85_d%C3%A0ng_nh%C6%B0_%C4%91%E1%BA%B7t_xe_jwapy0.jpg",
          alt: "Video 4 bước cho một chiến dịch trọn vẹn",
        })}
      </div>

      <div class="lp-grid-4 lp-steps-cards-grid">
        <article class="lp-step-card">
          <div class="lp-step-badge">1</div>
          <h4>TÌM &amp; CHỌN</h4>
          <p>Doanh nghiệp lọc KOC theo ngành hàng, tỉnh, hạng, giá; xem hồ sơ với chỉ số hiệu quả thật và bảng giá công khai.</p>
        </article>
        <article class="lp-step-card">
          <div class="lp-step-badge">2</div>
          <h4>BOOKING &amp; ĐẶT CỌC</h4>
          <p>Gửi yêu cầu kèm link dữ liệu sản phẩm để KOC kiểm tra. Thanh toán tạm giữ vào ví đảm bảo của nền tảng.</p>
        </article>
        <article class="lp-step-card">
          <div class="lp-step-badge">3</div>
          <h4>SẢN XUẤT &amp; ĐĂNG BÀI</h4>
          <p>KOC xác nhận, tự sản xuất content đúng chất giọng của mình và đăng bài kèm link affiliate riêng.</p>
        </article>
        <article class="lp-step-card">
          <div class="lp-step-badge">4</div>
          <h4>ĐO LƯỜNG &amp; CHI TRẢ</h4>
          <p>Hệ thống ghi nhận click, đơn hàng theo thời gian thực. Hoàn thành: KOC nhận 95% phí booking + hoa hồng; doanh nghiệp nhận báo cáo minh bạch.</p>
        </article>
      </div>
    </div>
  </section>`;

  const whyUs = `<section class="lp-home-proof" aria-label="Điều mà thị trường booking KOC đang thiếu">
    <div class="lp-home-proof-inner">
      <div class="lp-section-head">
        <h2 class="lp-proof-heading">Điều thị trường booking KOC đang thiếu, <span class="lp-coral-text">chúng tôi làm trước tiên</span></h2>
      </div>
      <div class="lp-grid-4 lp-proof-grid">
        <article class="lp-card lp-proof-card lp-proof-coral">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            </div>
            <span class="lp-proof-badge">Minh bạch 100%</span>
          </div>
          <h3 class="lp-proof-card-title">Giá niêm yết công khai</h3>
          <p class="lp-proof-card-desc">Lần đầu tiên tại Việt Nam, phí booking KOC minh bạch, phân theo 4 hạng Nano – Micro – Mid – Macro.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-teal">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><path d="M12 15h2"/></svg>
            </div>
            <span class="lp-proof-badge">Ví đảm bảo</span>
          </div>
          <h3 class="lp-proof-card-title">Thanh toán an toàn</h3>
          <p class="lp-proof-card-desc">Doanh nghiệp không sợ mất tiền, KOC không sợ bị chậm phí. Tiền chỉ được chuyển khi hai bên xác nhận hoàn thành.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-blue">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </div>
            <span class="lp-proof-badge">Dữ liệu thật</span>
          </div>
          <h3 class="lp-proof-card-title">Hiệu quả bằng số thật</h3>
          <p class="lp-proof-card-desc">Chỉ số chuyển đổi của mỗi KOC tính từ dữ liệu affiliate thực tế, không tự khai báo, không mua follower ảo.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-amber">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <span class="lp-proof-badge">Đánh giá thật</span>
          </div>
          <h3 class="lp-proof-card-title">Đánh giá hai chiều</h3>
          <p class="lp-proof-card-desc">Doanh nghiệp chấm điểm KOC, KOC chấm điểm doanh nghiệp. Uy tín tích luỹ quyết định thứ hạng hiển thị.</p>
        </article>
      </div>
    </div>
  </section>`;

  const categories = `<section class="lp-home-categories">
    <div class="lp-home-categories-inner">
      <div class="lp-section-head"><h2>Phủ mọi ngành hàng đang tăng trưởng</h2></div>
      <div class="lp-section-media lp-reveal">${lpMedia({
        src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785488594/Thi%E1%BA%BFt_k%E1%BA%BF_ch%C6%B0a_c%C3%B3_t%C3%AAn_3_n84ryp.jpg",
        alt: "Minh họa các ngành hàng đang tăng trưởng",
        ratio: "9/4",
      })}</div>
      <div class="lp-chip-row">
        ${[
          "Mỹ phẩm & Làm đẹp",
          "Mẹ & Bé",
          "Ẩm thực F&B",
          "Thời trang",
          "Điện tử gia dụng",
          "Sức khoẻ",
          "Du lịch địa phương",
          "Tài chính cá nhân",
          "Giáo dục",
          "Thương mại điện tử",
        ]
          .map((c) => `<span class="lp-chip">${c}</span>`)
          .join("")}
      </div>
    </div>
  </section>`;

  const aiCloneTeaser = `<section class="lp-home-spotlight">
    <div class="lp-home-spotlight-inner">
      <div class="lp-banner">
        <h3>Mới: Dịch vụ video đại diện, không cần tự quay mỗi ngày</h3>
        <p>NetViet tiếp nhận booking và sản xuất video cho bạn. Bạn xem, duyệt và đăng, đồng thời vẫn nhận phí booking cùng hoa hồng bán hàng.</p>
        <a href="/ai-clone" class="btn grad">Tìm hiểu dịch vụ →</a>
      </div>
    </div>
  </section>`;

  const testimonials = `<section class="lp-home-stories">
    <div class="lp-home-stories-inner">
      <div class="lp-grid-2">
        <div class="lp-quote">
          <div class="stars">★★★★★</div>
          <p class="lp-quote-body">“Trước đây mình mất cả tuần đàm phán giá với từng nhãn. Giờ nhãn tự đến vì giá của mình treo sẵn trên hồ sơ — tháng cao điểm mình nhận 11 booking.”</p>
          <div class="lp-quote-author">
            <img class="lp-quote-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80" alt="Linh Chi" loading="lazy">
            <div class="lp-quote-info">
              <div class="lp-quote-name-row">
                <strong class="lp-quote-name">Linh Chi</strong>
                <span class="lp-role-badge koc">KOC</span>
              </div>
              <span class="lp-quote-role">Micro KOC ngành Làm đẹp · Đà Nẵng</span>
            </div>
          </div>
        </div>
        <div class="lp-quote">
          <div class="stars">★★★★★</div>
          <p class="lp-quote-body">“Chi 30 triệu cho 8 KOC qua KOC Việt, chúng tôi biết chính xác từng đồng tạo ra bao nhiêu đơn. Điều đó chưa agency nào làm được cho chúng tôi.”</p>
          <div class="lp-quote-author">
            <img class="lp-quote-avatar" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80" alt="Trần Minh Hoàng" loading="lazy">
            <div class="lp-quote-info">
              <div class="lp-quote-name-row">
                <strong class="lp-quote-name">Trần Minh Hoàng</strong>
                <span class="lp-role-badge business">Doanh nghiệp</span>
              </div>
              <span class="lp-quote-role">Giám đốc Marketing · Thương hiệu Mỹ phẩm nội địa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>`;

  const ctaFinal = `<section class="lp-cta-final">
    <div class="lp-cta-final-inner">
      <h2>Booking minh bạch. Thanh toán an tâm. Kết nối bền vững.</h2>
      <div class="lp-hero-cta">
        <a href="/#/tuyen-koc" class="btn navy nv-lift">Đăng ký làm KOC — miễn phí</a>
        <a href="/#/explore" class="btn ghost nv-lift">Booking KOC ngay hôm nay</a>
      </div>
    </div>
  </section>`;

  return (
    hero +
    splitSection +
    campaignDeskSection +
    whyUs +
    categories +
    aiCloneTeaser +
    testimonials +
    ctaFinal
  );
}

// ---------- 2. Dành cho KOC (/koc) ----------
function pageKoc() {
  const hero = lpHero({
    eyebrow: "DÀNH CHO KOC/KOLs",
    h1: `Bạn định giá.<br>Nền tảng mang booking đến.<br><span class="coral">Ví tự cộng tiền.</span>`,
    sub: "Mở gian hàng năng lực của riêng bạn trên KOC Việt: niêm yết mức phí theo từng ngành hàng, nhận booking từ 200.000 doanh nghiệp mục tiêu, cộng thêm hoa hồng affiliate trên từng đơn hàng bán ra. Đăng ký đến ký hợp đồng điện tử chưa đầy 15 phút.",
    ctas: [
      { href: "/#/tuyen-koc", label: "Tạo hồ sơ KOC miễn phí" },
    ],
    trust: "Miễn phí trọn đời · Nhận 95% mỗi booking · Rút tiền trong 24h",
    img: {
      src: "/images/koc-hero-seamless.png",
      alt: "KOC sáng tạo nội dung và nhận booking",
    },
    waveFill: "#ffffff",
  });

  const dualIncome = `<section class="lp-section" aria-label="Một bài đăng — hai dòng thu nhập">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Một bài đăng, <span class="lp-coral-text">hai dòng thu nhập</span></h2>
      </div>
      <div class="lp-grid-2">
        <article class="lp-card lp-proof-card lp-proof-coral">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span class="lp-proof-badge">Cố định</span>
          </div>
          <h3 class="lp-proof-card-title">PHÍ BOOKING CỐ ĐỊNH</h3>
          <p class="lp-proof-card-desc">Doanh nghiệp trả theo đúng bảng giá bạn niêm yết. Không mặc cả, không hạ giá ngầm.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-teal">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <span class="lp-proof-badge">Affiliate</span>
          </div>
          <h3 class="lp-proof-card-title">HOA HỒNG AFFILIATE</h3>
          <p class="lp-proof-card-desc">Mỗi click, mỗi đơn hàng từ link riêng của bạn được ghi nhận theo thời gian thực và cộng thẳng vào ví.</p>
        </article>
      </div>
      
      <!-- Highlighted Income Statement Card -->
      <div class="lp-statement-card lp-statement-coral">
        <div class="lp-statement-header">
          <div class="lp-statement-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h0M2 9.5h20"/></svg>
          </div>
          <span class="lp-statement-tag">MÔ PHỎNG THU NHẬP THỰC TẾ</span>
        </div>
        <div class="lp-statement-body">
          <p class="lp-statement-lead"><strong>Ví dụ KOC hạng Micro ngành Làm đẹp:</strong> 6 booking/tháng × 1.200.000đ + hoa hồng affiliate ≈ <strong>8–12 triệu đồng/tháng</strong>.</p>
          <p class="lp-statement-sub">Con số thực tế phụ thuộc hạng, ngành hàng và độ chăm chỉ của bạn.</p>
        </div>
      </div>
    </div>
  </section>`;

  const process = `<section class="lp-section tint" aria-label="5 bước để bắt đầu">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Bắt đầu chỉ với 5 bước, <span class="lp-coral-text">trong dưới 15 phút</span></h2>
      </div>
      <div class="lp-steps-video-wrap">
        ${lpVideoPlayer({
          src: "/videos/koc-process.mp4",
          poster: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785312036/BANNER_TRANG_KOC_qjho2n.jpg",
          alt: "Video giới thiệu quy trình chiến dịch KOC Việt",
        })}
      </div>
      <div class="lp-steps n5 lp-grid-5">
        <article class="lp-step">
          <div class="num">1</div>
          <p><strong>ĐĂNG KÝ</strong>Đăng ký bằng số điện thoại, xác thực OTP.</p>
        </article>
        <article class="lp-step">
          <div class="num">2</div>
          <p><strong>KẾT NỐI KÊNH</strong>Kết nối TikTok/Facebook/Instagram/YouTube — hệ thống tự xác minh follower thật và phân hạng Nano/Micro/Mid/Macro.</p>
        </article>
        <article class="lp-step">
          <div class="num">3</div>
          <p><strong>XÁC MINH DANH TÍNH</strong>Tải ảnh hai mặt CCCD và ảnh chân dung — bảo đảm tiền về đúng chủ tài khoản.</p>
        </article>
        <article class="lp-step">
          <div class="num">4</div>
          <p><strong>ĐẶT BẢNG GIÁ</strong>Tự đặt giá theo từng ngành hàng trong khung giá của hạng — bạn toàn quyền, hệ thống chỉ giữ khung để thị trường không phá giá.</p>
        </article>
        <article class="lp-step">
          <div class="num">5</div>
          <p><strong>KÝ HỢP ĐỒNG</strong>Ký hợp đồng điện tử có giá trị pháp lý — hồ sơ được duyệt là trang profile của bạn lên sàn, sẵn sàng nhận booking.</p>
        </article>
      </div>
    </div>
  </section>`;

  const rights = `<section class="lp-section" aria-label="Trên KOC Việt, bạn là người cầm quyền">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Trên KOC Việt, <span class="lp-coral-text">bạn là người cầm quyền</span></h2>
      </div>
      <div class="lp-grid-4">
        <article class="lp-card lp-proof-card lp-proof-coral">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            </div>
            <span class="lp-proof-badge">Định giá</span>
          </div>
          <h3 class="lp-proof-card-title">Quyền định giá</h3>
          <p class="lp-proof-card-desc">Chỉnh bảng giá bất cứ lúc nào trong khung hạng của mình.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-teal">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            </div>
            <span class="lp-proof-badge">Từ chối</span>
          </div>
          <h3 class="lp-proof-card-title">Quyền từ chối</h3>
          <p class="lp-proof-card-desc">Kiểm tra link dữ liệu sản phẩm trước khi nhận; sản phẩm không phù hợp giá trị của bạn, một chạm từ chối, tiền tự hoàn cho doanh nghiệp.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-blue">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <span class="lp-proof-badge">Sáng tạo</span>
          </div>
          <h3 class="lp-proof-card-title">Quyền sáng tạo</h3>
          <p class="lp-proof-card-desc">Bạn tự sản xuất content theo chất giọng riêng; nền tảng không can thiệp kịch bản.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-amber">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <span class="lp-proof-badge">Linh hoạt</span>
          </div>
          <h3 class="lp-proof-card-title">Quyền tắt nhận booking</h3>
          <p class="lp-proof-card-desc">Theo từng ngành hàng, khi bạn cần nghỉ hoặc đang quá tải.</p>
        </article>
      </div>
    </div>
  </section>`;

  const rankUp = `<section class="lp-section tint" aria-label="Càng làm tốt, khung giá càng mở">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Càng làm tốt, <span class="lp-coral-text">khung giá càng mở</span></h2>
      </div>
      <div class="lp-section-media lp-reveal" style="max-width:820px;margin:0 auto 24px auto;">${lpMedia({
        src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785313892/c%C3%A0nh_l%C3%A0m_t%E1%BB%91t_khung_gi%C3%A1_c%C3%A0ng_m%E1%BB%9F_jtq8qd.jpg",
        alt: "Càng làm tốt, khung giá KOC càng mở",
        ratio: "21/9",
      })}</div>
      
      <!-- Highlighted Rank-up Statement Card -->
      <div class="lp-statement-card lp-statement-teal" style="max-width:820px;margin:0 auto">
        <div class="lp-statement-header">
          <div class="lp-statement-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <span class="lp-statement-tag">CƠ CHẾ THĂNG HẠNG TỰ ĐỘNG</span>
        </div>
        <div class="lp-statement-body">
          <p class="lp-statement-lead"><strong>Hoàn thành booking đúng hạn</strong> + <strong>Điểm đánh giá cao</strong> + <strong>Follower tăng</strong> = <strong>Thăng hạng</strong>.</p>
          <p class="lp-statement-sub">Mỗi hạng mở khung giá cao hơn, được ưu tiên hiển thị trên marketplace và giảm phí dịch vụ. Lộ trình Nano → Macro hiển thị ngay trên dashboard của bạn.</p>
        </div>
      </div>
    </div>
  </section>`;

  const conditions = `<section class="lp-section" aria-label="Điều kiện tham gia">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Điều kiện tham gia</h2>
      </div>
      
      <!-- Highlighted Conditions Statement Card -->
      <div class="lp-statement-card lp-statement-blue" style="max-width:820px;margin:0 auto 40px auto">
        <div class="lp-statement-header">
          <div class="lp-statement-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span class="lp-statement-tag">TIÊU CHUẨN THAM GIA NỀN TẢNG</span>
        </div>
        <div class="lp-statement-body">
          <ul class="lp-statement-list">
            <li><span class="lp-check-ico">✓</span> Từ 18 tuổi trở lên, có CCCD hợp lệ để ký hợp đồng điện tử.</li>
            <li><span class="lp-check-ico">✓</span> Sở hữu ít nhất 1 kênh mạng xã hội đang hoạt động với follower thật (từ hạng Nano ~1.000 follower).</li>
            <li><span class="lp-check-ico">✓</span> Cam kết tuân thủ quy định gắn nhãn quảng cáo (<strong>#quangcao</strong>) theo đúng pháp luật hiện hành.</li>
          </ul>
        </div>
      </div>
      
      <div class="lp-quote" style="max-width:760px;margin:0 auto">
        <div class="stars">★★★★★</div>
        <p class="lp-quote-body">“Mình ở Buôn Ma Thuột, trước nghĩ booking chỉ dành cho KOC Sài Gòn, Hà Nội. Lên KOC Việt, doanh nghiệp cà phê ngay tỉnh mình tự tìm đến — không phải chào giá một lần nào.”</p>
        <div class="lp-quote-author">
          <img class="lp-quote-avatar" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80" alt="Hoàng Nam" loading="lazy">
          <div class="lp-quote-info">
            <div class="lp-quote-name-row">
              <strong class="lp-quote-name">Hoàng Nam</strong>
              <span class="lp-role-badge koc">KOC</span>
            </div>
            <span class="lp-quote-role">Nano KOC ngành F&B · Buôn Ma Thuột</span>
          </div>
        </div>
      </div>
    </div>
  </section>`;

  const faq = `<section class="lp-section tint" aria-label="Câu hỏi thường gặp">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Câu hỏi thường gặp</h2>
      </div>
      <div style="max-width:760px;margin:0 auto">
        ${lpAccordion([
          [
            "Tham gia có mất phí không?",
            "Hoàn toàn miễn phí. Nền tảng chỉ thu 5% trên booking thành công — không có booking, không mất gì.",
          ],
          [
            "Ít follower có tham gia được không?",
            "Được. Hạng Nano bắt đầu từ ~1.000 follower — doanh nghiệp địa phương rất cần KOC nhỏ mà thật.",
          ],
          [
            "Tiền về khi nào?",
            "Doanh nghiệp xác nhận hoàn thành là 95% phí booking vào ví; hoa hồng affiliate đối soát theo kỳ; rút về ngân hàng trong 24h.",
          ],
        ])}
      </div>
    </div>
  </section>`;

  const ctaFinal = lpCtaFinal(
    "Hồ sơ của bạn có thể nhận booking đầu tiên ngay tuần này.",
    [{ href: "/#/tuyen-koc", label: "Tạo hồ sơ KOC miễn phí — mất 15 phút" }],
  );

  return (
    hero +
    dualIncome +
    process +
    rights +
    rankUp +
    conditions +
    faq +
    ctaFinal
  );
}

// ---------- 3. Dành cho Doanh nghiệp (/doanh-nghiep) ----------
function pageBusiness() {
  const hero = lpHero({
    eyebrow: "DÀNH CHO DOANH NGHIỆP & NHÃN HÀNG",
    h1: `<span class="lp-hero-line">Booking KOC dễ dàng</span><span class="lp-hero-line">như đặt xe công nghệ:</span><span class="coral lp-hero-line lp-hero-line-wide">Chọn người - Hợp giá - Chốt ngay.</span>`,
    sub: "Không còn xin báo giá qua ba tầng agency. Trên KOC Việt, mọi KOC niêm yết giá công khai theo ngành hàng, kèm chỉ số hiệu quả thật từ dữ liệu affiliate. Ngân sách 3 triệu hay 3 tỷ đều bắt đầu được ngay hôm nay.",
    ctas: [
      { href: "/#/explore", label: "Tìm KOC ngay — miễn phí" },
      {
        href: "#contact-form",
        ghost: true,
        label: "Nhận tư vấn chiến dịch lớn",
      },
    ],
    img: {
      src: "/images/business-hero-seamless.png",
      alt: "Doanh nghiệp booking KOC dễ dàng như đặt xe",
    },
    waveFill: "#ffffff",
  });

  const pains = `<section class="lp-section" aria-label="Vì sao booking KOC lâu nay khiến bạn mệt?">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Vì sao booking KOC lâu nay khiến bạn mệt?</h2>
      </div>
      <div class="lp-grid-3">
        <article class="lp-card lp-proof-card lp-proof-red">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <span class="lp-proof-badge">Bất cập 1</span>
          </div>
          <h3 class="lp-proof-card-title">Báo giá hỗn loạn</h3>
          <p class="lp-proof-card-desc">Báo giá mỗi nơi một kiểu, chênh nhau 3–5 lần cho cùng một KOC.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-red">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <span class="lp-proof-badge">Bất cập 2</span>
          </div>
          <h3 class="lp-proof-card-title">Rủi ro tài chính</h3>
          <p class="lp-proof-card-desc">Chuyển khoản trước, hiệu quả phó mặc may rủi — không ít thương hiệu từng “mất trắng” phí booking.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-red">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="11" x2="23" y2="11"/></svg>
            </div>
            <span class="lp-proof-badge">Bất cập 3</span>
          </div>
          <h3 class="lp-proof-card-title">Số liệu ảo</h3>
          <p class="lp-proof-card-desc">Follower ảo, tương tác mua — số đẹp nhưng không ra một đơn hàng.</p>
        </article>
      </div>
    </div>
  </section>`;

  const solutions = `<section class="lp-section tint" aria-label="Giải pháp từ KOC Việt">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>KOC Việt giải quyết cả ba <span class="lp-coral-text">bằng thiết kế, không bằng lời hứa</span></h2>
      </div>
      <div class="lp-grid-3">
        <article class="lp-card lp-proof-card lp-proof-coral">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            </div>
            <span class="lp-proof-badge">Minh bạch</span>
          </div>
          <h3 class="lp-proof-card-title">GIÁ NIÊM YẾT</h3>
          <p class="lp-proof-card-desc">Bảng giá cố định do KOC tự đặt trong khung giá 4 hạng do nền tảng kiểm soát. Nhìn là biết, không cần hỏi.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-teal">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><path d="M12 15h2"/></svg>
            </div>
            <span class="lp-proof-badge">An toàn</span>
          </div>
          <h3 class="lp-proof-card-title">VÍ ĐẢM BẢO</h3>
          <p class="lp-proof-card-desc">Tiền tạm giữ tại nền tảng, chỉ giải ngân khi bạn xác nhận hoàn thành. Không hài lòng có cơ chế khiếu nại, hoàn tiền.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-blue">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </div>
            <span class="lp-proof-badge">Chính xác</span>
          </div>
          <h3 class="lp-proof-card-title">SỐ LIỆU THẬT</h3>
          <p class="lp-proof-card-desc">Mỗi hồ sơ KOC hiển thị tỉ lệ chuyển đổi, đơn hàng tạo ra từ hệ thống affiliate — dữ liệu máy ghi, KOC không tự khai được.</p>
        </article>
      </div>
    </div>
  </section>`;

  const twoModes = `<section class="lp-section" aria-label="Hai luồng — tuỳ quy mô của bạn">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Hai cách hợp tác, <span class="lp-coral-text">phù hợp từng quy mô</span></h2>
      </div>
      <div class="lp-grid-2">
        <article class="lp-card" style="border-top: 4px solid #ea583c;">
          <h3>TỰ BOOKING QUA MARKETPLACE</h3>
          <p>phù hợp SME, cửa hàng, chiến dịch đơn lẻ: lọc KOC theo ngành/tỉnh/hạng/giá, booking trực tiếp theo bảng giá, theo dõi từng bài đăng.</p>
        </article>
        <article class="lp-card" style="border-top: 4px solid #0f172a;">
          <h3>NETVIET ĐIỀU PHỐI</h3>
          <p>phù hợp chiến dịch lớn nhiều KOC: gửi ngân sách và mục tiêu, đội ngũ NetViet phối hợp hệ thống matching chọn danh sách KOC tối ưu, vận hành trọn gói và báo cáo hợp nhất.</p>
        </article>
      </div>
    </div>
  </section>`;

  const bookingProcess = `<section class="lp-section tint" aria-label="Booking trong 5 phút">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Booking trong 5 phút</h2>
      </div>
      <div class="lp-steps-video-wrap">
        ${lpVideoPlayer({
          src: "/videos/booking-process.mp4",
          poster: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785312034/booking_koc_d%E1%BB%85_d%C3%A0ng_nh%C6%B0_%C4%91%E1%BA%B7t_xe_jwapy0.jpg",
          alt: "Video giới thiệu quy trình booking dành cho doanh nghiệp",
        })}
      </div>
      <div class="lp-steps n5 lp-grid-5">
        <article class="lp-step">
          <div class="num">1</div>
          <p><strong>CHỌN KOC</strong>Chọn KOC và gói dịch vụ theo bảng giá trên hồ sơ.</p>
        </article>
        <article class="lp-step">
          <div class="num">2</div>
          <p><strong>GỬI THÔNG TIN SẢN PHẨM</strong>Đính kèm link dữ liệu sản phẩm (thông tin, hình ảnh, giá, chính sách bán) — bắt buộc, để KOC thẩm định trước khi nhận. KOC hiểu đúng sản phẩm là một nửa chất lượng content.</p>
        </article>
        <article class="lp-step">
          <div class="num">3</div>
          <p><strong>THANH TOÁN ĐẢM BẢO</strong>Thanh toán vào ví đảm bảo — nhận mã giao dịch và hoá đơn điện tử.</p>
        </article>
        <article class="lp-step">
          <div class="num">4</div>
          <p><strong>TRIỂN KHAI BOOKING</strong>KOC xác nhận, sản xuất và đăng bài kèm link affiliate; bạn theo dõi trạng thái từng bước trên portal.</p>
        </article>
        <article class="lp-step">
          <div class="num">5</div>
          <p><strong>THEO DÕI &amp; ĐỐI SOÁT</strong>Xác nhận hoàn thành — xem báo cáo click/đơn hàng/doanh thu theo từng KOC, xuất file đối soát cho kế toán.</p>
        </article>
      </div>
    </div>
  </section>`;

  const measure = `<section class="lp-section" aria-label="Đo lường hiệu quả">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Mỗi đồng chi ra đều trả lời được: <span class="lp-coral-text">tạo ra bao nhiêu đơn?</span></h2>
      </div>
      
      <!-- Highlighted Measurement Statement Card -->
      <div class="lp-statement-card lp-statement-coral" style="max-width:860px;margin:0 auto 40px auto">
        <div class="lp-statement-header">
          <div class="lp-statement-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <span class="lp-statement-tag">ĐO LƯỜNG HIỆU QUẢ TỨC THỜI</span>
        </div>
        <div class="lp-statement-body">
          <p class="lp-statement-lead">Theo dõi tức thời lượt nhấp, đơn hàng và doanh thu của từng KOC, từng bài đăng. So sánh hiệu quả để tiếp tục đầu tư đúng người.</p>
          <p class="lp-statement-sub">Cuối kỳ, hệ thống tự tổng hợp chi phí booking, hoa hồng phát sinh và xuất hoá đơn điện tử đầy đủ.</p>
        </div>
      </div>
      
      <div class="lp-quote" style="max-width:760px;margin:0 auto">
        <div class="stars">★★★★★</div>
        <p class="lp-quote-body">“Chuỗi 6 cửa hàng của tôi ở Cần Thơ chỉ cần KOC miền Tây. Lọc theo tỉnh, booking 5 bạn, chi phí bằng 1/3 báo giá agency mà đơn về nhiều gấp đôi.”</p>
        <div class="lp-quote-author">
          <img class="lp-quote-avatar" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80" alt="Chủ chuỗi mỹ phẩm miền Tây" loading="lazy">
          <div class="lp-quote-info">
            <div class="lp-quote-name-row">
              <strong class="lp-quote-name">Chủ chuỗi mỹ phẩm miền Tây</strong>
              <span class="lp-role-badge business">Doanh nghiệp</span>
            </div>
            <span class="lp-quote-role">Doanh nghiệp bán lẻ · Cần Thơ</span>
          </div>
        </div>
      </div>
    </div>
  </section>`;

  const contact = `<section class="lp-section tint" aria-label="Liên hệ tư vấn">
    <div class="lp-section-inner">
      ${lpContactForm("doanh-nghiep", "Nhận tư vấn miễn phí")}
    </div>
  </section>`;

  const ctaFinal = lpCtaFinal(
    "Chiến dịch KOC đầu tiên của bạn có thể chạy ngay hôm nay.",
    [
      { href: "/#/explore", label: "Tìm KOC ngay" },
      {
        href: "#contact-form",
        label: "Đặt lịch tư vấn 1-1 miễn phí",
        ghost: true,
      },
    ],
  );

  return (
    hero +
    pains +
    solutions +
    twoModes +
    bookingProcess +
    measure +
    contact +
    ctaFinal
  );
}

// ---------- 4. Marketplace (/marketplace) ----------
function pageMarketplace() {
  const hero = lpHero({
    className: "lp-marketplace-hero",
    eyebrow: "MARKETPLACE KOC/KOLs",
    h1: `<span class="lp-hero-line lp-hero-line-wide">Cả một thị trường KOC</span><span class="coral lp-hero-line">trong một bộ lọc.</span>`,
    sub: "Hàng trăm nghìn hồ sơ KOC được xác minh — lọc theo ngành hàng, tỉnh thành, hạng, mức giá và hiệu quả thật. Tìm đúng gương mặt cho thương hiệu của bạn trong 30 giây.",
    ctas: [{ href: "/#/explore", label: "Khám phá marketplace" }],
    extra: `<div class="lp-box on-dark lp-marketplace-filter-summary">Tìm theo: Ngành hàng, Tỉnh/Thành, Hạng KOC, Khoảng giá, Đánh giá ⭐️</div>`,
    img: {
      src: "/images/marketplace-hero-seamless.png",
      alt: "Cả một thị trường KOC trong bộ lọc",
    },
    waveFill: "#ffffff",
  });

  const filters = `<section class="lp-section" aria-label="Lọc thông minh">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Lọc thông minh <span class="lp-coral-text">cho từng kiểu chiến dịch</span></h2>
      </div>
      <div class="lp-grid-4">
        <article class="lp-card lp-proof-card lp-proof-coral">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <span class="lp-proof-badge">Ngành hàng</span>
          </div>
          <h3 class="lp-proof-card-title">Ngành hàng</h3>
          <p class="lp-proof-card-desc">KOC được phân hồ sơ theo từng lĩnh vực với chỉ số riêng: một KOC làm đẹp giỏi chưa chắc bán đồ gia dụng tốt.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-teal">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <span class="lp-proof-badge">Địa phương</span>
          </div>
          <h3 class="lp-proof-card-title">Tỉnh/thành</h3>
          <p class="lp-proof-card-desc">Bán hàng địa phương thì chọn KOC địa phương: đúng giọng, đúng văn hoá, giao sản phẩm mẫu nhanh.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-blue">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            </div>
            <span class="lp-proof-badge">Hạng &amp; giá</span>
          </div>
          <h3 class="lp-proof-card-title">Hạng &amp; giá</h3>
          <p class="lp-proof-card-desc">Nano cho ngân sách gọn và độ tin cậy gần gũi; Macro cho độ phủ lớn. Khung giá từng hạng công khai.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-amber">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </div>
            <span class="lp-proof-badge">Chuyển đổi</span>
          </div>
          <h3 class="lp-proof-card-title">Hiệu quả &amp; đánh giá</h3>
          <p class="lp-proof-card-desc">Sắp xếp theo tỉ lệ chuyển đổi thật và điểm sao từ doanh nghiệp đã booking.</p>
        </article>
      </div>
    </div>
  </section>`;

  const profile = `<section class="lp-section tint" aria-label="Bản chào hàng đầy đủ">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Mỗi hồ sơ KOC là một bản chào hàng đầy đủ</h2>
      </div>
      <div class="lp-section-media lp-reveal" style="max-width:920px;margin:0 auto 24px auto">${lpMedia({
        src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785383806/h%E1%BB%93_s%C6%A1_koc_ihq9lf.jpg",
        alt: "Hồ sơ KOC",
        ratio: "21/9",
      })}</div>
      
      <!-- Highlighted Profile Transparency Statement Card -->
      <div class="lp-statement-card lp-statement-teal" style="max-width:920px;margin:0 auto">
        <div class="lp-statement-header">
          <div class="lp-statement-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <span class="lp-statement-tag">THÔNG TIN MINH BẠCH TRÊN HỒ SƠ</span>
        </div>
        <div class="lp-statement-body">
          <p class="lp-statement-lead">Trang profile công khai của mỗi KOC gồm:</p>
          <div class="lp-statement-chips">
            <span class="lp-chip-tag">Kênh MXH &amp; Follower thật</span>
            <span class="lp-chip-tag">Chỉ số chuyển đổi theo ngành</span>
            <span class="lp-chip-tag">Bảng giá cố định theo gói</span>
            <span class="lp-chip-tag">Portfolio bài đăng tiêu biểu</span>
            <span class="lp-chip-tag">Đánh giá 2 chiều từ Brand</span>
            <span class="lp-chip-tag">Trạng thái nhận booking</span>
          </div>
          <p class="lp-statement-sub" style="margin-top:14px">Xem là quyết định được ngay — không cần chờ báo giá qua trung gian.</p>
        </div>
      </div>
    </div>
  </section>`;

  const flow = `<section class="lp-section lp-marketplace-flow-section" aria-label="Quy trình từ hồ sơ đến bài đăng">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Từ hồ sơ đến bài đăng, <span class="lp-coral-text">một quy trình liền mạch</span></h2>
      </div>

      <div class="lp-flow-banner lp-marketplace-flow">
        <ol class="lp-marketplace-flow-list">
          <li class="lp-marketplace-flow-step"><span class="step-idx">01</span><span><strong>Chọn gói</strong><small>trên hồ sơ</small></span></li>
          <li class="lp-marketplace-flow-step"><span class="step-idx">02</span><span><strong>Gửi link</strong><small>dữ liệu SP</small></span></li>
          <li class="lp-marketplace-flow-step"><span class="step-idx">03</span><span><strong>Thanh toán</strong><small>ví đảm bảo</small></span></li>
          <li class="lp-marketplace-flow-step"><span class="step-idx">04</span><span><strong>Đăng bài</strong><small>&amp; xác nhận</small></span></li>
          <li class="lp-marketplace-flow-step"><span class="step-idx">05</span><span><strong>Giải ngân</strong><small>95%</small></span></li>
        </ol>
        <p class="lp-flow-assurance">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
          <span>Mỗi giao dịch có mã riêng, tra cứu trọn đời</span>
        </p>
      </div>
    </div>
  </section>`;

  const commit = `<section class="lp-section tint" aria-label="Cam kết từ nền tảng">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>3 cam kết vàng từ KOC Việt</h2>
      </div>
      <div class="lp-grid-3">
        <article class="lp-card lp-proof-card lp-proof-coral">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
          </div>
          <h3 class="lp-proof-card-title">Xác minh 100%</h3>
          <p class="lp-proof-card-desc">100% KOC đã xác minh danh tính và ký hợp đồng điện tử với nền tảng.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-teal">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <h3 class="lp-proof-card-title">Giá cuối cùng</h3>
          <p class="lp-proof-card-desc">Giá trên hồ sơ là giá cuối — không phát sinh, không phí ẩn ngoài 5% dịch vụ đã bao gồm.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-blue">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
          </div>
          <h3 class="lp-proof-card-title">Bảo vệ ví</h3>
          <p class="lp-proof-card-desc">Giao dịch ngoài nền tảng bị cấm theo hợp đồng — để mọi quyền lợi của bạn được ví đảm bảo bảo vệ.</p>
        </article>
      </div>
    </div>
  </section>`;

  const ctaFinal = lpCtaFinal(
    "KOC phù hợp nhất với bạn có thể đang ở ngay tỉnh bên cạnh.",
    [{ href: "/#/explore", label: "Bắt đầu lọc và booking" }],
  );

  return hero + filters + profile + flow + commit + ctaFinal;
}

// ---------- 5. AI Clone Avatar (/ai-clone) ----------
function pageAiClone() {
  const hero = lpHero({
    eyebrow: "DỊCH VỤ CỘNG THÊM — DÀNH RIÊNG CHO KOC CỦA KOC VIỆT",
    h1: `<span class="lp-hero-line">Thu nhập vẫn chạy</span><span class="coral lp-hero-line lp-hero-line-wide">Ngay cả khi bạn không quay video.</span>`,
    sub: "Tham gia chương trình AI Clone Avatar: NetViet trực tiếp mang booking đến và sản xuất video hoàn chỉnh bằng công nghệ AI Clone Avatar hình ảnh, giọng nói của bạn. Việc của bạn chỉ là duyệt video và bấm đăng — phí booking và hoa hồng affiliate vẫn về ví như thường.",
    ctas: [
      {
        href: "/#/aiclone",
        label: "Đăng ký tham gia AI Clone Avatar",
      },
    ],
    trust:
      "Bạn duyệt từng video trước khi đăng · Hợp đồng bảo vệ quyền hình ảnh · Huỷ tham gia bất cứ lúc nào",
    img: {
      src: "/images/aiclone-hero-seamless.png",
      alt: "Dịch vụ AI Clone Avatar",
    },
    waveFill: "#ffffff",
  });

  const forWho = `<section class="lp-section" aria-label="Chương trình này sinh ra cho bạn">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Chương trình này sinh ra cho bạn, nếu…</h2>
      </div>
      <div class="lp-grid-3">
        <article class="lp-card lp-proof-card lp-proof-coral">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <span class="lp-proof-badge">Tiết kiệm thời gian</span>
          </div>
          <h3 class="lp-proof-card-title">Tối ưu hoá thời gian</h3>
          <p class="lp-proof-card-desc">✔ Bạn có lượng follower tốt nhưng không đủ thời gian sản xuất content đều đặn.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-teal">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <span class="lp-proof-badge">Tăng trưởng thu nhập</span>
          </div>
          <h3 class="lp-proof-card-title">Nhận thêm booking</h3>
          <p class="lp-proof-card-desc">✔ Bạn muốn nhận thêm booking ngoài năng lực quay dựng hiện tại của mình.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-blue">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <span class="lp-proof-badge">Công nghệ mới</span>
          </div>
          <h3 class="lp-proof-card-title">Ứng dụng AI đột phá</h3>
          <p class="lp-proof-card-desc">✔ Bạn muốn thử nghiệm công nghệ mới mà vẫn giữ trọn quyền kiểm soát hình ảnh cá nhân.</p>
        </article>
      </div>
    </div>
  </section>`;

  const how = `<section class="lp-section tint" aria-label="Quy trình AI Clone">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>NetViet lo phần nặng, <span class="lp-coral-text">bạn giữ quyền quyết định</span></h2>
      </div>
      <div class="lp-steps-video-wrap">
        ${lpVideoPlayer({
          src: "/videos/ai-clone.mp4",
          poster: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785313898/banner_ai_clone_av_i0rjqx.jpg",
          alt: "Video giới thiệu quy trình AI Clone Avatar",
        })}
      </div>
      <div class="lp-steps n5 lp-grid-5">
        <article class="lp-step">
          <div class="num">1</div>
          <p><strong>ĐĂNG KÝ</strong>KOC đã kích hoạt trên nền tảng đăng ký tham gia; ký phụ lục hợp đồng về phạm vi sử dụng hình ảnh/giọng nói (có thời hạn, có giới hạn, đúng Nghị định 13/2023 về dữ liệu cá nhân).</p>
        </article>
        <article class="lp-step">
          <div class="num">2</div>
          <p><strong>THU MẪU</strong>Buổi ghi hình + thu giọng một lần duy nhất để xây dựng bản sao AI của bạn.</p>
        </article>
        <article class="lp-step">
          <div class="num">3</div>
          <p><strong>NETVIET BOOKING</strong>NetViet chủ động tìm và chốt booking phù hợp với hình ảnh của bạn, sau đó sản xuất video thành phẩm bên ngoài hệ thống bằng AI Clone Avatar.</p>
        </article>
        <article class="lp-step">
          <div class="num">4</div>
          <p><strong>BẠN DUYỆT &amp; ĐĂNG</strong>Video giao đến tài khoản của bạn; đồng ý thì tải về đăng kèm link affiliate, chưa ưng thì yêu cầu chỉnh sửa. Không có video nào được đăng khi bạn chưa gật đầu.</p>
        </article>
        <article class="lp-step">
          <div class="num">5</div>
          <p><strong>NHẬN TIỀN</strong>Phí booking + hoa hồng affiliate chảy về ví đúng cơ chế minh bạch của nền tảng.</p>
        </article>
      </div>
    </div>
  </section>`;

  const control = `<section class="lp-section" aria-label="Ba lớp bảo vệ hình ảnh của bạn">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Ba lớp bảo vệ hình ảnh của bạn</h2>
      </div>
      <div class="lp-grid-3">
        <article class="lp-card lp-proof-card lp-proof-purple">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span class="lp-proof-badge">Pháp lý</span>
          </div>
          <h3 class="lp-proof-card-title">Pháp lý nghiêm ngặt</h3>
          <p class="lp-proof-card-desc">Phụ lục hợp đồng quy định rõ phạm vi, thời hạn, ngành hàng được phép; ngoài phạm vi là vi phạm hợp đồng.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-teal">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <span class="lp-proof-badge">Quy trình</span>
          </div>
          <h3 class="lp-proof-card-title">Quyền duyệt tối cao</h3>
          <p class="lp-proof-card-desc">Bạn duyệt cuối mọi video trước khi công khai, từ chối không cần lý do.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-blue">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <span class="lp-proof-badge">Kỹ thuật</span>
          </div>
          <h3 class="lp-proof-card-title">Mã hoá bảo mật</h3>
          <p class="lp-proof-card-desc">Dữ liệu khuôn mặt, giọng nói lưu kho mã hoá riêng, không chia sẻ cho bên thứ ba, xoá vĩnh viễn khi bạn rời chương trình.</p>
        </article>
      </div>
    </div>
  </section>`;

  const compare = `<section class="lp-section tint" aria-label="So sánh booking">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Booking thường vs. Booking AI Clone Avatar</h2>
      </div>
      
      <!-- Highlighted Comparison Statement Card -->
      <div class="lp-statement-card lp-statement-purple" style="max-width:920px;margin:0 auto">
        <div class="lp-statement-header">
          <div class="lp-statement-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M6 12h12"/></svg>
          </div>
          <p class="lp-statement-note">So sánh hai mô hình hoạt động</p>
        </div>
        <div class="lp-statement-body">
          <div class="lp-compare-grid">
            <div class="lp-compare-col nv-card-enter nv-lift-card" style="--nv-delay:80ms">
              <h4>Booking thường</h4>
              <p>Bạn tự tìm nhận booking trên marketplace, tự sản xuất và quay dựng content.</p>
            </div>
            <div class="lp-compare-col featured nv-card-enter nv-lift-card" style="--nv-delay:160ms">
              <h4>Booking AI Clone Avatar</h4>
              <p>NetViet mang booking đến, video được sản xuất sẵn bằng hình ảnh và giọng nói AI của bạn.</p>
            </div>
          </div>
          <div class="lp-compare-common">
            <strong>Điểm chung</strong>
            <ul>
              <li>Thanh toán qua cơ chế ví an toàn; KOC nhận cả phí booking và hoa hồng affiliate.</li>
              <li>KOC giữ trọn quyền duyệt hoặc từ chối từng nội dung trước khi đăng.</li>
              <li>Hai mô hình chạy song song; tham gia AI Clone không ảnh hưởng booking thường.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>`;

  const faq = `<section class="lp-section" aria-label="Câu hỏi thường gặp">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Câu hỏi thường gặp</h2>
      </div>
      <div style="max-width:760px;margin:0 auto">
        ${lpAccordion([
          [
            "AI Clone Avatar có làm mất chất riêng của tôi?",
            "Video dựng từ chính hình ảnh, giọng nói của bạn và bạn duyệt từng chi tiết trước khi đăng.",
          ],
          [
            "Chi phí tham gia?",
            "Miễn phí. NetViet đầu tư sản xuất và thu lại từ phí dịch vụ với doanh nghiệp.",
          ],
          [
            "Muốn dừng thì sao?",
            "Thông báo trước theo hợp đồng; mọi dữ liệu clone bị xoá, các video đã đăng xử lý theo thoả thuận.",
          ],
        ])}
      </div>
    </div>
  </section>`;

  const ctaFinal = lpCtaFinal(
    "Số lượng tham gia giai đoạn đầu có giới hạn — ưu tiên KOC đăng ký sớm.",
    [{ href: "/#/aiclone", label: "Đăng ký tham gia AI Clone Avatar ngay" }],
  );

  return hero + forWho + how + control + compare + faq + ctaFinal;
}

// ---------- 6. Bảng giá & Hạng KOC (/bang-gia) ----------
function pagePricing() {
  const hero = lpHero({
    eyebrow: "BẢNG GIÁ & CHÍNH SÁCH",
    h1: `Một mức phí duy nhất: <span class="coral">5%.</span><br>Mọi thứ khác thuộc về KOC và doanh nghiệp.`,
    sub: "KOC Việt không bán quảng cáo, không thu phí thành viên, không phí ẩn. Nền tảng chỉ giữ 5% trên mỗi booking thành công — có giao dịch mới có phí, minh bạch trên từng hoá đơn.",
    img: {
      src: "/images/pricing-hero-seamless.png",
      alt: "Bảng giá minh bạch của KOC Việt",
    },
    waveFill: "#ffffff",
  });

  const feeMechanism = `<section class="lp-section lp-money-flow-section" aria-label="Cơ chế phí">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <span class="lp-statement-tag" style="margin-bottom:12px;display:inline-block">DÒNG TIỀN MINH BẠCH</span>
        <h2>Tiền đi đường nào, ai nhận bao nhiêu</h2>
        <p>Phí dịch vụ 5% duy nhất — không phí ẩn, không phí duy trì. Mọi luồng tiền được bảo chứng qua ví an toàn.</p>
      </div>

      <!-- 4-Step Connected Money Flow Pipeline (Full Width) -->
      <div class="lp-money-pipeline">
        <div class="lp-money-step">
          <div class="lp-money-step-head">
            <span class="lp-money-step-badge">1</span>
            <span class="lp-money-step-tag">Ký quỹ an toàn</span>
          </div>
          <h3 class="lp-money-step-title">Doanh nghiệp cọc 100%</h3>
          <p class="lp-money-step-desc">Tạm giữ an toàn trong ví đảm bảo ngay khi chốt hợp đồng booking, đảm bảo khả năng thanh toán.</p>
          <div class="lp-money-step-pill">Ví ký quỹ 100%</div>
        </div>

        <div class="lp-money-step-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </div>

        <div class="lp-money-step">
          <div class="lp-money-step-head">
            <span class="lp-money-step-badge">2</span>
            <span class="lp-money-step-tag">Thu nhập KOC</span>
          </div>
          <h3 class="lp-money-step-title">Hoàn thành: KOC nhận 95%</h3>
          <p class="lp-money-step-desc">Giải ngân tự động về ví KOC ngay sau khi doanh nghiệp nghiệm thu bài đăng đạt chuẩn.</p>
          <div class="lp-money-step-pill pill-koc">KOC nhận 95%</div>
        </div>

        <div class="lp-money-step-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </div>

        <div class="lp-money-step">
          <div class="lp-money-step-head">
            <span class="lp-money-step-badge">3</span>
            <span class="lp-money-step-tag">Phí dịch vụ</span>
          </div>
          <h3 class="lp-money-step-title">Nền tảng giữ 5%</h3>
          <p class="lp-money-step-desc">Phí duy nhất cho vận hành, kiểm duyệt &amp; bảo hộ hợp đồng, đã bao gồm hoá đơn VAT điện tử.</p>
          <div class="lp-money-step-pill pill-fee">Nền tảng 5%</div>
        </div>

        <div class="lp-money-step-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </div>

        <div class="lp-money-step">
          <div class="lp-money-step-head">
            <span class="lp-money-step-badge">4</span>
            <span class="lp-money-step-tag">Hoa hồng thêm</span>
          </div>
          <h3 class="lp-money-step-title">Hoa hồng affiliate</h3>
          <p class="lp-money-step-desc">Doanh thu bán hàng phát sinh từ link tiếp thị được hệ thống đối soát độc lập và cộng thưởng theo kỳ.</p>
          <div class="lp-money-step-pill pill-affiliate">Đối soát theo kỳ</div>
        </div>
      </div>

      <!-- Visual Example Box (Full Width) -->
      <div class="lp-money-calc-box">
        <div class="lp-money-calc-head">
          <span class="lp-money-calc-icon">💡</span>
          <strong>Ví dụ minh họa giao dịch thực tế:</strong>
          <span class="lp-money-calc-badge">Minh bạch 100%</span>
        </div>
        <div class="lp-money-calc-flow">
          <div class="calc-card total">
            <span class="calc-lbl">Booking hợp đồng mẫu</span>
            <span class="calc-num">2.500.000đ</span>
          </div>
          <span class="calc-sym">➔</span>
          <div class="calc-card koc">
            <span class="calc-lbl">KOC thực nhận (95%)</span>
            <span class="calc-num">2.375.000đ</span>
            <span class="calc-note green">Rút về tài khoản 24/7</span>
          </div>
          <span class="calc-sym">+</span>
          <div class="calc-card platform">
            <span class="calc-lbl">Phí dịch vụ sàn (5%)</span>
            <span class="calc-num">125.000đ</span>
            <span class="calc-note">Đã gồm hoá đơn VAT điện tử</span>
          </div>
        </div>
        <div class="lp-money-calc-footer">
          <span>✓ Không phí đăng ký tài khoản</span>
          <span>✓ Không phí duy trì hàng tháng</span>
          <span>✓ Không thu phụ phí ẩn</span>
        </div>
      </div>
    </div>
  </section>`;

  const tiers = `<section class="lp-section tint" aria-label="4 Hạng KOC">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Khung giá niêm yết theo 4 hạng KOC</h2>
      </div>
      <div class="lp-section-media lp-reveal" style="max-width:720px;margin:0 auto 36px auto">${lpMedia({ src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785745847/c%C3%A0ng_l%C3%A0m_t%E1%BB%91t_khun_gi%C3%A1_c%C3%A0ng_m%E1%BB%9F_1_v2awgu.jpg", alt: "Càng làm tốt, khung giá càng mở", ratio: "16/9" })}</div>
      <div class="lp-grid-4 lp-pricing-grid">
        <div class="lp-pricing-card">
          <h3>Nano</h3>
          <p>~1.000–10.000 follower · Khung giá 200.000đ – 800.000đ/bài · Hợp SME địa phương, sản phẩm cần độ tin cậy gần gũi</p>
        </div>
        <div class="lp-pricing-card featured">
          <span class="badge-popular">Phổ biến nhất</span>
          <h3>Micro</h3>
          <p>10.000–100.000 follower · Khung giá 800.000đ – 3.000.000đ/bài · Cân bằng tốt nhất giữa chi phí và chuyển đổi</p>
        </div>
        <div class="lp-pricing-card">
          <h3>Mid</h3>
          <p>100.000–500.000 follower · Khung giá 3.000.000đ – 10.000.000đ/bài · Chiến dịch cần độ phủ vùng hoặc toàn quốc</p>
        </div>
        <div class="lp-pricing-card">
          <h3>Macro</h3>
          <p>500.000+ follower · Khung giá từ 10.000.000đ/bài, thoả thuận trong khung · Ra mắt sản phẩm, chiến dịch thương hiệu lớn</p>
        </div>
      </div>
      <p class="lp-muted" style="text-align:center;max-width:760px;margin:24px auto 0;font-size:13.5px;color:#64748b;">KOC tự đặt giá cụ thể trong khung của hạng mình, theo từng ngành hàng. Khung giá do nền tảng công bố và điều chỉnh định kỳ theo dữ liệu thị trường — chống phá giá lẫn thổi giá.</p>
    </div>
  </section>`;

  const tierCriteria = `<section class="lp-section" aria-label="Tiêu chuẩn xếp hạng">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Hạng được tính bằng gì &amp; Lên hạng được gì?</h2>
      </div>
      <div class="lp-grid-2">
        <article class="lp-card lp-proof-card lp-proof-coral">
          <h3 class="lp-proof-card-title">Hạng được tính bằng gì?</h3>
          <p class="lp-proof-card-desc">Ba nhóm tiêu chí được đánh giá tự động: (1) quy mô — số người theo dõi đã xác minh; (2) chất lượng — tỉ lệ tương tác và khả năng tạo đơn hàng; (3) uy tín — tỉ lệ hoàn thành booking đúng hạn và điểm đánh giá từ doanh nghiệp. Hạng được xem xét mỗi quý; kết quả tốt có thể được xét sớm.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-teal">
          <h3 class="lp-proof-card-title">Lên hạng được gì?</h3>
          <p class="lp-proof-card-desc">Khung giá cao hơn · ưu tiên hiển thị trên kết quả lọc marketplace · giảm phí dịch vụ theo bậc · huy hiệu hạng trên hồ sơ · ưu tiên tham gia chương trình AI Clone Avatar và chiến dịch NetViet điều phối.</p>
        </article>
      </div>
    </div>
  </section>`;

  const payoutPolicy = `<section class="lp-section tint" aria-label="Chính sách thanh toán">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Chính sách thanh toán</h2>
      </div>
      
      <!-- Highlighted Payout Policy Statement Card (Featured Redesign) -->
      <div class="lp-statement-card lp-statement-coral" style="max-width:920px;margin:0 auto">
        <div class="lp-statement-header">
          <div class="lp-statement-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          </div>
          <div>
            <span class="lp-statement-tag">CAM KẾT THANH TOÁN 100% MINH BẠCH</span>
            <h3 class="lp-statement-card-headline">Quy chuẩn giải ngân &amp; đối soát dòng tiền</h3>
          </div>
        </div>
        <div class="lp-statement-body">
          <div class="lp-payout-pills-grid">
            <div class="lp-payout-pill-item">
              <div class="lp-payout-ico">⚡</div>
              <div class="lp-payout-content">
                <strong>Giải ngân ngay lập tức</strong>
                <p>Phí booking giải ngân ngay khi doanh nghiệp xác nhận hoàn thành chiến dịch.</p>
              </div>
            </div>
            <div class="lp-payout-pill-item">
              <div class="lp-payout-ico">📅</div>
              <div class="lp-payout-content">
                <strong>Đối soát theo kỳ</strong>
                <p>Hoa hồng affiliate đối soát theo kỳ (lịch công bố minh bạch và cập nhật trong app).</p>
              </div>
            </div>
            <div class="lp-payout-pill-item">
              <div class="lp-payout-ico">💳</div>
              <div class="lp-payout-content">
                <strong>Ngưỡng rút 1.000.000đ</strong>
                <p>Rút về tài khoản ngân hàng / ví điện tử trong 24h làm việc.</p>
              </div>
            </div>
            <div class="lp-payout-pill-item">
              <div class="lp-payout-ico">🔒</div>
              <div class="lp-payout-content">
                <strong>Bảo mật OTP 2 lớp</strong>
                <p>Mọi lệnh rút tiền đều được xác thực OTP 2 lớp chống rò rỉ và bảo vệ chủ tài khoản.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>`;

  const quote = `<section class="lp-section" aria-label="Báo giá riêng">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Gói cần thoả thuận? Nhận báo giá riêng</h2>
      </div>
      ${lpQuoteCta("Liên hệ nhận báo giá trực tiếp")}
      ${lpContactForm("bang-gia", "Liên hệ nhận báo giá trực tiếp")}
    </div>
  </section>`;

  const ctaFinal = lpCtaFinal(
    "Giá minh bạch là khởi đầu của sự hợp tác bền vững.",
    [
      { href: "/#/tuyen-koc", label: "KOC: Đặt bảng giá của bạn" },
      {
        href: "/#/explore",
        label: "Doanh nghiệp: Xem KOC theo khung giá",
        ghost: true,
      },
    ],
  );

  return (
    hero +
    feeMechanism +
    tiers +
    tierCriteria +
    payoutPolicy +
    quote +
    ctaFinal
  );
}

// ---------- 7. Cộng đồng tỉnh thành (/cong-dong) ----------
function pageCommunity() {
  const hero = lpHero({
    eyebrow: "CỘNG ĐỒNG KOC 34 TỈNH THÀNH",
    h1: `<span class="lp-hero-line lp-hero-line-wide">Khách hàng ở tỉnh nào</span><span class="coral lp-hero-line">KOC có mặt ở tỉnh đó.</span>`,
    sub: "KOC Việt tổ chức KOC thành cộng đồng theo từng tỉnh/thành: doanh nghiệp địa phương tìm được người nói đúng giọng khách hàng của mình, KOC tỉnh có sân chơi và người dẫn dắt ngay tại quê nhà.",
    ctas: [
      { href: "/#/explore", label: "Tìm KOC tại tỉnh của bạn" },
    ],
    img: {
      src: "/images/community-hero-seamless.png",
      alt: "Khách hàng tỉnh nào, KOC tỉnh đó",
    },
    waveFill: "#ffffff",
  });

  const whyLocal = `<section class="lp-section" aria-label="Sức mạnh của KOC cùng quê">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Sức mạnh của KOC “cùng quê”</h2>
      </div>
      <div class="lp-section-media lp-reveal" style="max-width:920px;margin:0 auto 36px auto">${lpMedia({
        src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785313891/s%E1%BB%A9c_m%E1%BA%A1nh_c%E1%BB%A7a_koc_c%C3%B9ng_t%E1%BB%89nh_vrclku.jpg",
        alt: "Sức mạnh của KOC cùng tỉnh",
        ratio: "21/9",
      })}</div>
      <div class="lp-grid-3">
        <article class="lp-card lp-proof-card lp-proof-coral">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <span class="lp-proof-badge">Văn hoá</span>
          </div>
          <h3 class="lp-proof-card-title">Đúng văn hoá, đúng giọng</h3>
          <p class="lp-proof-card-desc">Người miền Tây tin lời giới thiệu bằng giọng miền Tây.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-teal">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <span class="lp-proof-badge">Hậu cần</span>
          </div>
          <h3 class="lp-proof-card-title">Logistics nhanh gọn</h3>
          <p class="lp-proof-card-desc">Gửi sản phẩm mẫu trong ngày, quay tại điểm bán dễ dàng.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-blue">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span class="lp-proof-badge">Chi phí</span>
          </div>
          <h3 class="lp-proof-card-title">Chi phí hợp lý</h3>
          <p class="lp-proof-card-desc">KOC Nano/Micro địa phương cho hiệu quả trên chi phí tốt nhất với cửa hàng, quán ăn, spa, chuỗi bán lẻ tỉnh.</p>
        </article>
      </div>
    </div>
  </section>`;

  const leader = `<section class="lp-section tint" aria-label="Trưởng nhóm cộng đồng">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Trưởng nhóm cộng đồng, <span class="lp-coral-text">người kết nối tại từng tỉnh</span></h2>
      </div>
      <div class="lp-grid-2">
        <!-- Highlighted Leader Statement Card -->
        <div class="lp-statement-card lp-statement-amber" style="margin-top:0">
          <div class="lp-statement-header">
            <div class="lp-statement-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <span class="lp-statement-tag">VAI TRÒ TRƯỞNG NHÓM TỈNH</span>
          </div>
          <div class="lp-statement-body">
            <p class="lp-statement-lead">Mỗi tỉnh có một trưởng nhóm cộng đồng:</p>
            <ul class="lp-statement-list">
              <li><span class="lp-check-ico">✓</span> Hỗ trợ xem xét và duyệt hồ sơ KOC mới tại địa phương.</li>
              <li><span class="lp-check-ico">✓</span> Hướng dẫn người mới nhận booking và tăng hiệu quả bán hàng.</li>
              <li><span class="lp-check-ico">✓</span> Tổ chức sự kiện trải nghiệm sản phẩm thực tế.</li>
              <li><span class="lp-check-ico">✓</span> Nhận hoa hồng cộng đồng từ booking phát sinh trong tỉnh.</li>
            </ul>
          </div>
        </div>
        
        <div class="lp-recruit-card">
          <div class="lp-recruit-card-content">
            <h3>QUYỀN LỢI TRƯỞNG NHÓM TỈNH</h3>
            <p>Trở thành trưởng nhóm cộng đồng, bạn nhận được:</p>
            <ul class="lp-recruit-benefits">
              <li><span aria-hidden="true">✓</span> Hoa hồng cộng đồng từ các booking phát sinh trong tỉnh.</li>
              <li><span aria-hidden="true">✓</span> Huy hiệu &amp; quyền lợi riêng dành cho trưởng nhóm trên nền tảng.</li>
              <li><span aria-hidden="true">✓</span> Ưu tiên tham gia các sự kiện, chương trình trải nghiệm sản phẩm.</li>
              <li><span aria-hidden="true">✓</span> Mở rộng mạng lưới KOC và trở thành người kết nối cộng đồng tại địa phương.</li>
            </ul>
          </div>
          <a href="/#/tuyen-koc" class="btn btn-primary" style="display:inline-flex;align-items:center;justify-content:center;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;color:#fff;background:#ea583c;">Ứng tuyển trưởng nhóm tỉnh</a>
        </div>
      </div>
    </div>
  </section>`;

  const roadmap = `<section class="lp-section" aria-label="Lộ trình phủ 34 tỉnh thành">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Lộ trình phủ 34 tỉnh thành</h2>
      </div>
      
      <!-- Highlighted Roadmap Flow Banner -->
      <div class="lp-flow-banner" style="max-width:920px;margin:0 auto">
        <div class="lp-flow-banner-header">
          <span class="lp-statement-tag">LỘ TRÌNH PHỦ 34 TỈNH THÀNH</span>
          <span class="lp-flow-caption">Mở rộng mạng lưới KOC theo từng giai đoạn</span>
        </div>
        <div class="lp-roadmap-grid">
          <div class="lp-roadmap-card">
            <span class="phase-badge">Giai đoạn 1</span>
            <h4>5 Thành phố lớn</h4>
            <p>Hà Nội, TP.HCM, Đà Nẵng, Hải Phòng, Cần Thơ.</p>
          </div>
          <div class="lp-roadmap-card">
            <span class="phase-badge">Giai đoạn 2</span>
            <h4>20 Tỉnh trọng điểm</h4>
            <p>Theo sức mua và nhu cầu thương mại điện tử.</p>
          </div>
          <div class="lp-roadmap-card">
            <span class="phase-badge">Giai đoạn 3</span>
            <h4>Phủ toàn quốc</h4>
            <p>Phủ toàn quốc 34 tỉnh thành với cộng đồng địa phương.</p>
          </div>
          <div class="lp-roadmap-card">
            <span class="phase-badge">Giai đoạn 4</span>
            <h4>Liên kết vùng</h4>
            <p>Chia sẻ booking giữa các tỉnh lân cận cho chiến dịch vùng miền.</p>
          </div>
        </div>
      </div>
    </div>
  </section>`;

  const ctaFinal = lpCtaFinal(
    "Cộng đồng tỉnh bạn đang hình thành — có mặt sớm, lợi thế sớm.",
    [
      { href: "/#/tuyen-koc", label: "KOC: Gia nhập cộng đồng tỉnh" },
      {
        href: "/#/explore",
        label: "Doanh nghiệp: Lọc KOC theo tỉnh",
        ghost: true,
      },
    ],
  );

  return hero + whyLocal + leader + roadmap + ctaFinal;
}

// ---------- 8. FAQ & Hỗ trợ (/ho-tro) ----------
function pageSupport() {
  const hero = `<section class="lp-hero-home">
    <div class="lp-hero-home-inner" style="grid-template-columns: 1fr; text-align: center;">
      <div class="lp-hero-content" style="max-width: 820px; margin: 0 auto;">
        <div class="lp-hero-eyebrow-wrap" style="justify-content: center;">
          <span class="lp-hero-eyebrow-dash"></span>
          <span class="lp-hero-eyebrow">TRUNG TÂM TRỢ GIÚP &amp; GIẢI ĐÁP</span>
        </div>
        <h1 class="lp-hero-title">
          <span class="lp-hero-line lp-hero-line-wide">Mọi câu hỏi về KOC Việt</span>
          <span class="coral lp-hero-line lp-hero-line-wide">Được trả lời thẳng, không vòng vo.</span>
        </h1>
        <p class="lp-hero-sub" style="margin: 0 auto 28px auto;">Tra cứu câu hỏi thường gặp hoặc gửi yêu cầu trực tiếp tới đội ngũ hỗ trợ NetViet.</p>
        <div class="lp-search-box">
          <input id="lp-faq-search" placeholder="Gõ từ khoá: phí, rút tiền, hợp đồng, hoàn tiền, AI Clone Avatar…">
        </div>
      </div>
    </div>
    <div class="lp-hero-wave-divider" aria-hidden="true">
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" fill="#ffffff">
        <path d="M0,45 C280,75 560,18 840,42 C1080,62 1280,72 1440,32 L1440,90 L0,90 Z"></path>
      </svg>
    </div>
  </section>`;

  const faqBody = `<section class="lp-section" aria-label="Danh mục câu hỏi thường gặp">
    <div class="lp-section-inner" style="max-width:820px;margin:0 auto">
      <div class="lp-section-head">
        <h2>Danh mục câu hỏi thường gặp</h2>
      </div>
      ${lpAccordion(
        [
          [
            "Đăng ký KOC mất bao lâu?",
            "Dưới 15 phút gồm cả xác minh danh tính và ký hợp đồng điện tử; hồ sơ được duyệt trong 24–48 giờ.",
          ],
          [
            "Doanh nghiệp cần gì để booking?",
            "Tài khoản doanh nghiệp xác minh (MST) và link dữ liệu sản phẩm cho mỗi booking.",
          ],
          [
            "Một KOC làm nhiều ngành hàng được không?",
            "Được — mỗi ngành một hồ sơ năng lực, bảng giá và chỉ số riêng.",
          ],
        ],
        { groupTitle: "Tài khoản & Đăng ký" },
      )}
      ${lpAccordion(
        [
          [
            "Nền tảng thu phí thế nào?",
            "Duy nhất 5% trên booking thành công, khấu trừ tự động khi giải ngân. Đăng ký, duy trì tài khoản, hiển thị hồ sơ: miễn phí.",
          ],
          [
            "Giá booking có thương lượng được không?",
            "Không. Giá trên hồ sơ là giá cuối do KOC niêm yết trong khung hạng — minh bạch cho cả hai phía.",
          ],
        ],
        { groupTitle: "Giá & Phí" },
      )}
      ${lpAccordion(
        [
          [
            "KOC từ chối booking thì tiền của tôi ra sao?",
            "Ví đảm bảo hoàn 100% ngay khi KOC từ chối hoặc quá hạn xác nhận.",
          ],
          [
            "Ai duyệt nội dung trước khi đăng?",
            "KOC sản xuất theo brief và dữ liệu sản phẩm; doanh nghiệp được xem và phản hồi theo gói dịch vụ đã chọn.",
          ],
          [
            "Nội dung có cần gắn nhãn quảng cáo?",
            "Có — nền tảng nhắc tự động gắn #quangcao theo quy định pháp luật hiện hành.",
          ],
        ],
        { groupTitle: "Booking & Nội dung" },
      )}
      ${lpAccordion(
        [
          [
            "Khi nào KOC nhận tiền?",
            "95% phí booking vào ví ngay khi doanh nghiệp xác nhận hoàn thành; hoa hồng affiliate theo kỳ đối soát; rút về ngân hàng trong 24h làm việc.",
          ],
          [
            "Có tranh chấp thì xử lý thế nào?",
            "Mở khiếu nại trong app; đội ngũ trọng tài của nền tảng đối chiếu dữ liệu giao dịch (được lưu vết đầy đủ) và phân xử theo điều khoản hợp đồng.",
          ],
        ],
        { groupTitle: "Thanh toán" },
      )}
      ${lpAccordion(
        [
          [
            "Hợp đồng điện tử có giá trị pháp lý không?",
            "Có — ký bằng OTP/chữ ký số theo Luật Giao dịch điện tử 2023, lưu trữ kèm timestamp và mã băm chống chỉnh sửa.",
          ],
          [
            "Dữ liệu CCCD của tôi được dùng làm gì?",
            "Chỉ để xác minh danh tính và chi trả đúng người, mã hoá lưu trữ theo Nghị định 13/2023/NĐ-CP, không chia sẻ bên thứ ba.",
          ],
        ],
        { groupTitle: "Pháp lý & Dữ liệu" },
      )}
      ${lpAccordion(
        [
          [
            "AI Clone Avatar có bắt buộc không?",
            "Không — là dịch vụ cộng thêm hoàn toàn tự nguyện, đăng ký riêng và huỷ được bất cứ lúc nào.",
          ],
          [
            "Video AI Clone Avatar do ai sản xuất?",
            "NetViet booking và sản xuất bên ngoài hệ thống; KOC duyệt cuối từng video trước khi đăng.",
          ],
        ],
        { groupTitle: "AI Clone Avatar" },
      )}
    </div>
  </section>`;

  const support = `<section class="lp-section tint" aria-label="Kênh hỗ trợ">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Kênh hỗ trợ trực tiếp</h2>
      </div>
      
      <!-- Highlighted Support Channels Statement Card -->
      <div class="lp-statement-card lp-statement-teal" style="max-width:820px;margin:0 auto">
        <div class="lp-statement-header">
          <div class="lp-statement-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <span class="lp-statement-tag">KÊNH HỖ TRỢ TRỰC TIẾP</span>
        </div>
        <div class="lp-statement-body">
          <div class="lp-support-channels-grid">
            <div class="lp-channel-item">
              <span class="chan-ico">💬</span>
              <strong>Trung tâm hỗ trợ trong app</strong>
              <p>Phản hồi dưới 2 giờ làm việc</p>
            </div>
            <div class="lp-channel-item">
              <span class="chan-ico">📞</span>
              <strong>Hotline NetViet</strong>
              <p>Hỗ trợ trực tiếp từ chuyên viên</p>
            </div>
            <div class="lp-channel-item">
              <span class="chan-ico">✉️</span>
              <strong>Email hỗ trợ</strong>
              <p>Tiếp nhận &amp; xử lý yêu cầu</p>
            </div>
            <div class="lp-channel-item">
              <span class="chan-ico">👥</span>
              <strong>Cộng đồng KOC tỉnh</strong>
              <p>Trao đổi tại địa phương</p>
            </div>
          </div>
          <p class="lp-statement-sub" style="margin-top:16px;text-align:center">⏰ <strong>Giờ làm việc:</strong> 9:00 – 18:00 (Thứ 2 – Thứ 7 hàng tuần).</p>
        </div>
      </div>
    </div>
  </section>`;

  const contact = `<section class="lp-section" aria-label="Gửi yêu cầu hỗ trợ">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Chưa tìm thấy câu trả lời? Gửi yêu cầu hỗ trợ. Chúng tôi phản hồi trong 2 giờ làm việc.</h2>
      </div>
      ${lpContactForm("ho-tro", "Gửi yêu cầu hỗ trợ")}
    </div>
  </section>`;

  return hero + faqBody + support + contact;
}

const BUILDERS = {
  "/trang-chu": pageHome,
  "/koc": pageKoc,
  "/doanh-nghiep": pageBusiness,
  "/marketplace": pageMarketplace,
  "/ai-clone": pageAiClone,
  "/bang-gia": pagePricing,
  "/cong-dong": pageCommunity,
  "/ho-tro": pageSupport,
};

export function renderLandingBody(pathname) {
  const builder = BUILDERS[pathname];
  if (!builder) return null;
  return `<div class="lp-body lp-home">${lpHeader(pathname)}${builder()}${lpFooter()}</div>`;
}
