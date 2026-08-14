// Shared building blocks for the 8 public marketing landing pages (rendered client-side
// into #app for the pathnames in LANDING_ROUTES). Pure presentation only.

export const ROUTES = [
  ["/trang-chu", "Trang chủ"],
  ["/koc", "Dành cho KOC"],
  ["/doanh-nghiep", "Doanh nghiệp"],
  ["/marketplace", "Marketplace"],
  ["/ai-clone", "AI Clone Avatar"],
  ["/bang-gia", "Bảng giá"],
  ["/cong-dong", "Cộng đồng"],
  ["/ho-tro", "Hỗ trợ"],
];

let stopKocActivityTicker = () => {};

export function lpHeader(active) {
  return `<header class="lp-header">
    <div class="lp-header-inner">
      <a href="/trang-chu" class="lp-logo" aria-label="KOC Việt">
        <picture>
          <source media="(min-width:900px)" srcset="https://pub-84c3902526ad4c82b488275b43b39e3a.r2.dev/agent-assets/57813765-aa6e-4c0d-b03c-ebdab260764c/e823ecd8-9fa5-45de-9cec-74c8168e9249.png">
          <source media="(min-width:600px)" srcset="https://pub-84c3902526ad4c82b488275b43b39e3a.r2.dev/agent-assets/57813765-aa6e-4c0d-b03c-ebdab260764c/fab8e04f-8d1d-45a9-b892-d59434ae8f21.png">
          <img src="https://res.cloudinary.com/drxum5uxt/image/upload/v1785989746/iconXoaNen_afhony.png" alt="KOC Việt" decoding="async">
        </picture>
      </a>
      <nav class="lp-nav" id="lp-nav">
        ${ROUTES.map(([href, label]) => `<a href="${href}" class="${active === href ? "active" : ""}">${label}</a>`).join("")}
        <div class="lp-auth-btns">
          <a href="/#/login" class="btn ghost sm">Đăng nhập</a>
          <a href="/#/tuyen-koc" class="btn primary sm">Đăng ký</a>
        </div>
      </nav>
      <button class="lp-burger" id="lp-burger" aria-label="Menu">☰</button>
    </div>
  </header>`;
}

export function lpFooter() {
  return `<footer class="lp-footer">
    <div class="lp-footer-inner">
      <div class="lp-footer-top">
        <div class="lp-footer-brand">
          <img class="lp-footer-logo" src="https://pub-84c3902526ad4c82b488275b43b39e3a.r2.dev/agent-assets/57813765-aa6e-4c0d-b03c-ebdab260764c/e239dc0b-bac4-4110-92a2-0f842e7ec1e1.png" alt="KOC Việt" loading="lazy" decoding="async">
          <p>KOC Việt — nền tảng booking KOC/KOLs thuộc NetViet.</p>
        </div>
        <div class="lp-footer-cols">
          <div class="lp-footer-col">
            <h4>Về chúng tôi</h4>
            <a href="/trang-chu">Về chúng tôi</a>
            <a href="/bang-gia">Bảng giá &amp; Hạng KOC</a>
            <a href="/ai-clone">Dịch vụ AI Clone Avatar</a>
            <a href="/cong-dong">Cộng đồng tỉnh thành</a>
          </div>
          <div class="lp-footer-col">
            <h4>Hỗ trợ</h4>
            <a href="/ho-tro">Câu hỏi thường gặp</a>
            <a href="/ho-tro">Điều khoản sử dụng</a>
            <a href="/ho-tro">Chính sách bảo mật</a>
          </div>
          <div class="lp-footer-col">
            <h4>Liên hệ</h4>
            <p>Hotline &amp; email hỗ trợ</p>
            <p>Giờ làm việc 9:00–18:00</p>
          </div>
        </div>
      </div>
      <div class="lp-footer-bottom">
        <p>© KOC Việt — NetViet. Bảo lưu mọi quyền.</p>
      </div>
    </div>
  </footer>`;
}

