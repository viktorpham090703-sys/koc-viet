const SHELL_CACHE = "koc-viet-shell-v6";
const RUNTIME_CACHE = "koc-viet-runtime-v5";
const NOTIFICATION_STATE_CACHE = "koc-viet-notifications-v1";
const NOTIFICATION_STATE_URL = "/__koc-viet-notification-state__";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/styles/pwa.css",
  "/styles/portal-responsive.css",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then(async (keys) => {
        const upgradingExistingApp = keys.some(
          (key) =>
            (key.startsWith("koc-viet-shell-") && key !== SHELL_CACHE) ||
            (key.startsWith("koc-viet-runtime-") && key !== RUNTIME_CACHE),
        );
        await Promise.all(
          keys
            .filter(
              (key) =>
                key !== SHELL_CACHE &&
                key !== RUNTIME_CACHE &&
                key !== NOTIFICATION_STATE_CACHE,
            )
            .map((key) => caches.delete(key)),
        );
        await self.clients.claim();

        // A running tab keeps executing its old hashed JavaScript even after the
        // cache is replaced. Reload existing tabs once on an actual SW upgrade so
        // bug fixes become active immediately; do nothing on a first-time install.
        if (upgradingExistingApp) {
          const clients = await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true,
          });
          await Promise.all(
            clients.map((client) =>
              typeof client.navigate === "function"
                ? client.navigate(client.url)
                : Promise.resolve(),
            ),
          );
        }
      }),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    self.location.hostname === "localhost" ||
    self.location.hostname === "127.0.0.1"
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (["script", "style", "image", "font"].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = safeNotificationUrl(event.notification.data?.url);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(destination);
          return;
        }
      }
      return self.clients.openWindow(destination);
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch (_) {
    payload = { message: event.data?.text() || "Bạn có một cập nhật mới." };
  }

  event.waitUntil(
    rememberNotificationId(payload.id).then(() => showNotification({
      id: payload.id || Date.now(),
      title: payload.title || "KOC Việt",
      message: payload.message || payload.body || "Bạn có một cập nhật mới.",
      href: payload.href || payload.url || "/#/notifications",
      timestamp: payload.timestamp || Date.now(),
    })),
  );
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "koc-viet-check-notifications") {
    event.waitUntil(checkForNotifications());
  }
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (_) {
    return (
      (await cache.match(request)) ||
      (await caches.match("/index.html")) ||
      (await caches.match("/")) ||
      Response.error()
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || network;
}

async function checkForNotifications() {
  let response;
  try {
    response = await fetch("/api/notifications", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch (_) {
    return;
  }
  if (!response.ok) return;

  const data = await response.json();
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

  await Promise.all(
    fresh.map((item) =>
      showNotification({
        id: item.id,
        title: item.title || "Thông báo mới từ KOC Việt",
        message: item.message || "Bạn có một cập nhật mới.",
        href: item.href || "/#/notifications",
        timestamp: Number(item.created_at || 0) * 1000,
      }),
    ),
  );
}

function showNotification(item) {
  return self.registration.showNotification(item.title, {
    body: item.message,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: `koc-viet-${item.id}`,
    data: { url: item.href || "/#/notifications" },
    timestamp: item.timestamp || Date.now(),
    vibrate: [120, 60, 120],
  });
}

async function readNotificationState() {
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
  const cache = await caches.open(NOTIFICATION_STATE_CACHE);
  await cache.put(
    NOTIFICATION_STATE_URL,
    new Response(JSON.stringify(state), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function rememberNotificationId(id) {
  if (id === undefined || id === null) return;
  const previousState = await readNotificationState();
  const ids = [String(id), ...(previousState?.ids || [])]
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 200);
  await writeNotificationState({ initialized: true, ids });
}

function safeNotificationUrl(value) {
  try {
    const url = new URL(value || "/#/notifications", self.location.origin);
    if (url.origin === self.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch (_) {}
  return "/#/notifications";
}
