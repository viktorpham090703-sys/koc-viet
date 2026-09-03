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
import {
  ACTIVITY_CATEGORY_CYCLE,
  INDUSTRY_ITEMS,
  industryIconSvg,
} from "./industry-icons.js";
import { renderHomeKolInsights } from "./kol-insights.js";

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
  const activitySeedRows = [
    {
      name: "Kim L.",
      category: "Ẩm thực & F&B",
      text: "Nhận booking review sản phẩm mới và lên lịch đăng nội dung",
      time: "8 giây trước",
    },
    {
      name: "Ngọc A.",
      category: "Thời trang",
      text: "Bắt đầu chiến dịch ra mắt bộ sưu tập mùa mới",
      time: "30 giây trước",
    },
    {
      name: "Minh T.",
      category: "Làm đẹp",
      text: "Hoàn tất hồ sơ, bảng giá và sẵn sàng nhận booking",
      time: "52 giây trước",
    },
    {
      name: "Lan H.",
      category: "Mẹ & Bé",
      text: "Nhận lời mời trải nghiệm sản phẩm chăm sóc gia đình",
      time: "1 phút trước",
    },
    {
      name: "Quang D.",
      category: "Công nghệ",
      text: "Đã duyệt nội dung cho chiến dịch thiết bị thông minh",
      time: "1 phút trước",
    },
    {
      name: "Huyền N.",
      category: "Du lịch",
      text: "Nhận chiến dịch trải nghiệm điểm đến địa phương",
      time: "2 phút trước",
    },
    {
      name: "An P.",
      category: "Sức khỏe",
      text: "Hoàn tất nghiệm thu và nhận thanh toán an toàn",
      time: "2 phút trước",
    },
  ];
  const activityRows = activitySeedRows
    .map((item, index) => {
      const tone = ACTIVITY_CATEGORY_CYCLE[index]?.tone || "orange";
      return `<article class="lp-activity-row-item">
        <div class="lp-cat-pill">
          <span class="lp-cat-icon-wrap">${industryIconSvg(item.category, "lp-cat-icon")}<span class="lp-cat-dot ${tone}"></span></span>
          <span>${item.category}</span>
        </div>
        <div class="lp-user-cell"><img class="lp-user-avatar" src="/default-avatar.svg" alt="${item.name}" /><span class="lp-user-name">${item.name}</span></div>
        <div class="lp-activity-desc">${item.text}</div>
        <div class="lp-activity-timestamp">${item.time}</div>
      </article>`;
    })
    .join("");

  const categoryLinks = INDUSTRY_ITEMS.map(
    (item) =>
      `<line x1="500" y1="310" x2="${item.x * 10}" y2="${item.y * 6.2}"/>`,
  ).join("");

  const categoryNodes = INDUSTRY_ITEMS.map(
    (
      item,
    ) => `<a class="lp-category-node" href="/#/explore?category=${encodeURIComponent(item.filterCategory)}" style="--node-x:${item.x}%;--node-y:${item.y}%" aria-label="Khám phá KOC ngành ${item.label}">
      <span class="lp-category-node-icon">${industryIconSvg(item.label)}</span>
      <strong>${item.label}</strong>
      <span class="lp-category-node-rule" aria-hidden="true"></span>
      <span class="lp-category-node-description">${item.description}</span>
    </a>`,
  ).join("");

  const hero = `<section class="lp-hero-home">
    <div class="lp-hero-home-inner">
      <div class="lp-hero-content">
        <div class="lp-hero-eyebrow-wrap">
          <span class="lp-hero-eyebrow-dash"></span>
          <span class="lp-hero-eyebrow">NỀN TẢNG CỔNG BOOKING KOC / KOC VIỆT</span>
        </div>
        <h1 class="lp-hero-title">
          <span class="lp-hero-line lp-hero-line-wide">Booking KOC dễ như đặt xe.</span>
          <span class="coral lp-hero-line lp-hero-line-wide">Giá công khai. Hiệu quả đo được.</span>
        </h1>
        <p class="lp-hero-sub">KOC Việt - Nền tảng kết nối trực tiếp Doanh nghiệp và KOC/KOL trên toàn quốc.</p>
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
            <span class="lp-stat-num">0 Đồng</span>
            <span class="lp-stat-lbl">Phí dịch vụ booking</span>
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
          ${activityRows}
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
    <div class="lp-steps-atmosphere" aria-hidden="true">
      <span class="lp-steps-hex lp-steps-hex-one"></span>
      <span class="lp-steps-hex lp-steps-hex-two"></span>
      <span class="lp-steps-hex lp-steps-hex-three"></span>
      <span class="lp-steps-hex lp-steps-hex-four"></span>
      <span class="lp-steps-hex lp-steps-hex-five"></span>
      <span class="lp-steps-hex lp-steps-hex-six"></span>
      <span class="lp-steps-hex lp-steps-hex-seven"></span>
      <span class="lp-steps-hex lp-steps-hex-eight"></span>
      <span class="lp-steps-particles lp-steps-particles-one"></span>
      <span class="lp-steps-particles lp-steps-particles-two"></span>
    </div>
    <div class="lp-home-campaign-steps-inner">
      <div class="lp-section-head">
        <h2 class="lp-steps-heading">4 bước cho một chiến dịch trọn vẹn</h2>
      </div>

      <div class="lp-steps-video-wrap">
        ${lpVideoPlayer({
          src: "/videos/how-it-works.mp4",
          poster:
            "https://res.cloudinary.com/drxum5uxt/image/upload/v1785312034/booking_koc_d%E1%BB%85_d%C3%A0ng_nh%C6%B0_%C4%91%E1%BA%B7t_xe_jwapy0.jpg",
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
          <p class="lp-proof-card-desc">Lần đầu tiên tại Việt Nam, phí booking KOC minh bạch, phân theo 5 hạng Nano – Micro – Mid – Macro – Mega.</p>
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
      <div class="lp-category-network" aria-label="Danh sách ngành hàng">
        <svg class="lp-category-links" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
          <ellipse class="lp-category-orbit lp-category-orbit-outer" cx="500" cy="310" rx="365" ry="220"/>
          <ellipse class="lp-category-orbit lp-category-orbit-inner" cx="500" cy="310" rx="255" ry="145"/>
          ${categoryLinks}
        </svg>
        <div class="lp-category-hub" aria-hidden="true">
          <span class="lp-category-hub-mark"><img src="https://res.cloudinary.com/drxum5uxt/image/upload/v1785989746/iconXoaNen_afhony.png" alt="" loading="lazy" decoding="async"></span>
        </div>
        ${categoryNodes}
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
    // Tạm ẩn hai khối "KOL đang được chú ý" và "Top10 Chỉ số ảnh hưởng".
    // Bật lại bằng cách bỏ comment ở dòng renderHomeKolInsights() bên dưới.
    renderHomeKolInsights() +
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
    className: "lp-koc-hero",
    eyebrow: "DÀNH CHO KOC/KOLs",
    h1: `Bạn định giá.<br>Nền tảng mang booking đến.<br><span class="coral">Ví tự cộng tiền.</span>`,
    sub: `Tự đặt phí theo ngành hàng, nhận booking từ 200.000+ doanh nghiệp và kiếm thêm hoa hồng affiliate trên mỗi đơn hàng.<span class="lp-koc-hero-speed">Đăng ký và ký hợp đồng điện tử trong <strong>chưa đầy 15 phút.</strong></span>`,
    ctas: [{ href: "/#/tuyen-koc", label: "Tạo hồ sơ KOC miễn phí" }],
    trust: "Miễn phí trọn đời · Nhận 95% mỗi booking · Rút tiền trong 24h",
    img: {
      src: "/images/koc-hero-seamless.png",
      alt: "KOC sáng tạo nội dung và nhận booking",
    },
    waveFill: "#ffffff",
  });

  const dualIncome = `<section class="lp-section lp-koc-income-section" aria-label="Một bài đăng — hai dòng thu nhập">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2><span class="lp-koc-title-line">Một bài đăng</span><span class="lp-koc-title-line lp-coral-text">Hai dòng thu nhập!</span></h2>
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

  const process = `<section class="lp-section tint lp-koc-process-section" aria-label="5 bước để bắt đầu">
    <div class="lp-section-inner">
      <div class="lp-koc-process-lead">
        <div class="lp-koc-process-copy">
          <h2>5 bước để bắt đầu,<br><span class="lp-coral-text">chưa đầy 15 phút</span></h2>
          <p>Từ tạo tài khoản đến khi hồ sơ sẵn sàng nhận booking, mọi bước đều thực hiện trực tuyến và được hướng dẫn rõ ràng.</p>
          <div class="lp-koc-process-points" aria-label="Ưu điểm của quy trình">
            <span>Xác thực nhanh</span><span>Ký điện tử</span><span>Miễn phí đăng ký</span>
          </div>
        </div>
        <div class="lp-steps-video-wrap">
          ${lpVideoPlayer({
            src: "/videos/koc-process.mp4",
            poster:
              "https://res.cloudinary.com/drxum5uxt/image/upload/v1785312036/BANNER_TRANG_KOC_qjho2n.jpg",
            alt: "Video giới thiệu quy trình đăng ký KOC Việt",
          })}
        </div>
      </div>
      <div class="lp-steps n5 lp-grid-5 lp-koc-process-steps">
        <article class="lp-step">
          <div class="lp-koc-step-top"><div class="num">1</div><span class="lp-koc-step-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M16 11h6"/></svg></span></div>
          <h3>TẠO TÀI KHOẢN</h3>
          <p>Tạo tài khoản bằng số điện thoại và xác thực OTP.</p>
        </article>
        <article class="lp-step">
          <div class="lp-koc-step-top"><div class="num">2</div><span class="lp-koc-step-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1"/></svg></span></div>
          <h3>KẾT NỐI KÊNH</h3>
          <p>Kết nối TikTok, Facebook, Instagram hoặc YouTube để xác minh và phân hạng KOC.</p>
        </article>
        <article class="lp-step">
          <div class="lp-koc-step-top"><div class="num">3</div><span class="lp-koc-step-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M6 16c.8-2 5.2-2 6 0M14 9h4M14 13h4"/></svg></span></div>
          <h3>XÁC THỰC DANH TÍNH</h3>
          <p>Xác thực CCCD và ảnh chân dung để đảm bảo thông tin chủ tài khoản.</p>
        </article>
        <article class="lp-step">
          <div class="lp-koc-step-top"><div class="num">4</div><span class="lp-koc-step-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z"/><circle cx="7" cy="7" r="1"/></svg></span></div>
          <h3>ĐẶT BẢNG GIÁ</h3>
          <p>Tự đặt mức giá theo từng ngành hàng trong khung giá phù hợp với hạng KOC.</p>
        </article>
        <article class="lp-step">
          <div class="lp-koc-step-top"><div class="num">5</div><span class="lp-koc-step-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 16c2-3 4 2 8-2"/></svg></span></div>
          <h3>KÝ HỢP ĐỒNG</h3>
          <p>Ký hợp đồng điện tử. Hồ sơ được duyệt sẽ lên sàn và sẵn sàng nhận booking.</p>
        </article>
      </div>
    </div>
  </section>`;

  const rights = `<section class="lp-section lp-koc-rights-section" aria-label="Trên KOC Việt, bạn là người cầm quyền">
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
          <p class="lp-proof-card-desc">Kiểm tra sản phẩm trước khi nhận. Không phù hợp? Một chạm để từ chối, tiền tự hoàn cho doanh nghiệp.</p>
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
          <h3 class="lp-proof-card-title">Quyền tạm ngưng booking</h3>
          <p class="lp-proof-card-desc">Chủ động tạm ngưng theo từng ngành hàng khi cần nghỉ hoặc đang quá tải.</p>
        </article>
      </div>
    </div>
  </section>`;

  const rankUp = `<section class="lp-section tint lp-koc-rank-section" aria-label="Làm tốt hơn, nâng hạng cao hơn, nhận booking giá trị hơn">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Làm tốt hơn, nâng hạng cao hơn,<br><span class="lp-coral-text">nhận booking giá trị hơn</span></h2>
      </div>
      <div class="lp-section-media lp-koc-rank-media lp-reveal">${lpMedia({
        src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1787820954/1787820881216_1498435957045998974_1498435957045998974_bf7570bc0715d548225ae5899a58abfe_obc5vx.jpg",
        alt: "Lộ trình thăng hạng và mở mức giá KOC",
        ratio: "16/6",
      })}</div>

      <div class="lp-koc-rank-flow" aria-label="Làm tốt, thăng hạng và mở mức giá cao hơn">
        <strong>Làm tốt</strong>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>
        <strong>Thăng hạng</strong>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>
        <strong>Mở mức giá cao hơn</strong>
      </div>

      <div class="lp-grid-3 lp-koc-rank-benefits">
        <article class="lp-koc-benefit-card">
          <span class="lp-koc-benefit-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M16 12h3M7 9h5M7 15h7"/></svg></span>
          <h3>Khung giá cao hơn</h3>
          <p>Mỗi hạng mở mức giá booking cao hơn.</p>
        </article>
        <article class="lp-koc-benefit-card">
          <span class="lp-koc-benefit-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/></svg></span>
          <h3>Ưu tiên hiển thị</h3>
          <p>Hạng cao được ưu tiên trên marketplace.</p>
        </article>
        <article class="lp-koc-benefit-card">
          <span class="lp-koc-benefit-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M17 8l-5-5-5 5M7 16l5 5 5-5"/></svg></span>
          <h3>Phí dịch vụ thấp hơn</h3>
          <p>Thăng hạng giúp giảm phí dịch vụ.</p>
        </article>
      </div>
    </div>
  </section>`;

  const conditions = `<section class="lp-section lp-koc-conditions-section" aria-label="Chỉ 3 điều kiện để trở thành KOC Việt">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Chỉ 3 điều kiện để<br><span class="lp-coral-text">trở thành KOC Việt</span></h2>
      </div>

      <div class="lp-grid-3 lp-koc-condition-grid">
        <article class="lp-koc-condition-card">
          <span class="lp-koc-condition-check">✓</span>
          <h3>Đủ 18 tuổi và có CCCD</h3>
          <p>CCCD hợp lệ để xác thực danh tính và ký hợp đồng điện tử.</p>
        </article>
        <article class="lp-koc-condition-card">
          <span class="lp-koc-condition-check">✓</span>
          <h3>Có ít nhất một kênh hoạt động</h3>
          <p>Kênh mạng xã hội có follower thật, bắt đầu từ hạng Nano khoảng 1.000 follower.</p>
        </article>
        <article class="lp-koc-condition-card">
          <span class="lp-koc-condition-check">✓</span>
          <h3>Tuân thủ quy định quảng cáo</h3>
          <p>Cam kết gắn nhãn <strong>#quangcao</strong> theo đúng quy định pháp luật hiện hành.</p>
        </article>
      </div>

      <div class="lp-koc-testimonials-head">
        <h3>KOC nói gì sau khi tham gia?</h3>
        <p>Góc nhìn từ những KOC ở các ngành hàng và khu vực khác nhau.</p>
      </div>
      <div class="lp-koc-testimonials-grid">
        <article class="lp-quote lp-koc-testimonial-card">
          <div class="stars">★★★★★</div>
          <p class="lp-quote-body">“Mình ở Buôn Ma Thuột, trước nghĩ booking chỉ dành cho KOC Sài Gòn, Hà Nội. Lên KOC Việt, doanh nghiệp cà phê ngay tỉnh mình tự tìm đến — không phải chào giá một lần nào.”</p>
          <div class="lp-quote-author">
            <img class="lp-quote-avatar" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80" alt="Hoàng Nam" loading="lazy">
            <div class="lp-quote-info">
              <div class="lp-quote-name-row">
                <strong class="lp-quote-name">Hoàng Nam</strong>
                <span class="lp-role-badge koc">KOC</span>
              </div>
              <span class="lp-quote-role">Nano KOC ngành F&amp;B · Buôn Ma Thuột</span>
            </div>
          </div>
        </article>
        <article class="lp-quote lp-koc-testimonial-card">
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
        </article>
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
    hero + dualIncome + process + rights + rankUp + conditions + faq + ctaFinal
  );
}

// ---------- 3. Dành cho Doanh nghiệp (/doanh-nghiep) ----------
function pageBusiness() {
  const hero = lpHero({
    className: "lp-business-hero",
    eyebrow: "DÀNH CHO DOANH NGHIỆP & NHÃN HÀNG",
    h1: `<span class="lp-hero-line">Booking KOC,</span><span class="coral lp-hero-line">dễ như đặt xe.</span>`,
    sub: `Không cần qua nhiều tầng agency. Chọn KOC, xem giá công khai và hiệu quả thực tế, rồi chốt booking trực tiếp trên KOC Việt.<span class="lp-business-hero-budget">Từ ngân sách 0 Đồng đến tiền tỷ, đều có KOC/KOLs phù hợp.</span>`,
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

  const pains = `<section class="lp-section lp-business-pains" aria-label="Vì sao booking KOC lâu nay khiến bạn mệt?">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Vì sao booking KOC lâu nay khiến bạn mệt?</h2>
        <p>Ba điểm nghẽn khiến doanh nghiệp mất thời gian, khó kiểm soát ngân sách và khó đo lường hiệu quả.</p>
      </div>
      <div class="lp-grid-3">
        <article class="lp-card lp-proof-card lp-proof-red">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <span class="lp-proof-badge">Thiếu minh bạch</span>
          </div>
          <h3 class="lp-proof-card-title">Báo giá hỗn loạn</h3>
          <p class="lp-proof-card-desc">Báo giá mỗi nơi một kiểu, chênh nhau 3–5 lần cho cùng một KOC.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-red">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <span class="lp-proof-badge">Rủi ro</span>
          </div>
          <h3 class="lp-proof-card-title">Rủi ro tài chính</h3>
          <p class="lp-proof-card-desc">Chuyển khoản trước, hiệu quả phó mặc may rủi — không ít thương hiệu từng “mất trắng” phí booking.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-red">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="11" x2="23" y2="11"/></svg>
            </div>
            <span class="lp-proof-badge">Khó kiểm chứng</span>
          </div>
          <h3 class="lp-proof-card-title">Số liệu ảo</h3>
          <p class="lp-proof-card-desc">Follower ảo, tương tác mua — số đẹp nhưng không ra một đơn hàng.</p>
        </article>
      </div>
    </div>
  </section>`;

  const solutions = `<section class="lp-section tint lp-business-solutions" aria-label="Giải pháp từ KOC Việt">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>KOC Việt giải quyết cả ba <span class="lp-coral-text">bằng thiết kế, không bằng lời hứa</span></h2>
        <p>Minh bạch giá, bảo vệ dòng tiền và đo lường bằng dữ liệu được tích hợp ngay trong quy trình booking.</p>
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
          <p class="lp-proof-card-desc">Bảng giá cố định do KOC tự đặt trong khung giá 5 hạng Nano – Micro – Mid – Macro – Mega. Nhìn là biết, không cần hỏi.</p>
        </article>
        <article class="lp-card lp-proof-card lp-proof-teal">
          <div class="lp-proof-card-top">
            <div class="lp-proof-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><path d="M12 15h2"/></svg>
            </div>
            <span class="lp-proof-badge">An toàn</span>
          </div>
          <h3 class="lp-proof-card-title">VÍ ĐẢM BẢO</h3>
          <p class="lp-proof-card-desc">Tiền được tạm giữ trên nền tảng và chỉ giải ngân khi doanh nghiệp xác nhận hoàn thành. Nếu phát sinh vấn đề, doanh nghiệp có cơ chế khiếu nại và hoàn tiền theo chính sách.</p>
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

  const twoModes = `<section class="lp-section lp-business-modes" aria-label="Hai cách hợp tác phù hợp từng quy mô">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Hai cách hợp tác, <span class="lp-coral-text">phù hợp từng quy mô</span></h2>
      </div>
      <div class="lp-grid-2 lp-business-mode-grid">
        <article class="lp-card lp-business-mode-card lp-business-mode-self">
          <span class="lp-business-mode-fit">Phù hợp SME &amp; chiến dịch đơn lẻ</span>
          <h3>TỰ BOOKING QUA MARKETPLACE</h3>
          <p>Phù hợp SME, cửa hàng và chiến dịch đơn lẻ: lọc KOC theo ngành, tỉnh, hạng và giá; booking trực tiếp rồi theo dõi từng bài đăng.</p>
          <a class="lp-business-mode-cta" href="/#/explore">Khám phá KOC <span aria-hidden="true">→</span></a>
        </article>
        <article class="lp-card lp-business-mode-card lp-business-mode-managed">
          <span class="lp-business-mode-fit">Phù hợp chiến dịch quy mô lớn</span>
          <h3>NETVIET ĐIỀU PHỐI</h3>
          <p>Phù hợp chiến dịch lớn cần nhiều KOC: gửi ngân sách và mục tiêu, NetViet lựa chọn đội ngũ phù hợp, vận hành trọn gói và báo cáo hợp nhất.</p>
          <a class="lp-business-mode-cta" href="#contact-form">Nhận tư vấn chiến dịch <span aria-hidden="true">→</span></a>
        </article>
      </div>
    </div>
  </section>`;

  const bookingProcess = `<section class="lp-section tint lp-business-process-section" aria-label="Booking trong 5 phút">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Booking trong 5 phút</h2>
      </div>
      <div class="lp-steps-video-wrap lp-business-process-video">
        ${lpVideoPlayer({
          src: "/videos/booking-process.mp4",
          poster:
            "https://res.cloudinary.com/drxum5uxt/image/upload/v1785312034/booking_koc_d%E1%BB%85_d%C3%A0ng_nh%C6%B0_%C4%91%E1%BA%B7t_xe_jwapy0.jpg",
          alt: "Video giới thiệu quy trình booking dành cho doanh nghiệp",
        })}
      </div>
      <div class="lp-steps n5 lp-grid-5 lp-business-process-steps">
        <article class="lp-step">
          <div class="num">1</div>
          <p><strong>CHỌN KOC</strong>Chọn KOC và gói dịch vụ theo bảng giá trên hồ sơ.</p>
        </article>
        <article class="lp-step">
          <div class="num">2</div>
          <p><strong>GỬI THÔNG TIN SẢN PHẨM</strong>Đính kèm link sản phẩm, hình ảnh, giá và chính sách bán để KOC xem trước trước khi nhận booking.</p>
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
          <p><strong>THEO DÕI &amp; ĐỐI SOÁT</strong>Theo dõi click, đơn hàng, doanh thu và xuất file đối soát.</p>
        </article>
      </div>
      <div class="lp-business-process-cta">
        <h3>Bắt đầu chiến dịch đầu tiên của bạn</h3>
        <a href="/#/explore" class="btn primary nv-lift">Tìm KOC ngay</a>
      </div>
    </div>
  </section>`;

  const measure = `<section class="lp-section lp-business-measure-section" aria-label="Đo lường hiệu quả">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Mỗi đồng chi ra đều trả lời được: <span class="lp-coral-text">tạo ra bao nhiêu đơn?</span></h2>
        <p>Dữ liệu click, đơn hàng và doanh thu được ghi nhận theo từng KOC, giúp doanh nghiệp biết chính xác khoản đầu tư nào đang hiệu quả.</p>
      </div>

      <div class="lp-statement-card lp-statement-coral lp-business-measure-proof">
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

      <div class="lp-business-measure-testimonials">
        <article class="lp-quote lp-business-measure-testimonial">
          <div class="stars">★★★★★</div>
          <p class="lp-quote-body">“Chi 30 triệu cho 8 KOC qua KOC Việt, chúng tôi biết chính xác từng đồng tạo ra bao nhiêu đơn. Điều đó chưa agency nào làm được cho chúng tôi.”</p>
          <div class="lp-quote-author">
            <span class="lp-quote-avatar lp-quote-avatar-initials" aria-hidden="true">MH</span>
            <div class="lp-quote-info">
              <div class="lp-quote-name-row">
                <strong class="lp-quote-name">Trần Minh Hoàng</strong>
                <span class="lp-role-badge business">Doanh nghiệp</span>
              </div>
              <span class="lp-quote-role">Giám đốc Marketing · Thương hiệu Mỹ phẩm nội địa</span>
            </div>
          </div>
        </article>
        <article class="lp-quote lp-business-measure-testimonial">
          <div class="stars">★★★★★</div>
          <p class="lp-quote-body">“Chuỗi 6 cửa hàng của tôi ở Cần Thơ chỉ cần KOC miền Tây. Lọc theo tỉnh, booking 5 bạn, chi phí bằng 1/3 báo giá agency mà đơn về nhiều gấp đôi.”</p>
          <div class="lp-quote-author">
            <span class="lp-quote-avatar lp-quote-avatar-initials" aria-hidden="true">CT</span>
            <div class="lp-quote-info">
              <div class="lp-quote-name-row">
                <strong class="lp-quote-name">Chủ chuỗi mỹ phẩm miền Tây</strong>
                <span class="lp-role-badge business">Doanh nghiệp</span>
              </div>
              <span class="lp-quote-role">Doanh nghiệp bán lẻ · Cần Thơ</span>
            </div>
          </div>
        </article>
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
      <div class="lp-section-media lp-reveal" style="max-width:920px;margin:0 auto 24px auto">${lpMedia(
        {
          src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785383806/h%E1%BB%93_s%C6%A1_koc_ihq9lf.jpg",
          alt: "Hồ sơ KOC",
          ratio: "21/9",
        },
      )}</div>
      
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
    className: "lp-ai-clone-hero",
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
          poster:
            "https://res.cloudinary.com/drxum5uxt/image/upload/v1785313898/banner_ai_clone_av_i0rjqx.jpg",
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

  const tiers = `<section class="lp-section tint" aria-label="5 Hạng KOC">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Khung giá niêm yết theo 5 hạng KOC</h2>
      </div>
      <div class="lp-section-media lp-reveal" style="max-width:720px;margin:0 auto 36px auto">${lpMedia({ src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785745847/c%C3%A0ng_l%C3%A0m_t%E1%BB%91t_khun_gi%C3%A1_c%C3%A0ng_m%E1%BB%9F_1_v2awgu.jpg", alt: "Càng làm tốt, khung giá càng mở", ratio: "16/9" })}</div>
      <div class="lp-grid-5 lp-pricing-grid">
        <div class="lp-pricing-card">
          <h3>Nano</h3>
          <ul class="lp-tier-details">
            <li><span class="lp-tier-detail-icon">◎</span><div><small>Người theo dõi</small><strong>1.000 – dưới 10.000</strong></div></li>
            <li><span class="lp-tier-detail-icon">₫</span><div><small>Khung giá</small><strong>200.000đ – 1.500.000đ/bài</strong></div></li>
            <li><span class="lp-tier-detail-icon">✓</span><div><small>Phù hợp</small><span>SME địa phương, sản phẩm cần độ tin cậy gần gũi</span></div></li>
          </ul>
        </div>
        <div class="lp-pricing-card featured">
          <span class="badge-popular">Phổ biến nhất</span>
          <h3>Micro</h3>
          <ul class="lp-tier-details">
            <li><span class="lp-tier-detail-icon">◎</span><div><small>Người theo dõi</small><strong>10.000 – dưới 100.000</strong></div></li>
            <li><span class="lp-tier-detail-icon">₫</span><div><small>Khung giá</small><strong>1.000.000đ – 10.000.000đ/bài</strong></div></li>
            <li><span class="lp-tier-detail-icon">✓</span><div><small>Phù hợp</small><span>Cân bằng tốt giữa chi phí và chuyển đổi</span></div></li>
          </ul>
        </div>
        <div class="lp-pricing-card">
          <h3>Mid</h3>
          <ul class="lp-tier-details">
            <li><span class="lp-tier-detail-icon">◎</span><div><small>Người theo dõi</small><strong>100.000 – dưới 300.000</strong></div></li>
            <li><span class="lp-tier-detail-icon">₫</span><div><small>Khung giá</small><strong>8.000.000đ – 25.000.000đ/bài</strong></div></li>
            <li><span class="lp-tier-detail-icon">✓</span><div><small>Phù hợp</small><span>Chiến dịch cần độ phủ vùng hoặc toàn quốc</span></div></li>
          </ul>
        </div>
        <div class="lp-pricing-card">
          <h3>Macro</h3>
          <ul class="lp-tier-details">
            <li><span class="lp-tier-detail-icon">◎</span><div><small>Người theo dõi</small><strong>300.000 – dưới 1.000.000</strong></div></li>
            <li><span class="lp-tier-detail-icon">₫</span><div><small>Khung giá</small><strong>20.000.000đ – 60.000.000đ/bài</strong></div></li>
            <li><span class="lp-tier-detail-icon">✓</span><div><small>Phù hợp</small><span>Ra mắt sản phẩm, chiến dịch thương hiệu lớn</span></div></li>
          </ul>
        </div>
        <div class="lp-pricing-card">
          <h3>Mega</h3>
          <ul class="lp-tier-details">
            <li><span class="lp-tier-detail-icon">◎</span><div><small>Người theo dõi</small><strong>Từ 1.000.000</strong></div></li>
            <li><span class="lp-tier-detail-icon">₫</span><div><small>Khung giá</small><strong>Từ 50.000.000đ/bài</strong></div></li>
            <li><span class="lp-tier-detail-icon">✓</span><div><small>Phù hợp</small><span>Chiến dịch quy mô lớn và đại sứ thương hiệu</span></div></li>
          </ul>
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
          <p class="lp-proof-card-desc">Ba nhóm tiêu chí được đánh giá tự động: (1) quy mô — số người theo dõi đã xác minh; (2) chất lượng — khả năng tạo đơn hàng; (3) uy tín — tỉ lệ hoàn thành booking đúng hạn và điểm đánh giá từ doanh nghiệp. Hạng được xem xét mỗi quý; kết quả tốt có thể được xét sớm.</p>
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
                <p>Phí booking được ghi nhận vào ví ngay khi doanh nghiệp xác nhận hoàn thành; yêu cầu rút tiền được xử lý trong 24h làm việc.</p>
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
                <p>Có thể tạo yêu cầu rút khi số dư khả dụng đạt từ 1.000.000đ; số dư thấp hơn được cộng dồn.</p>
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
    hero + feeMechanism + tiers + tierCriteria + payoutPolicy + quote + ctaFinal
  );
}

// ---------- 7. Cộng đồng tỉnh thành (/cong-dong) ----------
function pageCommunity() {
  const hero = lpHero({
    className: "lp-community-hero",
    eyebrow: "CỘNG ĐỒNG KOC 34 TỈNH THÀNH",
    h1: `<span class="lp-hero-line lp-hero-line-wide">Khách hàng ở tỉnh nào</span><span class="coral lp-hero-line">KOC có mặt ở tỉnh đó.</span>`,
    sub: "KOC Việt kết nối doanh nghiệp với KOC tại 34 tỉnh thành, giúp thương hiệu tiếp cận đúng khách hàng địa phương và đúng người ảnh hưởng.",
    ctas: [{ href: "/#/explore", label: "Tìm KOC tại tỉnh của bạn" }],
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
      <div class="lp-section-media lp-reveal" style="max-width:920px;margin:0 auto 36px auto">${lpMedia(
        {
          src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785313891/s%E1%BB%A9c_m%E1%BA%A1nh_c%E1%BB%A7a_koc_c%C3%B9ng_t%E1%BB%89nh_vrclku.jpg",
          alt: "Sức mạnh của KOC cùng tỉnh",
          ratio: "21/9",
        },
      )}</div>
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
        <h2><span class="lp-heading-line">Trưởng nhóm cộng đồng</span><span class="lp-heading-line lp-coral-text">Người kết nối lại từng tỉnh</span></h2>
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
        <h2>Từ 5 thành phố, tiến đến 34 tỉnh thành</h2>
      </div>
      
      <!-- Highlighted Roadmap Flow Banner -->
      <div class="lp-flow-banner lp-community-roadmap">
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
        <div class="lp-roadmap-cta">
          <div class="lp-roadmap-network" aria-hidden="true">
            <svg viewBox="0 0 360 150" fill="none">
              <path d="M38 92L102 42L174 76L244 30L324 72M102 42L126 122L174 76L232 126L324 72M38 92L126 122M244 30L232 126"/>
              <circle cx="38" cy="92" r="8"/><circle cx="102" cy="42" r="10"/><circle cx="126" cy="122" r="7"/><circle cx="174" cy="76" r="13"/><circle cx="232" cy="126" r="8"/><circle cx="244" cy="30" r="7"/><circle cx="324" cy="72" r="11"/>
              <circle class="pulse" cx="174" cy="76" r="22"/>
            </svg>
          </div>
          <div class="lp-roadmap-cta-content">
            <h3>Tỉnh của bạn chưa có trong mạng lưới?</h3>
            <p>Trở thành người kết nối KOC đầu tiên tại địa phương.</p>
            <a href="/#/tuyen-koc" class="btn btn-primary nv-lift">Đăng ký trở thành trưởng nhóm tỉnh</a>
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
          <svg class="lp-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
          <input id="lp-faq-search" type="search" aria-label="Tìm kiếm câu hỏi hỗ trợ" placeholder="Gõ từ khoá: phí, rút tiền, hợp đồng...">
        </div>
      </div>
    </div>
    <div class="lp-hero-wave-divider" aria-hidden="true">
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" fill="#ffffff">
        <path d="M0,45 C280,75 560,18 840,42 C1080,62 1280,72 1440,32 L1440,90 L0,90 Z"></path>
      </svg>
    </div>
  </section>`;

  const categoryTabs = `<nav class="lp-support-tabs" aria-label="Danh mục hỗ trợ">
    <div class="lp-support-tabs-inner">
      <button type="button" data-faq-target="faq-tai-khoan">Tài khoản &amp; đăng ký</button>
      <button type="button" data-faq-target="faq-gia-phi">Giá &amp; phí</button>
      <button type="button" data-faq-target="faq-booking">Booking &amp; nội dung</button>
      <button type="button" data-faq-target="faq-thanh-toan">Thanh toán</button>
      <button type="button" data-faq-target="faq-phap-ly">Pháp lý &amp; dữ liệu</button>
      <button type="button" data-faq-target="faq-ai-clone">AI Clone Avatar</button>
    </div>
  </nav>`;

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
        {
          groupTitle: "Tài khoản & Đăng ký",
          groupId: "faq-tai-khoan",
          groupIcon: "account",
        },
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
        {
          groupTitle: "Giá & Phí",
          groupId: "faq-gia-phi",
          groupIcon: "wallet",
        },
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
        {
          groupTitle: "Booking & Nội dung",
          groupId: "faq-booking",
          groupIcon: "booking",
        },
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
        {
          groupTitle: "Thanh toán",
          groupId: "faq-thanh-toan",
          groupIcon: "payment",
        },
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
        {
          groupTitle: "Pháp lý & Dữ liệu",
          groupId: "faq-phap-ly",
          groupIcon: "legal",
        },
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
        {
          groupTitle: "AI Clone Avatar",
          groupId: "faq-ai-clone",
          groupIcon: "ai",
        },
      )}
    </div>
  </section>`;

  const support = `<section class="lp-section tint" aria-label="Kênh hỗ trợ">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Kênh hỗ trợ trực tiếp</h2>
      </div>
      
      <!-- Highlighted Support Channels Statement Card -->
      <div class="lp-statement-card lp-statement-teal lp-support-channels-card">
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
              <p>Phản hồi trong tối đa 2 giờ làm việc</p>
              <span class="lp-channel-hours">9:00–18:00 · Thứ 2–Thứ 7</span>
            </div>
            <div class="lp-channel-item featured">
              <span class="chan-ico">📞</span>
              <strong>Hotline NetViet</strong>
              <p>Hỗ trợ trực tiếp từ chuyên viên</p>
              <div class="lp-channel-contact-list">
                <a class="lp-channel-contact" href="tel:+84812986898">0812 98 68 98</a>
                <a class="lp-channel-contact" href="tel:+84813487686">0813 487 686</a>
              </div>
              <span class="lp-channel-hours">9:00–18:00 · Thứ 2–Thứ 7</span>
            </div>
            <div class="lp-channel-item">
              <span class="chan-ico">✉️</span>
              <strong>Email hỗ trợ</strong>
              <p>Gửi yêu cầu bất cứ lúc nào</p>
              <a class="lp-channel-contact" href="mailto:kocviet@netviettv.com.vn">kocviet@netviettv.com.vn</a>
              <span class="lp-channel-hours">Phản hồi trong tối đa 2 giờ làm việc</span>
            </div>
            <div class="lp-channel-item">
              <span class="chan-ico">👥</span>
              <strong>Cộng đồng KOC tỉnh</strong>
              <p>Trao đổi tại địa phương</p>
              <span class="lp-channel-hours">Trao đổi 24/7 · tùy quản trị viên địa phương</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>`;

  const contact = `<section class="lp-section" aria-label="Gửi yêu cầu hỗ trợ">
    <div class="lp-section-inner">
      <div class="lp-section-head">
        <h2>Chưa tìm thấy câu trả lời? Gửi yêu cầu hỗ trợ.</h2>
      </div>
      ${lpContactForm("ho-tro", "Gửi yêu cầu hỗ trợ")}
    </div>
  </section>`;

  return hero + categoryTabs + faqBody + support + contact;
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