export function lpCtaFinal(headline, ctas) {
  return `<section class="lp-cta-final">
    <h2>${headline}</h2>
    <div class="lp-hero-cta">${ctas.map((c) => `<a href="${c.href}" class="btn ${c.ghost ? "ghost" : "navy"} nv-lift">${c.label}</a>`).join("")}</div>
  </section>`;
}

export function lpHero({ eyebrow, h1, sub, ctas, trust, extra, img }) {
  return `<section class="lp-hero${img ? " has-media" : ""}">
    <div class="lp-hero-inner">
      ${eyebrow ? `<span class="lp-eyebrow">${eyebrow}</span>` : ""}
      <h1>${h1}</h1>
      <p class="lp-sub">${sub}</p>
      ${ctas ? `<div class="lp-hero-cta">${ctas.map((c) => `<a href="${c.href}" class="btn ${c.cls} nv-lift">${c.label}</a>`).join("")}</div>` : ""}
      ${trust ? `<p class="lp-trust">${trust}</p>` : ""}
      ${extra || ""}
    </div>
    ${img ? `<div class="lp-hero-media">${lpMedia(img)}</div>` : ""}
  </section>`;
}

// Responsive media frame (image or video) for landing sections. Keeps a fixed aspect ratio,
// lazy-loads, and shows a "thay ảnh/video sau" hint over any placeholder. `spec`:
//   { q:'search terms', src:'https://...', alt:'mô tả', ratio:'16/9'|'4/3'|'1/1', video:true?, label:'chú thích' }
export function lpMedia(spec) {
  if (typeof spec === "string") spec = { q: spec };
  const ratio = spec.ratio || "16/9";
  const label = spec.label || "Khung ảnh minh hoạ — thay ảnh/video thật sau";
  if (spec.src && !spec.video) {
    return `<figure class="lp-media" style="--ratio:${ratio}">
      <div class="lp-media-inner">
        <img src="${escAttr(spec.src)}" alt="${escAttr(spec.alt || "")}" loading="lazy" decoding="async">
      </div>
    </figure>`;
  }
  if (spec.src && spec.video) {
    return `<figure class="lp-media lp-media-video" style="--ratio:${ratio}">
      <div class="lp-media-inner">
        <video src="${escAttr(spec.src)}" controls playsinline preload="metadata" aria-label="${escAttr(spec.alt || "Video minh hoạ")}"></video>
      </div>
    </figure>`;
  }
  if (spec.video) {
    return `<figure class="lp-media lp-media-video" style="--ratio:${ratio}">
      <div class="lp-media-inner" data-media-video="${escAttr(spec.q || "")}">
        <div class="lp-media-ph"><span class="lp-media-icon">▶</span><span class="lp-media-hint">${label}</span></div>
      </div>
    </figure>`;
  }
  return `<figure class="lp-media" style="--ratio:${ratio}">
    <div class="lp-media-inner" data-media-img="${escAttr(spec.q || "")}">
      <div class="lp-media-ph"><span class="lp-media-icon">🖼</span><span class="lp-media-hint">${label}</span></div>
    </div>
  </figure>`;
}

// Alternating image + text feature row.
export function lpFeatureRow({ img, video, q, title, body, reverse }) {
  return `<div class="lp-feature-row${reverse ? " reverse" : ""} lp-reveal">
    <div class="lp-feature-media">${lpMedia({ q: q || img, video, ratio: "4/3" })}</div>
    <div class="lp-feature-text">
      ${title ? `<h3>${title}</h3>` : ""}
      ${body ? `<p>${body}</p>` : ""}
    </div>
  </div>`;
}

