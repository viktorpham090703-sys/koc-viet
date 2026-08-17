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
    
    <!-- Stats Strip directly on Hero background (Image 2) -->
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

    <!-- Organic Wave divider (đường lượn sóng) -->
    <div class="lp-hero-wave-divider" aria-hidden="true">
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" fill="#ffffff">
        <path d="M0,45 C280,75 560,18 840,42 C1080,62 1280,72 1440,32 L1440,90 L0,90 Z"></path>
      </svg>
    </div>
  </section>`;

  const splitSection = `<section class="lp-split-section" aria-label="Hoạt động và Đối tượng KOC Việt">
    <div class="lp-split-container">
      <!-- Left: Hoạt động Booking & KOC mới nhất (Image 2) -->
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
            <div class="lp-activity-timestamp">16 phút trước</div>
          </article>
          <article class="lp-activity-row-item">
            <div class="lp-cat-pill"><span class="lp-cat-dot red"></span><span>Thời trang</span></div>
            <div class="lp-user-cell"><img class="lp-user-avatar" src="/default-avatar.svg" alt="Ngọc A." /><span class="lp-user-name">Ngọc A.</span></div>
            <div class="lp-activity-desc">Booking &amp; 03 cpc</div>
            <div class="lp-activity-timestamp">17 phút trước</div>
          </article>
          <article class="lp-activity-row-item">
            <div class="lp-cat-pill"><span class="lp-cat-dot green"></span><span>Trước công</span></div>
            <div class="lp-user-cell"><img class="lp-user-avatar" src="/default-avatar.svg" alt="Minh T." /><span class="lp-user-name">Minh T.</span></div>
            <div class="lp-activity-desc">Săn hàng</div>
            <div class="lp-activity-timestamp">26 phút trước</div>
          </article>
          <article class="lp-activity-row-item">
            <div class="lp-cat-pill"><span class="lp-cat-dot green"></span><span>Thực phẩm</span></div>
            <div class="lp-user-cell"><img class="lp-user-avatar" src="/default-avatar.svg" alt="Lan H." /><span class="lp-user-name">Lan H.</span></div>
            <div class="lp-activity-desc">Review hũ ốc cháy — nghêu, ghẹ, sụ,... đồng nghìn &amp; 500 đồng.</div>
            <div class="lp-activity-timestamp">1 giờ trước</div>
          </article>
          <article class="lp-activity-row-item">
            <div class="lp-cat-pill"><span class="lp-cat-dot red"></span><span>Thác Đăng</span></div>
            <div class="lp-user-cell"><img class="lp-user-avatar" src="/default-avatar.svg" alt="Quang D." /><span class="lp-user-name">Quang D.</span></div>
            <div class="lp-activity-desc">Đo lường &amp; chi trả</div>
            <div class="lp-activity-timestamp">1 giờ trước</div>
          </article>
        </div>
      </div>

      <!-- Right: Dành cho doanh nghiệp & KOC (Image 2) -->
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
        <div class="lp-desk-video-card" id="lp-video-player-box">
          <video id="lp-campaign-video" src="https://quankle2004.quankle2004.workers.dev/videos/how-it-works.mp4" playsinline preload="metadata" poster="https://res.cloudinary.com/drxum5uxt/image/upload/v1785312034/booking_koc_d%E1%BB%85_d%C3%A0ng_nh%C6%B0_%C4%91%E1%BA%B7t_xe_jwapy0.jpg"></video>
          <button type="button" class="lp-video-play-btn" id="lp-video-play-trigger" aria-label="Phát video">
            <span>▶</span>
          </button>
          <div class="lp-video-bottom-bar" id="lp-video-controls">
            <div class="lp-video-progress-wrap" id="lp-video-progress-container">
              <div class="lp-video-progress-played" id="lp-video-played-bar"></div>
              <input type="range" class="lp-video-seekbar" id="lp-video-seekbar" min="0" max="100" step="0.1" value="0" aria-label="Thanh thời gian video" />
            </div>
            <div class="lp-video-controls-row">
              <div class="lp-video-ctrls-left">
                <button type="button" class="lp-ctrl-btn" id="lp-ctrl-play-pause" aria-label="Phát/Tạm dừng">
                  <span class="lp-icon-play">▶</span>
                  <span class="lp-icon-pause" style="display:none">❚❚</span>
                </button>
                <span class="lp-video-time" id="lp-video-time-display">0:00 / 1:47</span>
              </div>
              <div class="lp-video-ctrls-right">
                <button type="button" class="lp-ctrl-btn" id="lp-ctrl-volume" aria-label="Bật/Tắt âm lượng">
                  <span class="lp-icon-vol">🔊</span>
                  <span class="lp-icon-muted" style="display:none">🔇</span>
                </button>
                <button type="button" class="lp-ctrl-btn" id="lp-ctrl-fullscreen" aria-label="Toàn màn hình">
                  <span>⛶</span>
                </button>
              </div>
            </div>
          </div>
        </div>
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

  const whyUs = `<section class="lp-home-proof">
    <div class="lp-home-proof-inner">
      <div class="lp-section-head"><h2>Điều mà thị trường booking KOC đang thiếu — chúng tôi làm trước tiên</h2></div>
      <div class="lp-grid-4">
        <div class="lp-card"><p><strong>Giá niêm yết công khai</strong> — Lần đầu tiên tại Việt Nam, phí booking KOC minh bạch, phân theo 4 hạng <br>Nano – Micro – Mid – Macro.</p></div>
        <div class="lp-card"><p><strong>Thanh toán an toàn</strong> — Doanh nghiệp không sợ mất tiền, KOC không sợ bị chậm phí. Tiền chỉ được chuyển khi hai bên xác nhận hoàn thành.</p></div>
        <div class="lp-card"><p><strong>Hiệu quả bằng số thật</strong> — Chỉ số chuyển đổi của mỗi KOC tính từ dữ liệu affiliate thực tế, không tự khai báo, không mua follower ảo.</p></div>
        <div class="lp-card"><p><strong>Đánh giá hai chiều</strong> — Doanh nghiệp chấm điểm KOC, KOC chấm điểm doanh nghiệp. Uy tín tích luỹ quyết định thứ hạng hiển thị.</p></div>
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
        <h3>Mới: Dịch vụ video đại diện — không cần tự quay mỗi ngày</h3>
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
    h1: "Bạn định giá. Nền tảng mang booking đến. Ví tự cộng tiền.",
    sub: "Mở gian hàng năng lực của riêng bạn trên KOC Việt: niêm yết mức phí theo từng ngành hàng, nhận booking từ 200.000 doanh nghiệp mục tiêu, cộng thêm hoa hồng affiliate trên từng đơn hàng bán ra. Đăng ký đến ký hợp đồng điện tử chưa đầy 15 phút.",
    ctas: [
      { href: "/#/tuyen-koc", cls: "grad", label: "Tạo hồ sơ KOC miễn phí" },
    ],
    trust: "Miễn phí trọn đời · Nhận 95% mỗi booking · Rút tiền trong 24h",
    img: {
      src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785312036/BANNER_TRANG_KOC_qjho2n.jpg",
      alt: "KOC sáng tạo nội dung và nhận booking",
      ratio: "4/3",
    },
  });

  const dualIncome = `<section class="lp-section">
    <div class="lp-section-head"><h2>Một bài đăng — hai dòng thu nhập</h2></div>
    <div class="lp-grid-2">
      <div class="lp-card"><p><strong>PHÍ BOOKING CỐ ĐỊNH</strong> — Doanh nghiệp trả theo đúng bảng giá bạn niêm yết. Không mặc cả, không hạ giá ngầm.</p></div>
      <div class="lp-card"><p><strong>HOA HỒNG AFFILIATE</strong> — Mỗi click, mỗi đơn hàng từ link riêng của bạn được ghi nhận theo thời gian thực và cộng thẳng vào ví.</p></div>
    </div>
    <div class="lp-box" style="margin-top:16px">Ví dụ KOC hạng Micro ngành Làm đẹp: 6 booking/tháng × 1.200.000đ + hoa hồng affiliate ≈ 8–12 triệu đồng/tháng. Con số thực tế phụ thuộc hạng, ngành hàng và độ chăm chỉ của bạn.</div>
  </section>`;

  const process = `<section class="lp-section tint">
    <div class="lp-section-head"><h2>5 bước để bắt đầu — dưới 15 phút</h2></div>
    <div class="lp-section-media lp-reveal">${lpMedia({
      src: "https://quankle2004.quankle2004.workers.dev/videos/koc-process.mp4",
      alt: "Video giới thiệu quy trình chiến dịch KOC Việt",
      ratio: "21/9",
      video: true,
    })}</div>
    <div class="lp-steps n5">
      <div class="lp-step"><div class="num">1</div><p><strong>ĐĂNG KÝ</strong><br>Đăng ký bằng số điện thoại, xác thực OTP.</p></div>
      <div class="lp-step"><div class="num">2</div><p><strong>KẾT NỐI KÊNH</strong><br>Kết nối TikTok/Facebook/Instagram/YouTube — hệ thống tự xác minh follower thật và phân hạng Nano/Micro/Mid/Macro.</p></div>
      <div class="lp-step"><div class="num">3</div><p><strong>XÁC MINH DANH TÍNH</strong><br>Tải ảnh hai mặt CCCD và ảnh chân dung — bảo đảm tiền về đúng chủ tài khoản.</p></div>
      <div class="lp-step"><div class="num">4</div><p><strong>ĐẶT BẢNG GIÁ</strong><br>Tự đặt giá theo từng ngành hàng trong khung giá của hạng — bạn toàn quyền, hệ thống chỉ giữ khung để thị trường không phá giá.</p></div>
      <div class="lp-step"><div class="num">5</div><p><strong>KÝ HỢP ĐỒNG</strong><br>Ký hợp đồng điện tử có giá trị pháp lý — hồ sơ được duyệt là trang profile của bạn lên sàn, sẵn sàng nhận booking.</p></div>
    </div>
  </section>`;

  const rights = `<section class="lp-section">
    <div class="lp-section-head"><h2>Trên KOC Việt, bạn là người cầm quyền</h2></div>
    <div class="lp-grid-4">
      <div class="lp-card"><p><strong>Quyền định giá</strong> — chỉnh bảng giá bất cứ lúc nào trong khung hạng của mình.</p></div>
      <div class="lp-card"><p><strong>Quyền từ chối</strong> — kiểm tra link dữ liệu sản phẩm trước khi nhận; sản phẩm không phù hợp giá trị của bạn, một chạm từ chối, tiền tự hoàn cho doanh nghiệp.</p></div>
      <div class="lp-card"><p><strong>Quyền sáng tạo</strong> — bạn tự sản xuất content theo chất giọng riêng; nền tảng không can thiệp kịch bản.</p></div>
      <div class="lp-card"><p><strong>Quyền tắt nhận booking</strong> — theo từng ngành hàng, khi bạn cần nghỉ hoặc đang quá tải.</p></div>
    </div>
  </section>`;

  const rankUp = `<section class="lp-section tint">
    <div class="lp-section-head"><h2>Càng làm tốt, khung giá càng mở</h2></div>
    <div class="lp-section-media lp-reveal" style="max-width:760px">${lpMedia({
      src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785313892/c%C3%A0nh_l%C3%A0m_t%E1%BB%91t_khung_gi%C3%A1_c%C3%A0ng_m%E1%BB%9F_jtq8qd.jpg",
      alt: "Càng làm tốt, khung giá KOC càng mở",
      ratio: "21/9",
    })}</div>
    <div class="lp-box" style="max-width:760px;margin:0 auto">Hoàn thành booking đúng hạn + điểm đánh giá cao + follower tăng = thăng hạng. Mỗi hạng mở khung giá cao hơn, được ưu tiên hiển thị trên marketplace và giảm phí dịch vụ. Lộ trình Nano → Macro hiển thị ngay trên dashboard của bạn.</div>
  </section>`;

  const conditions = `<section class="lp-section">
    <div class="lp-section-head"><h2>Điều kiện tham gia</h2></div>
    <div class="lp-box" style="max-width:760px;margin:0 auto">Từ 18 tuổi, có CCCD; sở hữu ít nhất 1 kênh mạng xã hội đang hoạt động với follower thật (từ hạng Nano ~1.000 follower); cam kết tuân thủ quy định gắn nhãn quảng cáo (#quangcao) theo pháp luật hiện hành.</div>
  </section>`;

  const story = `<section class="lp-section tint">
    <div class="lp-quote" style="max-width:700px;margin:0 auto"><div class="stars">★★★★★</div><p>“Mình ở Buôn Ma Thuột, trước nghĩ booking chỉ dành cho KOC Sài Gòn, Hà Nội. Lên KOC Việt, doanh nghiệp cà phê ngay tỉnh mình tự tìm đến — không phải chào giá một lần nào.” — Hoàng Nam, Nano KOC ngành F&B</p></div>
  </section>`;

  const faq = `<section class="lp-section">
    <div class="lp-section-head"><h2>Câu hỏi thường gặp</h2></div>
    <div style="max-width:720px;margin:0 auto">
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
  </section>`;

  const ctaFinal = lpCtaFinal(
    '<span class="lp-nowrap-desktop">Hồ sơ của bạn có thể nhận booking đầu tiên ngay tuần này.</span>',
    [{ href: "/#/tuyen-koc", label: "Tạo hồ sơ KOC miễn phí — mất 15 phút" }],
  );

  return (
    hero +
    dualIncome +
    process +
    rights +
    rankUp +
    conditions +
    story +
    faq +
    ctaFinal
  );
}

// ---------- 3. Dành cho Doanh nghiệp (/doanh-nghiep) ----------
function pageBusiness() {
  const hero = lpHero({
    eyebrow: "DÀNH CHO DOANH NGHIỆP & NHÃN HÀNG",
    h1: "Booking KOC dễ dàng như đặt xe công nghệ: <br>Chọn người - Hợp giá - Chốt ngay.",
    sub: "Không còn xin báo giá qua ba tầng agency. Trên KOC Việt, mọi KOC niêm yết giá công khai theo ngành hàng, kèm chỉ số hiệu quả thật từ dữ liệu affiliate. Ngân sách 3 triệu hay 3 tỷ đều bắt đầu được ngay hôm nay.",
    ctas: [
      { href: "/#/explore", cls: "grad", label: "Tìm KOC ngay — miễn phí" },
      {
        href: "#contact-form",
        cls: "outline-white",
        label: "Nhận tư vấn chiến dịch lớn",
      },
    ],
    img: {
      src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785312034/booking_koc_d%E1%BB%85_d%C3%A0ng_nh%C6%B0_%C4%91%E1%BA%B7t_xe_jwapy0.jpg",
      alt: "Doanh nghiệp booking KOC dễ dàng như đặt xe",
      ratio: "4/3",
    },
  });

  const pains = `<section class="lp-section">
    <div class="lp-section-head"><h2>Vì sao booking KOC lâu nay khiến bạn mệt?</h2></div>
    <div class="lp-grid-3">
      <div class="lp-card"><p>Báo giá mỗi nơi một kiểu, chênh nhau 3–5 lần cho cùng một KOC.</p></div>
      <div class="lp-card"><p>Chuyển khoản trước, hiệu quả phó mặc may rủi — không ít thương hiệu từng “mất trắng” phí booking.</p></div>
      <div class="lp-card"><p>Follower ảo, tương tác mua — số đẹp nhưng không ra một đơn hàng.</p></div>
    </div>
  </section>`;

  const solutions = `<section class="lp-section tint">
    <div class="lp-section-head"><h2>KOC Việt giải quyết cả ba — bằng thiết kế, không bằng lời hứa</h2></div>
    <div class="lp-grid-3">
      <div class="lp-card"><p><strong>GIÁ NIÊM YẾT</strong> — Bảng giá cố định do KOC tự đặt trong khung giá 4 hạng do nền tảng kiểm soát. Nhìn là biết, không cần hỏi.</p></div>
      <div class="lp-card"><p><strong>VÍ ĐẢM BẢO</strong> — Tiền tạm giữ tại nền tảng, chỉ giải ngân khi bạn xác nhận hoàn thành. Không hài lòng có cơ chế khiếu nại, hoàn tiền.</p></div>
      <div class="lp-card"><p><strong>SỐ LIỆU THẬT</strong> — Mỗi hồ sơ KOC hiển thị tỉ lệ chuyển đổi, đơn hàng tạo ra từ hệ thống affiliate — dữ liệu máy ghi, KOC không tự khai được.</p></div>
    </div>
  </section>`;

  const twoModes = `<section class="lp-section">
    <div class="lp-section-head"><h2>Hai luồng — tuỳ quy mô của bạn</h2></div>
    <div class="lp-grid-2">
      <div class="lp-card lp-card-big"><h3>TỰ BOOKING QUA MARKETPLACE</h3><p>phù hợp SME, cửa hàng, chiến dịch đơn lẻ: lọc KOC theo ngành/tỉnh/hạng/giá, booking trực tiếp theo bảng giá, theo dõi từng bài đăng.</p></div>
      <div class="lp-card lp-card-big"><h3>NETVIET ĐIỀU PHỐI</h3><p>phù hợp chiến dịch lớn nhiều KOC: gửi ngân sách và mục tiêu, đội ngũ NetViet phối hợp hệ thống matching chọn danh sách KOC tối ưu, vận hành trọn gói và báo cáo hợp nhất.</p></div>
    </div>
  </section>`;

  const bookingProcess = `<section class="lp-section tint">
    <div class="lp-section-head"><h2>Booking trong 5 phút</h2></div>
    <div class="lp-section-media lp-reveal">${lpMedia({
      src: "https://quankle2004.quankle2004.workers.dev/videos/booking-process.mp4",
      alt: "Video giới thiệu quy trình booking dành cho doanh nghiệp",
      ratio: "21/9",
      video: true,
    })}</div>
    <div class="lp-steps n5">
      <div class="lp-step"><div class="num">1</div><p><strong>CHỌN KOC</strong><br>Chọn KOC và gói dịch vụ theo bảng giá trên hồ sơ.</p></div>
      <div class="lp-step"><div class="num">2</div><p><strong>GỬI THÔNG TIN SẢN PHẨM</strong><br>Đính kèm link dữ liệu sản phẩm (thông tin, hình ảnh, giá, chính sách bán) — bắt buộc, để KOC thẩm định trước khi nhận. KOC hiểu đúng sản phẩm là một nửa chất lượng content.</p></div>
      <div class="lp-step"><div class="num">3</div><p><strong>THANH TOÁN ĐẢM BẢO</strong><br>Thanh toán vào ví đảm bảo — nhận mã giao dịch và hoá đơn điện tử.</p></div>
      <div class="lp-step"><div class="num">4</div><p><strong>TRIỂN KHAI BOOKING</strong><br>KOC xác nhận, sản xuất và đăng bài kèm link affiliate; bạn theo dõi trạng thái từng bước trên portal.</p></div>
      <div class="lp-step"><div class="num">5</div><p><strong>THEO DÕI &amp; ĐỐI SOÁT</strong><br>Xác nhận hoàn thành — xem báo cáo click/đơn hàng/doanh thu theo từng KOC, xuất file đối soát cho kế toán.</p></div>
    </div>
  </section>`;

  const measure = `<section class="lp-section">
    <div class="lp-section-head"><h2>Mỗi đồng chi ra đều trả lời được: tạo ra bao nhiêu đơn?</h2></div>
    <div class="lp-box" style="max-width:820px;margin:0 auto">Theo dõi tức thời lượt nhấp, đơn hàng và doanh thu của từng KOC, từng bài đăng. So sánh hiệu quả để tiếp tục đầu tư đúng người. Cuối kỳ, hệ thống tự tổng hợp chi phí booking, hoa hồng phát sinh và xuất hoá đơn.</div>
  </section>`;

  const testimonial = `<section class="lp-section tint">
    <div class="lp-quote" style="max-width:700px;margin:0 auto"><div class="stars">★★★★★</div><p>“Chuỗi 6 cửa hàng của tôi ở Cần Thơ chỉ cần KOC miền Tây. Lọc theo tỉnh, booking 5 bạn, chi phí bằng 1/3 báo giá agency mà đơn về nhiều gấp đôi.” — Chủ chuỗi mỹ phẩm miền Tây</p></div>
  </section>`;

  const contact = `<section class="lp-section">${lpContactForm("doanh-nghiep", "Nhận tư vấn miễn phí")}</section>`;

  const ctaFinal = lpCtaFinal(
    '<span class="lp-nowrap-desktop">Chiến dịch KOC đầu tiên của bạn có thể chạy ngay hôm nay.</span>',
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
    testimonial +
    contact +
    ctaFinal
  );
}

// ---------- 4. Marketplace (/marketplace) ----------
function pageMarketplace() {
  const hero = lpHero({
    eyebrow: "MARKETPLACE KOC/KOLs",
    h1: '<span class="lp-nowrap-desktop">Cả một thị trường KOC trong một bộ lọc.</span>',
    sub: "Hàng trăm nghìn hồ sơ KOC được xác minh — lọc theo ngành hàng, tỉnh thành, hạng, mức giá và hiệu quả thật. Tìm đúng gương mặt cho thương hiệu của bạn trong 30 giây.",
    ctas: [{ href: "/#/explore", cls: "grad", label: "Khám phá marketplace" }],
    extra: `<div class="lp-box on-dark" style="margin-top:20px">Tìm theo: ngành hàng · tỉnh/thành · hạng KOC · khoảng giá · đánh giá ★</div>`,
    img: {
      src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785313898/c%E1%BA%A3_m%E1%BB%99t_th%E1%BB%8B_tr%C6%B0%E1%BB%9Dng_koc_trong_b%E1%BB%99_l%E1%BB%8Dc_ynzysz.jpg",
      alt: "Cả một thị trường KOC trong bộ lọc",
      ratio: "4/3",
    },
  });

  const filters = `<section class="lp-section">
    <div class="lp-section-head"><h2>Lọc thông minh — vì mỗi chiến dịch cần một kiểu KOC khác nhau</h2></div>
    <div class="lp-grid-4">
      <div class="lp-card"><p><strong>Ngành hàng</strong> — KOC được phân hồ sơ theo từng lĩnh vực với chỉ số riêng: một KOC làm đẹp giỏi chưa chắc bán đồ gia dụng tốt.</p></div>
      <div class="lp-card"><p><strong>Tỉnh/thành</strong> — bán hàng địa phương thì chọn KOC địa phương: đúng giọng, đúng văn hoá, giao sản phẩm mẫu nhanh.</p></div>
      <div class="lp-card"><p><strong>Hạng &amp; giá</strong> — Nano cho ngân sách gọn và độ tin cậy gần gũi; Macro cho độ phủ lớn. Khung giá từng hạng công khai.</p></div>
      <div class="lp-card"><p><strong>Hiệu quả &amp; đánh giá</strong> — sắp xếp theo tỉ lệ chuyển đổi thật và điểm sao từ doanh nghiệp đã booking.</p></div>
    </div>
  </section>`;

  const profile = `<section class="lp-section tint">
    <div class="lp-section-head"><h2>Mỗi hồ sơ KOC là một bản chào hàng đầy đủ</h2></div>
    <div class="lp-section-media lp-reveal">${lpMedia({
      src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785383806/h%E1%BB%93_s%C6%A1_koc_ihq9lf.jpg",
      alt: "Hồ sơ KOC",
      ratio: "21/9",
    })}</div>
    <div class="lp-box" style="max-width:900px;margin:0 auto">Trang profile công khai của mỗi KOC gồm: kênh MXH đã xác minh và follower thật · chỉ số hiệu quả theo từng ngành hàng (số bài đã làm, tỉ lệ chuyển đổi, doanh thu tạo ra) · bảng giá cố định theo gói · portfolio bài đăng tiêu biểu · đánh giá từ doanh nghiệp · trạng thái đang nhận/tạm ngưng booking. Xem là quyết định được — không cần chờ báo giá.</div>
  </section>`;

  const flow = `<section class="lp-section">
    <div class="lp-section-head"><h2>Từ hồ sơ đến bài đăng — một đường thẳng</h2></div>
    <div class="lp-flow-line" style="max-width:900px;margin:0 auto">Chọn gói trên hồ sơ → điền yêu cầu + link dữ liệu sản phẩm → thanh toán vào ví đảm bảo → KOC thẩm định và xác nhận → sản xuất, đăng bài kèm link affiliate → bạn xác nhận hoàn thành → giải ngân 95% cho KOC, nền tảng giữ 5% phí dịch vụ. Mọi giao dịch có mã riêng, tra cứu được trọn đời.</div>
  </section>`;

  const commit = `<section class="lp-section tint">
    <div class="lp-grid-3">
      <div class="lp-card"><p>✅ 100% KOC đã xác minh danh tính và ký hợp đồng điện tử với nền tảng.</p></div>
      <div class="lp-card"><p>✅ Giá trên hồ sơ là giá cuối — không phát sinh, không phí ẩn ngoài 5% dịch vụ đã bao gồm.</p></div>
      <div class="lp-card"><p>✅ Giao dịch ngoài nền tảng bị cấm theo hợp đồng — để mọi quyền lợi của bạn được ví đảm bảo bảo vệ.</p></div>
    </div>
  </section>`;

  const ctaFinal = lpCtaFinal(
    '<span class="lp-nowrap-desktop">KOC phù hợp nhất với bạn có thể đang ở ngay tỉnh bên cạnh.</span>',
    [{ href: "/#/explore", label: "Bắt đầu lọc và booking" }],
  );

  return hero + filters + profile + flow + commit + ctaFinal;
}

// ---------- 5. AI Clone Avatar (/ai-clone) ----------
function pageAiClone() {
  const hero = lpHero({
    eyebrow: "DỊCH VỤ CỘNG THÊM — DÀNH RIÊNG CHO KOC CỦA KOC VIỆT",
    h1: "Thu nhập vẫn chạy — kể cả ngày bạn không quay video.",
    sub: "Tham gia chương trình AI Clone Avatar: NetViet trực tiếp mang booking đến và sản xuất video hoàn chỉnh bằng công nghệ AI Clone Avatar hình ảnh, giọng nói của bạn. Việc của bạn chỉ là duyệt video và bấm đăng — phí booking và hoa hồng affiliate vẫn về ví như thường.",
    ctas: [
      {
        href: "/#/aiclone",
        cls: "grad",
        label: "Đăng ký tham gia AI Clone Avatar",
      },
    ],
    trust:
      "Bạn duyệt từng video trước khi đăng · Hợp đồng bảo vệ quyền hình ảnh · Huỷ tham gia bất cứ lúc nào",
    img: {
      src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785313898/banner_ai_clone_av_i0rjqx.jpg",
      alt: "Dịch vụ AI Clone Avatar",
      ratio: "4/3",
    },
  });

  const forWho = `<section class="lp-section">
    <div class="lp-section-head"><h2>Chương trình này sinh ra cho bạn, nếu…</h2></div>
    <div class="lp-grid-3">
      <div class="lp-card"><p>✔ Bạn có lượng follower tốt nhưng không đủ thời gian sản xuất content đều đặn.</p></div>
      <div class="lp-card"><p>✔ Bạn muốn nhận thêm booking ngoài năng lực quay dựng hiện tại của mình.</p></div>
      <div class="lp-card"><p>✔ Bạn muốn thử nghiệm công nghệ mới mà vẫn giữ trọn quyền kiểm soát hình ảnh cá nhân.</p></div>
    </div>
  </section>`;

  const how = `<section class="lp-section tint">
    <div class="lp-section-head"><h2>NetViet lo phần nặng — bạn giữ phần quyết</h2></div>
    <div class="lp-section-media lp-reveal">${lpMedia({
      src: "https://quankle2004.quankle2004.workers.dev/videos/ai-clone.mp4",
      alt: "Video giới thiệu quy trình AI Clone Avatar",
      ratio: "21/9",
      video: true,
    })}</div>
    <div class="lp-steps n5">
      <div class="lp-step"><div class="num">1</div><p><strong>ĐĂNG KÝ</strong><br>KOC đã kích hoạt trên nền tảng đăng ký tham gia; ký phụ lục hợp đồng về phạm vi sử dụng hình ảnh/giọng nói (có thời hạn, có giới hạn, đúng Nghị định 13/2023 về dữ liệu cá nhân).</p></div>
      <div class="lp-step"><div class="num">2</div><p><strong>THU MẪU</strong><br>Buổi ghi hình + thu giọng một lần duy nhất để xây dựng bản sao AI của bạn.</p></div>
      <div class="lp-step"><div class="num">3</div><p><strong>NETVIET BOOKING</strong><br>NetViet chủ động tìm và chốt booking phù hợp với hình ảnh của bạn, sau đó sản xuất video thành phẩm bên ngoài hệ thống bằng AI Clone Avatar.</p></div>
      <div class="lp-step"><div class="num">4</div><p><strong>BẠN DUYỆT &amp; ĐĂNG</strong><br>Video giao đến tài khoản của bạn; đồng ý thì tải về đăng kèm link affiliate, chưa ưng thì yêu cầu chỉnh sửa. Không có video nào được đăng khi bạn chưa gật đầu.</p></div>
      <div class="lp-step"><div class="num">5</div><p><strong>NHẬN TIỀN</strong><br>Phí booking + hoa hồng affiliate chảy về ví đúng cơ chế minh bạch của nền tảng.</p></div>
    </div>
  </section>`;

  const control = `<section class="lp-section">
    <div class="lp-section-head"><h2>Ba lớp bảo vệ hình ảnh của bạn</h2></div>
    <div class="lp-grid-3">
      <div class="lp-card"><p><strong>Pháp lý</strong> — phụ lục hợp đồng quy định rõ phạm vi, thời hạn, ngành hàng được phép; ngoài phạm vi là vi phạm hợp đồng.</p></div>
      <div class="lp-card"><p><strong>Quy trình</strong> — bạn duyệt cuối mọi video trước khi công khai, từ chối không cần lý do.</p></div>
      <div class="lp-card"><p><strong>Kỹ thuật</strong> — dữ liệu khuôn mặt, giọng nói lưu kho mã hoá riêng, không chia sẻ cho bên thứ ba, xoá vĩnh viễn khi bạn rời chương trình.</p></div>
    </div>
  </section>`;

  const compare = `<section class="lp-section tint">
    <div class="lp-section-head"><h2>Booking thường vs. Booking AI Clone Avatar</h2></div>
    <div class="lp-box" style="max-width:900px;margin:0 auto">Booking thường: bạn tự tìm nhận booking trên marketplace, tự sản xuất content. Booking AI Clone Avatar: NetViet mang booking đến, video được sản xuất sẵn cho bạn. Giống nhau: cùng cơ chế ví, cùng nhận phí booking + affiliate, cùng quyền từ chối. Hai luồng chạy song song — tham gia AI Clone Avatar không ảnh hưởng việc nhận booking thường.</div>
  </section>`;

  const faq = `<section class="lp-section">
    <div class="lp-section-head"><h2>Câu hỏi thường gặp</h2></div>
    <div style="max-width:720px;margin:0 auto">
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
    h1: "Một mức phí duy nhất: 5%. <br>Mọi thứ khác thuộc về KOC và doanh nghiệp.",
    sub: "KOC Việt không bán quảng cáo, không thu phí thành viên, không phí ẩn. Nền tảng chỉ giữ 5% trên mỗi booking thành công — có giao dịch mới có phí, minh bạch trên từng hoá đơn.",
    img: {
      src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785313899/b%E1%BA%A3ng_gi%C3%A1_u79tuy.jpg",
      alt: "Bảng giá minh bạch của KOC Việt",
      ratio: "4/3",
    },
  });

  const feeMechanism = `<section class="lp-section">
    <div class="lp-section-head"><h2>Tiền đi đường nào, ai nhận bao nhiêu</h2></div>
    <div class="lp-flow-line" style="max-width:900px;margin:0 auto">Doanh nghiệp thanh toán 100% giá trị booking vào ví đảm bảo → hoàn thành: KOC nhận 95%, nền tảng giữ 5% phí dịch vụ → hoa hồng affiliate tính riêng theo chính sách từng chiến dịch, đối soát theo kỳ. Ví dụ: booking 2.500.000đ → KOC nhận 2.375.000đ, phí dịch vụ 125.000đ (đã gồm hoá đơn điện tử).</div>
  </section>`;

  const tiers = `<section class="lp-section tint">
    <div class="lp-section-head"><h2>Khung giá niêm yết theo 4 hạng KOC</h2></div>
    <div class="lp-section-media lp-reveal" style="max-width:640px">${lpMedia({ src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785745847/c%C3%A0ng_l%C3%A0m_t%E1%BB%91t_khun_gi%C3%A1_c%C3%A0ng_m%E1%BB%9F_1_v2awgu.jpg", alt: "Càng làm tốt, khung giá càng mở", ratio: "16/9" })}</div>
    <div class="lp-grid-4">
      <div class="lp-pricing-card"><h3>Nano</h3><p>~1.000–10.000 follower · Khung giá 200.000đ – 800.000đ/bài · Hợp SME địa phương, sản phẩm cần độ tin cậy gần gũi</p></div>
      <div class="lp-pricing-card featured"><span class="badge-popular">Phổ biến nhất</span><h3>Micro</h3><p>10.000–100.000 follower · Khung giá 800.000đ – 3.000.000đ/bài · Cân bằng tốt nhất giữa chi phí và chuyển đổi</p></div>
      <div class="lp-pricing-card"><h3>Mid</h3><p>100.000–500.000 follower · Khung giá 3.000.000đ – 10.000.000đ/bài · Chiến dịch cần độ phủ vùng hoặc toàn quốc</p></div>
      <div class="lp-pricing-card"><h3>Macro</h3><p>500.000+ follower · Khung giá từ 10.000.000đ/bài, thoả thuận trong khung · Ra mắt sản phẩm, chiến dịch thương hiệu lớn</p></div>
    </div>
    <p class="lp-muted" style="text-align:center;max-width:760px;margin:16px auto 0">KOC tự đặt giá cụ thể trong khung của hạng mình, theo từng ngành hàng. Khung giá do nền tảng công bố và điều chỉnh định kỳ theo dữ liệu thị trường — chống phá giá lẫn thổi giá.</p>
  </section>`;

  const tierCriteria = `<section class="lp-section">
    <div class="lp-section-head"><h2>Hạng được tính bằng gì?</h2></div>
    <div class="lp-box" style="max-width:900px;margin:0 auto">Ba nhóm tiêu chí được đánh giá tự động: (1) quy mô — số người theo dõi đã xác minh; (2) chất lượng — tỉ lệ tương tác và khả năng tạo đơn hàng; (3) uy tín — tỉ lệ hoàn thành booking đúng hạn và điểm đánh giá từ doanh nghiệp. Hạng được xem xét mỗi quý; kết quả tốt có thể được xét sớm.</div>
  </section>`;

  const benefits = `<section class="lp-section tint">
    <div class="lp-section-head"><h2>Lên hạng được gì?</h2></div>
    <div class="lp-box" style="max-width:900px;margin:0 auto">Khung giá cao hơn · ưu tiên hiển thị trên kết quả lọc marketplace · giảm phí dịch vụ theo bậc · huy hiệu hạng trên hồ sơ · ưu tiên tham gia chương trình AI Clone Avatar và chiến dịch NetViet điều phối.</div>
  </section>`;

  const payoutPolicy = `<section class="lp-section">
    <div class="lp-section-head"><h2>Chính sách thanh toán</h2></div>
    <div class="lp-box" style="max-width:900px;margin:0 auto">Phí booking giải ngân ngay khi doanh nghiệp xác nhận hoàn thành · hoa hồng affiliate đối soát theo kỳ (công bố lịch trong app) · ngưỡng rút tối thiểu 1.000.000đ · rút về tài khoản ngân hàng/ví điện tử trong 24h làm việc · mọi lệnh rút xác thực OTP 2 lớp.</div>
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

  const quote = `<section class="lp-section">
    <div class="lp-section-head"><h2>Gói cần thoả thuận? Nhận báo giá riêng</h2></div>
    ${lpQuoteCta("Liên hệ nhận báo giá trực tiếp")}
    ${lpContactForm("bang-gia", "Liên hệ nhận báo giá trực tiếp")}
  </section>`;

  return (
    hero +
    feeMechanism +
    tiers +
    tierCriteria +
    benefits +
    payoutPolicy +
    quote +
    ctaFinal
  );
}

// ---------- 7. Cộng đồng tỉnh thành (/cong-dong) ----------
function pageCommunity() {
  const hero = lpHero({
    eyebrow: "CỘNG ĐỒNG KOC 34 TỈNH THÀNH",
    h1: '<span class="lp-nowrap-desktop">Khách hàng ở tỉnh nào — KOC ở tỉnh đó.</span>',
    sub: "KOC Việt tổ chức KOC thành cộng đồng theo từng tỉnh/thành: doanh nghiệp địa phương tìm được người nói đúng giọng khách hàng của mình, KOC tỉnh có sân chơi và người dẫn dắt ngay tại quê nhà.",
    ctas: [
      { href: "/#/explore", cls: "grad", label: "Tìm KOC tại tỉnh của bạn" },
    ],
    img: {
      src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785313892/kh%C3%A1ch_h%C3%A0ng_t%E1%BB%89nh_n%C3%A0o-koc_t%E1%BB%89nh_%C4%91%C3%B3_psuq1g.jpg",
      alt: "Khách hàng tỉnh nào, KOC tỉnh đó",
      ratio: "4/3",
    },
  });

  const whyLocal = `<section class="lp-section">
    <div class="lp-section-head"><h2>Sức mạnh của KOC “cùng quê”</h2></div>
    <div class="lp-section-media lp-reveal">${lpMedia({
      src: "https://res.cloudinary.com/drxum5uxt/image/upload/v1785313891/s%E1%BB%A9c_m%E1%BA%A1nh_c%E1%BB%A7a_koc_c%C3%B9ng_t%E1%BB%89nh_vrclku.jpg",
      alt: "Sức mạnh của KOC cùng tỉnh",
      ratio: "21/9",
    })}</div>
    <div class="lp-grid-3">
      <div class="lp-card"><p><strong>Đúng văn hoá, đúng giọng</strong> — người miền Tây tin lời giới thiệu bằng giọng miền Tây.</p></div>
      <div class="lp-card"><p><strong>Logistics nhanh gọn</strong> — gửi sản phẩm mẫu trong ngày, quay tại điểm bán dễ dàng.</p></div>
      <div class="lp-card"><p><strong>Chi phí hợp lý</strong> — KOC Nano/Micro địa phương cho hiệu quả trên chi phí tốt nhất với cửa hàng, quán ăn, spa, chuỗi bán lẻ tỉnh.</p></div>
    </div>
  </section>`;

  const leader = `<section class="lp-section tint">
    <div class="lp-section-head"><h2>Trưởng nhóm cộng đồng — người kết nối tại từng tỉnh</h2></div>
    <div class="lp-grid-2">
      <div class="lp-box">Mỗi tỉnh có một trưởng nhóm cộng đồng: hỗ trợ xem hồ sơ KOC mới, hướng dẫn người mới nhận booking và tăng hiệu quả bán hàng, tổ chức sự kiện trải nghiệm sản phẩm, đồng thời nhận hoa hồng cộng đồng từ booking phát sinh trong tỉnh.</div>
      <div class="lp-recruit-card">
        <p>Bạn là KOC có uy tín tại địa phương và muốn dẫn dắt cộng đồng? Vị trí trưởng nhóm đang mở tại nhiều tỉnh, với hoa hồng cộng đồng, huy hiệu riêng và ngân sách sự kiện.</p>
        <a href="/#/tuyen-koc" class="btn grad">Ứng tuyển trưởng nhóm tỉnh</a>
      </div>
    </div>
  </section>`;

  const roadmap = `<section class="lp-section">
    <div class="lp-section-head"><h2>Lộ trình phủ 34 tỉnh thành</h2></div>
    <div class="lp-flow-line" style="max-width:900px;margin:0 auto">Giai đoạn 1: 5 thành phố lớn (Hà Nội, TP.HCM, Đà Nẵng, Hải Phòng, Cần Thơ) → Giai đoạn 2: 20 tỉnh trọng điểm theo sức mua TMĐT → Giai đoạn 3: phủ toàn quốc 34 tỉnh → Giai đoạn 4: liên kết vùng, chia sẻ booking giữa các tỉnh lân cận cho chiến dịch vùng miền.</div>
  </section>`;

  const ctaFinal = lpCtaFinal(
    '<span class="lp-nowrap-desktop">Cộng đồng tỉnh bạn đang hình thành — có mặt sớm, lợi thế sớm.</span>',
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
  const hero = `<section class="lp-hero">
    <div class="lp-hero-inner">
      <h1>Mọi câu hỏi về KOC Việt — trả lời thẳng, không vòng vo.</h1>
      <div class="lp-search-box" style="margin-top:20px">
        <input id="lp-faq-search" placeholder="Gõ từ khoá: phí, rút tiền, hợp đồng, hoàn tiền, AI Clone Avatar…">
      </div>
    </div>
  </section>`;

  const faqBody = `<section class="lp-section">
    <div style="max-width:760px;margin:0 auto">
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

  const support = `<section class="lp-section tint">
    <div class="lp-section-head"><h2>Hỗ trợ</h2></div>
    <div class="lp-box" style="max-width:760px;margin:0 auto">Trung tâm hỗ trợ trong app (phản hồi &lt;2h giờ làm việc) · Hotline · Email hỗ trợ · Cộng đồng KOC tỉnh thành · Giờ làm việc 9:00–18:00, thứ 2–7.</div>
  </section>`;

  const contact = `<section class="lp-section">
    <div class="lp-section-head"><h2>Chưa tìm thấy câu trả lời? Gửi yêu cầu hỗ trợ — chúng tôi phản hồi trong 2 giờ làm việc.</h2></div>
    ${lpContactForm("ho-tro", "Gửi yêu cầu hỗ trợ")}
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
  const pageClass = pathname === "/trang-chu" ? " lp-home" : "";
  return `<div class="lp-body${pageClass}">${lpHeader(pathname)}${builder()}${lpFooter()}</div>`;
}
