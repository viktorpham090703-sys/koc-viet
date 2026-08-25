// Shared building blocks for the 8 public marketing landing pages (rendered client-side
// into #app for the pathnames in LANDING_ROUTES). Pure presentation only.
import {
  ACTIVITY_CATEGORY_CYCLE,
  industryIconSvg,
} from "./industry-icons.js";

export const ROUTES = [
  ["/trang-chu", "Trang chủ"],
  ["/koc", "Dành cho KOC"],
  ["/doanh-nghiep", "Doanh nghiệp"],
  ["/marketplace", "Khám phá KOC"],
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
          <source media="(max-width: 768px)" srcset="https://res.cloudinary.com/drxum5uxt/image/upload/v1785989746/iconXoaNen_afhony.png">
          <source media="(max-width: 1024px)" srcset="https://res.cloudinary.com/drxum5uxt/image/upload/v1787124004/ChatGPT_Image_13_04_51_20_thg_7__2026__3_-removebg-preview_olgnwa.png">
          <img src="https://res.cloudinary.com/drxum5uxt/image/upload/v1785865656/LogoDaXoaNen_r82hx2.png" alt="KOC Việt" decoding="async" fetchpriority="high">
        </picture>
      </a>
      <nav class="lp-nav" id="lp-nav">
        ${ROUTES.map(([href, label]) => `<a href="${href}" class="${active === href ? "active" : ""}">${label}</a>`).join("")}
        <div class="lp-auth-btns">
          <a href="/#/tuyen-koc" class="btn ghost sm">Đăng ký</a>
          <a href="#/login" class="btn primary sm">Đăng nhập</a>
        </div>
      </nav>
      <button class="lp-burger" id="lp-burger" type="button" aria-label="Mở trình đơn" aria-controls="lp-nav" aria-expanded="false">☰</button>
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
    </div>
    <div class="lp-footer-bottom-wrap">
      <div class="lp-footer-bottom">
        <p>© KOC Việt — NetViet. Bảo lưu mọi quyền.</p>
      </div>
    </div>
  </footer>`;
}

export function lpCtaFinal(headline, ctas) {
  return `<section class="lp-cta-final">
    <div class="lp-cta-final-inner">
      <h2>${headline}</h2>
      <div class="lp-hero-cta">${ctas.map((c) => `<a href="${c.href}" class="btn ${c.ghost ? "ghost" : "navy"} nv-lift">${c.label}</a>`).join("")}</div>
    </div>
  </section>`;
}

export function lpHero({
  eyebrow,
  h1,
  sub,
  ctas,
  trust,
  extra,
  img,
  waveFill = "#ffffff",
  className = "",
}) {
  return `<section class="lp-hero-home ${escAttr(className)}">
    <div class="lp-hero-home-inner">
      <div class="lp-hero-content">
        ${
          eyebrow
            ? `<div class="lp-hero-eyebrow-wrap">
          <span class="lp-hero-eyebrow-dash"></span>
          <span class="lp-hero-eyebrow">${eyebrow}</span>
        </div>`
            : ""
        }
        <h1 class="lp-hero-title">${h1}</h1>
        <p class="lp-hero-sub">${sub}</p>
        ${
          ctas && ctas.length
            ? `<div class="lp-hero-cta">
          ${ctas.map((c) => `<a href="${c.href}" class="btn ${c.cls === "outline-white" || c.ghost ? "btn-secondary" : "btn-primary"} nv-lift">${c.label}</a>`).join("")}
        </div>`
            : ""
        }
        ${
          trust
            ? `<div class="lp-hero-trust-bar">${trust
                .split("·")
                .map((t) => `<span class="pill">${t.trim()}</span>`)
                .join("")}</div>`
            : ""
        }
        ${extra || ""}
      </div>
      ${
        img
          ? `<div class="lp-hero-visual">
        <div class="lp-hero-brush-arc" aria-hidden="true"></div>
        <img src="${escAttr(img.src)}" alt="${escAttr(img.alt || "")}" fetchpriority="high" decoding="async">
      </div>`
          : ""
      }
    </div>
    <div class="lp-hero-wave-divider" aria-hidden="true">
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" fill="${waveFill}">
        <path d="M0,45 C280,75 560,18 840,42 C1080,62 1280,72 1440,32 L1440,90 L0,90 Z"></path>
      </svg>
    </div>
  </section>`;
}

// Responsive media frame (image or video) for landing sections.
export function lpVideoPlayer({ src, poster, alt = "Video giới thiệu" }) {
  return `<div class="lp-desk-video-card">
    <video src="${escAttr(src)}" poster="${escAttr(poster || "")}" playsinline preload="metadata" aria-label="${escAttr(alt)}"></video>
    <button type="button" class="lp-video-play-btn" aria-label="Phát video">
      <span>▶</span>
    </button>
    <div class="lp-video-bottom-bar">
      <div class="lp-video-progress-wrap" aria-label="Thanh thời gian video">
        <div class="lp-video-progress-track"></div>
        <div class="lp-video-progress-played">
          <span class="lp-video-progress-thumb"></span>
        </div>
      </div>
      <div class="lp-video-controls-row">
        <div class="lp-video-ctrls-left">
          <button type="button" class="lp-ctrl-btn lp-ctrl-play-pause" aria-label="Phát/Tạm dừng">
            <span class="lp-icon-play">▶</span>
            <span class="lp-icon-pause" style="display:none">❚❚</span>
          </button>
          <span class="lp-video-time">0:00 / 0:00</span>
        </div>
        <div class="lp-video-ctrls-right">
          <button type="button" class="lp-ctrl-btn lp-ctrl-volume" aria-label="Bật/Tắt âm lượng">
            <span class="lp-icon-vol">🔊</span>
            <span class="lp-icon-muted" style="display:none">🔇</span>
          </button>
          <button type="button" class="lp-ctrl-btn lp-ctrl-fullscreen" aria-label="Toàn màn hình">
            <span>⛶</span>
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

export function lpMedia(spec) {
  if (typeof spec === "string") spec = { q: spec };
  const ratio = spec.ratio || "16/9";
  const label = spec.label || "Khung ảnh minh hoạ — thay ảnh/video thật sau";
  if (spec.src && spec.video) {
    return lpVideoPlayer({ src: spec.src, poster: spec.poster, alt: spec.alt });
  }
  if (spec.src && !spec.video) {
    return `<figure class="lp-media" style="--ratio:${ratio}">
      <div class="lp-media-inner">
        <img src="${escAttr(spec.src)}" alt="${escAttr(spec.alt || "")}" loading="${spec.priority ? "eager" : "lazy"}"${spec.priority ? ' fetchpriority="high"' : ""} decoding="async">
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
        <p class="lp-muted" style="text-align:center">Yêu cầu được ghi nhận và gửi mô phỏng tới đội ngũ NetViet.</p>
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
    const setMenuOpen = (isOpen) => {
      nav.classList.toggle("open", isOpen);
      burger.setAttribute("aria-expanded", String(isOpen));
      burger.setAttribute("aria-label", isOpen ? "Đóng trình đơn" : "Mở trình đơn");
    };
    burger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setMenuOpen(!nav.classList.contains("open"));
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false));
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
    if (
      href &&
      !href.startsWith("/#") &&
      !href.startsWith("//") &&
      !a.hasAttribute("download")
    ) {
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

  // Interactive video players
  root.querySelectorAll(".lp-desk-video-card").forEach((card) => {
    const videoEl = card.querySelector("video");
    const videoPlayBtn = card.querySelector(".lp-video-play-btn");
    const timeDisplay = card.querySelector(".lp-video-time");
    const progressWrap = card.querySelector(".lp-video-progress-wrap");
    const playedBar = card.querySelector(".lp-video-progress-played");
    const ctrlPlayBtn =
      card.querySelector(".lp-ctrl-play-pause") ||
      card.querySelector("#lp-ctrl-play-pause");
    const ctrlVolBtn =
      card.querySelector(".lp-ctrl-volume") ||
      card.querySelector("#lp-ctrl-volume");
    const ctrlFsBtn =
      card.querySelector(".lp-ctrl-fullscreen") ||
      card.querySelector("#lp-ctrl-fullscreen");

    if (!videoEl) return;
    let isSeeking = false;

    const formatTime = (sec) => {
      if (isNaN(sec) || sec < 0) return "0:00";
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60)
        .toString()
        .padStart(2, "0");
      return `${m}:${s}`;
    };

    const updatePlayState = (isPlaying) => {
      card.classList.toggle("is-playing", isPlaying);
      if (videoPlayBtn) {
        videoPlayBtn.style.opacity = isPlaying ? "0" : "1";
        videoPlayBtn.style.pointerEvents = isPlaying ? "none" : "auto";
      }
      if (ctrlPlayBtn) {
        const iconPlay = ctrlPlayBtn.querySelector(".lp-icon-play");
        const iconPause = ctrlPlayBtn.querySelector(".lp-icon-pause");
        if (iconPlay) iconPlay.style.display = isPlaying ? "none" : "inline";
        if (iconPause) iconPause.style.display = isPlaying ? "inline" : "none";
      }
    };

    const togglePlay = (e) => {
      if (e) e.stopPropagation();
      if (videoEl.paused) {
        videoEl.play().catch(() => {});
        updatePlayState(true);
      } else {
        videoEl.pause();
        updatePlayState(false);
      }
    };

    if (videoPlayBtn) videoPlayBtn.addEventListener("click", togglePlay);
    if (ctrlPlayBtn) ctrlPlayBtn.addEventListener("click", togglePlay);
    videoEl.addEventListener("click", togglePlay);
    videoEl.addEventListener("play", () => updatePlayState(true));
    videoEl.addEventListener("pause", () => updatePlayState(false));
    videoEl.addEventListener("ended", () => updatePlayState(false));

    videoEl.addEventListener("loadedmetadata", () => {
      if (timeDisplay && !isNaN(videoEl.duration)) {
        timeDisplay.textContent = `${formatTime(videoEl.currentTime)} / ${formatTime(videoEl.duration)}`;
      }
    });

    videoEl.addEventListener("timeupdate", () => {
      if (!isSeeking && !isNaN(videoEl.duration) && videoEl.duration > 0) {
        const pct = (videoEl.currentTime / videoEl.duration) * 100;
        if (playedBar) playedBar.style.width = pct + "%";
        if (timeDisplay) {
          timeDisplay.textContent = `${formatTime(videoEl.currentTime)} / ${formatTime(videoEl.duration)}`;
        }
      }
    });

    // Interactive timeline scrubbing & seeking
    if (progressWrap) {
      const seekTo = (clientX) => {
        const rect = progressWrap.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const pct = Math.max(0, Math.min(1, clickX / rect.width));
        const dur = videoEl.duration;
        if (!isNaN(dur) && dur > 0) {
          videoEl.currentTime = pct * dur;
          if (playedBar) playedBar.style.width = pct * 100 + "%";
          if (timeDisplay) {
            timeDisplay.textContent = `${formatTime(videoEl.currentTime)} / ${formatTime(dur)}`;
          }
        }
      };

      progressWrap.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        isSeeking = true;
        progressWrap.setPointerCapture(e.pointerId);
        seekTo(e.clientX);
      });

      progressWrap.addEventListener("pointermove", (e) => {
        if (isSeeking) {
          e.stopPropagation();
          seekTo(e.clientX);
        }
      });

      const stopSeek = (e) => {
        if (isSeeking) {
          e.stopPropagation();
          isSeeking = false;
          try {
            progressWrap.releasePointerCapture(e.pointerId);
          } catch (_) {}
        }
      };

      progressWrap.addEventListener("pointerup", stopSeek);
      progressWrap.addEventListener("pointercancel", stopSeek);
      progressWrap.addEventListener("click", (e) => {
        e.stopPropagation();
        seekTo(e.clientX);
      });
    }

    if (ctrlVolBtn) {
      ctrlVolBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        videoEl.muted = !videoEl.muted;
        const iconVol = ctrlVolBtn.querySelector(".lp-icon-vol");
        const iconMuted = ctrlVolBtn.querySelector(".lp-icon-muted");
        if (iconVol) iconVol.style.display = videoEl.muted ? "none" : "inline";
        if (iconMuted)
          iconMuted.style.display = videoEl.muted ? "inline" : "none";
      });
    }

    if (ctrlFsBtn) {
      ctrlFsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement) {
          if (card.requestFullscreen) {
            card.requestFullscreen().catch(() => {});
          } else if (videoEl.webkitEnterFullscreen) {
            videoEl.webkitEnterFullscreen();
          }
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        }
      });
    }
  });

  // Scroll-reveal (fade/slide-in) for sections & feature rows — light, no dependency.
  const revealEls = root.querySelectorAll(
    ".lp-section, .lp-hero, .lp-reveal, .lp-stat-strip, .lp-cta-final, .lp-campaign-desk-section, .lp-split-section",
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
  let activities = [
    {
      name: "Kim L.",
      avatar: "",
      type: "booking_received",
      occurredAt: Math.floor(Date.now() / 1000) - 960,
      text: "Nhận booking review sản phẩm mới và lên lịch đăng nội dung",
      category: "Ẩm thực & F&B",
      dot: "green",
    },
    {
      name: "Ngọc A.",
      avatar: "",
      type: "booking_received",
      occurredAt: Math.floor(Date.now() / 1000) - 1020,
      text: "Bắt đầu chiến dịch ra mắt bộ sưu tập mùa mới",
      category: "Thời trang",
      dot: "red",
    },
    {
      name: "Minh T.",
      avatar: "",
      type: "registered",
      occurredAt: Math.floor(Date.now() / 1000) - 1560,
      text: "Hoàn tất hồ sơ, bảng giá và sẵn sàng nhận booking",
      category: "Làm đẹp",
      dot: "orange",
    },
    {
      name: "Lan H.",
      avatar: "",
      type: "booking_completed",
      occurredAt: Math.floor(Date.now() / 1000) - 3600,
      text: "Nhận lời mời trải nghiệm sản phẩm chăm sóc gia đình",
      category: "Mẹ & Bé",
      dot: "green",
    },
    {
      name: "Quang D.",
      avatar: "",
      type: "booking_completed",
      occurredAt: Math.floor(Date.now() / 1000) - 3600,
      text: "Đã duyệt nội dung cho chiến dịch thiết bị thông minh",
      category: "Công nghệ",
      dot: "blue",
    },
    {
      name: "Huyền N.",
      avatar: "",
      type: "booking_received",
      occurredAt: Math.floor(Date.now() / 1000) - 4200,
      text: "Nhận chiến dịch trải nghiệm điểm đến địa phương",
      category: "Du lịch",
      dot: "orange",
    },
    {
      name: "An P.",
      avatar: "",
      type: "booking_completed",
      occurredAt: Math.floor(Date.now() / 1000) - 4800,
      text: "Hoàn tất nghiệm thu và nhận thanh toán an toàn",
      category: "Sức khỏe",
      dot: "green",
    },
  ];
  const seedActivities = activities.map((item) => ({ ...item }));
  let startIndex = 0;
  let rotateTimer = 0;
  let pollTimer = 0;
  let clockTimer = 0;
  let stopped = false;

  const stageActivities = (items) => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    return items.map((item, index) => ({
      ...item,
      displayedAt: nowSeconds - Math.min(110, 8 + index * 22),
    }));
  };

  activities = stageActivities(activities);

  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const stop = () => {
    if (stopped) return;
    stopped = true;
    controller.abort();
    clearInterval(rotateTimer);
    clearInterval(pollTimer);
    clearInterval(clockTimer);
  };

  const relativeTime = (occurredAt) => {
    const occurredDate = new Date(Number(occurredAt) * 1000);
    if (Number.isNaN(occurredDate.getTime())) return "vừa xong";
    const seconds = Math.min(119, Math.max(
      0,
      Math.floor((Date.now() - occurredDate.getTime()) / 1000),
    ));
    if (seconds < 5) return "vừa xong";
    if (seconds < 60) return `${seconds} giây trước`;
    const mins = Math.floor(seconds / 60);
    return `${mins} phút trước`;
  };

  const safeAvatar = (value) => {
    try {
      const url = new URL(String(value || ""), window.location.origin);
      return url.protocol === "https:" || url.protocol === "http:"
        ? url.href
        : "";
    } catch (_) {
      return "";
    }
  };

  const render = () => {
    const activeEl = listContainer || singleCard;
    if (!activities.length || stopped || !activeEl || !activeEl.isConnected) {
      if (activeEl && !activeEl.isConnected) stop();
      return;
    }

    if (listContainer) {
      const visibleCount = Math.min(7, activities.length);
      const rowsHtml = [];
      const defaultCategories = ACTIVITY_CATEGORY_CYCLE.map((item) => ({
        cat: item.label,
        dot: item.tone,
      }));

      for (let i = 0; i < visibleCount; i++) {
        const item = activities[(startIndex + i) % activities.length];
        const timeStr = relativeTime(item.displayedAt || item.occurredAt);
        const avatar = safeAvatar(item.avatar) || "/default-avatar.svg";
        const catInfo = defaultCategories[i % defaultCategories.length];
        const categoryLabel = item.category || catInfo.cat;
        const dotColor = ["green", "red", "orange", "blue"].includes(item.dot)
          ? item.dot
          : catInfo.dot;
        const textContent =
          item.text ||
          (item.type === "booking_received"
            ? "Tiếp nhận booking chiến dịch mới"
            : item.type === "booking_completed"
              ? "Hoàn tất nghiệm thu và thanh toán an toàn"
              : "Đã hoàn tất hồ sơ và sẵn sàng nhận booking");

        rowsHtml.push(`
          <article class="lp-activity-row-item" data-activity-type="${item.type}">
            <div class="lp-cat-pill">
              <span class="lp-cat-icon-wrap">${industryIconSvg(categoryLabel, "lp-cat-icon")}<span class="lp-cat-dot ${dotColor}"></span></span>
              <span>${esc(categoryLabel)}</span>
            </div>
            <div class="lp-user-cell">
              <img class="lp-user-avatar" src="${esc(avatar)}" alt="${esc(item.name)}" onerror="this.src='/default-avatar.svg'" />
              <span class="lp-user-name">${esc(item.name)}</span>
            </div>
            <div class="lp-activity-desc">${esc(textContent)}</div>
            <div class="lp-activity-timestamp">${timeStr}</div>
          </article>
        `);
      }
      listContainer.innerHTML = rowsHtml.join("");
    } else if (singleCard) {
      const item = activities[startIndex % activities.length];
      const text = singleCard.querySelector("[data-koc-activity-text]");
      const label = singleCard.querySelector("[data-koc-activity-label]");
      singleCard.dataset.activityType = item.type;
      if (label) label.textContent = item.category || "HOẠT ĐỘNG";
      if (text)
        text.textContent = `${item.name}: ${item.text || "hoạt động mới"} (${relativeTime(item.displayedAt || item.occurredAt)})`;
      singleCard.hidden = false;
    }
  };

  const rotate = () => {
    if (!activities.length || stopped) return;
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
      if (nextActivities.length) {
        const paddedActivities = [...nextActivities];
        const liveKeys = new Set(
          paddedActivities.map((item) => `${item.name}:${item.type}`),
        );
        for (const seedItem of seedActivities) {
          if (paddedActivities.length >= 7) break;
          const key = `${seedItem.name}:${seedItem.type}`;
          if (!liveKeys.has(key)) paddedActivities.push(seedItem);
        }
        activities = stageActivities(paddedActivities);
      }
      render();
    } catch (_) {
      render();
    }
  };

  render();
  refresh();
  rotateTimer = window.setInterval(rotate, 5000);
  pollTimer = window.setInterval(refresh, 25000);
  clockTimer = window.setInterval(render, 1000);
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
