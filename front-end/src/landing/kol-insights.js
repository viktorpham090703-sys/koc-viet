const SOURCE_ASSET = "/images/kol-rankings";

const socialRanking = [
  ["Sơn Tùng M-TP", 280629, `${SOURCE_ASSET}/social/son-tung.jpg`],
  ["Hoa Hậu Hương Giang", 109486, `${SOURCE_ASSET}/social/huong-giang.jpg`],
  ["HIEUTHUHAI", 32691, `${SOURCE_ASSET}/social/hieuthuhai.jpg`],
  ["Binz", 28823, `${SOURCE_ASSET}/social/binz.jpg`],
  ["SOOBIN", 27023, `${SOURCE_ASSET}/social/soobin.jpg`],
  ["RHYDER", 23370, `${SOURCE_ASSET}/social/rhyder.jpg`],
  ["Nguyễn Văn Chung", 23265, `${SOURCE_ASSET}/social/nguyen-van-chung.jpg`],
  ["Quang Hùng MasterD", 23094, `${SOURCE_ASSET}/social/quang-hung.jpg`],
  ["Bùi Công Nam", 22770, `${SOURCE_ASSET}/social/bui-cong-nam.jpg`],
  ["CongB", 20761, `${SOURCE_ASSET}/social/congb.jpg`],
].map(([name, score, image], index) => ({ rank: index + 1, name, score, image }));

function featuredCard(item) {
  return `<a class="lp-kol-featured lp-kol-featured-${item.rank}" href="/#/explore?search=${encodeURIComponent(item.name)}">
    <img src="${item.image}" data-kol-avatar="${item.name}" data-avatar-fallback="${item.image}" alt="${item.name}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=this.dataset.avatarFallback||'/default-avatar.svg'">
    <span class="lp-kol-rank-badge">★ Top ${item.rank}</span>
    <span class="lp-kol-featured-shade" aria-hidden="true"></span>
    <span class="lp-kol-featured-copy"><strong>${item.name}</strong><small>${item.field}</small><b>${item.fanbase}</b></span>
  </a>`;
}

function rankingListItem(item) {
  return `<a class="lp-kol-rank-row" href="/#/explore?search=${encodeURIComponent(item.name)}">
    <span class="lp-kol-rank-number">${item.rank}</span>
    <img src="${item.image}" data-kol-avatar="${item.name}" data-avatar-fallback="${item.image}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=this.dataset.avatarFallback||'/default-avatar.svg'">
    <span class="lp-kol-rank-person"><strong>${item.name}</strong><small>${item.field}</small></span>
    <span class="lp-kol-rank-metric"><small>Người theo dõi</small><strong>${item.fanbase}</strong></span>
  </a>`;
}

function chartBars(items = socialRanking) {
  const max = Math.max(...items.map((item) => item.score), 1);
  return items.map((item, index) => {
    // Reserve enough headroom for the avatar and score above the tallest bar.
    const height = 15 + (item.score / max) * 63;
    return `<li class="lp-bsi-chart-item" style="--bar-height:${height}%;--bar-delay:${index * 65}ms">
      <span class="lp-bsi-bar-stage"><span class="lp-bsi-meta"><img src="${item.image}" data-kol-avatar="${item.name}" data-avatar-fallback="${item.image}" alt="${item.name}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=this.dataset.avatarFallback||'/default-avatar.svg'"><b>${item.score.toLocaleString("vi-VN")}</b></span><span class="lp-bsi-bar"></span></span>
      <strong title="${item.name}">${item.name}</strong>
    </li>`;
  }).join("");
}

export function renderHomeKolInsights() {
  return `<section class="lp-kol-insights lp-reveal" aria-label="Bảng xếp hạng KOL và chỉ số ảnh hưởng">
    <div class="lp-kol-insights-inner">
      <article class="lp-kol-ranking-card" data-kol-ranking>
        <header class="lp-kol-ranking-head">
          <div><span class="lp-kol-section-label">GƯƠNG MẶT NỔI BẬT</span><h2>KOL đang được chú ý</h2></div>
        </header>
        <p class="lp-kol-snapshot">Dữ liệu hồ sơ KOL trên KOC Việt</p>
        <div class="lp-kol-featured-grid" data-kol-featured aria-live="polite"></div>
        <div class="lp-kol-rank-list" data-kol-rank-list tabindex="0" aria-label="Danh sách KOL nổi bật"></div>
        <p class="lp-kol-ranking-status" data-kol-ranking-status>Đang tải danh sách KOL...</p>
      </article>

      <article class="lp-bsi-section">
        <header class="lp-bsi-heading"><h2>Top10 <span>Chỉ số ảnh hưởng</span> trên Social Media</h2></header>
        <div class="lp-bsi-layout">
          <div class="lp-bsi-chart-card">
            <div class="lp-bsi-chart-title"><span>TOP10 NGƯỜI ẢNH HƯỞNG</span><h3>10 NGƯỜI ẢNH HƯỞNG NỔI BẬT TRÊN SOCIAL MEDIA</h3><p>Tháng 05/2026</p></div>
            <div class="lp-bsi-scroll" tabindex="0" role="region" aria-label="Biểu đồ Top 10 chỉ số ảnh hưởng, cuộn ngang để xem đầy đủ"><div class="lp-bsi-chart-frame"><strong class="lp-bsi-axis">CHỈ SỐ ẢNH HƯỞNG XÃ HỘI (BSI)</strong><ol class="lp-bsi-chart" data-bsi-chart>${chartBars()}</ol></div></div>
          </div>
        </div>
        <p class="lp-bsi-source">Được cung cấp dữ liệu từ <strong>Buzzmetrics BSI</strong></p>
      </article>
    </div>
  </section>`;
}

export function bindHomeKolInsights(root) {
  const ranking = root.querySelector("[data-kol-ranking]");
  fetch("/api/public/kols", { headers: { Accept: "application/json" } })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
    .then(({ kols = [] }) => {
      if (!ranking) return;
      // Keep the landing ranking concise while still presenting a complete
      // Top 10: three featured cards and seven supporting profiles.
      const items = kols.slice(0, 10).map((kol, index) => ({
        rank: index + 1,
        name: String(kol.name || "KOL"),
        field: String(kol.field || "KOL / Nghệ sĩ"),
        fanbase: String(kol.fanbase || "Đang cập nhật"),
        image: String(kol.avatar || "/default-avatar.svg"),
      }));
      const featured = items.length >= 3 ? [items[1], items[0], items[2]] : items;
      const status = ranking.querySelector("[data-kol-ranking-status]");
      ranking.querySelector("[data-kol-featured]").innerHTML = featured.map(featuredCard).join("");
      ranking.querySelector("[data-kol-rank-list]").innerHTML = items.slice(3).map(rankingListItem).join("");
      if (status) {
        status.textContent = items.length ? "" : "Chưa có hồ sơ KOL đang hoạt động.";
        status.hidden = items.length > 0;
      }
    })
    .catch(() => {
      const status = ranking?.querySelector("[data-kol-ranking-status]");
      if (status) status.textContent = "Chưa tải được danh sách KOL. Vui lòng thử lại sau.";
    });

}
