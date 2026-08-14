// KOC Việt · Animation helpers
// Lightweight, dependency-free utilities for applying animations to
// dynamically rendered content across all portals and landing pages.

/**
 * Apply scroll-reveal to elements matching `selector` within `root`.
 * Elements get the `.nv-reveal` class and are revealed when they enter
 * the viewport via IntersectionObserver.
 *
 * @param {HTMLElement} root - Container element to search within
 * @param {string} selector - CSS selector for elements to reveal
 * @param {Object} [opts] - Options
 * @param {string} [opts.direction] - 'up' | 'left' | 'right' | 'zoom'
 * @param {number} [opts.delay] - Base delay in ms (staggered per element)
 * @param {number} [opts.stagger] - Stagger increment in ms between elements
 * @param {number} [opts.threshold] - IntersectionObserver threshold (0-1)
 */
export function revealOnScroll(root, selector, opts = {}) {
  const {
    direction = 'up',
    delay = 0,
    stagger = 60,
    threshold = 0.1,
  } = opts;
  const els = root.querySelectorAll(selector);
  if (!els.length) return;

  const dirClass =
    direction === 'left' ? 'nv-reveal-left' :
    direction === 'right' ? 'nv-reveal-right' :
    direction === 'zoom' ? 'nv-reveal-zoom' : '';

  els.forEach((el, i) => {
    el.classList.add('nv-reveal');
    if (dirClass) el.classList.add(dirClass);
    el.style.setProperty('--nv-reveal-delay', `${delay + i * stagger}ms`);
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );
    els.forEach((el) => io.observe(el));
  } else {
    els.forEach((el) => el.classList.add('is-visible'));
  }
}

/**
 * Apply staggered entrance animation to direct children of elements
 * matching `selector` within `root`. Each child gets `.nv-stagger`
 * treatment with incremental `--nv-delay`.
 *
 * @param {HTMLElement} root - Container element to search within
 * @param {string} selector - CSS selector for parent elements
 * @param {Object} [opts]
 * @param {number} [opts.delay] - Base delay in ms
 * @param {number} [opts.stagger] - Stagger increment in ms
 */
export function staggerChildren(root, selector, opts = {}) {
  const { delay = 0, stagger = 70 } = opts;
  const parents = root.querySelectorAll(selector);
  parents.forEach((parent) => {
    parent.classList.add('nv-stagger');
    Array.from(parent.children).forEach((child, i) => {
      child.style.setProperty('--nv-delay', `${delay + i * stagger}ms`);
    });
  });
}

/**
 * Apply card entrance animation to elements matching `selector`.
 * Each element gets `.nv-card-enter` with incremental `--nv-delay`.
 *
 * @param {HTMLElement} root - Container element to search within
 * @param {string} selector - CSS selector for cards
 * @param {Object} [opts]
 * @param {number} [opts.delay] - Base delay in ms
 * @param {number} [opts.stagger] - Stagger increment in ms
 */
export function animateCards(root, selector, opts = {}) {
  const { delay = 0, stagger = 50 } = opts;
  const cards = root.querySelectorAll(selector);
  cards.forEach((card, i) => {
    card.classList.add('nv-card-enter');
    card.style.setProperty('--nv-delay', `${delay + i * stagger}ms`);
  });
}

/**
 * Apply row entrance animation to elements matching `selector`.
 * Each element gets `.nv-row-enter` with incremental `--nv-delay`.
 *
 * @param {HTMLElement} root - Container element to search within
 * @param {string} selector - CSS selector for rows
 * @param {Object} [opts]
 * @param {number} [opts.delay] - Base delay in ms
 * @param {number} [opts.stagger] - Stagger increment in ms
 */
export function animateRows(root, selector, opts = {}) {
  const { delay = 0, stagger = 40 } = opts;
  const rows = root.querySelectorAll(selector);
  rows.forEach((row, i) => {
    row.classList.add('nv-row-enter');
    row.style.setProperty('--nv-delay', `${delay + i * stagger}ms`);
  });
}

/**
 * Add a page-enter animation to the root element.
 * @param {HTMLElement} el - Element to animate
 */
export function pageEnter(el) {
  if (!el) return;
  el.classList.add('nv-page-enter');
}

/**
 * Animate a number counting up from 0 to `target` over `duration` ms.
 * Updates the element's textContent with the formatted value.
 *
 * @param {HTMLElement} el - Element whose textContent will be updated
 * @param {number} target - Final number value
 * @param {Object} [opts]
 * @param {number} [opts.duration] - Animation duration in ms
 * @param {Function} [opts.format] - Formatter for the displayed value
 */
export function countUp(el, target, opts = {}) {
  const { duration = 1200, format = (n) => Math.round(n).toLocaleString('vi-VN') } = opts;
  if (!el) return;
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    el.textContent = format(target * eased);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Shake an element to indicate an error.
 * @param {HTMLElement} el - Element to shake
 */
export function shake(el) {
  if (!el) return;
  el.classList.remove('nv-anim-shake');
  void el.offsetWidth; // reflow to restart animation
  el.classList.add('nv-anim-shake');
}

/**
 * Flash a success pulse on an element.
 * @param {HTMLElement} el - Element to pulse
 */
export function pulse(el) {
  if (!el) return;
  el.classList.remove('nv-anim-pulse');
  void el.offsetWidth;
  el.classList.add('nv-anim-pulse');
}

/**
 * Auto-apply animations to common patterns after content is rendered.
 * Call this after setting innerHTML on a container.
 *
 * @param {HTMLElement} root - Container element with freshly rendered content
 */
export function autoAnimate(root) {
  if (!root) return;

  // Page enter
  pageEnter(root);

  // Card entrance for grids (stat cards are handled by CSS)
  animateCards(root, '.grid > .card, .lp-grid-2 > .lp-card, .lp-grid-3 > .lp-card, .lp-grid-4 > .lp-card', { stagger: 50 });

  // Row entrance for tables
  animateRows(root, 'tbody tr', { stagger: 30 });

  // Scroll-reveal for sections — skip elements already handled by
  // bindLandingEvents' lp-reveal-init system to avoid CSS conflicts.
  const landingReveal = root.querySelectorAll('.lp-section, .lp-stat-strip, .lp-cta-final');
  const unhandled = Array.from(landingReveal).filter((el) => !el.classList.contains('lp-reveal-init'));
  if (unhandled.length) {
    unhandled.forEach((el, i) => {
      el.classList.add('nv-reveal');
      el.style.setProperty('--nv-reveal-delay', `${i * 40}ms`);
    });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
      );
      unhandled.forEach((el) => io.observe(el));
    } else {
      unhandled.forEach((el) => el.classList.add('is-visible'));
    }
  }

  // Scroll-reveal for KOC recruit sections (only if not already handled)
  const recruitReveal = root.querySelectorAll('.koc-recruit-section-head, .koc-recruit-benefit-card, .koc-recruit-step-grid article, .koc-recruit-final-box');
  const unhandledRecruit = Array.from(recruitReveal).filter((el) => !el.classList.contains('koc-recruit-reveal'));
  if (unhandledRecruit.length) {
    unhandledRecruit.forEach((el, i) => {
      el.classList.add('nv-reveal');
      el.style.setProperty('--nv-reveal-delay', `${i * 70}ms`);
    });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
      );
      unhandledRecruit.forEach((el) => io.observe(el));
    } else {
      unhandledRecruit.forEach((el) => el.classList.add('is-visible'));
    }
  }
}
