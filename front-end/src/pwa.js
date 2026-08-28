import { api } from "./api.js";

const NOTIFICATION_STATE_CACHE = "koc-viet-notifications-v1";
const NOTIFICATION_STATE_URL = "/__koc-viet-notification-state__";
const POLL_INTERVAL = 60_000;

let deferredInstallPrompt = null;
let serviceWorkerRegistration = null;
let initialized = false;
let authenticated = false;
let notificationTimer = null;
let notificationSyncInFlight = null;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  renderPwaActions();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  sessionStorage.setItem("koc-viet-pwa-actions-dismissed", "1");
  renderPwaActions();
});

export function initializePwa(options = {}) {
  authenticated = Boolean(options.authenticated);

  if (!initialized) {
    initialized = true;
    registerServiceWorker();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForNewNotifications();
    });
    window.addEventListener("online", checkForNewNotifications);
  }

  renderPwaActions();
  updateNotificationPolling();
}

export function setPwaAuthenticated(value) {
  authenticated = Boolean(value);
  renderPwaActions();
  updateNotificationPolling();
}

export async function disconnectPwaNotifications() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration?.pushManager?.getSubscription();
    if (!subscription) return;
    try {
      await api("/api/push/unsubscribe", {
        method: "POST",
        body: { endpoint: subscription.endpoint },
      });
    } finally {
      await subscription.unsubscribe();
    }
  } catch (_) {
    // Logout must still proceed if the device is offline.
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  // Avoid stale Vite modules during local development. Use `vite preview` to
  // exercise the production PWA build, or append ?pwa=1 when needed in dev.
  const enableInThisEnvironment =
    import.meta.env.PROD || new URLSearchParams(location.search).has("pwa");
  if (!enableInThisEnvironment) return;

  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    await serviceWorkerRegistration.update();
    updateNotificationPolling();
  } catch (error) {
    console.warn("Không thể đăng ký service worker KOC Việt", error);
  }
}

function renderPwaActions() {
  if (!document.body) return;

  const notificationPermission =
    "Notification" in window ? Notification.permission : "unsupported";
  const canInstall = !isStandalone() && (Boolean(deferredInstallPrompt) || isIos());
  const canEnableNotifications =
    authenticated && notificationPermission === "default";
  const wasDismissed =
    sessionStorage.getItem("koc-viet-pwa-actions-dismissed") === "1";

  let host = document.getElementById("pwa-actions");
  if ((!canInstall && !canEnableNotifications) || wasDismissed) {
    host?.remove();
    return;
  }

  if (!host) {
    host = document.createElement("aside");
    host.id = "pwa-actions";
    host.className = "pwa-actions";
    host.setAttribute("aria-label", "Tùy chọn ứng dụng KOC Việt");
    document.body.appendChild(host);
  }

  host.innerHTML = `
    <img class="pwa-actions__logo" src="/icons/icon-192.png" alt="" aria-hidden="true">
    <div class="pwa-actions__content">
      <strong>KOC Việt</strong>
      <span>${canEnableNotifications ? "Không bỏ lỡ booking và cập nhật mới" : "Mở nhanh như một ứng dụng"}</span>
    </div>
    <div class="pwa-actions__buttons">
      ${canInstall ? '<button type="button" class="pwa-action-button" data-pwa-install>Cài ứng dụng</button>' : ""}
      ${canEnableNotifications ? '<button type="button" class="pwa-action-button pwa-action-button--accent" data-pwa-notifications>🔔 Bật thông báo</button>' : ""}
    </div>
    <button type="button" class="pwa-actions__close" data-pwa-dismiss aria-label="Đóng">×</button>`;

  host.querySelector("[data-pwa-install]")?.addEventListener("click", installPwa);
  host
    .querySelector("[data-pwa-notifications]")
    ?.addEventListener("click", requestNotificationPermission);
  host.querySelector("[data-pwa-dismiss]")?.addEventListener("click", () => {
    sessionStorage.setItem("koc-viet-pwa-actions-dismissed", "1");
    host.remove();
  });
}

async function installPwa() {
  if (!deferredInstallPrompt) {
    showPwaHint("Trên Safari, bấm Chia sẻ rồi chọn “Thêm vào Màn hình chính”.");
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  renderPwaActions();
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    showPwaHint("Trình duyệt này chưa hỗ trợ thông báo của ứng dụng.");
    return;
  }

  const permission = await Notification.requestPermission();
  renderPwaActions();

  if (permission === "granted") {
    await primeNotificationState();
    const pushReady = await ensurePushSubscription({ showErrors: true });
    if (pushReady) {
      await showSystemNotification({
        id: "notifications-enabled",
        title: "Đã bật thông báo KOC Việt",
        message: "Bạn sẽ nhận được booking và cập nhật mới ngay cả khi app đang đóng.",
        href: "/#/notifications",
      });
    }
    await registerPeriodicNotificationSync();
    updateNotificationPolling();
    return;
  }

  if (permission === "denied") {
    showPwaHint("Thông báo đang bị chặn. Bạn có thể bật lại trong cài đặt của trình duyệt.");
  }
}