function escAttr(s) {
  return String(s).replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function lpAccordion(items, opts) {
  const groupTitle = opts && opts.groupTitle;
  return `${groupTitle ? `<div class="lp-faq-group-title">${groupTitle}</div>` : ""}
  ${items
    .map(
      ([q, a]) => `<div class="lp-acc-item">
      <div class="lp-acc-q">${q}</div>
      <div class="lp-acc-a"><p>${a}</p></div>
    </div>`,
    )
    .join("")}`;
}

// Red "Liên hệ nhận báo giá trực tiếp" CTA (brand red #B91C1C) — additive, links to contact form.
export function lpQuoteCta(label) {
  return `<div class="lp-quote-cta-wrap">
    <button type="button" class="lp-quote-cta" data-quote-cta>${label || "Liên hệ nhận báo giá trực tiếp"}</button>
  </div>`;
}

export function lpContactForm(idSuffix, title) {
  return `<div class="lp-contact-wrap" id="contact-form">
    <div class="lp-card">
      <h3 style="margin-bottom:14px">${title}</h3>
      <form class="lp-contact-form" data-id="${idSuffix}">
        <div class="field"><label>Họ tên</label><input required placeholder="Nguyễn Văn A"></div>
        <div class="field"><label>Số điện thoại</label><input required placeholder="09xx xxx xxx"></div>
        <div class="field"><label>Tên doanh nghiệp (nếu có)</label><input placeholder="Công ty / thương hiệu"></div>
        <div class="field"><label>Nội dung cần tư vấn</label><textarea rows="3" placeholder="Bạn cần hỗ trợ điều gì?"></textarea></div>
        <button type="submit" class="btn primary" style="width:100%">Gửi yêu cầu</button>
        <p class="lp-muted" style="text-align:center">Yêu cầu được ghi nhận và gửi mô phỏng tới đội ngũ NetViet (demo).</p>
      </form>
      <div class="lp-contact-success">
        <div class="ico">✅</div>
        <h3>Đã ghi nhận yêu cầu của bạn!</h3>
        <p class="muted">Đội ngũ NetViet sẽ liên hệ tư vấn trong thời gian sớm nhất (demo — mô phỏng gửi email).</p>
      </div>
    </div>
  </div>`;
}

// Attach interactive behavior after a landing page's HTML has been injected into `root`.
export function bindLandingEvents(root) {
  stopKocActivityTicker();
  stopKocActivityTicker = bindKocActivityTicker(root);

  const burger = root.querySelector("#lp-burger");
  const nav = root.querySelector("#lp-nav");
  if (burger && nav) {
    burger.addEventListener("click", () => nav.classList.toggle("open"));
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => nav.classList.remove("open"));
    });
  }
  root.querySelectorAll(".lp-acc-q").forEach((q) => {
    q.addEventListener("click", () => q.parentElement.classList.toggle("open"));
  });
  const search = root.querySelector("#lp-faq-search");
  if (search) {
    search.addEventListener("input", () => {
      const kw = search.value.trim().toLowerCase();
      root.querySelectorAll(".lp-acc-item").forEach((item) => {
        const txt = item.textContent.toLowerCase();
        item.style.display = !kw || txt.includes(kw) ? "" : "none";
      });
    });
  }
  root.querySelectorAll(".lp-contact-form").forEach((f) => {
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputs = f.querySelectorAll("input, textarea");
      const [name, phone, company, need] = [
        inputs[0],
        inputs[1],
        inputs[2],
        inputs[3],
      ];
      // best-effort persist as a real lead; UI success shows regardless
      try {
        await fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name?.value || "",
            phone: phone?.value || "",
            company: company?.value || "",
            need: need?.value || "",
            source: "landing-" + (f.dataset.id || "contact"),
          }),
        });
      } catch (_) {}
      f.style.display = "none";
      const ok = f.parentElement.querySelector(".lp-contact-success");
      if (ok) ok.style.display = "block";
    });
  });
  // Red quote CTA buttons — smooth-scroll to the contact form, or route to it.
  root.querySelectorAll("[data-quote-cta]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const form = root.querySelector("#contact-form");
      if (form) form.scrollIntoView({ behavior: "smooth", block: "center" });
      else location.href = "/ho-tro#contact-form";
    });
  });

  // Intercept landing navbar/footer link clicks for instant 0ms SPA transitions
  root.querySelectorAll("a[href^='/']").forEach((a) => {
    const href = a.getAttribute("href");
    if (href && !href.startsWith("/#") && !href.startsWith("//") && !a.hasAttribute("download")) {
      a.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const targetPath = href.split("#")[0];
        if (ROUTES.some(([path]) => path === targetPath)) {
          e.preventDefault();
          if (location.pathname !== targetPath) {
            history.pushState(null, "", href);
            window.dispatchEvent(new Event("popstate"));
          }
          const hash = href.split("#")[1];
          if (hash) {
            const targetEl = root.querySelector("#" + hash);
            if (targetEl) targetEl.scrollIntoView({ behavior: "smooth" });
          } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }
      });
    }
  });

  // Scroll-reveal (fade/slide-in) for sections & feature rows — light, no dependency.
  const revealEls = root.querySelectorAll(
    ".lp-section, .lp-hero, .lp-reveal, .lp-stat-strip, .lp-cta-final",
  );
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("lp-in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    revealEls.forEach((el) => {
      el.classList.add("lp-reveal-init");
      io.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add("lp-in"));
  }

  // Lazy-load real stock imagery/video into media frames (Unsplash / Pexels via platform).
  loadLandingMedia(root);
}