function updateNotificationPolling() {
  if (notificationTimer) {
    clearInterval(notificationTimer);
    notificationTimer = null;
  }

  if (
    !authenticated ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  checkForNewNotifications();
  notificationTimer = window.setInterval(checkForNewNotifications, POLL_INTERVAL);
  registerPeriodicNotificationSync();
  ensurePushSubscription();
}

async function ensurePushSubscription(options = {}) {
  if (!authenticated || Notification.permission !== "granted") return false;
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration?.pushManager) {
      if (options.showErrors) {
        showPwaHint("Thiết bị này chưa hỗ trợ Web Push. Thông báo vẫn hiện khi app đang mở.");
      }
      return false;
    }

    const config = await api("/api/push/config");
    if (!config.enabled || !config.publicKey) {
      if (options.showErrors) {
        showPwaHint("Máy chủ chưa cấu hình Web Push. Thông báo vẫn hiện khi app đang mở.");
      }
      return false;
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      });
    }
    const serialized = subscription.toJSON();
    await api("/api/push/subscribe", {
      method: "POST",
      body: {
        endpoint: subscription.endpoint,
        keys: serialized.keys,
      },
    });
    return true;
  } catch (error) {
    console.warn("Không thể đăng ký Web Push KOC Việt", error);
    if (options.showErrors) {
      showPwaHint("Chưa thể kết nối thông báo nền. Vui lòng thử lại khi mạng ổn định.");
    }
    return false;
  }
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function primeNotificationState() {
  try {
    const data = await api("/api/notifications");
    await writeNotificationState({
      initialized: true,
      ids: (data.notifications || []).map((item) => String(item.id)).slice(0, 200),
    });
  } catch (_) {
    // A later successful poll will establish the baseline.
  }
}

async function checkForNewNotifications() {
  if (
    notificationSyncInFlight ||
    !authenticated ||
    document.visibilityState === "hidden" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return notificationSyncInFlight;
  }

  notificationSyncInFlight = (async () => {
    try {
      const data = await api("/api/notifications");
      const notifications = Array.isArray(data.notifications) ? data.notifications : [];
      const previousState = await readNotificationState();

      if (!previousState?.initialized) {
        await writeNotificationState({
          initialized: true,
          ids: notifications.map((item) => String(item.id)).slice(0, 200),
        });
        return;
      }

      const seen = new Set(previousState.ids || []);
      const fresh = notifications
        .filter((item) => !item.is_read && !seen.has(String(item.id)))
        .slice(0, 4)
        .reverse();

      await writeNotificationState({
        initialized: true,
        ids: [
          ...notifications.map((item) => String(item.id)),
          ...(previousState.ids || []),
        ].filter((id, index, ids) => ids.indexOf(id) === index).slice(0, 200),
      });

      for (const item of fresh) {
        await showSystemNotification({
          id: item.id,
          title: item.title || "Thông báo mới từ KOC Việt",
          message: item.message || "Bạn có một cập nhật mới.",
          href: item.href || "/#/notifications",
          timestamp: Number(item.created_at || 0) * 1000,
        });
      }
    } catch (_) {
      // Offline sessions and expired sessions are retried on focus or next poll.
    } finally {
      notificationSyncInFlight = null;
    }
  })();

  return notificationSyncInFlight;
}

async function showSystemNotification(item) {
  const options = {
    body: item.message,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: `koc-viet-${item.id}`,
    data: { url: item.href || "/#/notifications" },
    timestamp: item.timestamp || Date.now(),
    vibrate: [120, 60, 120],
  };

  try {
    const registration = await getServiceWorkerRegistration();
    if (registration) return registration.showNotification(item.title, options);
  } catch (_) {
    // Fall back to the page Notification API below.
  }

  if (Notification.permission === "granted") {
    const notification = new Notification(item.title, options);
    notification.onclick = () => {
      window.focus();
      location.href = item.href || "/#/notifications";
      notification.close();
    };
  }
}

async function registerPeriodicNotificationSync() {
  try {
    const registration = await getServiceWorkerRegistration();
    if (registration?.periodicSync) {
      await registration.periodicSync.register("koc-viet-check-notifications", {
        minInterval: 15 * 60 * 1000,
      });
    }
  } catch (_) {
    // Periodic Background Sync is an optional progressive enhancement.
  }
}

async function getServiceWorkerRegistration() {
  if (serviceWorkerRegistration) return serviceWorkerRegistration;
  if (!("serviceWorker" in navigator)) return null;

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => window.setTimeout(() => resolve(null), 1500)),
  ]);
}

async function readNotificationState() {
  if (!("caches" in window)) return null;
  const cache = await caches.open(NOTIFICATION_STATE_CACHE);
  const response = await cache.match(NOTIFICATION_STATE_URL);
  if (!response) return null;
  try {
    return await response.json();
  } catch (_) {
    return null;
  }
}

async function writeNotificationState(state) {
  if (!("caches" in window)) return;
  const cache = await caches.open(NOTIFICATION_STATE_CACHE);
  await cache.put(
    NOTIFICATION_STATE_URL,
    new Response(JSON.stringify(state), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function showPwaHint(message) {
  document.querySelector(".pwa-hint")?.remove();
  const hint = document.createElement("div");
  hint.className = "pwa-hint";
  hint.setAttribute("role", "status");
  hint.textContent = message;
  document.body.appendChild(hint);
  window.setTimeout(() => hint.remove(), 6500);
}