function bindKocActivityTicker(root) {
  const listContainer = root.querySelector("[data-koc-activity-list]");
  const singleCard = root.querySelector("[data-koc-activity]");
  if (!listContainer && !singleCard) return () => {};

  const activityTypes = new Set([
    "registered",
    "booking_received",
    "booking_completed",
  ]);

  const controller = new AbortController();
  let activities = [];
  let startIndex = 0;
  let rotateTimer = 0;
  let pollTimer = 0;
  let pointerPaused = false;
  let focusPaused = false;
  let stopped = false;

  const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const stop = () => {
    if (stopped) return;
    stopped = true;
    controller.abort();
    clearInterval(rotateTimer);
    clearInterval(pollTimer);
  };

  const relativeTime = (occurredAt) => {
    const occurredDate = new Date(Number(occurredAt) * 1000);
    if (Number.isNaN(occurredDate.getTime())) return "vừa xong";
    const seconds = Math.max(0, Math.floor((Date.now() - occurredDate.getTime()) / 1000));
    if (seconds < 50) return "vừa xong";
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(seconds / 3600);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(seconds / 86400)} ngày trước`;
  };

  const render = () => {
    const activeEl = listContainer || singleCard;
    if (!activities.length || stopped || !activeEl || !activeEl.isConnected) {
      if (activeEl && !activeEl.isConnected) stop();
      return;
    }

    const copyMap = {
      registered: ["KOC MỚI", "đã đăng ký tham gia hệ thống"],
      booking_received: ["BOOKING MỚI", "đã nhận booking mới"],
      booking_completed: ["HOÀN THÀNH", "đã hoàn tất hợp đồng booking"],
    };

    if (listContainer) {
      // Display 3 continuous activity rows in the dedicated section list
      const visibleCount = Math.min(3, activities.length);
      const rowsHtml = [];
      for (let i = 0; i < visibleCount; i++) {
        const item = activities[(startIndex + i) % activities.length];
        const [label, actionText] = copyMap[item.type] || ["CẬP NHẬT", "hoạt động mới"];
        const timeStr = relativeTime(item.occurredAt - i * 45);
        rowsHtml.push(`
          <div class="lp-activity-row" data-activity-type="${item.type}">
            <span class="lp-activity-badge">${label}</span>
            <span class="lp-activity-text"><strong>${esc(item.name)}</strong> ${actionText}</span>
            <span class="lp-activity-time">${timeStr}</span>
          </div>
        `);
      }
      listContainer.innerHTML = rowsHtml.join("");
    } else if (singleCard) {
      const item = activities[startIndex % activities.length];
      const text = singleCard.querySelector("[data-koc-activity-text]");
      const label = singleCard.querySelector("[data-koc-activity-label]");
      const [labelText, actionText] = copyMap[item.type] || ["CẬP NHẬT", "hoạt động mới"];
      singleCard.dataset.activityType = item.type;
      if (label) label.textContent = labelText;
      if (text) text.textContent = `${item.name} ${actionText} ${relativeTime(item.occurredAt)}`;
      singleCard.hidden = false;
    }
  };

  const rotate = () => {
    if (!activities.length || stopped || pointerPaused || focusPaused) return;
    const activeEl = listContainer || singleCard;
    if (!activeEl || !activeEl.isConnected) {
      stop();
      return;
    }
    startIndex = (startIndex + 1) % activities.length;
    render();
  };

  const refresh = async () => {
    const activeEl = listContainer || singleCard;
    if (stopped || !activeEl || !activeEl.isConnected) {
      stop();
      return;
    }
    try {
      const response = await fetch("/api/public/koc-activity", {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Không tải được hoạt động KOC");
      const payload = await response.json();
      const nextActivities = Array.isArray(payload.activities)
        ? payload.activities.filter(
            (item) =>
              item &&
              item.name &&
              activityTypes.has(item.type) &&
              Number.isFinite(Number(item.occurredAt)),
          )
        : [];
      if (!nextActivities.length) {
        activities = [];
        if (listContainer) listContainer.innerHTML = "";
        if (singleCard) singleCard.hidden = true;
        return;
      }
      activities = nextActivities;
      render();
    } catch (error) {
      if (error?.name !== "AbortError" && !activities.length) {
        if (listContainer) listContainer.innerHTML = "";
        if (singleCard) singleCard.hidden = true;
      }
    }
  };

  const targetEl = listContainer || singleCard;
  targetEl.addEventListener("mouseenter", () => { pointerPaused = true; });
  targetEl.addEventListener("mouseleave", () => { pointerPaused = false; });
  targetEl.addEventListener("focusin", () => { focusPaused = true; });
  targetEl.addEventListener("focusout", () => { focusPaused = false; });

  refresh();
  rotateTimer = window.setInterval(rotate, 3200);
  pollTimer = window.setInterval(refresh, 18000);
  return stop;
}

// Populate .lp-media placeholders with real stock photos/videos when they scroll near view.
function loadLandingMedia(root) {
  const frames = root.querySelectorAll("[data-media-img],[data-media-video]");
  if (!frames.length) return;
  const fill = async (inner) => {
    if (inner.dataset.loaded) return;
    inner.dataset.loaded = "1";
    const isVid = inner.hasAttribute("data-media-video");
    const q =
      (isVid
        ? inner.getAttribute("data-media-video")
        : inner.getAttribute("data-media-img")) || "business marketing";
    try {
      if (isVid) {
        const r = await fetch(
          "/__nexrall/vid?q=" +
            encodeURIComponent(q) +
            "&n=1&orientation=landscape",
        );
        const { videos } = await r.json();
        const v = videos && videos[0];
        if (!v) return;
        inner.innerHTML = `<video src="${v.url}" poster="${v.thumb}" muted loop playsinline preload="none" controls></video>`;
      } else {
        const r = await fetch(
          "/__nexrall/img?q=" + encodeURIComponent(q) + "&n=1",
        );
        const { photos } = await r.json();
        const p = photos && photos[0];
        if (!p) return;
        inner.innerHTML =
          `<img src="${p.url}" alt="${(p.alt || q).replace(/"/g, "")}" loading="lazy" decoding="async">` +
          `<a class="lp-media-credit" href="${p.creditUrl}" target="_blank" rel="noopener">${p.credit || ""}</a>`;
      }
    } catch (_) {
      /* keep placeholder on failure */
    }
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            fill(en.target);
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "200px" },
    );
    frames.forEach((f) => io.observe(f));
  } else {
    frames.forEach(fill);
  }
}
