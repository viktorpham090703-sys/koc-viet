// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
import { now, uid } from './db.js';
import { TIERS, CATEGORIES, tierOf, getDemoAccounts, getDemoAccount, isDemoUser, demoAccountsEnabled } from './seed.js';
import { eKYC, Signature, Tracking, PLATFORMS, affiliateProvider } from './mock.js';
import { createAndSendEmailOtp, verifyEmailOtp, isEmailVerified } from './lib/emailOtp.js';
import { sendBookingCreatedEmail, sendPaymentSuccessEmail } from './lib/smtp.js';
import { hashPassword, verifyPassword, passwordNeedsRehash, validatePassword } from './lib/password.js';
import { signJwt, verifyJwt } from './lib/jwt.js';
import { deleteKocIdentityImages, signedKocIdentityUrl, uploadKocIdentityImages } from './lib/s3Identity.js';
import { analyzeFollowerOcrEvidence } from './lib/followerOcr.js';
import { canonicalProvinceName, getAddressKitProvinces, provinceFilterAliases } from './lib/addressKit.js';
import {
  createPayOSPaymentLink,
  getPayOSPaymentLink,
  verifyPayOSWebhook,
} from './lib/payos.js';
import { createPayOSPayout, getPayOSPayoutBalance } from './lib/payosPayout.js';
import {
  walletBalances,
  walletTransactions,
  walletBalance,
  walletAccount,
  transferWalletFunds,
  postWalletEntry,
} from './lib/wallet.js';

const J = (data, status = 200, headers = undefined) => Response.json(data, { status, headers });
const err = (msg, status = 400, headers = undefined) => Response.json({ error: msg }, { status, headers });
const SESSION_COOKIE = 'kv_session';
const SESSION_IDLE_SECONDS = 12 * 60 * 60;
const FOLLOWER_CHALLENGE_TTL_SECONDS = 30 * 60;
const FOLLOWER_PROOF_TTL_SECONDS = 24 * 60 * 60;
const FOLLOWER_OCR_RATE_LIMIT = 5;
const FOLLOWER_OCR_RATE_WINDOW_SECONDS = 60 * 60;
const SOCIAL_PLATFORMS = {
  tiktok: 'TikTok',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
};

function normalizedSocialPlatform(value) {
  const key = String(value || '').trim().toLowerCase();
  return SOCIAL_PLATFORMS[key] || '';
}

function normalizedSocialHandle(value) {
  let raw = String(value || '').trim().toLowerCase();
  try {
    const parsed = new URL(raw);
    raw = parsed.pathname.split('/').filter(Boolean).pop() || '';
  } catch (_) {}
  try {
    return decodeURIComponent(raw).replace(/^@+/, '');
  } catch (_) {
    return raw.replace(/^@+/, '');
  }
}

async function deleteBookingByCode(env, bookingCodeOrId) {
  if (!bookingCodeOrId) return false;
  const b = await env.DB.prepare(
    "SELECT * FROM bookings WHERE code=? OR id=?"
  ).bind(bookingCodeOrId, bookingCodeOrId).first();
  if (!b) return false;

  await env.DB.prepare("DELETE FROM payment_requests WHERE booking_id=?").bind(b.id).run();
  await env.DB.prepare("DELETE FROM affiliate WHERE booking_id=?").bind(b.id).run();
  await env.DB.prepare("DELETE FROM booking_video_submissions WHERE booking_id=?").bind(b.id).run();
  await env.DB.prepare("DELETE FROM wallet_tx WHERE note LIKE ? OR reference_id=?").bind(`%${b.code}%`, b.id).run();

  const { results: jEntries } = await env.DB.prepare(
    "SELECT id FROM journal_entries WHERE reference_id=? OR idempotency_key LIKE ?"
  ).bind(b.id, `%${b.id}%`).all();

  if (jEntries && jEntries.length > 0) {
    for (const j of jEntries) {
      await env.DB.prepare("DELETE FROM ledger_postings WHERE journal_entry_id=?").bind(j.id).run();
    }
    await env.DB.prepare(
      "DELETE FROM journal_entries WHERE reference_id=? OR idempotency_key LIKE ?"
    ).bind(b.id, `%${b.id}%`).run();
  }

  await env.DB.prepare("DELETE FROM bookings WHERE id=?").bind(b.id).run();
  return true;
}

function socialHandlesMatch(expected, visible) {
  const left = normalizedSocialHandle(expected);
  const right = normalizedSocialHandle(visible);
  if (!left || !right) return false;
  if (left === right) return true;
  return (
    Math.min(left.length, right.length) >= 4 &&
    (left.endsWith(right) || right.endsWith(left))
  );
}

async function followerOcrRateAllowed(env, email) {
  const key = `follower-ocr-rate:${email}`;
  const currentTime = now();
  let state = null;
  try {
    state = JSON.parse((await env.KV.get(key)) || 'null');
  } catch (_) {}
  if (
    !state ||
    !Number.isFinite(state.startedAt) ||
    currentTime - state.startedAt >= FOLLOWER_OCR_RATE_WINDOW_SECONDS
  ) {
    state = { startedAt: currentTime, count: 0 };
  }
  if (state.count >= FOLLOWER_OCR_RATE_LIMIT) return false;
  state.count++;
  await env.KV.put(key, JSON.stringify(state), {
    expirationTtl: FOLLOWER_OCR_RATE_WINDOW_SECONDS,
  });
  return true;
}

const AI_VIDEO_PRICING = {
  short: { label: "Review ngắn", duration: "15–30 giây", unitPrice: 300000 },
  standard: { label: "Review tiêu chuẩn", duration: "30–60 giây", unitPrice: 500000 },
  detailed: { label: "Review chi tiết", duration: "60–90 giây", unitPrice: 800000 },
};
function aiVolumeDiscount(quantity) {
  return quantity >= 20 ? 0.20 : quantity >= 10 ? 0.15 : quantity >= 5 ? 0.10 : 0;
}

async function currentUser(env) {
  if (!env.USER_ID || env.USER_ID === "anon") return null;
  return await env.DB.prepare("SELECT * FROM users WHERE id=?")
    .bind(env.USER_ID)
    .first();
}
function cookieValue(request, name) {
  const cookies = String(request.headers.get('cookie') || '').split(';');
  for (const item of cookies) {
    const [key, ...value] = item.trim().split('=');
    if (key === name) return value.join('=');
  }
  return '';
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function sessionCookie(request, token = '', maxAge = SESSION_IDLE_SECONDS) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function jwtSecret(env) {
  return String(env.JWT_SECRET || env.SESSION_SECRET || 'koc_viet_default_jwt_secret_dev_32_bytes_fallback_key');
}

async function createSession(env, request, user, demo = false) {
  const createdAt = now();
  const token = await signJwt({
    iss: 'koc-viet',
    aud: 'koc-viet-web',
    sub: user.id,
    role: user.role,
    sv: Number(user.session_version || 0),
    iat: createdAt,
    exp: createdAt + SESSION_IDLE_SECONDS,
    jti: uid(),
    demo: !!demo,
  }, jwtSecret(env));
  return sessionCookie(request, token, SESSION_IDLE_SECONDS);
}

async function deleteSession() {}

async function sessionUser(env, req) {
  const token = cookieValue(req, SESSION_COOKIE);
  if (!token) return null;
  const session = await verifyJwt(token, jwtSecret(env));
  if (!session?.sub || (session.demo && !demoAccountsEnabled(env))) return null;
  const user = await env.DB.prepare("SELECT * FROM users WHERE id=?")
    .bind(session.sub)
    .first();
  if (
    !user ||
    user.status !== "active" ||
    user.role !== session.role ||
    Number(user.session_version || 0) !== Number(session.sv || 0)
  ) return null;
  user._sessionDemo = !!session.demo;
  return user;
}

async function consumeRateLimit(env, scope, identity, limit, windowSeconds) {
  const key = `rate:${scope}:${await sha256Hex(String(identity || '').toLowerCase())}`;
  const currentTime = now();
  let state = null;
  try { state = JSON.parse((await env.KV.get(key)) || 'null'); } catch (_) {}
  if (!state || currentTime - Number(state.startedAt || 0) >= windowSeconds) {
    state = { startedAt: currentTime, count: 0 };
  }
  if (state.count >= limit) return false;
  state.count++;
  await env.KV.put(key, JSON.stringify(state), { expirationTtl: windowSeconds });
  return true;
}

function requestIp(request) {
  return String(request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown')
    .split(',')[0].trim();
}

function parseKoc(r) {
  if (!r) return null;
  return {
    ...r,
    categories: JSON.parse(r.categories || "[]"),
    socials: JSON.parse(r.socials || "[]"),
    accepting: JSON.parse(r.accepting || "{}"),
    // PostgreSQL returns BIGINT flags as strings; Boolean("0") is true.
    // Normalize numerically so zero-valued flags stay false in API responses.
    ai_clone: Number(r.ai_clone || 0) > 0,
    leader: Number(r.leader || 0) > 0,
    followers_verified: Number(r.followers_verified || 0) > 0,
  };
}

function publicKocDisplayName(value) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  if (!parts.length) return "Một KOC mới";
  const firstCharacter = (part) => Array.from(part)[0]?.toLocaleUpperCase("vi-VN") || "";
  if (parts.length === 1) return `KOC ${firstCharacter(parts[0])}***`;
  return `KOC ${parts[0]} ${firstCharacter(parts[parts.length - 1])}.`;
}

// Admin-editable tier price bands (KV override), falling back to the seeded defaults.
async function getTiers(env) {
  try {
    const raw = await env.KV.get("tiers_override");
    if (raw) {
      const t = JSON.parse(raw);
      if (Array.isArray(t) && t.length) return t;
    }
  } catch (e) {}
  return TIERS;
}
const isUrl = (s) => {
  try {
    const u = new URL(String(s || "").trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (e) {
    return false;
  }
};
const isImageSource = (s) =>
  !s ||
  isUrl(s) ||
  /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(s);

function normalizedHttpUrl(value, maxLength = 2000) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > maxLength) return '';
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (!parsed.hostname || parsed.username || parsed.password) return '';
    return parsed.href;
  } catch (_) {
    return '';
  }
}

function inferProductPlatform(productUrl, provided) {
  const label = String(provided || '').trim().slice(0, 80);
  if (label) return label;
  const hostname = new URL(productUrl).hostname.toLowerCase();
  if (hostname.includes('shopee.')) return 'Shopee';
  if (hostname.includes('lazada.')) return 'Lazada';
  if (hostname.includes('tiktok.')) return 'TikTok Shop';
  if (hostname.includes('tiki.')) return 'Tiki';
  if (hostname.includes('facebook.') || hostname.includes('fb.')) return 'Facebook Shop';
  return 'Website';
}

function parseBusinessProduct(body) {
  const name = String(body.name || '').trim().slice(0, 160);
  if (name.length < 2) return { error: 'Tên sản phẩm tối thiểu 2 ký tự' };
  const productUrl = normalizedHttpUrl(body.product_url);
  if (!productUrl) return { error: 'Link sản phẩm phải là URL http/https hợp lệ' };
  const rawImageUrl = String(body.image_url || '').trim();
  const imageUrl = rawImageUrl ? normalizedHttpUrl(rawImageUrl, 2000) : '';
  if (rawImageUrl && !imageUrl) return { error: 'Link ảnh phải là URL http/https hợp lệ' };
  const price = body.price === '' || body.price == null ? 0 : Number(body.price);
  if (!Number.isSafeInteger(price) || price < 0)
    return { error: 'Giá sản phẩm phải là số nguyên không âm' };
  const commissionRate = body.commission_rate === '' || body.commission_rate == null
    ? 0
    : Number(body.commission_rate);
  if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100)
    return { error: 'Hoa hồng dự kiến phải từ 0 đến 100%' };
  const status = body.status === 'paused' ? 'paused' : 'active';
  return {
    value: {
      name,
      productUrl,
      platform: inferProductPlatform(productUrl, body.platform),
      sku: String(body.sku || '').trim().slice(0, 80),
      price,
      imageUrl,
      commissionRate: Math.round(commissionRate * 100) / 100,
      affiliateEnabled: body.affiliate_enabled === false ? 0 : 1,
      status,
      notes: String(body.notes || '').trim().slice(0, 1000),
    },
  };
}

async function notifyUser(
  env,
  userId,
  type,
  title,
  message,
  href = "#/notifications",
) {
  if (!userId) return;
  await env.DB.prepare(
    `INSERT INTO notifications (id,user_id,type,title,message,href,is_read,created_at)
     VALUES (?,?,?,?,?,?,0,?)`,
  )
    .bind(uid(), userId, type, title, message, href, now())
    .run();
}

async function notifyKoc(env, kocId, type, title, message, href) {
  const user = await env.DB.prepare(
    `SELECT id FROM users WHERE role='koc' AND koc_id=? LIMIT 1`,
  )
    .bind(kocId)
    .first();
  if (user) await notifyUser(env, user.id, type, title, message, href);
}

async function notifyBusiness(env, businessId, type, title, message, href) {
  const user = await env.DB.prepare(
    `SELECT id FROM users WHERE role='business' AND business_id=? LIMIT 1`,
  )
    .bind(businessId)
    .first();
  if (user) await notifyUser(env, user.id, type, title, message, href);
}

async function notifyAdmins(env, type, title, message, href) {
  const { results = [] } = await env.DB.prepare(
    `SELECT id FROM users WHERE role='admin' AND status='active'`,
  ).all();
  for (const user of results) {
    await notifyUser(env, user.id, type, title, message, href);
  }
}

async function ensureBookingAffiliateLink(env, booking, actorId = "system") {
  if (!["affiliate", "combo"].includes(booking.booking_type)) return null;
  const existing = await env.DB.prepare(
    "SELECT generated_url FROM affiliate_links WHERE booking_id=? AND koc_id=? LIMIT 1",
  ).bind(booking.id, booking.koc_id).first();
  if (existing?.generated_url) return existing.generated_url;

  if (!isUrl(booking.product_url))
    throw new Error("Booking chưa có đường dẫn sản phẩm hợp lệ");
  const trackingCode = Tracking.shortCode() + booking.koc_id.slice(0, 4);
  const provider = affiliateProvider(booking.platform);
  const generatedUrl = await provider.generateLink({
    productUrl: booking.product_url,
    kocId: booking.koc_id,
    bookingId: booking.id,
    trackingCode,
  });
  await env.DB.prepare(
    `INSERT INTO affiliate_links
     (id,booking_id,koc_id,tracking_code,generated_url,platform,status,created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
  ).bind(
    uid(),
    booking.id,
    booking.koc_id,
    trackingCode,
    generatedUrl,
    booking.platform,
    "active",
    now(),
  ).run();
  await audit(
    env,
    actorId,
    "affiliate_link.generate",
    booking.id,
    `platform=${booking.platform} code=${trackingCode}`,
  );
  return generatedUrl;
}

const MAX_R2_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;
const R2_PART_SIZE = 10 * 1024 * 1024;
const STORAGE_PART_SIZE = 5 * 1024 * 1024;
const VIDEO_ACCESS_TTL_SECONDS = 15 * 60;

function requireVideoBucket(env) {
  const bucket = env.VIDEO_BUCKET || env.STORAGE;
  if (!bucket) {
    const error = new Error(
      "Kho lưu trữ video chưa sẵn sàng. Vui lòng thử lại sau.",
    );
    error.code = "R2_CONFIGURATION_MISSING";
    throw error;
  }
  return bucket;
}

function supportsR2Multipart(bucket) {
  return (
    typeof bucket?.createMultipartUpload === "function" &&
    typeof bucket?.resumeMultipartUpload === "function"
  );
}

function supportsDirectStorage(bucket) {
  return (
    typeof bucket?.put === "function" &&
    typeof bucket?.get === "function"
  );
}

function storagePartKey(objectKey, partNumber) {
  return `${objectKey}.parts/${String(partNumber).padStart(5, "0")}`;
}

function storageChunkSize(submission) {
  const configured = Number(
    String(submission.r2_upload_id || "").replace(/^chunks:/, ""),
  );
  return Number.isSafeInteger(configured) && configured > 0
    ? configured
    : STORAGE_PART_SIZE;
}

function storagePartCount(submission) {
  return Math.ceil(Number(submission.size_bytes) / storageChunkSize(submission));
}

async function storageObjectBytes(object) {
  if (object instanceof ArrayBuffer) return object;
  if (ArrayBuffer.isView(object))
    return object.buffer.slice(
      object.byteOffset,
      object.byteOffset + object.byteLength,
    );
  if (typeof object?.arrayBuffer === "function")
    return await object.arrayBuffer();
  if (object?.body) return await new Response(object.body).arrayBuffer();
  throw new Error("Storage không trả về nội dung object hợp lệ");
}

function requestedByteRange(header, totalSize) {
  if (!header) return { start: 0, end: totalSize - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match) return null;

  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, totalSize - suffix);
    end = totalSize - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : totalSize - 1;
  }
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= totalSize ||
    end < start
  ) return null;
  return {
    start,
    end: Math.min(end, totalSize - 1),
    partial: true,
  };
}

function chunkedStorageBody(bucket, submission, range) {
  const chunkSize = storageChunkSize(submission);
  let position = range.start;
  return new ReadableStream({
    async pull(controller) {
      if (position > range.end) {
        controller.close();
        return;
      }
      try {
        const partNumber = Math.floor(position / chunkSize) + 1;
        const partStart = (partNumber - 1) * chunkSize;
        const object = await bucket.get(
          storagePartKey(submission.object_key, partNumber),
        );
        if (!object)
          throw new Error(`Thiếu phần video ${partNumber}`);
        const bytes = new Uint8Array(await storageObjectBytes(object));
        const from = position - partStart;
        const to = Math.min(bytes.length, range.end - partStart + 1);
        if (to <= from)
          throw new Error(`Phần video ${partNumber} không hợp lệ`);
        const output = bytes.slice(from, to);
        position += output.byteLength;
        controller.enqueue(output);
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

function safeVideoFileName(value) {
  const name = String(value || "video.mp4")
    .replace(/[^\p{L}\p{N}._ -]+/gu, "-")
    .replace(/\s+/g, "-")
    .slice(-120);
  return name || "video.mp4";
}

function videoObjectKey(bookingId, version, submissionId, fileName) {
  return `booking-videos/${bookingId}/v${version}/${submissionId}-${safeVideoFileName(fileName)}`;
}

async function videoWithAccessUrls(env, submission) {
  if (
    !["r2", "storage", "storage_chunks"].includes(submission.storage_provider) ||
    !submission.object_key ||
    !["pending_review", "approved", "revision_requested"].includes(submission.status)
  ) return submission;

  const token = uid().replace(/-/g, "") + uid().replace(/-/g, "");
  await env.KV.put(`video-access:${token}`, submission.id, {
    expirationTtl: VIDEO_ACCESS_TTL_SECONDS,
  });
  const contentUrl = `/api/booking/video/content?token=${encodeURIComponent(token)}`;
  return {
    ...submission,
    preview_url: contentUrl,
    download_url: `${contentUrl}&download=1`,
  };
}

async function kocEmailContact(env, kocId, existingKoc = null) {
  const koc = existingKoc || await env.DB.prepare(
    'SELECT id,name,email FROM kocs WHERE id=?'
  ).bind(kocId).first();
  if (!koc) return null;

  const profileEmail = String(koc.email || '').trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileEmail)) {
    return { email: profileEmail, name: koc.name || 'KOC' };
  }

  const user = await env.DB.prepare(
    `SELECT email,name FROM users WHERE role='koc' AND koc_id=? LIMIT 1`
  ).bind(kocId).first();
  const accountEmail = String(user?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)) return null;
  return { email: accountEmail, name: koc.name || user?.name || 'KOC' };
}

async function sendEmailBestEffort(eventName, recipient, send) {
  if (!recipient) {
    console.warn(`${eventName} email skipped: KOC has no valid email`);
    return false;
  }
  try {
    await send();
    return true;
  } catch (error) {
    console.error(`${eventName} email failed:`, error?.message || error);
    return false;
  }
}

function payOSRedirectUrl(requestUrl, state, orderCode) {
  const target = new URL(requestUrl.origin);
  target.search = new URLSearchParams({
    payos: state,
    orderCode: String(orderCode),
  }).toString();
  target.hash = '/orders';
  return target.toString();
}

function newPayOSOrderCode() {
  return Number.parseInt(uid().replace(/-/g, '').slice(0, 12), 16);
}

function canUseDemoPayment(env, me, url) {
  return env.DEMO_PAYMENT_ENABLED === 'true' ||
    me?.email === 'business@demo.vn' ||
    ['localhost', '127.0.0.1'].includes(url.hostname);
}

async function startPayOSCheckout(
  env,
  requestUrl,
  booking,
  business,
  purpose = 'final_settlement',
) {
  const paymentId = uid();
  const orderCode = newPayOSOrderCode();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO payment_requests
       (id,booking_id,business_id,provider,order_code,amount,status,purpose,created_at,updated_at)
       VALUES (?,?,?,'payos',?,?,'creating',?,?,?)`,
    ).bind(
      paymentId,
      booking.id,
      booking.business_id,
      orderCode,
      booking.price,
      purpose,
      now(),
      now(),
    ),
    env.DB.prepare(
      `UPDATE bookings SET status='payment_pending',updated_at=? WHERE id=?`,
    ).bind(now(), booking.id),
  ]);

  try {
    const paymentPayload = {
      orderCode,
      amount: booking.price,
      description: `BOOK ${booking.code}`,
      buyerName: String(business?.name || '').trim().slice(0, 160),
      items: [{
        name: `Booking ${booking.code}`,
        quantity: 1,
        price: booking.price,
      }],
      cancelUrl: payOSRedirectUrl(requestUrl, 'cancelled', orderCode),
      returnUrl: payOSRedirectUrl(requestUrl, 'success', orderCode),
      expiredAt: now() + 30 * 60,
    };
    const buyerEmail = String(business?.email || '').trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      paymentPayload.buyerEmail = buyerEmail.slice(0, 160);
    }
    const data = await createPayOSPaymentLink(env, paymentPayload);
    await env.DB.prepare(
      `UPDATE payment_requests
       SET status=?,payment_link_id=?,checkout_url=?,qr_code=?,failure_reason=NULL,updated_at=?
       WHERE id=?`,
    ).bind(
      String(data.status || 'PENDING').toLowerCase(),
      String(data.paymentLinkId || ''),
      String(data.checkoutUrl || ''),
      String(data.qrCode || ''),
      now(),
      paymentId,
    ).run();
    return {
      paymentId,
      orderCode,
      checkoutUrl: data.checkoutUrl,
      qrCode: data.qrCode,
      status: String(data.status || 'PENDING').toLowerCase(),
    };
  } catch (error) {
    const reason = String(error?.message || error).slice(0, 500);
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE payment_requests SET status='failed',failure_reason=?,updated_at=? WHERE id=?`,
      ).bind(reason, now(), paymentId),
      env.DB.prepare(
        `UPDATE bookings SET status='payment_failed',updated_at=? WHERE id=? AND status='payment_pending'`,
      ).bind(now(), booking.id),
    ]);
    throw error;
  }
}

async function markPayOSPaymentPaid(env, payment, providerData, source) {
  if (!payment) return { found: false, changed: false };
  const amount = Number(providerData.amount ?? providerData.amountPaid);
  if (!Number.isSafeInteger(amount) || amount !== Number(payment.amount)) {
    throw new Error('Số tiền thanh toán không khớp booking');
  }
  const paymentLinkId = String(providerData.paymentLinkId || providerData.id || '');
  if (
    payment.payment_link_id &&
    paymentLinkId &&
    payment.payment_link_id !== paymentLinkId
  ) throw new Error('Mã giao dịch thanh toán không khớp');

  const reference = String(providerData.reference || '').slice(0, 160);

  if (payment.purpose === 'deposit') {
    if (['paid', 'refund_pending', 'refunded'].includes(payment.status)) {
      return { found: true, changed: false };
    }
    const batchResults = await env.DB.batch([
      env.DB.prepare(
        `UPDATE payment_requests
         SET status='paid',provider_reference=?,paid_at=?,failure_reason=NULL,updated_at=?
         WHERE id=? AND status NOT IN ('paid','refund_pending','refunded')`,
      ).bind(reference, now(), now(), payment.id),
    ]);
    const paymentChanged = Number(batchResults[0]?.meta?.changes || 0) > 0;
    if (!paymentChanged) return { found: true, changed: false };

    try {
      await postWalletEntry(env, {
        idempotencyKey: `topup-deposit:${payment.id}`,
        eventType: 'wallet_topup',
        referenceType: 'payment_request',
        referenceId: payment.id,
        note: `Nạp tiền vào Ví doanh nghiệp (#${payment.order_code})`,
        postings: [
          {
            account: walletAccount('system', 'payos', 'cash_clearing'),
            amount: -Number(payment.amount),
          },
          {
            account: walletAccount('business', payment.business_id, 'available'),
            amount: Number(payment.amount),
          },
        ],
      });
    } catch (e) {
      console.error('Wallet topup deposit error:', e?.message || e);
    }

    await audit(
      env,
      'payos',
      'payment.paid',
      payment.id,
      `purpose=deposit source=${source} orderCode=${payment.order_code} amount=${payment.amount}`,
    );
    return { found: true, changed: true };
  }

  const booking = await env.DB.prepare(
    `SELECT b.*,bz.name bizname
     FROM bookings b JOIN businesses bz ON bz.id=b.business_id WHERE b.id=?`,
  ).bind(payment.booking_id).first();
  if (!booking) throw new Error('Không tìm thấy booking của giao dịch');
  if (['paid', 'refund_pending', 'refunded'].includes(payment.status)) {
    return { found: true, changed: false, booking };
  }
  if (payment.purpose === 'final_settlement') {
    if (!booking.post_link) {
      throw new Error('KOC chưa đăng bài nên chưa thể hoàn tất thanh toán');
    }
    const fee = Math.round(Number(payment.amount) * 0.05);
    const kocGet = Number(payment.amount) - fee;
    const batchResults = await env.DB.batch([
      env.DB.prepare(
        `UPDATE payment_requests
         SET status='paid',provider_reference=?,paid_at=?,failure_reason=NULL,updated_at=?
         WHERE id=? AND status NOT IN ('paid','refund_pending','refunded')`,
      ).bind(reference, now(), now(), payment.id),
      env.DB.prepare(
        `INSERT OR IGNORE INTO wallet_tx
         (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`,
      ).bind(
        payment.id,
        booking.koc_id,
        'booking',
        kocGet,
        'settled',
        `Phí booking ${booking.code} (95%)`,
        now(),
      ),
      env.DB.prepare(
        `INSERT OR IGNORE INTO ledger
         (id,kind,amount,ref,note,created_at) VALUES (?,?,?,?,?,?)`,
      ).bind(
        payment.id,
        'service_fee',
        fee,
        booking.id,
        `Phí dịch vụ 5% ${booking.code}`,
        now(),
      ),
      env.DB.prepare(
        `UPDATE kocs SET completed_bookings=completed_bookings+1
         WHERE id=? AND EXISTS (
           SELECT 1 FROM bookings
           WHERE id=? AND status IN ('posted','settling','video_approved','payment_pending','payment_failed','payment_cancelled')
         )`,
      ).bind(booking.koc_id, booking.id),
      env.DB.prepare(
        `UPDATE bookings SET status='completed',escrow=0,updated_at=?
         WHERE id=? AND status IN ('posted','settling','video_approved','payment_pending','payment_failed','payment_cancelled')`,
      ).bind(now(), booking.id),
      env.DB.prepare(
        `UPDATE payment_requests SET status='cancelled',updated_at=?
         WHERE booking_id=? AND id!=? AND status IN ('creating','pending','failed')`,
      ).bind(now(), booking.id, payment.id),
    ]);
    const paymentChanged = Number(batchResults[0]?.meta?.changes || 0) > 0;
    const bookingCompleted = Number(batchResults[4]?.meta?.changes || 0) > 0;
    if (!paymentChanged) return { found: true, changed: false, booking };

    if (kocGet > 0) {
      try {
        await postWalletEntry(env, {
          idempotencyKey: `payos-payout:${payment.id}`,
          eventType: 'booking_settled',
          referenceType: 'payment_request',
          referenceId: payment.id,
          note: `Chuyển tiền booking ${booking.code} vào ví KOC`,
          postings: [
            {
              account: walletAccount('system', 'payos', 'cash_clearing'),
              amount: -Number(payment.amount),
            },
            {
              account: walletAccount('koc', booking.koc_id, 'available'),
              amount: kocGet,
            },
            {
              account: walletAccount('platform', 'netviet', 'revenue'),
              amount: fee,
            },
          ],
        });
      } catch (e) {
        console.error('PayOS wallet settlement error:', e?.message || e);
      }
    }

    await audit(
      env,
      'payos',
      'payment.paid',
      booking.id,
      `purpose=final_settlement source=${source} orderCode=${payment.order_code} amount=${payment.amount}`,
    );
    if (bookingCompleted) {
      await notifyKoc(
        env,
        booking.koc_id,
        'payment',
        'Booking đã được thanh toán',
        `${booking.code} đã hoàn thành · ${kocGet.toLocaleString('vi-VN')}đ được ghi nhận vào ví.`,
        '#/wallet',
      );
      const emailContact = await kocEmailContact(env, booking.koc_id);
      await sendEmailBestEffort('booking.payment_succeeded', emailContact, () =>
        sendPaymentSuccessEmail(env, emailContact.email, {
          kocName: emailContact.name,
          amount: kocGet,
          reference: `Booking ${booking.code}`,
          note: 'Khoản thanh toán đã được ghi nhận vào ví KOC Việt.',
        })
      );
    }
    return {
      found: true,
      changed: true,
      booking: { ...booking, status: bookingCompleted ? 'completed' : booking.status },
    };
  }

  // Compatibility for payment links created by the former upfront-escrow flow.
  const activatedStatus = booking.type === 'aiclone' ? 'brief_review' : 'pending';
  const batchResults = await env.DB.batch([
    env.DB.prepare(
      `UPDATE payment_requests
       SET status='paid',provider_reference=?,paid_at=?,failure_reason=NULL,updated_at=?
       WHERE id=? AND status NOT IN ('paid','refund_pending','refunded')`,
    ).bind(reference, now(), now(), payment.id),
    env.DB.prepare(
      `UPDATE bookings SET status=?,escrow=?,funding_mode='wallet_escrow_v2',updated_at=?
       WHERE id=? AND status IN ('payment_pending','payment_failed','payment_cancelled','quote_sent','quoted','quote_pending')`,
    ).bind(activatedStatus, payment.amount, now(), booking.id),
    env.DB.prepare(
      `UPDATE payment_requests SET status='cancelled',updated_at=?
       WHERE booking_id=? AND id!=? AND status IN ('creating','pending','failed')`,
    ).bind(now(), booking.id, payment.id),
  ]);
  const paymentChanged = Number(batchResults[0]?.meta?.changes || 0) > 0;
  const bookingActivated = Number(batchResults[1]?.meta?.changes || 0) > 0;
  if (!paymentChanged) return { found: true, changed: false, booking };

  try {
    const priceToPay = Number(payment.amount || booking.price || 0);
    if (priceToPay > 0) {
      let avail = await walletBalance(env, 'business', booking.business_id, 'available');
      if (avail < priceToPay) {
        await postWalletEntry(env, {
          idempotencyKey: `topup-payos:${payment.id}:${now()}`,
          eventType: 'wallet_topup',
          referenceType: 'payment_request',
          referenceId: payment.id,
          note: `Nạp tiền ví doanh nghiệp từ thanh toán đơn ${booking.code}`,
          postings: [
            {
              account: walletAccount('system', 'payos', 'cash_clearing'),
              amount: -priceToPay,
            },
            {
              account: walletAccount('business', booking.business_id, 'available'),
              amount: priceToPay,
            },
          ],
        });
      }
      await transferWalletFunds(env, {
        idempotencyKey: `escrow-hold-payos:${payment.id}`,
        eventType: 'escrow_hold',
        referenceType: 'payment_request',
        referenceId: payment.id,
        note: `Giữ tiền an toàn cho đơn booking ${booking.code}`,
        source: walletAccount('business', booking.business_id, 'available'),
        destinations: [{
          account: walletAccount('business', booking.business_id, 'escrow'),
          amount: priceToPay,
        }],
      });
    }
  } catch (e) {
    console.error('payOS payment wallet deduction error:', e?.message || e);
  }

  await audit(
    env,
    'payos',
    'payment.paid',
    booking.id,
    `purpose=legacy_escrow source=${source} orderCode=${payment.order_code} amount=${payment.amount}`,
  );
  if (bookingActivated) {
    if (booking.type === 'aiclone') {
      if (booking.aiclone_batch_id) {
        await env.DB.prepare(
          `UPDATE bookings SET status='brief_review',updated_at=?
           WHERE aiclone_batch_id=? AND status='payment_grouped'`,
        ).bind(now(), booking.aiclone_batch_id).run();
      }
      await notifyAdmins(
        env,
        'aiclone',
        'AI Clone đã thanh toán · sẵn sàng sản xuất',
        `${booking.code} · Hãy kiểm tra brief của doanh nghiệp và sản xuất video.`,
        '#/aiclone',
      );
    } else {
      await notifyKoc(
        env,
        booking.koc_id,
        'booking',
        'Bạn có booking mới',
        `${booking.code} · ${booking.category}`,
        '#/bookings',
      );
      const emailContact = await kocEmailContact(env, booking.koc_id);
      await sendEmailBestEffort('booking.created', emailContact, () =>
        sendBookingCreatedEmail(env, emailContact.email, {
          code: booking.code,
          kocName: emailContact.name,
          businessName: booking.bizname || 'Đối tác',
          type: booking.content_type,
          category: booking.category,
          price: booking.price,
          deadline: booking.deadline || '',
        })
      );
    }
  }
  return {
    found: true,
    changed: true,
    booking: { ...booking, status: bookingActivated ? activatedStatus : booking.status },
  };
}

async function syncPayOSPayment(env, payment) {
  const data = await getPayOSPaymentLink(
    env,
    payment.payment_link_id || payment.order_code,
  );
  const status = String(data.status || '').toUpperCase();
  const paidAmount = Number(data.amountPaid ?? data.amount);
  if (status === 'PAID') {
    if (paidAmount !== Number(payment.amount))
      throw new Error('Số tiền đã nhận không khớp booking');
    await markPayOSPaymentPaid(env, payment, {
      ...data,
      amount: paidAmount,
    }, 'sync');
  } else if (status === 'CANCELLED') {
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE payment_requests SET status='cancelled',updated_at=? WHERE id=? AND status!='paid'`,
      ).bind(now(), payment.id),
      env.DB.prepare(
        `UPDATE bookings SET status='payment_cancelled',updated_at=?
         WHERE id=? AND status IN ('payment_pending','payment_failed')`,
      ).bind(now(), payment.booking_id),
    ]);
  }
  return {
    status: status.toLowerCase(),
    checkoutUrl: payment.checkout_url || data.checkoutUrl || '',
  };
}

export async function route(request, env, url) {
  const p = url.pathname;
  const m = request.method;
  const contentType = request.headers.get("content-type") || "";
  const body =
    m !== "GET" && contentType.includes("application/json")
      ? await request.json().catch(() => ({}))
      : {};

  // ---------- AUTH ----------
  if (p === "/api/login" && m === "POST") {
    const email = String(body.email || '').trim().toLowerCase();
    const loginAllowed =
      await consumeRateLimit(env, 'login-ip', requestIp(request), 20, 15 * 60) &&
      await consumeRateLimit(env, 'login-email', email, 10, 15 * 60);
    if (!loginAllowed) return err('Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.', 429, { 'Retry-After': '900' });
    const u = await env.DB.prepare("SELECT * FROM users WHERE email=?")
      .bind(email)
      .first();
    if (!u || !(await verifyPassword(body.password || "", u.password)))
      return err("Sai email hoặc mật khẩu", 401);
    const demoUser = await isDemoUser(env, u.id);
    if (demoUser && !demoAccountsEnabled(env))
      return err('Tài khoản demo không được bật trong môi trường này.', 403);
    if (u.status === "pending")
      return err("Tài khoản đang chờ admin duyệt. Vui lòng thử lại sau.", 403);
    if (u.status === "rejected")
      return err("Hồ sơ đăng ký chưa được duyệt. Vui lòng liên hệ quản trị viên.", 403);
    if (u.status === "locked")
      return err("Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.", 403);
    if (u.status !== "active")
      return err("Tài khoản chưa được kích hoạt.", 403);
    if (passwordNeedsRehash(u.password)) {
      const passwordHash = await hashPassword(body.password || '');
      await env.DB.prepare('UPDATE users SET password=?,updated_at=? WHERE id=?')
        .bind(passwordHash, now(), u.id).run();
    }
    const setCookie = await createSession(env, request, u, demoUser);
    u._sessionDemo = demoUser;
    return J({ user: safeUser(u) }, 200, { 'Set-Cookie': setCookie });
  }

  if (p === '/api/demo-login' && m === 'POST') {
    if (!demoAccountsEnabled(env)) return err('Tài khoản demo không được bật.', 404);
    const role = String(body.role || '').trim().toLowerCase();
    const u = await getDemoAccount(env, role);
    if (!u) return err('Tài khoản demo không tồn tại.', 404);
    const allowed = await consumeRateLimit(env, 'demo-login-ip', requestIp(request), 30, 15 * 60);
    if (!allowed) return err('Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.', 429, { 'Retry-After': '900' });
    const setCookie = await createSession(env, request, u, true);
    u._sessionDemo = true;
    return J({ user: safeUser(u) }, 200, { 'Set-Cookie': setCookie });
  }

  const me = await sessionUser(env, request);

  if (p === "/api/me") {
    return J({ user: me ? safeUser(me) : null });
  }
  if (p === "/api/logout" && m === "POST") {
    await deleteSession(env, request);
    return J({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request, '', 0) });
  }

  if (p === "/api/change-password" && m === "POST") {
    if (!me) return err("Vui lòng đăng nhập lại", 401);
    if (me._sessionDemo || await isDemoUser(env, me.id))
      return err("Không thể đổi mật khẩu của tài khoản demo", 403);
    const allowed = await consumeRateLimit(
      env,
      "change-password",
      `${me.id}:${requestIp(request)}`,
      5,
      15 * 60,
    );
    if (!allowed)
      return err("Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.", 429, {
        "Retry-After": "900",
      });
    const currentPassword = String(body.current_password || "");
    const newPassword = String(body.new_password || "");
    const passwordError = validatePassword(newPassword);
    if (passwordError) return err(passwordError);
    if (currentPassword === newPassword)
      return err("Mật khẩu mới phải khác mật khẩu hiện tại");
    const user = await env.DB.prepare("SELECT id,password FROM users WHERE id=?")
      .bind(me.id)
      .first();
    if (!user || !(await verifyPassword(currentPassword, user.password)))
      return err("Mật khẩu hiện tại không chính xác", 401);
    const passwordHash = await hashPassword(newPassword);
    await env.DB.prepare(
      "UPDATE users SET password=?,session_version=session_version+1,updated_at=? WHERE id=?",
    )
      .bind(passwordHash, now(), me.id)
      .run();
    await deleteSession(env, request);
    await audit(env, me.id, "account.password_change", me.id, "");
    return J({ ok: true, relogin: true }, 200, {
      "Set-Cookie": sessionCookie(request, "", 0),
    });
  }

  // ---------- Forgot / reset password (email OTP, reuses onboarding's SMTP adapter) ----------
  if (p === "/api/forgot-password" && m === "POST") {
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return err("Email không hợp lệ");
    const allowed =
      await consumeRateLimit(env, 'forgot-ip', requestIp(request), 10, 15 * 60) &&
      await consumeRateLimit(env, 'forgot-email', email, 5, 15 * 60);
    if (!allowed) return err('Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.', 429, { 'Retry-After': '900' });
    const u = await env.DB.prepare("SELECT id FROM users WHERE email=?")
      .bind(email)
      .first();
    // Always send a generic response regardless of whether the account exists — never leak
    // which emails are registered. Only actually send the OTP when the account is real.
    if (u) {
      await createAndSendEmailOtp(env, request, email, "reset");
    }
    return J({ ok: true });
  }
  if (p === "/api/reset-password" && m === "POST") {
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const code = String(body.code || "").trim();
    const password = String(body.password || "");
    const passwordError = validatePassword(password);
    if (passwordError) return err(passwordError);
    if (!code) return err("Nhập mã xác thực");
    const otpResult = await verifyEmailOtp(env, email, code, "reset", request); // one-time use
    if (!otpResult.ok)
      return err(otpResult.error || "Mã xác thực không đúng hoặc đã hết hạn");
    const u = await env.DB.prepare("SELECT id FROM users WHERE email=?")
      .bind(email)
      .first();
    if (!u) return err("Không tìm thấy tài khoản", 404);
    const passwordHash = await hashPassword(password);
    await env.DB.prepare("UPDATE users SET password=?,session_version=session_version+1,updated_at=? WHERE id=?")
      .bind(passwordHash, now(), u.id)
      .run();
    return J({ ok: true });
  }

  // ---------- Business registration (email OTP + admin approval) ----------
  if (p === "/api/business-register/email-otp" && m === "POST") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return err("Email không hợp lệ");
    const existingUser = await env.DB.prepare(
      "SELECT id FROM users WHERE email=? LIMIT 1",
    ).bind(email).first();
    if (existingUser) return err("Email này đã được sử dụng", 409);
    const result = await createAndSendEmailOtp(
      env,
      request,
      email,
      "business_register",
    );
    if (!result.sent)
      return err(
        result.warning || "Chưa gửi được mã OTP. Vui lòng thử lại sau.",
        result.rateLimited || result.cooldown ? 429 : 502,
        result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : undefined,
      );
    return J(result);
  }

  if (p === "/api/business-register" && m === "POST") {
    const email = String(body.email || "").trim().toLowerCase();
    const companyName = String(body.companyName || "").trim().slice(0, 160);
    const contactName = String(body.contactName || "").trim().slice(0, 120);
    const phone = String(body.phone || "").trim().slice(0, 40);
    const industry = String(body.industry || "").trim().slice(0, 120);
    const taxCode = String(body.taxCode || "").trim().slice(0, 40);
    const licenseFile = String(body.licenseFile || "");
    const licenseName = String(body.licenseName || "").trim().slice(0, 180);
    const licenseType = String(body.licenseType || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (companyName.length < 2) return err("Tên doanh nghiệp tối thiểu 2 ký tự");
    if (contactName.length < 2) return err("Tên người liên hệ tối thiểu 2 ký tự");
    if (!/^0\d{9}$/.test(phone))
      return err("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return err("Email không hợp lệ");
    const passwordError = validatePassword(password);
    if (passwordError) return err(passwordError);
    if (!taxCode) return err("Vui lòng nhập mã số thuế");
    if (!/^\d{10}(?:\d{3})?$/.test(taxCode))
      return err("Mã số thuế phải gồm 10 hoặc 13 chữ số");
    const allowedLicenseTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!licenseFile || !licenseName || !allowedLicenseTypes.includes(licenseType))
      return err("Vui lòng tải lên giấy phép kinh doanh hợp lệ");
    const licensePattern = licenseType === "application/pdf"
      ? /^data:application\/pdf;base64,[a-z0-9+/=]+$/i
      : /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i;
    if (!licensePattern.test(licenseFile))
      return err("Định dạng giấy phép kinh doanh không hợp lệ");
    if (licenseFile.length > 4_200_000)
      return err("Giấy phép kinh doanh không được vượt quá 3 MB");

    const existingUser = await env.DB.prepare(
      "SELECT id FROM users WHERE email=? LIMIT 1",
    ).bind(email).first();
    if (existingUser) return err("Email này đã có tài khoản", 409);

    const otpResult = await verifyEmailOtp(
      env,
      email,
      body.code,
      "business_register",
      request,
    );
    if (!otpResult.ok)
      return err(otpResult.error || "Mã OTP không đúng hoặc đã hết hạn");

    const businessId = uid();
    const userId = uid();
    const passwordHash = await hashPassword(password);
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO businesses
         (id,name,email,contact,industry,tax_code,license_file,license_name,license_type,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
      ).bind(
        businessId,
        companyName,
        email,
        `${contactName} · ${phone}`,
        industry,
        taxCode,
        licenseFile,
        licenseName,
        licenseType,
        now(),
      ),
      env.DB.prepare(
        `INSERT INTO users
         (id,email,password,role,name,business_id,status,created_at,updated_at)
         VALUES (?,?,?,'business',?,?,'pending',?,?)`,
      ).bind(
        userId,
        email,
        passwordHash,
        contactName,
        businessId,
        now(),
        now(),
      ),
    ]);
    return J({
      ok: true,
      businessId,
      status: "pending",
      message: "Tài khoản đã được tạo và đang chờ admin duyệt.",
    });
  }

  // ---------- PUBLIC config ----------
  if (p === "/api/config") {
    const tiers = await getTiers(env);
    const demoAccounts = await getDemoAccounts(env);
    const provinces = await getAddressKitProvinces();
    return J({ tiers, categories: CATEGORIES, provinces, demoAccounts });
  }

  // ---------- PUBLIC privacy-safe landing activity ----------
  if (p === "/api/public/koc-activity" && m === "GET") {
    const { results = [] } = await env.DB.prepare(
      `SELECT name,avatar,activity_type,MAX(occurred_at) occurred_at FROM (
         SELECT name,avatar,'registered' activity_type,created_at occurred_at
         FROM kocs
         WHERE status IN ('pending','active')
         UNION ALL
         SELECT k.name,k.avatar,'booking_received' activity_type,b.updated_at occurred_at
         FROM bookings b
         JOIN kocs k ON k.id=b.koc_id
         WHERE b.status='confirmed'
         UNION ALL
         SELECT k.name,k.avatar,'booking_completed' activity_type,b.updated_at occurred_at
         FROM bookings b
         JOIN kocs k ON k.id=b.koc_id
         WHERE b.status='completed'
       )
       GROUP BY name,avatar,activity_type
       ORDER BY occurred_at DESC
       LIMIT 15`,
    ).all();
    const currentNow = now();
    const activities = results.map((item, idx) => ({
      name: publicKocDisplayName(item.name),
      avatar: isUrl(item.avatar) ? item.avatar : "",
      type: item.activity_type,
      // Calculate realistic relative time (1 to 15 minutes ago) so activity updates stay ultra fresh
      occurredAt: currentNow - Math.max(25, 40 + idx * 70 + ((idx * 17) % 35)),
    }));
    return Response.json(
      { activities },
      {
        headers: {
          "Cache-Control": "public, max-age=5, stale-while-revalidate=10",
        },
      },
    );
  }

  // ---------- Authenticated email OTP for wallet withdrawal ----------
  if (p === "/api/otp" && m === "POST") {
    if (!me || me.role !== 'koc') return err('Chưa đăng nhập', 401);
    const koc = await env.DB.prepare('SELECT email FROM kocs WHERE id=?')
      .bind(me.koc_id).first();
    const email = String(koc?.email || me.email || '').trim().toLowerCase();
    if (!email) return err('Tài khoản chưa có email nhận OTP');
    const result = await createAndSendEmailOtp(env, request, email, 'withdraw');
    if (!result.sent)
      return err(
        result.warning || 'Chưa gửi được mã OTP. Vui lòng thử lại sau.',
        result.rateLimited || result.cooldown ? 429 : 502,
        result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : undefined,
      );
    return J(result);
  }

  // ---------- Email OTP (KOC onboarding — Brevo adapter in server/lib) ----------
  if (p === "/api/onboard/email-otp" && m === "POST") {
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return err("Email không hợp lệ");
    const existingUser = await env.DB.prepare(
      "SELECT id FROM users WHERE email=? LIMIT 1",
    ).bind(email).first();
    if (existingUser) return err("Email này đã được sử dụng", 409);
    const r = await createAndSendEmailOtp(env, request, email, "onboard");
    if (!r.sent)
      return err(
        r.warning || "Chưa gửi được mã OTP. Vui lòng thử lại sau.",
        r.rateLimited || r.cooldown ? 429 : 502,
        r.retryAfter ? { 'Retry-After': String(r.retryAfter) } : undefined,
      );
    return J(r);
  }
  if (p === "/api/onboard/email-otp/verify" && m === "POST") {
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const otpResult = await verifyEmailOtp(env, email, body.code, "onboard", request);
    if (!otpResult.ok)
      return err(otpResult.error || "Mã OTP không đúng hoặc đã hết hạn");
    return J(otpResult);
  }
  if (p === "/api/onboard/follower-challenge" && m === "POST") {
    const email = String(body.email || "").trim().toLowerCase();
    const platform = normalizedSocialPlatform(body.platform);
    const handle = String(body.handle || "").trim();
    const claimedFollowers = Number(body.claimedFollowers);
    if (!(await isEmailVerified(env, email, "onboard")))
      return err("Email chưa được xác thực OTP", 403);
    if (!platform)
      return err("Nền tảng phải là TikTok, Facebook, Instagram hoặc YouTube");
    if (
      !normalizedSocialHandle(handle) ||
      handle.length > 200 ||
      /[\r\n]/.test(handle)
    )
      return err("Nhập handle hoặc URL hồ sơ mạng xã hội");
    if (
      !Number.isSafeInteger(claimedFollowers) ||
      claimedFollowers < 0 ||
      claimedFollowers > 2_000_000_000
    )
      return err("Số người theo dõi khai báo không hợp lệ");

    const token = uid().replace(/-/g, "");
    const code = `KOCV-${uid().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    const expiresAt = now() + FOLLOWER_CHALLENGE_TTL_SECONDS;
    await env.KV.put(
      `follower-challenge:${token}`,
      JSON.stringify({
        email,
        platform,
        handle,
        claimedFollowers,
        code,
        expiresAt,
      }),
      { expirationTtl: FOLLOWER_CHALLENGE_TTL_SECONDS },
    );
    return J({ token, code, expiresAt });
  }
  if (p === "/api/onboard/follower-verify" && m === "POST") {
    const challengeToken = String(body.challengeToken || "").trim();
    if (!/^[a-f0-9]{32}$/i.test(challengeToken))
      return err("Mã phiên xác minh không hợp lệ");
    const rawChallenge = await env.KV.get(
      `follower-challenge:${challengeToken}`,
    );
    if (!rawChallenge)
      return err("Mã xác minh đã hết hạn. Hãy tạo mã mới.", 410);

    let challenge;
    try {
      challenge = JSON.parse(rawChallenge);
    } catch (_) {
      return err("Phiên xác minh bị lỗi. Hãy tạo mã mới.", 410);
    }
    if (!(await isEmailVerified(env, challenge.email, "onboard")))
      return err("Phiên xác thực email đã hết hạn", 403);
    if (!(await followerOcrRateAllowed(env, challenge.email)))
      return err(
        "Bạn đã dùng quá 5 lượt xác minh trong một giờ. Vui lòng thử lại sau.",
        429,
      );

    const analysis = analyzeFollowerOcrEvidence({
      ocrText: body.ocrText,
      ocrConfidence: body.ocrConfidence,
      ownershipCode: challenge.code,
      handle: challenge.handle,
      claimedFollowers: challenge.claimedFollowers,
    });
    if (analysis.failedChecks.length) {
      return J(
        {
          error:
            "Hệ thống chưa đọc đủ thông tin. Hãy chụp rõ tên tài khoản, số người theo dõi và mã trong phần giới thiệu rồi thử lại.",
          code: "FOLLOWER_OCR_EVIDENCE_REJECTED",
          failedChecks: analysis.failedChecks,
          analysis: {
            confidence: analysis.confidence,
          },
        },
        422,
      );
    }

    const proofToken = uid().replace(/-/g, "");
    const verifiedAt = now();
    await env.KV.put(
      `follower-proof:${proofToken}`,
      JSON.stringify({
        email: challenge.email,
        platform: challenge.platform,
        handle: challenge.handle,
        followers: challenge.claimedFollowers,
        claimedFollowers: challenge.claimedFollowers,
        confidence: analysis.confidence,
        source: "tesseract_ocr",
        verifiedAt,
      }),
      { expirationTtl: FOLLOWER_PROOF_TTL_SECONDS },
    );
    await env.KV.delete(`follower-challenge:${challengeToken}`);
    return J({
      ok: true,
      proofToken,
      platform: challenge.platform,
      handle: challenge.handle,
      followers: challenge.claimedFollowers,
      claimedFollowers: challenge.claimedFollowers,
      confidence: analysis.confidence,
      verifiedAt,
    });
  }

  // ---------- KOC list / marketplace (server filter+paginate) ----------
  if (p === "/api/kocs") {
    const q = url.searchParams;
    const page = Math.max(1, parseInt(q.get("page") || "1"));
    const per = 6;
    const where = [`status='active'`];
    const bind = [];
    if (q.get("category")) {
      where.push(`categories LIKE ?`);
      bind.push('%"' + q.get("category") + '"%');
    }
    if (q.get("province")) {
      const provinceAliases = provinceFilterAliases(q.get("province"));
      where.push(`province IN (${provinceAliases.map(() => "?").join(",")})`);
      bind.push(...provinceAliases);
    }
    if (q.get("tier")) {
      where.push(`tier=?`);
      bind.push(q.get("tier"));
    }
    if (q.get("minRating")) {
      where.push(`rating>=?`);
      bind.push(Number(q.get("minRating")));
    }
    if (q.get("search")) {
      where.push(`name LIKE ?`);
      bind.push("%" + q.get("search") + "%");
    }
    const w = "WHERE " + where.join(" AND ");
    const total = Number(
      (await env.DB.prepare(`SELECT COUNT(*) c FROM kocs ${w}`)
        .bind(...bind)
        .first("c")) || 0,
    );
    const { results } = await env.DB.prepare(
      `SELECT * FROM kocs ${w} ORDER BY followers DESC, rowid DESC LIMIT ? OFFSET ?`,
    )
      .bind(...bind, per, (page - 1) * per)
      .all();
    const kocs = [];
    for (const r of results) {
      const pr = await env.DB.prepare(
        "SELECT category,price FROM koc_prices WHERE koc_id=?",
      )
        .bind(r.id)
        .all();
      let list = pr.results;
      if (q.get("maxPrice"))
        list = list.filter((x) => x.price <= Number(q.get("maxPrice")));
      const k = parseKoc(r);
      k.prices = pr.results;
      k.minPrice = pr.results.length
        ? Math.min(...pr.results.map((x) => x.price))
        : 0;
      kocs.push(k);
    }
    return J({ kocs, total, page, pages: Math.ceil(total / per) || 1 });
  }

  if (
    p.startsWith("/api/koc/") &&
    !["dashboard", "accepting", "profile", "campaigns"].includes(p.split("/")[3])
  ) {
    const id = p.split("/")[3];
    const r = await env.DB.prepare("SELECT * FROM kocs WHERE id=?")
      .bind(id)
      .first();
    if (!r) return err("Không tìm thấy KOC", 404);
    const pr = await env.DB.prepare(
      "SELECT category,price FROM koc_prices WHERE koc_id=?",
    )
      .bind(id)
      .all();
    const port = await env.DB.prepare(
      `SELECT category,post_platform,post_link,rating FROM bookings WHERE koc_id=? AND post_link IS NOT NULL LIMIT 8`,
    )
      .bind(id)
      .all();
    const rev = await env.DB.prepare(
      `SELECT b.rating,b.review,b.category,bz.name bizname FROM bookings b JOIN businesses bz ON bz.id=b.business_id
       WHERE b.koc_id=? AND b.rating IS NOT NULL ORDER BY b.updated_at DESC, b.rowid DESC LIMIT 10`,
    )
      .bind(id)
      .all();
    const k = parseKoc(r);
    k.prices = pr.results;
    k.portfolio = port.results;
    k.reviews = rev.results;
    return J({ koc: k });
  }

  // ---------- Onboarding ----------
  if (p === "/api/onboard" && m === "POST") {
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    if (!email) return err("Thiếu email");
    const existingUser = await env.DB.prepare(
      "SELECT id FROM users WHERE email=? LIMIT 1",
    ).bind(email).first();
    if (existingUser) return err("Email này đã có tài khoản", 409);
    const password = String(body.password || "");
    const passwordError = validatePassword(password);
    if (passwordError) return err(passwordError);
    const name = String(body.name || "").trim();
    if (name.length < 2) return err("Họ tên tối thiểu 2 ký tự");
    const phone = String(body.phone || "").trim();
    if (!/^0\d{9}$/.test(phone))
      return err("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)");
    const emailOk = await isEmailVerified(env, email, "onboard");
    if (!emailOk) return err("Email chưa được xác thực OTP");
    const kyc = await eKYC.verify(body.kyc || {});
    if (!kyc.ok) return err("Xác minh danh tính chưa thành công");
    const kycFiles = body.kyc?.files || {};
    const identityImage = (value) => {
      const image = String(value || "");
      return /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) && image.length <= 3_000_000
        ? image
        : "";
    };
    const identityImages = {
      front: identityImage(kycFiles.frontPreview),
      back: identityImage(kycFiles.backPreview),
      selfie: identityImage(kycFiles.selfiePreview),
    };
    if (!identityImages.front || !identityImages.back || !identityImages.selfie)
      return err("Ảnh xác minh không hợp lệ hoặc vượt quá dung lượng cho phép");
    const followerProofToken = String(
      body.followerVerificationToken || "",
    ).trim();
    if (!/^[a-f0-9]{32}$/i.test(followerProofToken))
      return err("Bạn cần xác minh số người theo dõi từ ảnh chụp trước khi đăng ký");
    const rawFollowerProof = await env.KV.get(
      `follower-proof:${followerProofToken}`,
    );
    if (!rawFollowerProof)
      return err("Kết quả xác minh số người theo dõi đã hết hạn. Hãy xác minh lại.", 410);
    let followerProof;
    try {
      followerProof = JSON.parse(rawFollowerProof);
    } catch (_) {
      return err("Kết quả xác minh số người theo dõi không hợp lệ", 410);
    }
    if (followerProof.email !== email)
      return err("Kết quả xác minh số người theo dõi không thuộc email này", 403);
    const followers = Number(followerProof.followers);
    if (
      !Number.isSafeInteger(followers) ||
      followers < 0 ||
      followers > 2_000_000_000
    )
      return err("Số người theo dõi đã xác minh không hợp lệ");
    const verifiedSocials = [
      {
        platform: followerProof.platform,
        handle: followerProof.handle,
        followers,
        verified: true,
        verificationSource: followerProof.source,
        verifiedAt: followerProof.verifiedAt,
      },
    ];
    const eng = Number(body.engagement) || 0;
    const tier = tierOf(followers, eng);
    const tiersNow = await getTiers(env);
    const tr = tiersNow.find((t) => t.name === tier);
    // validate prices in tier range
    const prices = body.prices || {};
    for (const [cat, val] of Object.entries(prices)) {
      const v = Number(val);
      if (v < tr.min || v > tr.max)
        return err(
          `Giá ngành "${cat}" (${v.toLocaleString("vi")}đ) ngoài khung ${tier}: ${tr.min.toLocaleString("vi")}–${tr.max.toLocaleString("vi")}đ`,
        );
    }
    const bank = body.bank || {};
    const bankName = String(bank.name || "").trim();
    const bankBin = String(bank.bin || "").trim();
    const bankAccount = String(bank.account || "").trim();
    const bankOwner = String(bank.owner || "").trim();
    if (!bankName) return err("Nhập tên ngân hàng");
    if (!/^\d{6}$/.test(bankBin))
      return err("Mã ngân hàng gồm đúng 6 chữ số");
    if (!/^\d{6,20}$/.test(bankAccount))
      return err("Số tài khoản chỉ gồm chữ số, 6-20 ký tự");
    if (!bankOwner || /\d/.test(bankOwner))
      return err("Nhập tên chủ tài khoản hợp lệ (không chứa số)");
    const contract = body.contract || {};
    const contractSignature = String(contract.signature || "");
    const contractHtml = String(contract.html || "");
    const contractSignedAt = Number(contract.signedAt);
    const contractVersion = "KOC-2026-01";
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(contractSignature))
      return err("Chữ ký hợp đồng không hợp lệ");
    if (contractSignature.length > 500_000)
      return err("Ảnh chữ ký vượt quá dung lượng cho phép");
    if (
      !Number.isFinite(contractSignedAt) ||
      contractSignedAt <= 0 ||
      Math.abs(Date.now() - contractSignedAt) > 24 * 60 * 60 * 1000
    )
      return err("Thời điểm ký hợp đồng không hợp lệ");
    if (
      !contractHtml.includes("HỢP ĐỒNG HỢP TÁC KOC/KOL") ||
      !contractHtml.includes("Chữ ký KOC") ||
      contractHtml.length > 250_000
    )
      return err("Bản hợp đồng điện tử không hợp lệ");
    const sig = await Signature.sign(
      [
        name,
        contractVersion,
        contractSignedAt,
        contractHtml,
        contractSignature,
      ].join("|"),
    );
    const id = uid();
    const userId = uid();
    let identityObjectKeys = {};
    try {
      identityObjectKeys = await uploadKocIdentityImages(env, id, identityImages);
    } catch (error) {
      console.error('S3 identity upload failed:', error?.message || error);
      return err('Không thể tải ảnh xác minh lên kho lưu trữ. Vui lòng thử lại.', 502);
    }
    const passwordHash = await hashPassword(password);
    const cats = body.categories || [];
    const accepting = {};
    cats.forEach((c) => (accepting[c] = true));
    const createKoc = env.DB.prepare(
      `INSERT INTO kocs (id,name,phone,email,tier,province,avatar,bio,followers,followers_verified,followers_verified_at,followers_verification_source,engagement,categories,socials,status,accepting,contract_hash,contract_version,contract_signed_at,contract_signature,contract_html,bank_name,bank_bin,bank_account,bank_owner,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
      .bind(
        id,
        name,
        phone,
        email,
        tier,
        body.province,
        "",
        body.bio || "",
        followers,
        1,
        followerProof.verifiedAt,
        followerProof.source,
        eng,
        JSON.stringify(cats),
        JSON.stringify(verifiedSocials),
        "pending",
        JSON.stringify(accepting),
        sig.hash,
        contractVersion,
        Math.floor(contractSignedAt / 1000),
        contractSignature,
        contractHtml,
        bankName.slice(0, 80),
        bankBin,
        bankAccount.slice(0, 40),
        bankOwner.slice(0, 120),
        now(),
      );
    const stmts = [];
    for (const [cat, val] of Object.entries(prices)) {
      stmts.push(
        env.DB.prepare(
          `INSERT INTO koc_prices (id,koc_id,category,price) VALUES (?,?,?,?)`,
        ).bind(uid(), id, cat, Number(val)),
      );
    }
    const createUser = env.DB.prepare(
      `INSERT INTO users (id,email,password,role,name,koc_id,status,created_at,updated_at)
       VALUES (?,?,?,'koc',?,?,'pending',?,?)`,
    ).bind(userId, email, passwordHash, name, id, now(), now());
    const createIdentityDocuments = env.DB.prepare(
      `INSERT INTO koc_identity_documents
       (koc_id,front_image,back_image,selfie_image,front_object_key,back_object_key,selfie_object_key,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    ).bind(id, '', '', '', identityObjectKeys.front, identityObjectKeys.back, identityObjectKeys.selfie, now(), now());
    const consumeOtp = env.DB.prepare(
      `UPDATE email_otp SET expires_at=?
       WHERE email=? AND purpose='onboard' AND verified=1`,
    ).bind(now(), email);
    try {
      await env.DB.batch([createKoc, createUser, createIdentityDocuments, ...stmts, consumeOtp]);
    } catch (error) {
      await deleteKocIdentityImages(env, identityObjectKeys).catch(() => {});
      throw error;
    }
    try {
      await env.KV.delete(`follower-proof:${followerProofToken}`);
    } catch (_) {}

    return J({
      ok: true,
      tier,
      hash: sig.hash,
      ts: sig.ts,
      kocId: id,
      profileStatus: "pending",
    });
  }

  // ---------- Quote leads (PUBLIC — "Liên hệ nhận báo giá trực tiếp") ----------
  if (p === "/api/lead" && m === "POST") {
    if (!body.name || !body.phone) return err("Nhập tên và số điện thoại");
    const id = uid();
    const esc = (s) =>
      String(s == null ? "" : s).replace(
        /[<>&]/g,
        (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c],
      );
    await env.DB.prepare(
      `INSERT INTO quote_leads (id,name,company,phone,email,need,source,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    )
      .bind(
        id,
        String(body.name).slice(0, 120),
        String(body.company || "").slice(0, 160),
        String(body.phone).slice(0, 40),
        String(body.email || "").slice(0, 160),
        String(body.need || "").slice(0, 800),
        String(body.source || "landing").slice(0, 60),
        "new",
        now(),
        now(),
      )
      .run();
    try {
      await fetch(
        "https://" + request.headers.get("host") + "/__nexrall/email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "sales@netviet.vn",
            subject: "Lead báo giá mới: " + esc(body.name),
            html: `<p>${esc(body.name)} · ${esc(body.phone)} · ${esc(body.company || "")}</p><p>${esc(body.need || "")}</p>`,
          }),
        },
      );
    } catch (e) {
      /* email best-effort */
    }
    await audit(
      env,
      me ? me.id : "guest",
      "lead.create",
      id,
      `phone=${body.phone}`,
    );
    return J({ ok: true, leadId: id });
  }
  // Public config for platforms list (for booking form)
  if (p === "/api/platforms") return J({ platforms: PLATFORMS });

  // payOS calls this route without an application session. The HMAC signature,
  // exact order code, link id, and amount are verified before final settlement.
  if (p === "/api/payos/webhook" && m === "POST") {
    try {
      const data = await verifyPayOSWebhook(env, body);
      if (
        body.success !== true ||
        String(body.code || '') !== '00' ||
        String(data.code || '') !== '00'
      ) return J({ ok: true, ignored: true });

      const orderCode = Number(data.orderCode);
      if (!Number.isSafeInteger(orderCode))
        return err('Webhook payOS có orderCode không hợp lệ');
      const payment = await env.DB.prepare(
        `SELECT * FROM payment_requests WHERE order_code=? LIMIT 1`,
      ).bind(orderCode).first();
      // payOS sends a signed sample while the webhook URL is being confirmed.
      if (!payment) return J({ ok: true, ignored: true });
      await markPayOSPaymentPaid(env, payment, data, 'webhook');
      return J({ ok: true });
    } catch (error) {
      console.warn('payOS webhook rejected', error?.message || error);
      return err(error?.message || 'Webhook payOS không hợp lệ');
    }
  }

  // A short-lived, object-scoped token lets the native video player request a
  // private R2 object without exposing the user's login token in the URL.
  if (p === "/api/booking/video/content" && m === "GET") {
    const token = String(url.searchParams.get("token") || "");
    const submissionId = token
      ? await env.KV.get(`video-access:${token}`)
      : "";
    if (!submissionId) return err("Link video đã hết hạn hoặc không hợp lệ", 401);

    const submission = await env.DB.prepare(
      `SELECT object_key,storage_provider,r2_upload_id,original_name,mime_type,size_bytes
       FROM booking_video_submissions WHERE id=?`,
    ).bind(submissionId).first();
    if (
      !submission ||
      !["r2", "storage", "storage_chunks"].includes(submission.storage_provider) ||
      !submission.object_key
    ) return err("Video không tồn tại", 404);

    if (submission.storage_provider === "storage_chunks") {
      const totalSize = Number(submission.size_bytes);
      const range = requestedByteRange(
        request.headers.get("range"),
        totalSize,
      );
      if (!range) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${totalSize}` },
        });
      }
      const headers = new Headers({
        "Content-Type": submission.mime_type || "video/mp4",
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
        "Content-Length": String(range.end - range.start + 1),
      });
      if (range.partial)
        headers.set(
          "Content-Range",
          `bytes ${range.start}-${range.end}/${totalSize}`,
        );
      if (url.searchParams.get("download") === "1") {
        const encodedName = encodeURIComponent(
          safeVideoFileName(submission.original_name),
        );
        headers.set(
          "Content-Disposition",
          `attachment; filename="video.mp4"; filename*=UTF-8''${encodedName}`,
        );
      }
      return new Response(
        chunkedStorageBody(requireVideoBucket(env), submission, range),
        {
          status: range.partial ? 206 : 200,
          headers,
        },
      );
    }

    let object;
    try {
      const bucket = requireVideoBucket(env);
      try {
        object = await bucket.get(submission.object_key, {
          range: request.headers,
        });
      } catch (rangeError) {
        if (submission.storage_provider !== "storage") throw rangeError;
        object = await bucket.get(submission.object_key);
      }
    } catch (error) {
      console.error("r2 video read", error?.message || error);
      return err("Không tải được video. Vui lòng thử lại sau.", 502);
    }
    if (!object) return err("Video không còn tồn tại.", 404);

    const headers = new Headers();
    if (typeof object.writeHttpMetadata === "function")
      object.writeHttpMetadata(headers);
    headers.set("Content-Type", submission.mime_type || headers.get("Content-Type") || "video/mp4");
    if (object.httpEtag || object.etag)
      headers.set("ETag", object.httpEtag || object.etag);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "private, no-store");
    const objectSize = Number(object.size) || Number(submission.size_bytes) || 0;
    if (object.range) {
      const start = object.range.offset || 0;
      const length = object.range.length || objectSize;
      headers.set("Content-Range", `bytes ${start}-${start + length - 1}/${objectSize}`);
      headers.set("Content-Length", String(length));
    } else if (objectSize) headers.set("Content-Length", String(objectSize));
    if (url.searchParams.get("download") === "1") {
      const encodedName = encodeURIComponent(
        safeVideoFileName(submission.original_name),
      );
      headers.set(
        "Content-Disposition",
        `attachment; filename="video.mp4"; filename*=UTF-8''${encodedName}`,
      );
    }
    const responseBody =
      object.body ??
      (typeof object.arrayBuffer === "function"
        ? await object.arrayBuffer()
        : object);
    return new Response(responseBody, {
      status: object.range ? 206 : 200,
      headers,
    });
  }

  // ---------- everything below needs auth ----------
  if (!me) return err("Chưa đăng nhập", 401);
  const isAdmin = me.role === "admin";

  // ---------- In-app notifications ----------
  if (p === "/api/notifications" && m === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT * FROM notifications WHERE user_id=?
       ORDER BY created_at DESC, rowid DESC LIMIT 100`,
    )
      .bind(me.id)
      .all();
    const unread = results.filter((n) => !n.is_read).length;
    return J({ notifications: results, unread });
  }
  if (p === "/api/notifications/read" && m === "POST") {
    if (body.all) {
      await env.DB.prepare(`UPDATE notifications SET is_read=1 WHERE user_id=?`)
        .bind(me.id)
        .run();
    } else {
      await env.DB.prepare(
        `UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?`,
      )
        .bind(body.id, me.id)
        .run();
    }
    return J({ ok: true });
  }

  if (p === "/api/booking/payment-link" && m === "POST") {
    if (me.role !== 'business') return err('Chỉ doanh nghiệp được thanh toán booking', 403);
    const booking = await env.DB.prepare(
      `SELECT * FROM bookings WHERE id=? AND business_id=?`,
    ).bind(body.booking_id, me.business_id).first();
    if (!booking) return err('Booking không tồn tại', 404);
    if (!(Number(booking.price) > 0))
      return err('Booking này không cần thanh toán trực tuyến');
    const isAiCloneUpfront = booking.type === 'aiclone' && !booking.post_link;
    if (!booking.post_link && !isAiCloneUpfront)
      return err('KOC chưa đăng bài nên booking chưa đến bước thanh toán');
    if (![
      'posted',
      'settling',
      'payment_pending',
      'payment_failed',
      'payment_cancelled',
      'quote_sent',
      'quoted',
      'quote_pending',
    ].includes(booking.status))
      return err('Booking đã được thanh toán hoặc chưa thể tạo yêu cầu thanh toán');

    const latest = await env.DB.prepare(
      `SELECT * FROM payment_requests
       WHERE booking_id=? ORDER BY created_at DESC, rowid DESC LIMIT 1`,
    ).bind(booking.id).first();
    const paymentPurpose = isAiCloneUpfront ? 'escrow' : 'final_settlement';
    if (
      latest?.purpose === paymentPurpose &&
      latest.checkout_url &&
      ['creating', 'pending'].includes(latest.status)
    ) {
      return J({
        ok: true,
        bookingId: booking.id,
        orderCode: latest.order_code,
        checkoutUrl: latest.checkout_url,
        paymentRequired: true,
      });
    }

    const business = await env.DB.prepare(
      `SELECT name,email,contact FROM businesses WHERE id=?`,
    ).bind(me.business_id).first();
    try {
      const payment = await startPayOSCheckout(
        env,
        url,
        booking,
        business,
        paymentPurpose,
      );
      await audit(
        env,
        me.id,
        'payment.checkout_created',
        booking.id,
        `orderCode=${payment.orderCode} amount=${booking.price}`,
      );
      return J({
        ok: true,
        bookingId: booking.id,
        orderCode: payment.orderCode,
        checkoutUrl: payment.checkoutUrl,
        qrCode: payment.qrCode,
        paymentRequired: true,
      });
    } catch (error) {
      return err(error?.message || 'Chưa tạo được yêu cầu thanh toán', 502);
    }
  }

  if (p === "/api/booking/payment/status" && m === "POST") {
    if (!['business', 'admin'].includes(me.role))
      return err('Không có quyền xem thanh toán booking', 403);
    const orderCode = Number(body.order_code);
    if (!Number.isSafeInteger(orderCode)) return err('orderCode không hợp lệ');
    const payment = await env.DB.prepare(
      `SELECT p.* FROM payment_requests p
       WHERE p.order_code=? AND (?='admin' OR p.business_id=?) LIMIT 1`,
    ).bind(orderCode, me.role, me.business_id || '').first();
    if (!payment) return err('Không tìm thấy giao dịch', 404);
    try {
      const result = await syncPayOSPayment(env, payment);
      return J({ ok: true, ...result, orderCode });
    } catch (error) {
      return err(error?.message || 'Chưa cập nhật được trạng thái thanh toán', 502);
    }
  }

  if (p === "/api/booking/payment/demo-paid" && m === "POST") {
    if (me.role !== "business") return err("Chỉ doanh nghiệp được xác nhận thanh toán demo", 403);
    if (!canUseDemoPayment(env, me, url))
      return err("Thanh toán demo không được bật trên môi trường này", 403);
    const booking = await env.DB.prepare(
      `SELECT * FROM bookings WHERE id=? AND business_id=?`,
    ).bind(body.booking_id, me.business_id).first();
    if (!booking) return err("Booking không tồn tại", 404);
    if (booking.type !== "aiclone")
      return err("Nút demo chỉ áp dụng cho booking AI Clone Avatar");
    if (!["payment_pending", "payment_failed", "payment_cancelled", "quote_sent", "quoted", "quote_pending"].includes(booking.status))
      return err("Booking không ở trạng thái chờ thanh toán");
    let payment = await env.DB.prepare(
      `SELECT * FROM payment_requests
       WHERE booking_id=? AND COALESCE(purpose,'escrow')='escrow'
       ORDER BY created_at DESC,rowid DESC LIMIT 1`,
    ).bind(booking.id).first();
    if (!payment) {
      const orderCode = newPayOSOrderCode();
      const amount = Number(booking.price || booking.aiclone_production_fee || 100000);
      const paymentId = uid();
      await env.DB.prepare(
        `INSERT INTO payment_requests (id, booking_id, business_id, provider, order_code, amount, status, purpose, created_at, updated_at)
         VALUES (?, ?, ?, 'payos', ?, ?, 'pending', 'escrow', ?, ?)`,
      ).bind(paymentId, booking.id, me.business_id, orderCode, amount, now(), now()).run();
      payment = await env.DB.prepare(`SELECT * FROM payment_requests WHERE id=?`).bind(paymentId).first();
    }
    const result = await markPayOSPaymentPaid(
      env,
      payment,
      {
        amount: Number(payment.amount),
        paymentLinkId: payment.payment_link_id || "",
        reference: `DEMO-${payment.order_code}`,
      },
      "demo_button",
    );
    return J({ ok: true, status: result.booking?.status || "pending" });
  }

  // ---------- AI Clone booking wizard (business) ----------
  if (p === "/api/aiclone/eligible-kocs" && m === "GET") {
    if (me.role !== "business") return err("Chỉ doanh nghiệp được chọn KOC AI Clone", 403);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const per = Math.min(24, Math.max(6, Number(url.searchParams.get("per") || 12)));
    const q = String(url.searchParams.get("q") || "").trim();
    const tier = String(url.searchParams.get("tier") || "").trim();
    const province = String(url.searchParams.get("province") || "").trim();
    const category = String(url.searchParams.get("category") || "").trim();
    const where = ["k.status='active'", "EXISTS(SELECT 1 FROM aiclone ar WHERE ar.koc_id=k.id)"];
    const binds = [];
    if (q) {
      where.push("(k.name LIKE ? OR k.bio LIKE ?)");
      binds.push(`%${q}%`, `%${q}%`);
    }
    if (tier) {
      where.push("k.tier=?");
      binds.push(tier);
    }
    if (province) {
      const provinceAliases = provinceFilterAliases(province);
      where.push(`k.province IN (${provinceAliases.map(() => "?").join(",")})`);
      binds.push(...provinceAliases);
    }
    if (category) {
      where.push("EXISTS(SELECT 1 FROM koc_prices fp WHERE fp.koc_id=k.id AND fp.category=?)");
      binds.push(category);
    }
    const whereSql = where.join(" AND ");
    const total = Number(
      await env.DB.prepare(`SELECT COUNT(*) c FROM kocs k WHERE ${whereSql}`)
        .bind(...binds)
        .first("c"),
    ) || 0;
    const { results } = await env.DB.prepare(
      `SELECT k.id,k.name,k.avatar,k.tier,k.province,k.categories,k.followers,k.rating,
              CASE WHEN EXISTS(SELECT 1 FROM aiclone ar WHERE ar.koc_id=k.id) THEN 1 ELSE 0 END ai_clone_ready,
              p.category,p.price
       FROM kocs k
       LEFT JOIN koc_prices p ON p.koc_id=k.id
       WHERE k.id IN (
         SELECT pk.id FROM kocs pk
         WHERE ${whereSql.replaceAll("k.", "pk.")}
         ORDER BY pk.created_at DESC,pk.rowid DESC LIMIT ? OFFSET ?
       )
       ORDER BY k.created_at DESC,k.rowid DESC,p.category`,
    ).bind(...binds, per, (page - 1) * per).all();
    const byId = new Map();
    for (const row of results) {
      if (!byId.has(row.id)) {
        byId.set(row.id, {
          id: row.id,
          name: row.name,
          avatar: row.avatar,
          tier: row.tier,
          province: row.province,
          followers: Number(row.followers || 0),
          rating: Number(row.rating || 0),
          ai_clone_ready: Boolean(row.ai_clone_ready),
          categories: JSON.parse(row.categories || "[]"),
          prices: [],
        });
      }
      if (row.category) byId.get(row.id).prices.push({
        category: row.category,
        price: Number(row.price || 0),
      });
    }
    return J({
      kocs: [...byId.values()],
      page,
      per,
      total,
      pages: Math.max(1, Math.ceil(total / per)),
      filters: {
        tiers: TIERS.map(item => item.name),
        provinces: await getAddressKitProvinces(),
        categories: CATEGORIES,
      },
      aiProductionPricing: AI_VIDEO_PRICING,
    });
  }

  if (p === "/api/aiclone/bookings" && m === "POST") {
    if (me.role !== "business") return err("Chỉ doanh nghiệp được tạo booking AI Clone", 403);
    const kocIds = Array.isArray(body.koc_ids)
      ? [...new Set(body.koc_ids.map(String).filter(Boolean))].slice(0, 10)
      : [];
    if (!kocIds.length) return err("Chọn ít nhất 1 KOC");
    const format = String(body.format || "");
    if (!["review", "affiliate", "combo"].includes(format))
      return err("Loại nội dung AI Clone không hợp lệ");
    const category = String(body.category || "").trim().slice(0, 120);
    if (!category) return err("Chọn ngành hàng");
    const productLink = String(body.product_link || "").trim();
    if (!isUrl(productLink)) return err("Link thông tin sản phẩm không hợp lệ");
    const requirements = String(body.requirements || "").trim().slice(0, 1600);
    if (requirements.length < 10) return err("Brief cần ít nhất 10 ký tự");
    const message = String(body.message || "").trim().slice(0, 500);
    const scope = String(body.scope || "standard");
    const videoQuantity = Number(body.video_quantity || 1);
    if (!AI_VIDEO_PRICING[scope]) return err("Quy mô video AI không hợp lệ");
    if (!Number.isSafeInteger(videoQuantity) || videoQuantity < 1 || videoQuantity > 100)
      return err("Số lượng video phải từ 1 đến 100");
    const productionFee = Math.round(
      AI_VIDEO_PRICING[scope].unitPrice * videoQuantity * (1 - aiVolumeDiscount(videoQuantity)),
    );
    const deadline = String(body.deadline || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return err("Thời hạn không hợp lệ");
    const hasAffiliate = format === "affiliate" || format === "combo";
    const platform = hasAffiliate ? String(body.platform || "") : null;
    const productUrl = hasAffiliate ? String(body.product_url || "").trim() : null;
    const commissionRate = hasAffiliate ? Number(body.commission_rate) : 0;
    if (hasAffiliate) {
      if (!PLATFORMS.includes(platform)) return err("Chọn sàn áp dụng hợp lệ");
      if (!isUrl(productUrl)) return err("Link sản phẩm trên sàn không hợp lệ");
      if (!(commissionRate >= 1 && commissionRate <= 90))
        return err("Tỉ lệ hoa hồng bán hàng phải từ 1–90%");
    }

    const placeholders = kocIds.map(() => "?").join(",");
    const { results: selected } = await env.DB.prepare(
      `SELECT k.id,k.name,p.price
       FROM kocs k
       LEFT JOIN koc_prices p ON p.koc_id=k.id AND p.category=?
       WHERE k.id IN (${placeholders}) AND k.status='active'
         AND EXISTS(SELECT 1 FROM aiclone registered_ai WHERE registered_ai.koc_id=k.id)`,
    ).bind(category, ...kocIds).all();
    if (selected.length !== kocIds.length)
      return err("Một hoặc nhiều KOC không còn hoạt động");

    const batchId = uid();
    const created = [];
    const statements = [];
    for (const koc of selected) {
      const kocFee = format === "affiliate" ? 0 : Number(koc.price || 0);
      if (format !== "affiliate" && kocFee <= 0)
        return err(`${koc.name} chưa có bảng giá cho ngành ${category}`);
      const platformFee = Math.round((kocFee + productionFee) * 0.05);
      const estimatedPrice = kocFee + productionFee + platformFee;
      const id = uid();
      const code = "AI" + Math.floor(100000 + Math.random() * 899999);
      const bookingType = format === "review" ? "ad" : format;
      const status = "quote_pending";
      statements.push(
        env.DB.prepare(
          `INSERT INTO bookings
           (id,code,business_id,koc_id,category,price,escrow,product_link,requirements,
            deadline,status,type,booking_type,content_type,platform,product_url,
            commission_rate,platform_fee_rate,aiclone_format,aiclone_message,
            aiclone_batch_id,aiclone_scope,aiclone_video_quantity,aiclone_production_fee,aiclone_platform_fee,
            created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        ).bind(
          id, code, me.business_id, koc.id, category, 0, 0, productLink,
          requirements, deadline, status, "aiclone", bookingType, "review",
          platform, productUrl, commissionRate, 0.01, format, message, batchId,
          scope, videoQuantity, productionFee, platformFee,
          now(), now(),
        ),
      );
      created.push({
        id, code, koc_id: koc.id, koc_name: koc.name, price: 0,
        estimated_price: estimatedPrice, koc_fee: kocFee,
        production_fee: productionFee, platform_fee: platformFee, status,
      });
    }
    await env.DB.batch(statements);
    for (const booking of created) {
      await audit(env, me.id, "aiclone.booking_create", booking.id, `batch=${batchId} format=${format}`);
    }
    await notifyAdmins(
      env,
      "aiclone_quote",
      "Có yêu cầu báo giá AI Clone mới",
      `${created.length} yêu cầu trong lô ${batchId} · Hãy kiểm tra brief và gửi báo giá cho doanh nghiệp.`,
      "#/aiclone",
    );
    return J({
      ok: true,
      batchId,
      bookings: created,
      quotePending: true,
      paymentRequired: false,
    });
  }

  // ---------- Booking delete ----------
  if (p === "/api/booking/delete" && m === "POST") {
    const code = String(body.code || body.booking_id || "").trim();
    if (!code) return err("Nhập mã hoặc ID booking cần xóa");
    const ok = await deleteBookingByCode(env, code);
    if (!ok) return err("Không tìm thấy booking " + code, 404);
    await audit(env, me.id, "booking.delete", code, `deleted_by=${me.id}`);
    return J({ ok: true, deleted: code });
  }

  // ---------- Booking create (business) ----------
  if (p === "/api/booking" && m === "POST") {
    if (me.role !== "business")
      return err("Chỉ doanh nghiệp mới đặt booking", 403);
    if (!body.product_link || !body.product_link.trim())
      return err("Bắt buộc nhập link dữ liệu sản phẩm");
    if (!isUrl(body.product_link))
      return err(
        "Link dữ liệu sản phẩm không hợp lệ (phải bắt đầu bằng http:// hoặc https://)",
      );
    if (!body.category) return err("Chọn ngành hàng");
    const koc = await env.DB.prepare("SELECT * FROM kocs WHERE id=?")
      .bind(body.koc_id)
      .first();
    if (!koc) return err("KOC không tồn tại", 404);
    // `booking_type` remains compatible with legacy `ad`, while content_type makes
    // fixed-fee Review and Quảng cáo visibly distinct in every portal.
    const requestedType = String(body.booking_type || "review");
    const bt = ["affiliate", "combo"].includes(requestedType)
      ? requestedType
      : "ad";
    const contentType =
      bt === "ad"
        ? ["review", "advertising"].includes(requestedType)
          ? requestedType
          : ["review", "advertising"].includes(body.content_type)
            ? body.content_type
            : "review"
        : bt;
    let price = 0;
    if (bt === "ad" || bt === "combo") {
      const priceRow = await env.DB.prepare(
        "SELECT price FROM koc_prices WHERE koc_id=? AND category=?",
      )
        .bind(body.koc_id, body.category)
        .first();
      if (!priceRow) return err("Ngành hàng không có bảng giá");
      // PostgreSQL returns BIGINT columns as strings.  Wallet transfers require
      // an actual safe integer, so normalize the listed price before comparing
      // balances or creating the available -> escrow ledger entry.
      price = Number(priceRow.price);
      if (!Number.isSafeInteger(price) || price <= 0)
        return err("Giá booking không hợp lệ");
    }
    let commission_rate = 0,
      platform = null,
      product_url = null;
    if (bt === "affiliate" || bt === "combo") {
      commission_rate = Number(body.commission_rate);
      if (!(commission_rate > 0 && commission_rate <= 90))
        return err("Tỉ lệ chiết khấu (%) phải trong khoảng 1–90");
      platform = body.platform;
      if (!PLATFORMS.includes(platform)) return err("Chọn sàn áp dụng hợp lệ");
      product_url = (body.product_url || "").trim();
      if (!product_url) return err("Bắt buộc nhập link sản phẩm gốc trên sàn");
      if (!isUrl(product_url))
        return err("Link sản phẩm gốc trên sàn không hợp lệ");
    }
    if (body.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.deadline)))
      return err("Thời hạn không hợp lệ");
    const id = uid();
    const pfx =
      bt === "affiliate"
        ? "AF"
        : bt === "combo"
          ? "CB"
          : contentType === "advertising"
            ? "QC"
            : "RV";
    const code = pfx + Math.floor(100000 + Math.random() * 899999);
    const initialStatus = 'pending';

    if (price > 0) {
      const avail = await walletBalance(env, 'business', me.business_id, 'available');
      if (avail < price) {
        return err(
          `Ví khả dụng của doanh nghiệp không đủ số dư để đặt booking (${avail.toLocaleString('vi-VN')}đ / ${price.toLocaleString('vi-VN')}đ). Vui lòng nạp thêm tiền vào ví khả dụng.`,
          400,
        );
      }
      try {
        await transferWalletFunds(env, {
          idempotencyKey: `escrow-hold:${id}`,
          eventType: 'escrow_hold',
          referenceType: 'booking',
          referenceId: id,
          note: `Giữ tiền an toàn cho đơn booking ${code}`,
          source: walletAccount('business', me.business_id, 'available'),
          destinations: [{
            account: walletAccount('business', me.business_id, 'escrow'),
            amount: price,
          }],
        });
      } catch (e) {
        return err(`Chưa thể giữ khoản thanh toán từ số dư khả dụng: ${e.message}`, 400);
      }
    }

    await env.DB.prepare(
      `INSERT INTO bookings (id,code,business_id,koc_id,category,price,escrow,funding_mode,product_link,requirements,deadline,status,type,booking_type,content_type,platform,product_url,commission_rate,platform_fee_rate,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id,code,me.business_id,body.koc_id,body.category,
      price,price,price > 0 ? 'wallet_escrow_v2' : null,body.product_link.trim(),body.requirements||'',body.deadline||'',
      initialStatus,'marketplace',bt,contentType,platform,product_url,commission_rate,0.01,now(),now()).run();
    await audit(env, me.id, 'booking.create', id, `type=${contentType} price=${price} rate=${commission_rate}`);
    const business = await env.DB.prepare(
      'SELECT name,email,contact FROM businesses WHERE id=?',
    ).bind(me.business_id).first();
    await notifyKoc(env, body.koc_id, 'booking', 'Bạn có booking mới',
      `${code} · ${body.category}`,
      '#/bookings');
    const emailContact = await kocEmailContact(env, koc.id, koc);
    await sendEmailBestEffort('booking.created', emailContact, () =>
      sendBookingCreatedEmail(env, emailContact.email, {
        code,
        kocName: emailContact.name,
        businessName: business?.name || me.name || 'Đối tác',
        type: contentType,
        category: body.category,
        price,
        deadline: body.deadline || '',
      })
    );
    return J({
      ok: true,
      bookingId: id,
      escrow: 0,
      paymentRequired: false,
      booking_type: bt,
      content_type: contentType,
    });
  }

  // ---------- Bookings list (role-scoped) ----------
  if (p === "/api/bookings") {
    let sql = `SELECT b.*, bz.name bizname, k.name kocname, k.avatar kocavatar,
                 EXISTS(SELECT 1 FROM aiclone ar WHERE ar.koc_id=k.id) koc_ai_clone,
                 v.id video_submission_id, v.stream_uid video_stream_uid,
                 v.version video_version, v.status video_status,
                 v.original_name video_original_name, v.size_bytes video_size_bytes,
                 v.preview_url video_preview_url, v.thumbnail_url video_thumbnail_url,
                 v.download_url video_download_url, v.duration video_duration,
                 v.review_note video_review_note,
                 pr.status payment_status, pr.order_code payment_order_code,
                 pr.checkout_url payment_checkout_url, pr.failure_reason payment_failure_reason,
                 EXISTS(
                   SELECT 1 FROM payment_requests lp
                   WHERE lp.booking_id=b.id AND lp.status='paid'
                     AND COALESCE(lp.purpose,'escrow')='escrow'
                 ) legacy_paid_escrow
               FROM bookings b
               JOIN businesses bz ON bz.id=b.business_id
               JOIN kocs k ON k.id=b.koc_id
               LEFT JOIN booking_video_submissions v ON v.id=(
                 SELECT bv.id FROM booking_video_submissions bv
                 WHERE bv.booking_id=b.id
                 ORDER BY bv.version DESC, bv.created_at DESC LIMIT 1
               )
               LEFT JOIN payment_requests pr ON pr.id=(
                 SELECT bp.id FROM payment_requests bp
                 WHERE bp.booking_id=b.id
                 ORDER BY bp.created_at DESC, bp.rowid DESC LIMIT 1
               )`;
    const bind = [];
    const cond = [];
    if (me.role === "business") {
      cond.push("b.business_id=?");
      bind.push(me.business_id);
    } else if (me.role === "koc") {
      cond.push("b.koc_id=?");
      bind.push(me.koc_id);
      cond.push(
        `(b.status NOT IN ('payment_pending','payment_failed','payment_cancelled')
          OR COALESCE(b.post_link,'')!='')`,
      );
      cond.push(
        `(b.type!='aiclone'
          OR COALESCE(b.koc_video_link,'')!=''
          OR b.status IN ('video_approved','posted','settling','completed'))`,
      );
    }
    const st = url.searchParams.get("status");
    if (st) {
      cond.push("b.status=?");
      bind.push(st);
    }
    const bt2 = url.searchParams.get("type");
    if (bt2 === "aiclone") {
      cond.push("b.type='aiclone'");
    } else if (["review", "advertising"].includes(bt2)) {
      cond.push(
        `b.type!='aiclone' AND COALESCE(b.booking_type,'ad')='ad' AND COALESCE(b.content_type,'review')=?`,
      );
      bind.push(bt2);
    } else if (bt2) {
      cond.push("b.booking_type=?");
      bind.push(bt2);
    }
    const q2 = url.searchParams.get("q");
    if (q2) {
      cond.push("(b.code LIKE ? OR bz.name LIKE ? OR k.name LIKE ?)");
      bind.push("%" + q2 + "%", "%" + q2 + "%", "%" + q2 + "%");
    }
    const bizName = url.searchParams.get("business");
    if (bizName) {
      cond.push("bz.name LIKE ?");
      bind.push("%" + bizName + "%");
    }
    const kocName = url.searchParams.get("koc");
    if (kocName) {
      cond.push("k.name LIKE ?");
      bind.push("%" + kocName + "%");
    }
    const bookingId = url.searchParams.get("id");
    if (bookingId) {
      cond.push("b.id=?");
      bind.push(bookingId);
    }
    const batchId = url.searchParams.get("batch");
    if (batchId) {
      cond.push("b.aiclone_batch_id=?");
      bind.push(batchId);
    }
    const from = url.searchParams.get("from");
    if (from) {
      cond.push("b.created_at>=?");
      bind.push(Number(from));
    }
    const to = url.searchParams.get("to");
    if (to) {
      cond.push("b.created_at<=?");
      bind.push(Number(to));
    }
    const whereSql = cond.length ? " WHERE " + cond.join(" AND ") : "";
    sql += whereSql;
    let page = 1;
    let per = 200;
    let total = 0;
    const paginated = me.role === "business" || me.role === "admin";
    if (paginated) {
      const requestedPage = Math.max(1, Number(url.searchParams.get("page") || 1));
      per = Math.min(50, Math.max(5, Number(url.searchParams.get("per") || 10)));
      total = Number(await env.DB.prepare(
        `SELECT COUNT(*) c FROM bookings b JOIN businesses bz ON bz.id=b.business_id JOIN kocs k ON k.id=b.koc_id${whereSql}`,
      ).bind(...bind).first("c")) || 0;
      page = Math.min(requestedPage, Math.max(1, Math.ceil(total / per)));
      sql += " ORDER BY b.created_at DESC, b.rowid DESC LIMIT ? OFFSET ?";
    } else {
      sql += " ORDER BY b.created_at DESC, b.rowid DESC LIMIT 200";
    }
    const { results } = await env.DB.prepare(sql)
      .bind(...bind, ...(paginated ? [per, (page - 1) * per] : []))
      .all();
    for (const r of results) {
      const aff = await env.DB.prepare(
        "SELECT * FROM affiliate WHERE booking_id=?",
      )
        .bind(r.id)
        .first();
      r.affiliate = aff || null;
    }
    return J({
      bookings: results,
      page,
      per,
      total: paginated ? total : results.length,
      pages: paginated ? Math.max(1, Math.ceil(total / per)) : 1,
      demoPaymentAllowed: me.role === "business" && canUseDemoPayment(env, me, url),
    });
  }

  // ---------- Cloudflare R2 video approval flow ----------
  if (p === "/api/booking/video/upload-url" && m === "POST") {
    if (me.role !== "koc") return err("Chỉ KOC được tải video lên", 403);
    const booking = await env.DB.prepare("SELECT * FROM bookings WHERE id=?")
      .bind(body.booking_id)
      .first();
    if (!booking || booking.koc_id !== me.koc_id)
      return err("Booking không tồn tại", 404);
    if (!["producing", "revision_requested"].includes(booking.status))
      return err("Booking chưa ở bước cho phép tải video");

    const fileName = String(body.file_name || "").trim().slice(0, 180);
    const mimeType = String(body.mime_type || "").trim().slice(0, 100);
    const fileSize = Number(body.file_size);
    const duration = Number(body.duration);
    const videoExtension = /\.(mp4|m4v|webm)$/i.test(fileName);
    if (
      !fileName ||
      (!["video/mp4", "video/webm"].includes(mimeType) && !videoExtension)
    ) return err("Chỉ chấp nhận video MP4 hoặc WebM");
    if (!Number.isSafeInteger(fileSize) || fileSize <= 0)
      return err("Dung lượng video không hợp lệ");
    if (fileSize > MAX_R2_UPLOAD_BYTES)
      return err("Video vượt quá giới hạn 5 GB");
    if (!Number.isFinite(duration) || duration <= 0 || duration > 300)
      return err("Video phải có thời lượng tối đa 5 phút");

    const latest = await env.DB.prepare(
      `SELECT * FROM booking_video_submissions
       WHERE booking_id=? ORDER BY version DESC, created_at DESC LIMIT 1`,
    ).bind(booking.id).first();
    if (
      latest?.status === "uploading" &&
      latest.storage_provider === "storage_chunks" &&
      latest.original_name === fileName &&
      Number(latest.size_bytes) === fileSize &&
      latest.mime_type === mimeType
    ) {
      return J({
        submission_id: latest.id,
        upload_url: `/api/booking/video/upload-part?submission_id=${encodeURIComponent(latest.id)}`,
        upload_method: "storage_chunks",
        chunk_size: storageChunkSize(latest),
        version: latest.version,
        resumed: true,
      });
    }
    if (latest && ["uploading", "processing", "pending_review", "approved"].includes(latest.status))
      return err("Booking đã có video đang tải, chờ duyệt hoặc đã duyệt");

    const version = Number(latest?.version || 0) + 1;
    const submissionId = uid();
    const objectKey = videoObjectKey(
      booking.id,
      version,
      submissionId,
      fileName,
    );
    let uploadId = "";
    let storageProvider = "";
    let uploadMethod = "";
    let bucket;
    try {
      bucket = requireVideoBucket(env);
      if (supportsR2Multipart(bucket)) {
        const multipart = await bucket.createMultipartUpload(objectKey, {
          httpMetadata: { contentType: mimeType || "video/mp4" },
          customMetadata: {
            bookingId: booking.id,
            submissionId,
            uploaderId: me.id,
            version: String(version),
          },
        });
        uploadId = multipart.uploadId;
        storageProvider = "r2";
        uploadMethod = "r2_multipart";
      } else if (supportsDirectStorage(bucket)) {
        uploadId = `chunks:${STORAGE_PART_SIZE}`;
        storageProvider = "storage_chunks";
        uploadMethod = "storage_chunks";
      } else {
        const error = new Error(
          "Kho lưu trữ hiện không hỗ trợ tải video.",
        );
        error.code = "R2_CONFIGURATION_MISSING";
        throw error;
      }
    } catch (error) {
      console.error("video upload create", error?.message || error);
      return err(
        error?.message || "Không tạo được phiên tải video",
        error?.code === "R2_CONFIGURATION_MISSING" ? 503 : 502,
      );
    }

    await env.DB.prepare(
      `INSERT INTO booking_video_submissions
       (id,booking_id,stream_uid,storage_provider,object_key,r2_upload_id,
        version,status,original_name,mime_type,size_bytes,duration,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      submissionId,
      booking.id,
      `${storageProvider}:${objectKey}`,
      storageProvider,
      objectKey,
      uploadId,
      version,
      "uploading",
      fileName,
      mimeType,
      fileSize,
      duration,
      now(),
      now(),
    ).run();
    await audit(
      env,
      me.id,
      "booking.video_upload_created",
      booking.id,
      `submission=${submissionId} version=${version} size=${fileSize}`,
    );
    return J({
      submission_id: submissionId,
      upload_url: `/api/booking/video/upload-part?submission_id=${encodeURIComponent(submissionId)}`,
      upload_method: uploadMethod,
      chunk_size:
        uploadMethod === "r2_multipart"
          ? R2_PART_SIZE
          : STORAGE_PART_SIZE,
      version,
    });
  }

  if (p === "/api/booking/video/upload-part" && m === "PUT") {
    if (me.role !== "koc") return err("Chỉ KOC được tải video lên", 403);
    const submissionId = String(url.searchParams.get("submission_id") || "");
    const partNumber = Number(url.searchParams.get("part_number"));
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000)
      return err("Số thứ tự phần tải lên không hợp lệ");
    const submission = await env.DB.prepare(
      `SELECT v.*,b.koc_id FROM booking_video_submissions v
       JOIN bookings b ON b.id=v.booking_id WHERE v.id=?`,
    ).bind(submissionId).first();
    if (!submission || submission.koc_id !== me.koc_id)
      return err("Phiên tải video không tồn tại", 404);
    if (
      !["r2", "storage", "storage_chunks"].includes(submission.storage_provider) ||
      !submission.object_key ||
      !submission.r2_upload_id ||
      submission.status !== "uploading"
    ) return err("Phiên tải video không còn hiệu lực");
    if (!request.body) return err("Phần video tải lên bị rỗng");

    try {
      const bucket = requireVideoBucket(env);
      let uploaded;
      if (submission.storage_provider === "r2") {
        const multipart = bucket.resumeMultipartUpload(
          submission.object_key,
          submission.r2_upload_id,
        );
        uploaded = await multipart.uploadPart(partNumber, request.body);
      } else if (submission.storage_provider === "storage") {
        if (partNumber !== 1)
          return err("Kho lưu trữ chỉ nhận video được tải trực tiếp");
        if (!supportsDirectStorage(bucket))
          return err("Kho lưu trữ hiện không hỗ trợ tải video", 503);
        const stored = await bucket.put(submission.object_key, request.body, {
          httpMetadata: {
            contentType: submission.mime_type || "video/mp4",
          },
          customMetadata: {
            bookingId: submission.booking_id,
            submissionId: submission.id,
          },
        });
        uploaded = {
          partNumber: 1,
          etag: stored?.etag || stored?.httpEtag || `direct-${submission.id}`,
        };
      } else {
        if (!supportsDirectStorage(bucket))
          return err("Kho lưu trữ hiện không hỗ trợ tải video", 503);
        const expectedParts = storagePartCount(submission);
        if (partNumber > expectedParts)
          return err("Số thứ tự phần video vượt quá giới hạn");
        const stored = await bucket.put(
          storagePartKey(submission.object_key, partNumber),
          request.body,
          {
            httpMetadata: { contentType: "application/octet-stream" },
            customMetadata: {
              bookingId: submission.booking_id,
              submissionId: submission.id,
              partNumber: String(partNumber),
            },
          },
        );
        uploaded = {
          partNumber,
          etag:
            stored?.etag ||
            stored?.httpEtag ||
            `chunk-${submission.id}-${partNumber}`,
        };
      }
      return J({
        partNumber: uploaded.partNumber,
        etag: uploaded.etag,
      });
    } catch (error) {
      console.error("video storage upload", error?.message || error);
      return err("Không tải được video. Vui lòng thử lại.", 502);
    }
  }

  if (p === "/api/booking/video/complete" && m === "POST") {
    if (me.role !== "koc") return err("Chỉ KOC được xác nhận tải video", 403);
    const submission = await env.DB.prepare(
      `SELECT v.*,b.koc_id,b.business_id,b.code,b.status booking_status
       FROM booking_video_submissions v JOIN bookings b ON b.id=v.booking_id
       WHERE v.id=?`,
    ).bind(body.submission_id).first();
    if (!submission || submission.koc_id !== me.koc_id)
      return err("Video không tồn tại", 404);
    if (submission.status !== "uploading")
      return err("Phiên tải video không còn hiệu lực");
    if (
      !["r2", "storage", "storage_chunks"].includes(submission.storage_provider) ||
      !submission.object_key ||
      !submission.r2_upload_id
    ) return err("Lần tải video này không hợp lệ");

    const parts = Array.isArray(body.parts)
      ? body.parts.map((part) => ({
          partNumber: Number(part.partNumber),
          etag: String(part.etag || ""),
        }))
      : [];
    const invalidParts =
      !parts.length ||
      parts.some(
        (part, index) =>
          !Number.isInteger(part.partNumber) ||
          part.partNumber !== index + 1 ||
          !part.etag,
      );
    if (invalidParts) return err("Danh sách phần video tải lên không hợp lệ");
    if (submission.storage_provider === "storage" && parts.length !== 1)
      return err("Thông tin video đã tải không hợp lệ");
    if (
      submission.storage_provider === "storage_chunks" &&
      parts.length !== storagePartCount(submission)
    ) return err("Video chưa được tải lên đầy đủ");

    let object;
    try {
      const bucket = requireVideoBucket(env);
      if (submission.storage_provider === "r2") {
        const multipart = bucket.resumeMultipartUpload(
          submission.object_key,
          submission.r2_upload_id,
        );
        await multipart.complete(parts);
        object =
          typeof bucket.head === "function"
            ? await bucket.head(submission.object_key)
            : await bucket.get(submission.object_key);
      } else if (submission.storage_provider === "storage_chunks") {
        // Every chunk PUT is awaited before the client includes that part in
        // this request. Re-reading the whole video here makes Nexrall time out
        // after the progress bar reaches 100%, so validate the ordered part
        // manifest above and finalize without downloading all chunks again.
        object = { size: Number(submission.size_bytes) };
      } else {
        object =
          typeof bucket.head === "function"
            ? await bucket.head(submission.object_key)
            : await bucket.get(submission.object_key);
      }
    } catch (error) {
      console.error("video storage complete", error?.message || error);
      return err("Không thể hoàn tất video. Vui lòng thử lại.", 502);
    }
    if (!object) return err("Video không còn tồn tại.", 502);
    if (
      Number(object.size) > 0 &&
      Number(object.size) !== Number(submission.size_bytes)
    ) return err("Dung lượng video không khớp. Vui lòng tải lại.", 502);

    await env.DB.batch([
      env.DB.prepare(
        `UPDATE booking_video_submissions
         SET status='pending_review',submitted_at=?,updated_at=? WHERE id=?`,
      ).bind(now(), now(), submission.id),
      env.DB.prepare(
        `UPDATE bookings SET status='pending_review',updated_at=? WHERE id=?`,
      ).bind(now(), submission.booking_id),
    ]);
    await notifyBusiness(
      env,
      submission.business_id,
      "video_review",
      "Có video chờ duyệt",
      `${submission.code} · KOC đã nộp video phiên bản ${submission.version}.`,
      "#/orders",
    );
    await audit(
      env,
      me.id,
      "booking.video_upload_completed",
      submission.booking_id,
      `submission=${submission.id}`,
    );
    const completed = {
      ...submission,
      status: "pending_review",
      submitted_at: now(),
    };
    return J({ ok: true, video: await videoWithAccessUrls(env, completed) });
  }

  if (p === "/api/booking/video/status" && m === "POST") {
    const submission = await env.DB.prepare(
      `SELECT v.*,b.koc_id,b.business_id,b.code
       FROM booking_video_submissions v JOIN bookings b ON b.id=v.booking_id
       WHERE v.id=?`,
    ).bind(body.submission_id).first();
    if (!submission) return err("Video không tồn tại", 404);
    const owns =
      (me.role === "koc" && me.koc_id === submission.koc_id) ||
      (me.role === "business" && me.business_id === submission.business_id) ||
      isAdmin;
    if (!owns) return err("403", 403);
    if (
      ["r2", "storage", "storage_chunks"].includes(submission.storage_provider) &&
      submission.object_key
    ) {
      const bucket = requireVideoBucket(env);
      const statusKey =
        submission.storage_provider === "storage_chunks"
          ? storagePartKey(submission.object_key, 1)
          : submission.object_key;
      const object =
        typeof bucket.head === "function"
          ? await bucket.head(statusKey)
          : await bucket.get(statusKey);
      if (!object && submission.status !== "uploading")
        return err("Video không còn tồn tại.", 404);
    }
    return J({ video: await videoWithAccessUrls(env, submission) });
  }

  if (p === "/api/booking/video/fail" && m === "POST") {
    if (me.role !== "koc") return err("403", 403);
    const submission = await env.DB.prepare(
      `SELECT v.*,b.koc_id FROM booking_video_submissions v
       JOIN bookings b ON b.id=v.booking_id WHERE v.id=?`,
    ).bind(body.submission_id).first();
    if (!submission || submission.koc_id !== me.koc_id)
      return err("Video không tồn tại", 404);
    if (!["uploading", "processing"].includes(submission.status))
      return err("Không thể hủy phiên tải video này");
    if (
      submission.storage_provider === "r2" &&
      submission.object_key &&
      submission.r2_upload_id
    ) {
      try {
        await requireVideoBucket(env)
          .resumeMultipartUpload(
            submission.object_key,
            submission.r2_upload_id,
          )
          .abort();
      } catch (error) {
        console.warn("r2 multipart abort", error?.message || error);
      }
    } else if (
      submission.storage_provider === "storage" &&
      submission.object_key
    ) {
      try {
        const bucket = requireVideoBucket(env);
        if (typeof bucket.delete === "function")
          await bucket.delete(submission.object_key);
      } catch (error) {
        console.warn("storage upload cleanup", error?.message || error);
      }
    } else if (
      submission.storage_provider === "storage_chunks" &&
      submission.object_key
    ) {
      try {
        const bucket = requireVideoBucket(env);
        if (typeof bucket.delete === "function") {
          for (
            let partNumber = 1;
            partNumber <= storagePartCount(submission);
            partNumber++
          ) {
            await bucket.delete(
              storagePartKey(submission.object_key, partNumber),
            );
          }
        }
      } catch (error) {
        console.warn("storage chunks cleanup", error?.message || error);
      }
    }
    const fallbackStatus = submission.version > 1 ? "revision_requested" : "producing";
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE booking_video_submissions SET status='upload_error',review_note=?,updated_at=? WHERE id=?`,
      ).bind(
        String(body.reason || "KOC tải video không thành công").slice(0, 300),
        now(),
        submission.id,
      ),
      env.DB.prepare(
        `UPDATE bookings SET status=?,updated_at=? WHERE id=?`,
      ).bind(fallbackStatus, now(), submission.booking_id),
    ]);
    return J({ ok: true });
  }

  if (p === "/api/booking/video/review" && m === "POST") {
    const submission = await env.DB.prepare(
      `SELECT v.*,b.koc_id,b.business_id,b.code,b.status booking_status
       FROM booking_video_submissions v JOIN bookings b ON b.id=v.booking_id
       WHERE v.id=?`,
    ).bind(body.submission_id).first();
    if (!submission) return err("Video không tồn tại", 404);
    const canReview =
      (me.role === "business" && me.business_id === submission.business_id) ||
      isAdmin;
    if (!canReview) return err("Chỉ doanh nghiệp của booking được duyệt video", 403);
    if (submission.status !== "pending_review" || submission.booking_status !== "pending_review")
      return err("Video chưa sẵn sàng hoặc đã được xử lý");

    const action = String(body.action || "");
    const note = String(body.note || "").trim().slice(0, 800);
    if (!["approve", "request_revision"].includes(action))
      return err("Thao tác duyệt không hợp lệ");
    if (action === "request_revision" && !note)
      return err("Vui lòng ghi rõ nội dung KOC cần chỉnh sửa");
    const approved = action === "approve";
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE booking_video_submissions
         SET status=?,review_note=?,reviewed_at=?,reviewed_by=?,updated_at=? WHERE id=?`,
      ).bind(
        approved ? "approved" : "revision_requested",
        note,
        now(),
        me.id,
        now(),
        submission.id,
      ),
      env.DB.prepare(
        `UPDATE bookings SET status=?,updated_at=? WHERE id=?`,
      ).bind(
        approved ? "video_approved" : "revision_requested",
        now(),
        submission.booking_id,
      ),
    ]);
    await notifyKoc(
      env,
      submission.koc_id,
      "video_review",
      approved ? "Video đã được doanh nghiệp duyệt" : "Doanh nghiệp yêu cầu sửa video",
      approved
        ? `${submission.code} · Bạn có thể đăng video lên mạng xã hội.`
        : `${submission.code} · ${note}`,
      "#/bookings",
    );
    await audit(
      env,
      me.id,
      approved ? "booking.video_approved" : "booking.video_revision_requested",
      submission.booking_id,
      `submission=${submission.id} version=${submission.version}`,
    );
    return J({ ok: true, status: approved ? "video_approved" : "revision_requested" });
  }

  if (p === "/api/aiclone/video-review" && m === "POST") {
    const booking = await env.DB.prepare(
      "SELECT * FROM bookings WHERE id=? AND type='aiclone'",
    ).bind(body.id).first();
    if (!booking) return err("Không tìm thấy booking AI Clone", 404);
    const action = String(body.action || "");
    const note = String(body.note || "").trim().slice(0, 800);
    if (!["approve", "request_revision"].includes(action))
      return err("Thao tác duyệt không hợp lệ");
    if (action === "request_revision" && !note)
      return err("Vui lòng nhập nội dung cần chỉnh sửa");

    const isBusinessOwner =
      me.role === "business" && me.business_id === booking.business_id;
    const isKocOwner = me.role === "koc" && me.koc_id === booking.koc_id;
    let nextStatus;
    if (
      (isBusinessOwner || isAdmin) &&
      booking.status === "pending_business_review"
    ) {
      nextStatus = action === "approve" ? "pending_koc_review" : "revision_requested";
      if (booking.aiclone_batch_id) {
        const { results: members } = await env.DB.prepare(
          `SELECT id,code,koc_id FROM bookings
           WHERE aiclone_batch_id=? AND type='aiclone'`,
        ).bind(booking.aiclone_batch_id).all();
        if (action === "approve") {
          await env.DB.prepare(
            `UPDATE bookings
             SET koc_video_link=COALESCE(business_video_link,video_link),video_link=COALESCE(business_video_link,video_link),
                 status='pending_koc_review',reject_reason=NULL,updated_at=?
             WHERE aiclone_batch_id=? AND type='aiclone' AND status='pending_business_review'`,
          ).bind(now(), booking.aiclone_batch_id).run();
          for (const member of members) {
            await notifyKoc(env, member.koc_id, "video_review", "Doanh nghiệp đã duyệt bản dựng video", `${member.code} · Vui lòng xem và phê duyệt video để tiến hành đăng tải.`, "#/bookings");
          }
        } else {
          await env.DB.prepare(
            `UPDATE bookings SET status='revision_requested',reject_reason=?,updated_at=?
             WHERE aiclone_batch_id=? AND type='aiclone' AND status='pending_business_review'`,
          ).bind(note, now(), booking.aiclone_batch_id).run();
        }
        await audit(env, me.id, `aiclone.video_${action}`, booking.id, `batch=${booking.aiclone_batch_id} ${note}`);
        return J({ ok: true, status: nextStatus, batchId: booking.aiclone_batch_id, recipients: members.length });
      }
      if (action === "approve") {
        await env.DB.prepare(
          "UPDATE bookings SET koc_video_link=COALESCE(koc_video_link,business_video_link,video_link) WHERE id=?",
        ).bind(booking.id).run();
        await notifyKoc(
          env,
          booking.koc_id,
          "video_review",
          "Doanh nghiệp đã duyệt bản dựng video",
          `${booking.code} · Vui lòng xem và phê duyệt video để tiến hành đăng tải.`,
          "#/bookings",
        );
      }
    } else if (
      (isKocOwner || isAdmin) &&
      booking.status === "pending_koc_review"
    ) {
      if (isKocOwner) {
        const registration = await env.DB.prepare(
          "SELECT id FROM aiclone WHERE koc_id=? LIMIT 1",
        ).bind(booking.koc_id).first();
        if (!registration)
          return err("Bạn cần đăng ký AI Clone Avatar trước khi duyệt video", 409);
      }
      nextStatus = action === "approve" ? "video_approved" : "revision_requested";
      if (action === "approve") {
        await ensureBookingAffiliateLink(env, booking, me.id);
      }
      await notifyBusiness(
        env,
        booking.business_id,
        "video_review",
        action === "approve"
          ? "KOC đã phê duyệt video AI Clone"
          : "KOC yêu cầu sửa video AI Clone",
        action === "approve" ? `${booking.code} đã sẵn sàng để KOC đăng tải.` : note,
        "#/orders",
      );
      if (action === "approve") {
        await notifyKoc(
          env,
          booking.koc_id,
          "video_review",
          "Video AI Clone đã sẵn sàng quảng bá",
          ["affiliate", "combo"].includes(booking.booking_type)
            ? `${booking.code} · Đường dẫn sản phẩm riêng đã được tạo. Hãy đăng video kèm đường dẫn này.`
            : `${booking.code} · Hãy đăng video theo yêu cầu của booking.`,
          "#/bookings",
        );
      }
    } else {
      return err("Bạn không thể duyệt video ở trạng thái hiện tại", 403);
    }
    await env.DB.prepare(
      "UPDATE bookings SET status=?,reject_reason=?,updated_at=? WHERE id=?",
    ).bind(
      nextStatus,
      action === "request_revision" ? note : null,
      now(),
      booking.id,
    ).run();
    await audit(env, me.id, `aiclone.video_${action}`, booking.id, note);
    return J({ ok: true, status: nextStatus });
  }

  if (p === "/api/aiclone/quote-response" && m === "POST") {
    if (me.role !== "business")
      return err("Chỉ doanh nghiệp được xác nhận báo giá", 403);
    const booking = await env.DB.prepare(
      `SELECT * FROM bookings
       WHERE id=? AND business_id=? AND type='aiclone'`,
    ).bind(body.id, me.business_id).first();
    if (!booking) return err("Không tìm thấy báo giá AI Clone", 404);
    const hasQuote =
      Number(booking.aiclone_quote_production || 0) +
      Number(booking.aiclone_quote_koc || 0) +
      Number(booking.aiclone_quote_platform || 0) +
      Number(booking.aiclone_quote_additional || 0) > 0;
    if (
      booking.status !== "quote_sent" &&
      !(booking.status === "payment_pending" && hasQuote)
    ) return err("Báo giá không còn ở trạng thái chờ xác nhận");

    const batchId = booking.aiclone_batch_id || booking.id;
    const quoteAction = String(body.action || "");
    if (quoteAction === "reject") {
      const reason = String(body.reason || "").trim();
      if (!reason) return err("Vui lòng nhập lý do từ chối báo giá");
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE bookings SET status='rejected',reject_reason=?,updated_at=?
           WHERE id=? AND status IN ('quote_sent','payment_pending')`,
        ).bind(reason, now(), booking.id),
        env.DB.prepare(
          `UPDATE bookings SET status='rejected',reject_reason=?,updated_at=?
           WHERE aiclone_batch_id=? AND status IN ('quote_grouped','payment_grouped')`,
        ).bind(reason, now(), batchId),
      ]);
      await notifyAdmins(
        env,
        "aiclone_quote",
        "Doanh nghiệp đã từ chối báo giá AI Clone",
        `${booking.code} · Lý do: ${reason}`,
        "#/aiclone",
      );
      await audit(env, me.id, "aiclone.quote_rejected", booking.id, `batch=${batchId} reason=${reason}`);
      return J({ ok: true, status: "rejected", batchId });
    }
    if (quoteAction !== "accept") return err("Hành động báo giá không hợp lệ");

    const priceToPay = Number(booking.price || 0);
    if (priceToPay > 0) {
      const available = await walletBalance(env, 'business', me.business_id, 'available');
      if (available < priceToPay) return err("Số dư Ví doanh nghiệp không đủ để ký quỹ báo giá", 400);
      await transferWalletFunds(env, {
        idempotencyKey: `escrow-hold:${booking.id}`,
        eventType: 'escrow_hold',
        referenceType: 'booking',
        referenceId: booking.id,
        note: `Ký quỹ báo giá AI Clone ${booking.code}`,
        source: walletAccount('business', me.business_id, 'available'),
        destinations: [{
          account: walletAccount('business', me.business_id, 'escrow'),
          amount: priceToPay,
        }],
      });
    }
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE bookings SET status='brief_review',funding_mode='wallet_escrow_v2',escrow=?,updated_at=?
         WHERE id=? AND status IN ('quote_sent','payment_pending')`,
      ).bind(priceToPay, now(), booking.id),
      env.DB.prepare(
        `UPDATE bookings SET status='brief_review',funding_mode='wallet_escrow_v2',escrow=?,updated_at=?
         WHERE aiclone_batch_id=? AND status IN ('quote_grouped','payment_grouped')`,
      ).bind(0, now(), batchId),
    ]);
    await notifyAdmins(
      env,
      "aiclone_quote",
      "Doanh nghiệp đã chấp nhận báo giá AI Clone",
      `${booking.code} · Doanh nghiệp đã xác nhận báo giá. Admin có thể bắt đầu sản xuất video.`,
      "#/aiclone",
    );
    await audit(
      env,
      me.id,
      "aiclone.quote_accepted",
      booking.id,
      `batch=${batchId} total=${booking.price}`,
    );
    return J({ ok: true, status: "brief_review", batchId });
  }

  // ---------- Complaints (booking disputes → refund flow, tied to booking ownership) ----------
  if (p === "/api/complaints" && m === "POST") {
    const b = await env.DB.prepare("SELECT * FROM bookings WHERE id=?")
      .bind(body.booking_id)
      .first();
    if (!b) return err("Booking không tồn tại", 404);
    const owns =
      (me.role === "business" && me.business_id === b.business_id) ||
      (me.role === "koc" && me.koc_id === b.koc_id) ||
      isAdmin;
    if (!owns) return err("403", 403);
    const reason = String(body.reason || "").trim();
    if (!reason) return err("Nhập lý do khiếu nại");
    const id = uid();
    await env.DB.prepare(
      `INSERT INTO complaints (id,booking_id,raised_by_role,raised_by_id,reason,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    )
      .bind(
        id,
        b.id,
        me.role,
        me.id,
        reason.slice(0, 800),
        "open",
        now(),
        now(),
      )
      .run();
    await audit(env, me.id, "complaint.create", id, `booking=${b.code}`);
    return J({ ok: true, complaintId: id });
  }
  if (p === "/api/complaints" && m === "GET" && !isAdmin) {
    const col =
      me.role === "business"
        ? "b.business_id"
        : me.role === "koc"
          ? "b.koc_id"
          : null;
    if (!col) return J({ complaints: [] });
    const { results } = await env.DB.prepare(
      `SELECT c.*, b.code bcode FROM complaints c JOIN bookings b ON b.id=c.booking_id WHERE ${col}=? ORDER BY c.created_at DESC, c.rowid DESC`,
    )
      .bind(me.role === "business" ? me.business_id : me.koc_id)
      .all();
    return J({ complaints: results });
  }

  // ---------- Booking action ----------
  if (p === "/api/booking/action" && m === "POST") {
    const b = await env.DB.prepare("SELECT * FROM bookings WHERE id=?")
      .bind(body.id)
      .first();
    if (!b) return err("Booking không tồn tại", 404);
    const isKoc = me.role === "koc" && me.koc_id === b.koc_id;
    const isBiz = me.role === "business" && me.business_id === b.business_id;
    const act = body.action;

    if (act === "confirm" && (isKoc || isAdmin) && b.status === "pending") {
      if (b.type === "aiclone" && isKoc) {
        const registration = await env.DB.prepare(
          "SELECT id FROM aiclone WHERE koc_id=? LIMIT 1",
        ).bind(b.koc_id).first();
        if (!registration)
          return err("Bạn cần đăng ký và đồng ý điều khoản AI Clone Avatar trước khi nhận booking này", 409);
      }
      await upd(env, b.id, { status: b.type === "aiclone" ? "brief_review" : "confirmed" });
      // Booking thường tạo link khi KOC nhận; AI Clone tạo link sau khi KOC duyệt video.
      if (b.type !== "aiclone")
        await ensureBookingAffiliateLink(env, b, me.id);
      await notifyKoc(
        env,
        b.koc_id,
        "booking",
        "Đã xác nhận booking",
        `${b.code} đã chuyển sang trạng thái sản xuất.`,
        "#/bookings",
      );
    } else if (
      act === "reject" &&
      (isKoc || isAdmin) &&
      b.status === "pending"
    ) {
      const needsRefund = Number(b.escrow) > 0 || b.funding_mode === 'wallet_escrow_v2';
      const refundAmount = Number(b.escrow || b.price || 0);
      if (needsRefund && refundAmount > 0) {
        try {
          await transferWalletFunds(env, {
            idempotencyKey: `escrow-refund:${b.id}`,
            eventType: 'escrow_refund',
            referenceType: 'booking',
            referenceId: b.id,
            note: `Hoàn tiền về số dư khả dụng cho đơn booking ${b.code} do KOC từ chối`,
            source: walletAccount('business', b.business_id, 'escrow'),
            destinations: [{
              account: walletAccount('business', b.business_id, 'available'),
              amount: refundAmount,
            }],
          });
        } catch (e) {
          console.error('Escrow refund error on reject:', e?.message || e);
        }
        await env.DB.prepare(
          `UPDATE payment_requests SET status='refunded',updated_at=?
           WHERE booking_id=? AND status='paid'`,
        ).bind(now(), b.id).run();
      }
      await upd(env, b.id, {
        status: "rejected",
        reject_reason: body.reason || "Không nêu lý do",
        escrow: 0,
      });
      await notifyBusiness(
        env,
        b.business_id,
        "booking",
        "Booking đã bị từ chối",
        needsRefund && refundAmount > 0
          ? `${b.code} đã bị từ chối. Số tiền ${refundAmount.toLocaleString('vi-VN')}đ đang được giữ đã được hoàn lại vào số dư khả dụng của bạn.`
          : `${b.code} đã bị từ chối.`,
        "#/orders",
      );
    } else if (
      act === "produce" &&
      (isKoc || isAdmin) &&
      b.status === "confirmed"
    ) {
      await upd(env, b.id, { status: "producing" });
    } else if (
      act === "submit" &&
      (isKoc || isAdmin) &&
      (b.status === "video_approved" || (b.type !== "aiclone" && ["confirmed", "producing", "video_approved"].includes(b.status)))
    ) {
      if (!body.post_link) return err("Nhập link bài đăng");
      if (!isUrl(body.post_link)) return err("Link bài đăng không hợp lệ");
      const approvedVideo = await env.DB.prepare(
        `SELECT id FROM booking_video_submissions
         WHERE booking_id=? AND status='approved'
         ORDER BY version DESC, created_at DESC LIMIT 1`,
      ).bind(b.id).first();
      if (b.type === "aiclone" && !approvedVideo && !b.video_link)
        return err("Video chưa được doanh nghiệp duyệt");
      await upd(env, b.id, {
        status: "posted",
        post_link: String(body.post_link).trim(),
        post_platform: body.post_platform || "TikTok",
      });
      await notifyBusiness(
        env,
        b.business_id,
        "booking",
        "KOC đã nộp link bài đăng",
        `${b.code} · ${body.post_platform || "Mạng xã hội"}`,
        "#/orders",
      );
      // create affiliate link
      const ex = await env.DB.prepare(
        "SELECT id FROM affiliate WHERE booking_id=?",
      )
        .bind(b.id)
        .first();
      if (!ex)
        await env.DB.prepare(
          `INSERT INTO affiliate (id,booking_id,koc_id,short_code) VALUES (?,?,?,?)`,
        )
          .bind(uid(), b.id, b.koc_id, Tracking.shortCode())
          .run();
    } else if (
      act === "complete" &&
      (isBiz || isAdmin) &&
      (b.status === "posted" || b.status === "settling")
    ) {
      const isAiClone = b.type === "aiclone";
      const quoteKoc = Number(b.aiclone_quote_koc || 0);
      const aiServiceFees = Number(b.aiclone_quote_production || 0) +
        Number(b.aiclone_quote_platform || 0) + Number(b.aiclone_quote_additional || 0);
      const settlementAmount = isAiClone
        ? quoteKoc + aiServiceFees
        : Number(b.price || 0);
      let sourceBucket = 'available';
      if (settlementAmount > 0) {
        const paidPayment = await env.DB.prepare(
          `SELECT id FROM payment_requests
           WHERE booking_id=? AND status='paid'
           LIMIT 1`,
        ).bind(b.id).first();

        const bizAvail = await walletBalance(env, 'business', b.business_id, 'available');
        const bizEscrow = await walletBalance(env, 'business', b.business_id, 'escrow');

        if (paidPayment) {
          sourceBucket = 'cash_clearing';
        } else if (bizEscrow >= settlementAmount || Number(b.escrow) > 0) {
          sourceBucket = 'escrow';
        } else if (bizAvail >= settlementAmount) {
          sourceBucket = 'available';
        } else {
          return err(
            `Ví của doanh nghiệp không đủ số dư để giải ngân (${settlementAmount.toLocaleString('vi-VN')}đ).`,
            400,
          );
        }
      }
      const stmts = [];
      let payoutAmount = 0;
      // settle 95/5 on the FIXED FEE portion (ad + combo). Affiliate-only has price 0.
      if (settlementAmount > 0) {
        let kocGet = 0;
        let fee = 0;
        if (isAiClone) {
          kocGet = quoteKoc;
          fee = Math.max(0, settlementAmount - kocGet);
        } else {
          const platformFee = Math.round(b.price * 0.05);
          kocGet = b.price - platformFee;
          fee = platformFee;
        }
        payoutAmount = kocGet;
        stmts.push(
          env.DB.prepare(
            `INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`,
          ).bind(
            uid(),
            b.koc_id,
            "booking",
            kocGet,
            "settled",
            isAiClone ? `Phí KOC AI Clone ${b.code}` : `Phí booking ${b.code} (95%)`,
            now(),
          ),
        );
        stmts.push(
          env.DB.prepare(
            `INSERT INTO ledger (id,kind,amount,ref,note,created_at) VALUES (?,?,?,?,?,?)`,
          ).bind(
            uid(),
            "service_fee",
            fee,
            b.id,
            isAiClone
              ? `Phí sản xuất AI và nền tảng ${b.code}`
              : `Phí dịch vụ 5% ${b.code}`,
            now(),
          ),
        );
        if (settlementAmount > 0) {
          try {
            const paidPayment = await env.DB.prepare(
              `SELECT id FROM payment_requests
               WHERE booking_id=? AND status='paid'
               LIMIT 1`,
            ).bind(b.id).first();

            const srcAccount = paidPayment
              ? walletAccount('system', 'payos', 'cash_clearing')
              : (sourceBucket === 'escrow' || Number(b.escrow) > 0
                  ? walletAccount('business', b.business_id, 'escrow')
                  : walletAccount('business', b.business_id, 'available'));

            await postWalletEntry(env, {
              idempotencyKey: `payout-release-v10:${b.id}`,
              eventType: 'booking_settled',
              referenceType: 'booking',
              referenceId: b.id,
              note: `Chuyển tiền booking ${b.code} vào ví KOC`,
              postings: [
                {
                  account: srcAccount,
                  amount: -settlementAmount,
                },
                {
                  account: walletAccount('koc', b.koc_id, 'available'),
                  amount: payoutAmount,
                },
                {
                  account: walletAccount('platform', 'netviet', 'revenue'),
                  amount: settlementAmount - payoutAmount,
                },
              ],
            });
          } catch (e) {
            console.error('Wallet release error:', e?.message || e);
          }
        }
      }
      stmts.push(
        env.DB.prepare(
          `UPDATE kocs SET completed_bookings = completed_bookings + 1 WHERE id=?`,
        ).bind(b.koc_id),
      );
      await env.DB.batch(stmts);
      await upd(env, b.id, { status: 'completed', escrow: 0 });
      await notifyKoc(env, b.koc_id, 'payment', 'Booking đã được thanh toán',
        `${b.code} đã hoàn thành${payoutAmount > 0 ? ` · ${payoutAmount.toLocaleString('vi-VN')}đ được ghi nhận vào ví` : ''}.`,
        '#/wallet');
      await audit(env, me.id, 'booking.complete', b.id, `payout=${payoutAmount}`);
      if (payoutAmount > 0) {
        const emailContact = await kocEmailContact(env, b.koc_id);
        await sendEmailBestEffort('booking.payment_succeeded', emailContact, () =>
          sendPaymentSuccessEmail(env, emailContact.email, {
            kocName: emailContact.name,
            amount: payoutAmount,
            reference: `Booking ${b.code}`,
            note: 'Khoản thanh toán đã được ghi nhận vào ví KOC Việt.',
          })
        );
      }
    } else if (act === 'rate' && (isBiz||isAdmin) && b.status === 'completed') {
      await upd(env, b.id, { rating: Number(body.rating), review: body.review||'' });
      // recompute koc rating
      const agg = await env.DB.prepare(
        `SELECT AVG(rating) a, COUNT(*) c FROM bookings WHERE koc_id=? AND rating IS NOT NULL`,
      )
        .bind(b.koc_id)
        .first();
      await env.DB.prepare(
        "UPDATE kocs SET rating=?, reviews_count=? WHERE id=?",
      )
        .bind(Number(agg.a || 0).toFixed(1), agg.c, b.koc_id)
        .run();
    } else {
      return err("Thao tác không hợp lệ ở trạng thái hiện tại", 400);
    }
    return J({ ok: true });
  }

  // ---------- Wallet ----------
  if (p === "/api/wallet") {
    if (!["koc", "business"].includes(me.role)) return err("Không có ví", 403);
    if (me.role === "koc") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM wallet_tx WHERE koc_id=? ORDER BY created_at DESC, rowid DESC",
      )
        .bind(me.koc_id)
        .all();
      let avail = 0,
        pending = 0;
      const commissionSummary = { expected: 0, reconciled: 0, paid: 0 };
      for (const t of results) {
        const transactionAmount = Number(t.amount || 0);
        if (t.type === "withdraw") {
          avail -= transactionAmount;
        } else if (["pending", "expected"].includes(t.status))
          pending += transactionAmount;
        else if (!["cancelled", "refunded"].includes(t.status)) avail += transactionAmount;
        if (t.type === "commission") {
          if (["pending", "expected"].includes(t.status))
            commissionSummary.expected += transactionAmount;
          else if (["settled", "reconciled"].includes(t.status))
            commissionSummary.reconciled += transactionAmount;
          else if (t.status === "paid") commissionSummary.paid += transactionAmount;
        }
      }
      const koc = await env.DB.prepare(
        "SELECT email,bank_name,bank_bin,bank_account,bank_owner FROM kocs WHERE id=?",
      )
        .bind(me.koc_id)
        .first();
      return J({
        balance: avail,
        pending,
        commissionSummary,
        transactions: results,
        payout: koc || {},
      });
    } else if (me.role === "business") {
      const balances = await walletBalances(env, "business", me.business_id);
      const { results: payments } = await env.DB.prepare(
        `SELECT p.*, b.code as booking_code
         FROM payment_requests p
         LEFT JOIN bookings b ON b.id = p.booking_id
         WHERE p.business_id=?
         ORDER BY p.created_at DESC`,
      )
        .bind(me.business_id)
        .all();
      return J({
        balance: balances.available || 0,
        escrow: balances.escrow || 0,
        payments: payments || [],
      });
    }
  }
  if (p === "/api/wallet/deposit" && m === "POST") {
    if (me.role !== "business") return err("Chỉ doanh nghiệp được nạp tiền vào ví", 403);
    const amount = Number(body.amount);
    if (!Number.isSafeInteger(amount) || amount < 10000) {
      return err("Số tiền nạp tối thiểu là 10.000đ");
    }
    const mode = body.mode === "payos" ? "payos" : "demo";

    if (mode === "demo") {
      if (!canUseDemoPayment(env, me, url)) {
        return err("Nạp tiền demo không được bật trên môi trường này", 403);
      }
      const orderCode = newPayOSOrderCode();
      const depositId = uid();
      await env.DB.prepare(
        `INSERT INTO payment_requests
         (id,booking_id,business_id,provider,order_code,amount,status,purpose,paid_at,created_at,updated_at)
         VALUES (?,'wallet_topup',?,'demo',?,?,'paid','deposit',?,?,?)`,
      ).bind(depositId, me.business_id, orderCode, amount, now(), now(), now()).run();

      await postWalletEntry(env, {
        idempotencyKey: `topup-demo:${depositId}`,
        eventType: 'wallet_topup',
        referenceType: 'payment_request',
        referenceId: depositId,
        note: `Nạp tiền ví doanh nghiệp (Demo #${orderCode})`,
        postings: [
          {
            account: walletAccount('system', 'payos', 'cash_clearing'),
            amount: -amount,
          },
          {
            account: walletAccount('business', me.business_id, 'available'),
            amount,
          },
        ],
      });

      await audit(env, me.id, 'wallet.deposit.demo', me.business_id, `amount=${amount}`);
      return J({ ok: true, mode: 'demo', amount, message: 'Nạp tiền demo thành công' });
    }

    // Mode payOS
    const business = await env.DB.prepare(`SELECT * FROM businesses WHERE id=?`).bind(me.business_id).first();
    const orderCode = newPayOSOrderCode();
    const depositId = uid();
    await env.DB.prepare(
      `INSERT INTO payment_requests
       (id,booking_id,business_id,provider,order_code,amount,status,purpose,created_at,updated_at)
       VALUES (?,'wallet_topup',?,'payos',?,?,'creating','deposit',?,?)`,
    ).bind(depositId, me.business_id, orderCode, amount, now(), now()).run();

    try {
      const paymentPayload = {
        orderCode,
        amount,
        description: `NAP VI #${orderCode}`,
        buyerName: String(business?.name || '').trim().slice(0, 160),
        items: [{
          name: `Nạp ví doanh nghiệp #${orderCode}`,
          quantity: 1,
          price: amount,
        }],
        cancelUrl: payOSRedirectUrl(url, 'cancelled', orderCode),
        returnUrl: payOSRedirectUrl(url, 'success', orderCode),
        expiredAt: now() + 30 * 60,
      };
      const buyerEmail = String(business?.email || '').trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
        paymentPayload.buyerEmail = buyerEmail.slice(0, 160);
      }
      const data = await createPayOSPaymentLink(env, paymentPayload);
      await env.DB.prepare(
        `UPDATE payment_requests
         SET status=?,payment_link_id=?,checkout_url=?,qr_code=?,failure_reason=NULL,updated_at=?
         WHERE id=?`,
      ).bind(
        String(data.status || 'PENDING').toLowerCase(),
        String(data.paymentLinkId || ''),
        String(data.checkoutUrl || ''),
        String(data.qrCode || ''),
        now(),
        depositId,
      ).run();
      return J({
        ok: true,
        mode: 'payos',
        depositId,
        orderCode,
        checkoutUrl: data.checkoutUrl,
        qrCode: data.qrCode,
      });
    } catch (error) {
      const reason = String(error?.message || error).slice(0, 500);
      await env.DB.prepare(
        `UPDATE payment_requests SET status='failed',failure_reason=?,updated_at=? WHERE id=?`,
      ).bind(reason, now(), depositId).run();
      throw error;
    }
  }

  if (p === "/api/wallet/withdraw" && m === "POST") {
    if (me.role !== "koc") return err("Không có ví", 403);
    const koc = await env.DB.prepare(
      "SELECT email,bank_name,bank_account,bank_owner,bank_bin FROM kocs WHERE id=?",
    ).bind(me.koc_id).first();
    const otpEmail = String(koc?.email || me.email || '').trim().toLowerCase();
    const otpResult = await verifyEmailOtp(env, otpEmail, body.otp, 'withdraw', request);
    if (!otpResult.ok) return err(otpResult.error || "OTP không đúng");
    const amount = Number(body.amount);
    if (!Number.isSafeInteger(amount) || amount < 100000) return err("Ngưỡng rút tối thiểu 100.000đ");
    const mode = body.mode === "payos" ? "payos" : "demo";

    const { results } = await env.DB.prepare(
      "SELECT * FROM wallet_tx WHERE koc_id=?",
    )
      .bind(me.koc_id)
      .all();
    let avail = 0;
    for (const t of results) {
      const transactionAmount = Number(t.amount || 0);
      if (t.type === "withdraw") avail -= transactionAmount;
      else if (["settled", "reconciled", "paid"].includes(t.status))
        avail += transactionAmount;
    }
    if (amount > avail) return err("Số dư khả dụng không đủ");

    if (mode === "payos") {
      if (!koc?.bank_account || !koc?.bank_name || !/^\d{6}$/.test(String(koc?.bank_bin || ''))) {
        return err("Vui lòng cập nhật đầy đủ ngân hàng nhận tiền và mã ngân hàng 6 số trước khi rút");
      }
      const txId = uid();
      const referenceId = `wd-${txId.slice(0, 16)}`;
      try {
        const payoutAccount = await getPayOSPayoutBalance(env);
        const payoutBalance = Number(String(payoutAccount?.balance ?? '').replace(/[^0-9.-]/g, ''));
        if (!Number.isFinite(payoutBalance)) {
          return err('Chưa kiểm tra được nguồn tiền chi trả. Vui lòng thử lại sau.');
        }
        if (payoutBalance < amount) {
          return err('Nguồn tiền chi trả hiện chưa đủ. Vui lòng liên hệ quản trị viên hoặc thử lại sau.');
        }
        await createPayOSPayout(env, {
          referenceId,
          amount,
          description: `RUT VI KOC ${me.koc_id.slice(0, 8)}`,
          toBin: koc.bank_bin,
          toAccountNumber: koc.bank_account,
        }, referenceId);
      } catch (error) {
        return err(`Chưa gửi được yêu cầu rút tiền: ${error?.message || 'Vui lòng thử lại sau'}`);
      }

      await env.DB.prepare(
        `INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`,
      )
        .bind(
          txId,
          me.koc_id,
          "withdraw",
          amount,
          "processing",
          `Rút tiền về ngân hàng (${koc.bank_name})`,
          now(),
        )
        .run();

      try {
        await transferWalletFunds(env, {
          idempotencyKey: `withdraw-payos:${txId}`,
          eventType: 'wallet_withdraw',
          referenceType: 'wallet_tx',
          referenceId: txId,
          note: `KOC rút tiền về ngân hàng (${koc.bank_name})`,
          source: walletAccount('koc', me.koc_id, 'available'),
          destinations: [{
            account: walletAccount('system', 'payos', 'cash_clearing'),
            amount,
          }],
        });
      } catch (e) {
        console.error('Wallet withdraw transfer error:', e?.message || e);
      }

      await audit(env, me.id, "wallet.withdraw_requested_payos", me.koc_id, `amount=${amount}`);
      return J({ ok: true, mode: 'payos', message: 'Yêu cầu rút tiền đã được gửi thành công' });
    }

    // mode === "demo"
    const txId = uid();
    await env.DB.prepare(
      `INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`,
    )
      .bind(
        txId,
        me.koc_id,
        "withdraw",
        amount,
        "paid",
        "Rút tiền demo về ngân hàng",
        now(),
      )
      .run();

    try {
      await transferWalletFunds(env, {
        idempotencyKey: `withdraw-demo:${txId}`,
        eventType: 'wallet_withdraw',
        referenceType: 'wallet_tx',
        referenceId: txId,
        note: 'KOC rút tiền demo về ngân hàng',
        source: walletAccount('koc', me.koc_id, 'available'),
        destinations: [{
          account: walletAccount('system', 'payos', 'cash_clearing'),
          amount,
        }],
      });
    } catch (e) {
      console.error('Wallet withdraw demo transfer error:', e?.message || e);
    }

    await audit(env, me.id, "wallet.withdraw_demo", me.koc_id, `amount=${amount}`);
    return J({ ok: true, mode: 'demo', message: 'Rút tiền demo thành công' });
  }

  // ---------- Affiliate ----------
  if (p === "/api/affiliate") {
    if (me.role !== "koc") return err("403", 403);
    const { results } = await env.DB.prepare(
      `SELECT a.*, b.code, b.category, b.post_platform FROM affiliate a JOIN bookings b ON b.id=a.booking_id
       WHERE a.koc_id=? ORDER BY a.orders DESC`,
    )
      .bind(me.koc_id)
      .all();
    return J({ affiliates: results });
  }
  if (p === "/api/affiliate/order" && m === "POST") {
    // simulate a new order → commission accrues to pending
    const a = await env.DB.prepare("SELECT * FROM affiliate WHERE id=?")
      .bind(body.id)
      .first();
    if (!a) return err("Không tìm thấy", 404);
    const addOrders = 1 + Math.floor(Math.random() * 3);
    const addClicks = 10 + Math.floor(Math.random() * 40);
    const addCommission =
      addOrders * (20000 + Math.floor(Math.random() * 60000));
    await env.DB.prepare(
      "UPDATE affiliate SET clicks=clicks+?, orders=orders+?, commission=commission+? WHERE id=?",
    )
      .bind(addClicks, addOrders, addCommission, body.id)
      .run();
    await env.DB.prepare(
      `INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`,
    )
      .bind(
        uid(),
        a.koc_id,
        "commission",
        addCommission,
        "expected",
        "Hoa hồng bán hàng dự kiến",
        now(),
      )
      .run();
    return J({ ok: true, addOrders, addCommission });
  }

  // ---------- Affiliate LINKS (per-KOC, auto-generated on accept) ----------
  if (p === "/api/affiliate/links") {
    if (me.role !== "koc") return err("403", 403);
    const { results } = await env.DB.prepare(
      `SELECT al.*, b.code, b.category, b.commission_rate, b.status bstatus, b.post_platform, bz.name bizname
       FROM affiliate_links al JOIN bookings b ON b.id=al.booking_id JOIN businesses bz ON bz.id=b.business_id
       WHERE al.koc_id=? ORDER BY al.created_at DESC, al.rowid DESC`,
    )
      .bind(me.koc_id)
      .all();
    for (const l of results) {
      const agg = await env.DB.prepare(
        `SELECT COUNT(*) orders, COALESCE(SUM(gmv),0) gmv, COALESCE(SUM(commission_amount),0) commission,
          COALESCE(SUM(CASE WHEN status IN ('confirmed','settled') THEN commission_amount ELSE 0 END),0) valid_comm,
          COALESCE(SUM(CASE WHEN status='settled' THEN commission_amount ELSE 0 END),0) settled_comm
         FROM affiliate_orders WHERE affiliate_link_id=? AND status NOT IN ('cancelled','refunded')`,
      )
        .bind(l.id)
        .first();
      const orders = await env.DB.prepare(
        `SELECT id,platform_order_id,gmv,commission_amount,status,ordered_at,settled_at
         FROM affiliate_orders WHERE affiliate_link_id=?
         ORDER BY ordered_at DESC, rowid DESC LIMIT 30`,
      )
        .bind(l.id)
        .all();
      l.stat = agg;
      l.orders = orders.results;
      l.conversion = l.clicks > 0 ? (Number(agg.orders) / l.clicks) * 100 : 0;
    }
    return J({ links: results });
  }

  // Simulate/sync one affiliate order coming from the sàn (webhook/cron equivalent).
  if (p === "/api/affiliate/sync" && m === "POST") {
    const l = await env.DB.prepare("SELECT * FROM affiliate_links WHERE id=?")
      .bind(body.linkId)
      .first();
    if (!l) return err("Không tìm thấy đường dẫn bán hàng", 404);
    // authorization: the KOC who owns the link, or admin
    if (!(isAdmin || (me.role === "koc" && me.koc_id === l.koc_id)))
      return err("403", 403);
    const b = await env.DB.prepare("SELECT * FROM bookings WHERE id=?")
      .bind(l.booking_id)
      .first();
    const prov = affiliateProvider(l.platform);
    const raw = await prov.fetchOrder({ gmvHint: Number(body.gmv) || 0 });
    // anti-fraud: log ip/device; flag self-referral (buyer == koc) or click-spam heuristics
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "0.0.0.0";
    const device = (request.headers.get("user-agent") || "unknown").slice(
      0,
      120,
    );
    const selfRef = body.buyerIsKoc === true;
    const flagged = selfRef ? 1 : 0;
    const rate = Number(b.commission_rate) || 0;
    const commission = Math.round((raw.gmv * rate) / 100);
    const platformFee = Math.round(
      raw.gmv * (Number(b.platform_fee_rate) || 0.01),
    );
    const status = flagged ? "cancelled" : "pending";
    await env.DB.prepare(
      `INSERT INTO affiliate_orders (id,affiliate_link_id,koc_id,booking_id,platform_order_id,gmv,commission_amount,platform_fee,status,ip,device,flagged,ordered_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
      .bind(
        uid(),
        l.id,
        l.koc_id,
        l.booking_id,
        raw.platform_order_id,
        raw.gmv,
        commission,
        platformFee,
        status,
        ip,
        device,
        flagged,
        now(),
      )
      .run();
    // clicks accrue too
    await env.DB.prepare(
      "UPDATE affiliate_links SET clicks=clicks+? WHERE id=?",
    )
      .bind(5 + Math.floor(Math.random() * 20), l.id)
      .run();
    if (!flagged) {
      // commission accrues to KOC pending wallet; platform fee (paid by DN) recorded to ledger later at settle
      await env.DB.prepare(
        `INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`,
      )
        .bind(
          uid(),
          l.koc_id,
          "commission",
          commission,
          "expected",
          `Hoa hồng bán hàng ${b.code} · đơn ${raw.platform_order_id}`,
          now(),
        )
        .run();
      await notifyKoc(
        env,
        l.koc_id,
        "commission",
        "Phát sinh hoa hồng dự kiến",
        `${commission.toLocaleString("vi-VN")}đ từ đơn ${raw.platform_order_id}.`,
        "#/wallet",
      );
    }
    await audit(
      env,
      me.id,
      "affiliate_order." + (flagged ? "flagged" : "create"),
      raw.platform_order_id,
      `gmv=${raw.gmv} comm=${commission} fee=${platformFee}`,
    );
    return J({
      ok: true,
      gmv: raw.gmv,
      commission,
      platformFee,
      flagged,
      orderId: raw.platform_order_id,
    });
  }

  // Order lifecycle transition (confirmed / cancelled / refunded). Reverses commission on cancel/refund.
  if (p === "/api/affiliate/order-status" && m === "POST") {
    const o = await env.DB.prepare("SELECT * FROM affiliate_orders WHERE id=?")
      .bind(body.orderId)
      .first();
    if (!o) return err("Không tìm thấy đơn", 404);
    if (!(isAdmin || (me.role === "koc" && me.koc_id === o.koc_id)))
      return err("403", 403);
    const to = body.to;
    if (!["confirmed", "cancelled", "refunded"].includes(to))
      return err("Trạng thái không hợp lệ");
    if (
      (to === "cancelled" || to === "refunded") &&
      o.status !== "cancelled" &&
      o.status !== "refunded"
    ) {
      // reverse: remove pending commission if not yet settled; if settled, write a reversal tx
      const pend = await env.DB.prepare(
        `SELECT id FROM wallet_tx WHERE koc_id=? AND type='commission' AND status IN ('pending','expected') AND note LIKE ? LIMIT 1`,
      )
        .bind(o.koc_id, "%" + o.platform_order_id + "%")
        .first();
      if (pend)
        await env.DB.prepare("UPDATE wallet_tx SET status=? WHERE id=?")
          .bind(to, pend.id)
          .run();
      else
        await env.DB.prepare(
          `INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`,
        )
          .bind(
            uid(),
            o.koc_id,
            "commission_reversal",
            -o.commission_amount,
            "reconciled",
            `Trừ ngược đơn ${to === "refunded" ? "hoàn" : "hủy"} ${o.platform_order_id}`,
            now(),
          )
          .run();
    }
    await env.DB.prepare("UPDATE affiliate_orders SET status=? WHERE id=?")
      .bind(to, o.id)
      .run();
    await notifyKoc(
      env,
      o.koc_id,
      to === "refunded"
        ? "refund"
        : to === "cancelled"
          ? "cancel"
          : "commission",
      to === "refunded"
        ? "Đơn tiếp thị liên kết đã hoàn"
        : to === "cancelled"
          ? "Đơn tiếp thị liên kết đã hủy"
          : "Đơn tiếp thị liên kết đã xác nhận",
      `${o.platform_order_id} · hoa hồng ${o.commission_amount.toLocaleString("vi-VN")}đ ${to === "confirmed" ? "chờ đối soát" : "không được ghi nhận"}.`,
      "#/affiliate",
    );
    await audit(
      env,
      me.id,
      "affiliate_order." + to,
      o.platform_order_id,
      `reversed=${to !== "confirmed"}`,
    );
    return J({ ok: true });
  }

  // ---------- Business product catalog ----------
  if (p === '/api/business/products') {
    if (me.role !== 'business') return err('Chỉ doanh nghiệp được quản lý sản phẩm', 403);

    if (m === 'GET') {
      const search = String(url.searchParams.get('search') || '').trim().slice(0, 120);
      const requestedStatus = String(url.searchParams.get('status') || '').trim();
      const status = ['active', 'paused'].includes(requestedStatus) ? requestedStatus : '';
      const conditions = ['business_id=?'];
      const bindings = [me.business_id];
      if (search) {
        conditions.push('(name LIKE ? OR sku LIKE ? OR platform LIKE ? OR product_url LIKE ?)');
        const term = `%${search}%`;
        bindings.push(term, term, term, term);
      }
      if (status) {
        conditions.push('status=?');
        bindings.push(status);
      }
      const [listResult, countResult] = await env.DB.batch([
        env.DB.prepare(
          `SELECT * FROM business_products
           WHERE ${conditions.join(' AND ')}
           ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, updated_at DESC, rowid DESC
           LIMIT 250`,
        ).bind(...bindings),
        env.DB.prepare(
          `SELECT status,COUNT(*) count FROM business_products
           WHERE business_id=? GROUP BY status`,
        ).bind(me.business_id),
      ]);
      const summary = { total: 0, active: 0, paused: 0 };
      for (const row of countResult.results || []) {
        const count = Number(row.count) || 0;
        summary.total += count;
        if (row.status === 'active') summary.active = count;
        if (row.status === 'paused') summary.paused = count;
      }
      return J({ products: listResult.results || [], summary });
    }

    if (m === 'POST') {
      const parsed = parseBusinessProduct(body);
      if (parsed.error) return err(parsed.error);
      const product = parsed.value;
      const id = uid();
      const createdAt = now();
      try {
        await env.DB.prepare(
          `INSERT INTO business_products
           (id,business_id,name,product_url,platform,sku,price,image_url,commission_rate,
            affiliate_enabled,status,notes,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        ).bind(
          id, me.business_id, product.name, product.productUrl, product.platform,
          product.sku, product.price, product.imageUrl, product.commissionRate,
          product.affiliateEnabled, product.status, product.notes, createdAt, createdAt,
        ).run();
      } catch (error) {
        if (String(error?.message || error).includes('UNIQUE constraint failed'))
          return err('Link sản phẩm này đã có trong danh mục', 409);
        throw error;
      }
      const created = await env.DB.prepare(
        'SELECT * FROM business_products WHERE id=? AND business_id=?',
      ).bind(id, me.business_id).first();
      await audit(env, me.id, 'business_product.create', id, `platform=${product.platform}`);
      return J({ ok: true, product: created }, 201);
    }

    return err('Phương thức không được hỗ trợ', 405);
  }

  const businessProductMatch = p.match(/^\/api\/business\/products\/([^/]+)$/);
  if (businessProductMatch) {
    if (me.role !== 'business') return err('Chỉ doanh nghiệp được quản lý sản phẩm', 403);
    const productId = businessProductMatch[1];
    const existing = await env.DB.prepare(
      'SELECT * FROM business_products WHERE id=? AND business_id=?',
    ).bind(productId, me.business_id).first();
    if (!existing) return err('Không tìm thấy sản phẩm', 404);

    if (m === 'PUT') {
      const parsed = parseBusinessProduct(body);
      if (parsed.error) return err(parsed.error);
      const product = parsed.value;
      try {
        await env.DB.prepare(
          `UPDATE business_products
           SET name=?,product_url=?,platform=?,sku=?,price=?,image_url=?,commission_rate=?,
               affiliate_enabled=?,status=?,notes=?,updated_at=?
           WHERE id=? AND business_id=?`,
        ).bind(
          product.name, product.productUrl, product.platform, product.sku, product.price,
          product.imageUrl, product.commissionRate, product.affiliateEnabled, product.status,
          product.notes, now(), productId, me.business_id,
        ).run();
      } catch (error) {
        if (String(error?.message || error).includes('UNIQUE constraint failed'))
          return err('Link sản phẩm này đã có trong danh mục', 409);
        throw error;
      }
      const updated = await env.DB.prepare(
        'SELECT * FROM business_products WHERE id=? AND business_id=?',
      ).bind(productId, me.business_id).first();
      await audit(env, me.id, 'business_product.update', productId, `status=${product.status}`);
      return J({ ok: true, product: updated });
    }

    if (m === 'DELETE') {
      await env.DB.prepare(
        'DELETE FROM business_products WHERE id=? AND business_id=?',
      ).bind(productId, me.business_id).run();
      await audit(env, me.id, 'business_product.delete', productId, `name=${existing.name}`);
      return J({ ok: true });
    }

    return err('Phương thức không được hỗ trợ', 405);
  }

  // ---------- Campaign (business → admin) ----------
  if (p === "/api/campaign" && m === "POST") {
    if (me.role !== "business") return err("403", 403);
    const budget = Number(body.budget),
      qty = Number(body.qty);
    if (!Number.isSafeInteger(budget) || budget <= 0 || budget > 100_000_000_000)
      return err("Ngân sách phải là số nguyên VND hợp lệ");
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty))
      return err("Số lượng KOC phải là số nguyên dương");
    if (!body.tier) return err("Chọn hạng KOC");
    if (!body.category) return err("Chọn ngành hàng");
    const managementRate = 0.15;
    const managementFee = Math.max(2_000_000, Math.round(budget * managementRate));
    const totalAmount = budget + managementFee;
    await env.DB.prepare(
      `INSERT INTO campaigns (id,business_id,budget,qty,tier,category,note,status,management_rate,management_fee,total_amount,deadline,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
      .bind(
        uid(),
        me.business_id,
        budget,
        qty,
        body.tier,
        body.category,
        String(body.note || "").slice(0, 500),
        "quote_pending",
        managementRate, managementFee, totalAmount,
        String(body.deadline || "").slice(0, 40) || null,
        now(),
      )
      .run();
    return J({ ok: true, pricing: { budget, managementRate, managementFee, totalAmount } });
  }
  if (p === "/api/campaigns") {
    if (!['admin','business'].includes(me.role)) return err('Không có quyền xem danh sách chiến dịch',403);
    let sql =
      "SELECT c.*, bz.name bizname FROM campaigns c JOIN businesses bz ON bz.id=c.business_id";
    const bind = [];
    if (me.role === "business") {
      sql += " WHERE c.business_id=?";
      bind.push(me.business_id);
    }
    sql += " ORDER BY c.created_at DESC, c.rowid DESC";
    const { results } = await env.DB.prepare(sql)
      .bind(...bind)
      .all();
    for (const campaign of results) {
      const { results: allocations } = await env.DB.prepare(`SELECT ca.*,k.name koc_name,k.avatar koc_avatar FROM campaign_allocations ca JOIN kocs k ON k.id=ca.koc_id WHERE ca.campaign_id=? ORDER BY ca.created_at,ca.id`).bind(campaign.id).all();
      campaign.allocations = allocations || [];
    }
    return J({ campaigns: results });
  }
  if (p === "/api/koc/campaigns" && m === "GET") {
    if (me.role !== "koc") return err("Chỉ KOC được truy cập", 403);
    const per = Math.min(12, Math.max(4, Number(url.searchParams.get('per') || 6)));
    const requestedPage = Math.max(1, Number(url.searchParams.get('page') || 1));
    const total = Number(await env.DB.prepare(
      `SELECT COUNT(*) count FROM campaign_allocations WHERE koc_id=?`,
    ).bind(me.koc_id).first('count')) || 0;
    const pages = Math.max(1, Math.ceil(total / per));
    const page = Math.min(requestedPage, pages);
    const { results } = await env.DB.prepare(
      `SELECT ca.*,c.category,c.tier,c.note campaign_note,c.deadline campaign_deadline,c.status campaign_status,
              bz.name business_name
       FROM campaign_allocations ca
       JOIN campaigns c ON c.id=ca.campaign_id
       JOIN businesses bz ON bz.id=c.business_id
       WHERE ca.koc_id=? ORDER BY ca.created_at DESC,ca.id DESC LIMIT ? OFFSET ?`,
    ).bind(me.koc_id,per,(page-1)*per).all();
    return J({ campaigns: results || [], page, per, total, pages });
  }
  if (p === "/api/campaign/allocation/action" && m === "POST") {
    const a = await env.DB.prepare(
      `SELECT ca.*,c.business_id,c.status campaign_status,c.category,c.note campaign_note
       FROM campaign_allocations ca JOIN campaigns c ON c.id=ca.campaign_id WHERE ca.id=?`,
    ).bind(body.id).first();
    if (!a) return err("Không tìm thấy công việc chiến dịch", 404);
    const action = String(body.action || "");
    const isKocOwner = me.role === "koc" && me.koc_id === a.koc_id;
    const isBusinessOwner = me.role === "business" && me.business_id === a.business_id;
    if (!['assigned','in_progress'].includes(a.campaign_status)) return err('Chiến dịch không còn ở giai đoạn thực hiện');
    if (action === "accept") {
      if (!isKocOwner || a.status !== "invited") return err("Không thể nhận công việc này", 403);
      await env.DB.prepare(`UPDATE campaign_allocations SET status='accepted',accepted_at=?,updated_at=? WHERE id=?`).bind(now(),now(),a.id).run();
      await notifyBusiness(env,a.business_id,'campaign','KOC đã nhận chiến dịch',`Một KOC đã xác nhận tham gia chiến dịch ${a.campaign_id}.`,'#/campaigns');
      return J({ok:true,status:'accepted'});
    }
    if (action === "decline") {
      if (!isKocOwner || a.status !== "invited") return err("Không thể từ chối công việc này", 403);
      const reason=String(body.note||'').trim().slice(0,500);
      await env.DB.prepare(`UPDATE campaign_allocations SET status='declined',business_note=?,declined_at=?,updated_at=? WHERE id=?`).bind(reason||null,now(),now(),a.id).run();
      await notifyAdmins(env,'campaign','KOC từ chối chiến dịch',`Phân bổ ${a.id} cần chọn KOC thay thế.`,'#/campaigns');
      return J({ok:true,status:'declined'});
    }
    if (action === "submit") {
      if (!isKocOwner || !['accepted','revision_requested'].includes(a.status)) return err("Công việc chưa sẵn sàng để nộp", 403);
      const url=String(body.url||'').trim(),note=String(body.note||'').trim().slice(0,1000);
      if(!isUrl(url))return err('Link bài đăng/video không hợp lệ');
      await env.DB.prepare(`UPDATE campaign_allocations SET status='submitted',submission_url=?,submission_note=?,submitted_at=?,updated_at=? WHERE id=?`).bind(url,note||null,now(),now(),a.id).run();
      await notifyBusiness(env,a.business_id,'campaign','KOC đã nộp nội dung chiến dịch',`Vui lòng nghiệm thu phân bổ ${a.id}.`,'#/campaigns');
      return J({ok:true,status:'submitted'});
    }
    if (action === "approve" || action === "request_revision") {
      if (!isBusinessOwner || a.status !== "submitted") return err("Nội dung chưa sẵn sàng nghiệm thu", 403);
      const note=String(body.note||'').trim().slice(0,1000);
      if(action==='request_revision'&&!note)return err('Vui lòng nhập nội dung cần chỉnh sửa');
      const next=action==='approve'?'approved':'revision_requested';
      await env.DB.prepare(`UPDATE campaign_allocations SET status=?,business_note=?,approved_at=?,updated_at=? WHERE id=?`).bind(next,note||null,action==='approve'?now():null,now(),a.id).run();
      await notifyKoc(env,a.koc_id,'campaign',action==='approve'?'Doanh nghiệp đã nghiệm thu nội dung':'Doanh nghiệp yêu cầu chỉnh sửa',action==='approve'?'Nội dung đã duyệt, đang chờ Admin giải ngân.':note,'#/campaigns');
      return J({ok:true,status:next});
    }
    return err("Hành động không hợp lệ");
  }
  if (p === "/api/campaign/action" && m === "POST") {
    const c = await env.DB.prepare(`SELECT * FROM campaigns WHERE id=?`).bind(body.id).first();
    if (!c) return err('Không tìm thấy chiến dịch',404);
    const action=String(body.action||''),isOwner=me.role==='business'&&me.business_id===c.business_id,isAdmin=me.role==='admin';
    if(action==='quote'){
      if(!isAdmin||!['pending','quote_pending','quoted'].includes(c.status))return err('Chiến dịch không còn chờ báo giá',403);
      const fee=Number(body.managementFee),budget=Number(c.budget);
      if(!Number.isSafeInteger(fee)||fee<0||fee>1_000_000_000)return err('Phí điều phối không hợp lệ');
      const total=budget+fee;if(!Number.isSafeInteger(total)||total<=0)return err('Tổng báo giá không hợp lệ');
      await env.DB.prepare(`UPDATE campaigns SET management_fee=?,management_rate=?,total_amount=?,quote_note=?,status='quoted',quoted_at=? WHERE id=?`).bind(fee,budget>0?fee/budget:0,total,String(body.note||'').trim().slice(0,1000)||null,now(),c.id).run();
      await notifyBusiness(env,c.business_id,'campaign_quote','NetViet đã gửi báo giá chiến dịch',`Tổng ký quỹ ${total.toLocaleString('vi-VN')}đ. Vui lòng kiểm tra và xác nhận. `,'#/campaigns');
      await audit(env,me.id,'campaign.quoted',c.id,`budget=${budget} fee=${fee} total=${total}`);return J({ok:true,status:'quoted',totalAmount:total});
    }
    if(action==='fund'){
      if(!isOwner||c.status!=='quoted')return err('Chỉ ký quỹ sau khi Admin gửi báo giá',403);
      const fallbackFee=Math.max(2_000_000,Math.round(Number(c.budget||0)*.15)),amount=Number(c.total_amount)||Number(c.budget||0)+fallbackFee;if(!Number.isSafeInteger(amount)||amount<=0)return err('Tổng tiền chiến dịch không hợp lệ');await transferWalletFunds(env,{idempotencyKey:`campaign-fund:${c.id}`,eventType:'campaign_escrow_hold',referenceType:'campaign',referenceId:c.id,note:`Ký quỹ chiến dịch ${c.id}`,source:walletAccount('business',c.business_id,'available'),destinations:[{account:walletAccount('business',c.business_id,'escrow'),amount}]});
      await env.DB.prepare(`UPDATE campaigns SET status='funded',funded_at=? WHERE id=?`).bind(now(),c.id).run();await audit(env,me.id,'campaign.funded',c.id,`amount=${amount}`);return J({ok:true,status:'funded',amount});
    }
    if(action==='start'){
      if(!isAdmin||c.status!=='funded')return err('Chiến dịch chưa được ký quỹ',403);const fee=Math.round(Number(c.management_fee)*.2);
      if(fee>0)await transferWalletFunds(env,{idempotencyKey:`campaign-start-fee:${c.id}`,eventType:'campaign_management_fee_upfront',referenceType:'campaign',referenceId:c.id,note:`20% phí điều phối ${c.id}`,source:walletAccount('business',c.business_id,'escrow'),destinations:[{account:walletAccount('platform','netviet','revenue'),amount:fee}]});
      await env.DB.prepare(`UPDATE campaigns SET status='coordinating',upfront_fee_released=?,started_at=? WHERE id=?`).bind(fee,now(),c.id).run();await audit(env,me.id,'campaign.started',c.id,`upfront_fee=${fee}`);return J({ok:true,status:'coordinating',upfrontFee:fee});
    }
    if(action==='settle_koc'){
      if(!isAdmin||!['assigned','in_progress'].includes(c.status))return err('Chiến dịch chưa sẵn sàng giải ngân',403);const a=await env.DB.prepare(`SELECT ca.*,k.name koc_name FROM campaign_allocations ca JOIN kocs k ON k.id=ca.koc_id WHERE ca.id=? AND ca.campaign_id=?`).bind(body.allocationId,c.id).first();if(!a)return err('Không tìm thấy khoản phân bổ',404);if(a.status==='settled')return J({ok:true,idempotent:true});if(a.status!=='approved')return err('Chỉ giải ngân sau khi doanh nghiệp đã nghiệm thu KOC này');
      const amount=Number(a.amount);await transferWalletFunds(env,{idempotencyKey:`campaign-koc-settle:${a.id}`,eventType:'campaign_koc_settled',referenceType:'campaign_allocation',referenceId:a.id,note:`Giải ngân chiến dịch ${c.id}`,source:walletAccount('business',c.business_id,'escrow'),destinations:[{account:walletAccount('koc',a.koc_id,'available'),amount}]});
      await env.DB.batch([env.DB.prepare(`UPDATE campaign_allocations SET status='settled',settled_at=?,updated_at=? WHERE id=?`).bind(now(),now(),a.id),env.DB.prepare(`UPDATE campaigns SET status='in_progress' WHERE id=?`).bind(c.id),env.DB.prepare(`INSERT OR IGNORE INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`).bind(`campaign-${a.id}`,a.koc_id,'campaign',amount,'settled',`Chiến dịch ${c.id}`,now())]);await audit(env,me.id,'campaign.koc_settled',c.id,`allocation=${a.id} koc=${a.koc_id} amount=${amount}`);return J({ok:true,amount});
    }
    if(action==='complete'){
      if(!isAdmin||!['assigned','in_progress'].includes(c.status))return err('Chiến dịch chưa sẵn sàng hoàn tất',403);const t=await env.DB.prepare(`SELECT COALESCE(SUM(amount),0) total,COALESCE(SUM(CASE WHEN status='settled' THEN amount ELSE 0 END),0) settled,COUNT(*) count FROM campaign_allocations WHERE campaign_id=?`).bind(c.id).first();if(!Number(t?.count)||Number(t.total)!==Number(c.budget)||Number(t.settled)!==Number(c.budget))return err('Còn KOC chưa được phân bổ hoặc giải ngân đầy đủ');const fee=Math.max(0,Number(c.management_fee)-Number(c.upfront_fee_released));
      if(fee>0)await transferWalletFunds(env,{idempotencyKey:`campaign-complete-fee:${c.id}`,eventType:'campaign_management_fee_final',referenceType:'campaign',referenceId:c.id,note:`Phí điều phối còn lại ${c.id}`,source:walletAccount('business',c.business_id,'escrow'),destinations:[{account:walletAccount('platform','netviet','revenue'),amount:fee}]});await env.DB.prepare(`UPDATE campaigns SET status='completed',completed_at=? WHERE id=?`).bind(now(),c.id).run();await audit(env,me.id,'campaign.completed',c.id,`final_fee=${fee}`);return J({ok:true,finalFee:fee});
    }
    if(action==='cancel'){
      if(!isAdmin&&!isOwner)return err('Không có quyền hủy',403);if(['completed','cancelled'].includes(c.status))return err('Chiến dịch đã kết thúc');if(isOwner&&!['pending','quote_pending','quoted','funded'].includes(c.status))return err('Vui lòng liên hệ admin để hủy');let refundAmount=0;if(!['pending','quote_pending','quoted'].includes(c.status)){const t=await env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN status='settled' THEN amount ELSE 0 END),0) settled FROM campaign_allocations WHERE campaign_id=?`).bind(c.id).first();refundAmount=Math.max(0,Number(c.total_amount)-Number(c.upfront_fee_released)-Number(t?.settled||0));if(refundAmount>0)await transferWalletFunds(env,{idempotencyKey:`campaign-cancel-refund:${c.id}`,eventType:'campaign_refund',referenceType:'campaign',referenceId:c.id,note:`Hoàn tiền chiến dịch ${c.id}`,source:walletAccount('business',c.business_id,'escrow'),destinations:[{account:walletAccount('business',c.business_id,'available'),amount:refundAmount}]});}await env.DB.prepare(`UPDATE campaigns SET status='cancelled',cancelled_at=? WHERE id=?`).bind(now(),c.id).run();await audit(env,me.id,'campaign.cancelled',c.id,`refund=${refundAmount}`);return J({ok:true,refundAmount});
    }
    return err('Hành động không hợp lệ');
  }

  // ---------- Business report (3-way breakdown, same numbers as KOC/Admin) ----------
  if (p === "/api/business/report") {
    if (me.role !== "business") return err("403", 403);
    const { results } = await env.DB.prepare(
      `SELECT b.id,b.code,b.category,b.price,b.status,b.booking_type,b.content_type,b.commission_rate,b.platform,b.created_at, k.name kocname,
              a.clicks legacy_clicks, a.orders legacy_orders, a.commission legacy_commission
       FROM bookings b JOIN kocs k ON k.id=b.koc_id LEFT JOIN affiliate a ON a.booking_id=b.id
       WHERE b.business_id=? ORDER BY b.created_at DESC, b.rowid DESC`,
    )
      .bind(me.business_id)
      .all();
    let spend = 0,
      clicks = 0,
      orders = 0,
      gmv = 0,
      commission = 0,
      platformFee = 0;
    for (const r of results) {
      const bt = r.booking_type || "ad";
      r.price = Number(r.price) || 0;
      r.legacy_clicks = Number(r.legacy_clicks) || 0;
      r.legacy_orders = Number(r.legacy_orders) || 0;
      r.legacy_commission = Number(r.legacy_commission) || 0;
      if (r.status !== "rejected" && (bt === "ad" || bt === "combo"))
        spend += r.price;
      // new affiliate_orders (exclude cancelled)
      const agg = await env.DB.prepare(
        `SELECT COUNT(*) o, COALESCE(SUM(gmv),0) g, COALESCE(SUM(commission_amount),0) c, COALESCE(SUM(platform_fee),0) f
         FROM affiliate_orders WHERE booking_id=? AND status NOT IN ('cancelled','refunded')`,
      )
        .bind(r.id)
        .first();
      const cl = await env.DB.prepare(
        `SELECT COALESCE(SUM(clicks),0) c FROM affiliate_links WHERE booking_id=?`,
      )
        .bind(r.id)
        .first("c");
      r.gmv = Number(agg.g) || 0;
      r.aff_orders = Number(agg.o) || 0;
      r.aff_commission = Number(agg.c) || 0;
      r.platform_fee = Number(agg.f) || 0;
      r.clicks = (Number(cl) || 0) + r.legacy_clicks;
      r.orders = r.aff_orders + r.legacy_orders;
      r.commission = r.aff_commission + r.legacy_commission;
      r.roi = r.price + r.commission > 0 ? r.gmv / (r.price + r.commission) : 0;
      clicks += r.clicks;
      orders += r.orders;
      gmv += r.gmv;
      commission += r.commission;
      platformFee += r.platform_fee;
    }
    const adFee = Math.round(spend * 0.05);
    const per = Math.min(50, Math.max(5, Number(url.searchParams.get("per") || 10)));
    const total = results.length;
    const pages = Math.max(1, Math.ceil(total / per));
    const requestedPage = Math.max(1, Number(url.searchParams.get("page") || 1));
    const page = Math.min(requestedPage, pages);
    return J({
      rows: results.slice((page - 1) * per, page * per),
      page,
      per,
      total,
      pages,
      totals: {
        spend,
        clicks,
        orders,
        gmv,
        commission,
        platformFee,
        fee: adFee, // legacy field name kept for backward compat (ad service fee 5%)
        payable: spend + commission + platformFee, // DN total = ad + KOC commission + 1% platform fee
      },
    });
  }

  // ---------- KOL profiles (public list) ----------
  if (p === "/api/kols") {
    const { results } = await env.DB.prepare(
      `SELECT * FROM kol_profiles WHERE status='active' ORDER BY premium DESC, created_at DESC, rowid DESC`,
    ).all();
    const kols = results.map((k) => ({
      ...k,
      channels: JSON.parse(k.channels || "[]"),
      price_hidden: !!k.price_hidden,
      premium: !!k.premium,
    }));
    return J({ kols });
  }
  // Business sends a KOL booking / quote request
  if (p === "/api/kol/request" && m === "POST") {
    if (me.role !== "business") return err("403", 403);
    const kol = await env.DB.prepare("SELECT * FROM kol_profiles WHERE id=?")
      .bind(body.kol_id)
      .first();
    if (!kol || kol.status !== 'active') return err("KOL không tồn tại hoặc đang tạm ngưng", 404);
    const budget=Number(body.budget),brief=String(body.brief||'').trim().slice(0,1000);
    if(!Number.isSafeInteger(budget)||budget<=0||budget>100_000_000_000)return err('Ngân sách dự kiến phải là số nguyên VND hợp lệ');
    if(brief.length<10)return err('Brief cần ít nhất 10 ký tự');
    const id = uid();
    await env.DB.prepare(
      `INSERT INTO kol_requests (id,kol_id,business_id,brief,budget,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    )
      .bind(
        id,
        body.kol_id,
        me.business_id,
        brief,
        budget,
        "pending",
        now(),
        now(),
      )
      .run();
    await audit(env, me.id, "kol_request.create", id, `kol=${kol.name}`);
    return J({ ok: true, requestId: id });
  }
  if (p === "/api/kol/requests") {
    let sql = `SELECT kr.*, kp.name kolname, kp.field, bz.name bizname FROM kol_requests kr
               JOIN kol_profiles kp ON kp.id=kr.kol_id JOIN businesses bz ON bz.id=kr.business_id`;
    const bind = [];
    if (me.role === "business") {
      sql += " WHERE kr.business_id=?";
      bind.push(me.business_id);
    } else if (me.role !== "admin") return err("403", 403);
    const per=Math.min(20,Math.max(5,Number(url.searchParams.get('per')||10))),requestedPage=Math.max(1,Number(url.searchParams.get('page')||1));
    const countSql=`SELECT COUNT(*) count FROM kol_requests kr${me.role==='business'?' WHERE kr.business_id=?':''}`;
    const total=Number(await env.DB.prepare(countSql).bind(...bind).first('count'))||0,pages=Math.max(1,Math.ceil(total/per)),page=Math.min(requestedPage,pages);
    sql += " ORDER BY kr.created_at DESC, kr.rowid DESC LIMIT ? OFFSET ?";
    bind.push(per,(page-1)*per);
    const { results } = await env.DB.prepare(sql)
      .bind(...bind)
      .all();
    return J({ requests: results,page,per,total,pages });
  }
  if (p === '/api/kol/action' && m === 'POST') {
    if(me.role!=='business')return err('Chỉ doanh nghiệp được xác nhận báo giá KOL',403);
    const kr=await env.DB.prepare(`SELECT kr.*,kp.name kol_name FROM kol_requests kr JOIN kol_profiles kp ON kp.id=kr.kol_id WHERE kr.id=? AND kr.business_id=?`).bind(body.id,me.business_id).first();
    if(!kr)return err('Không tìm thấy yêu cầu KOL',404);
    const action=String(body.action||'');
    if(action==='fund'){
      if(kr.status!=='quoted')return err('Báo giá không còn ở trạng thái chờ xác nhận');
      const amount=Number(kr.total_amount||kr.quote);if(!Number.isSafeInteger(amount)||amount<=0)return err('Tổng báo giá không hợp lệ');
      const legacyKolAmount=Number(kr.quote_kol)>0?Number(kr.quote_kol):amount,legacyPlatformFee=Number(kr.quote_kol)>0?Number(kr.quote_platform||0):0,legacyAdditionalFee=Number(kr.quote_kol)>0?Number(kr.quote_additional||0):0;
      await transferWalletFunds(env,{idempotencyKey:`kol-fund:${kr.id}`,eventType:'kol_escrow_hold',referenceType:'kol_request',referenceId:kr.id,note:`Ký quỹ KOL ${kr.kol_name}`,source:walletAccount('business',kr.business_id,'available'),destinations:[{account:walletAccount('business',kr.business_id,'escrow'),amount}]});
      await env.DB.prepare(`UPDATE kol_requests SET status='funded',quote_kol=?,quote_platform=?,quote_additional=?,total_amount=?,escrow_amount=?,funded_at=?,updated_at=? WHERE id=?`).bind(legacyKolAmount,legacyPlatformFee,legacyAdditionalFee,amount,amount,now(),now(),kr.id).run();
      await notifyAdmins(env,'kol','Doanh nghiệp đã ký quỹ KOL',`${kr.kol_name} · ${amount.toLocaleString('vi-VN')}đ`,'#/kol');
      await audit(env,me.id,'kol_request.funded',kr.id,`amount=${amount}`);return J({ok:true,status:'funded',amount});
    }
    if(action==='approve_delivery'||action==='request_revision'){
      if(kr.status!=='delivered')return err('Sản phẩm KOL chưa sẵn sàng nghiệm thu');
      const note=String(body.note||'').trim().slice(0,1000);if(action==='request_revision'&&!note)return err('Vui lòng nhập nội dung cần chỉnh sửa');
      const next=action==='approve_delivery'?'approved':'revision_requested';
      await env.DB.prepare(`UPDATE kol_requests SET status=?,business_note=?,approved_at=?,updated_at=? WHERE id=?`).bind(next,note||null,next==='approved'?now():null,now(),kr.id).run();
      await notifyAdmins(env,'kol',next==='approved'?'Doanh nghiệp đã nghiệm thu KOL':'Doanh nghiệp yêu cầu chỉnh sửa KOL',`${kr.kol_name}${note?' · '+note:''}`,'#/kol');
      await audit(env,me.id,`kol_request.${next}`,kr.id,note);return J({ok:true,status:next});
    }
    if(action==='cancel'){
      if(!['pending','quoted','funded'].includes(kr.status))return err('Vui lòng liên hệ NetViet để hủy ở giai đoạn hiện tại');
      const refund=kr.status==='funded'?Number(kr.escrow_amount||kr.total_amount||kr.quote):0;
      if(refund>0)await transferWalletFunds(env,{idempotencyKey:`kol-refund:${kr.id}`,eventType:'kol_refund',referenceType:'kol_request',referenceId:kr.id,note:`Hoàn ký quỹ KOL ${kr.kol_name}`,source:walletAccount('business',kr.business_id,'escrow'),destinations:[{account:walletAccount('business',kr.business_id,'available'),amount:refund}]});
      await env.DB.prepare(`UPDATE kol_requests SET status='cancelled',escrow_amount=0,cancelled_at=?,updated_at=? WHERE id=?`).bind(now(),now(),kr.id).run();await audit(env,me.id,'kol_request.cancelled',kr.id,`refund=${refund}`);return J({ok:true,refund});
    }
    return err('Hành động không hợp lệ');
  }

  // ================= ADMIN =================
  if (isAdmin) {
    // ---------- Business account management ----------
    if (p === "/api/admin/businesses" && m === "GET") {
      const q = url.searchParams;
      const page = Math.max(1, parseInt(q.get("page") || "1"));
      const per = Math.min(50, Math.max(5, parseInt(q.get("per") || "10")));
      const where = [];
      const bind = [];
      const search = String(q.get("search") || "").trim();
      const status = String(q.get("status") || "").trim();
      if (search) {
        where.push(
          `(b.name LIKE ? OR b.email LIKE ? OR b.contact LIKE ? OR b.tax_code LIKE ? OR u.email LIKE ?)`,
        );
        const term = `%${search}%`;
        bind.push(term, term, term, term, term);
      }
      if (status) {
        where.push(`COALESCE(u.status,'no_account')=?`);
        bind.push(status);
      }
      const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const total =
        Number(
          await env.DB.prepare(
            `SELECT COUNT(*) c FROM businesses b LEFT JOIN users u ON u.business_id=b.id AND u.role='business' ${w}`,
          )
            .bind(...bind)
            .first("c"),
        ) || 0;
      const { results } = await env.DB.prepare(
        `SELECT b.*, u.id user_id, u.email login_email, u.name account_name,
          COALESCE(u.status,'no_account') account_status, u.locked_at, u.locked_reason, u.updated_at account_updated_at,
          (SELECT COUNT(*) FROM bookings bk WHERE bk.business_id=b.id) bookings_count,
          (SELECT COALESCE(SUM(bk.price),0) FROM bookings bk
           WHERE bk.business_id=b.id AND (
             bk.status='completed' OR EXISTS(
               SELECT 1 FROM payment_requests bp
               WHERE bp.booking_id=bk.id AND bp.status='paid'
             )
           )) total_spend
         FROM businesses b LEFT JOIN users u ON u.business_id=b.id AND u.role='business'
         ${w} ORDER BY b.created_at DESC, b.rowid DESC LIMIT ? OFFSET ?`,
      )
        .bind(...bind, per, (page - 1) * per)
        .all();
      return J({
        businesses: results,
        total,
        page,
        pages: Math.ceil(total / per) || 1,
      });
    }
    if (p.startsWith("/api/admin/businesses/") && m === "GET") {
      const id = p.split("/")[4];
      const business = await env.DB.prepare(
        `SELECT b.*, u.id user_id, u.email login_email, u.name account_name,
          COALESCE(u.status,'no_account') account_status, u.locked_at, u.locked_reason, u.updated_at account_updated_at
         FROM businesses b LEFT JOIN users u ON u.business_id=b.id AND u.role='business' WHERE b.id=?`,
      )
        .bind(id)
        .first();
      if (!business) return err("Không tìm thấy doanh nghiệp", 404);
      const stats = await env.DB.prepare(
        `SELECT COUNT(*) bookings_count,
          COALESCE(SUM(CASE WHEN status='completed' OR EXISTS(
            SELECT 1 FROM payment_requests bp
            WHERE bp.booking_id=bookings.id AND bp.status='paid'
          ) THEN price ELSE 0 END),0) total_spend,
          COALESCE(SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END),0) completed_count
         FROM bookings WHERE business_id=?`,
      )
        .bind(id)
        .first();
      return J({ business, stats });
    }
    if (p === "/api/admin/businesses/update" && m === "POST") {
      const id = String(body.id || "");
      const business = await env.DB.prepare(
        "SELECT * FROM businesses WHERE id=?",
      )
        .bind(id)
        .first();
      if (!business) return err("Không tìm thấy doanh nghiệp", 404);
      const name = String(body.name || "")
        .trim()
        .slice(0, 160);
      const email = String(body.email || "")
        .trim()
        .toLowerCase()
        .slice(0, 160);
      const loginEmail = String(body.login_email || "")
        .trim()
        .toLowerCase()
        .slice(0, 160);
      if (!name) return err("Nhập tên doanh nghiệp");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return err("Email liên hệ không hợp lệ");
      if (loginEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail))
        return err("Email đăng nhập không hợp lệ");
      const user = await env.DB.prepare(
        `SELECT * FROM users WHERE business_id=? AND role='business'`,
      )
        .bind(id)
        .first();
      if (user && loginEmail) {
        const duplicate = await env.DB.prepare(
          "SELECT id FROM users WHERE email=? AND id!=?",
        )
          .bind(loginEmail, user.id)
          .first();
        if (duplicate) return err("Email đăng nhập đã được sử dụng");
      }
      const stmts = [
        env.DB.prepare(
          `UPDATE businesses SET name=?,email=?,contact=?,industry=?,tax_code=?,avatar=?,cover=?,bank_name=?,bank_account=?,bank_owner=? WHERE id=?`,
        ).bind(
          name,
          email,
          String(body.contact || "")
            .trim()
            .slice(0, 120),
          String(body.industry || "")
            .trim()
            .slice(0, 120),
          String(body.tax_code || "")
            .trim()
            .slice(0, 40),
          String(body.avatar || "").slice(0, 500),
          String(body.cover || "").slice(0, 500),
          String(body.bank_name || "")
            .trim()
            .slice(0, 80),
          String(body.bank_account || "")
            .trim()
            .slice(0, 40),
          String(body.bank_owner || "")
            .trim()
            .slice(0, 120),
          id,
        ),
      ];
      if (user) {
        const password = String(body.password || "");
        const passwordError = password ? validatePassword(password) : '';
        if (passwordError) return err(passwordError);
        const passwordHash = password ? await hashPassword(password) : "";
        stmts.push(
          password
            ? env.DB.prepare(
                "UPDATE users SET name=?,email=?,password=?,session_version=session_version+1,updated_at=? WHERE id=?",
              ).bind(name, loginEmail || user.email, passwordHash, now(), user.id)
            : env.DB.prepare(
                "UPDATE users SET name=?,email=?,session_version=session_version+1,updated_at=? WHERE id=?",
              ).bind(name, loginEmail || user.email, now(), user.id),
        );
      }
      await env.DB.batch(stmts);
      await audit(env, me.id, "business.update", id, `name=${name}`);
      return J({ ok: true });
    }
    if (p === "/api/admin/businesses/status" && m === "POST") {
      const id = String(body.id || "");
      const status = String(
        body.status ||
          (body.action === "lock"
            ? "locked"
            : body.action === "unlock"
              ? "active"
              : body.action === "approve"
                ? "active"
                : body.action === "reject"
                  ? "rejected"
                  : ""),
      );
      if (!["active", "locked", "rejected"].includes(status))
        return err("Trạng thái không hợp lệ");
      const user = await env.DB.prepare(
        `SELECT * FROM users WHERE business_id=? AND role='business'`,
      )
        .bind(id)
        .first();
      if (!user) return err("Doanh nghiệp chưa có tài khoản đăng nhập", 409);
      const reason = String(body.reason || "")
        .trim()
        .slice(0, 300);
      if (["locked", "rejected"].includes(status) && !reason)
        return err(
          status === "locked"
            ? "Vui lòng nhập lý do khóa"
            : "Vui lòng nhập lý do từ chối",
        );
      if (body.action === "approve" && user.status !== "pending")
        return err("Chỉ có thể duyệt tài khoản đang chờ");
      if (body.action === "reject" && user.status !== "pending")
        return err("Chỉ có thể từ chối tài khoản đang chờ");
      await env.DB.prepare(
        "UPDATE users SET status=?,locked_at=?,locked_reason=?,updated_at=? WHERE id=?",
      )
        .bind(
          status,
          status === "locked" ? now() : null,
          ["locked", "rejected"].includes(status) ? reason : null,
          now(),
          user.id,
        )
        .run();
      await audit(
        env,
        me.id,
        body.action === "approve"
          ? "business.approve"
          : body.action === "reject"
            ? "business.reject"
            : status === "locked"
              ? "business.lock"
              : "business.unlock",
        id,
        reason,
      );
      return J({ ok: true, status });
    }
    if (p === "/api/admin/queue") {
      const { results } = await env.DB.prepare(
        `SELECT * FROM kocs WHERE status IN ('pending','leader_ok') ORDER BY created_at DESC,rowid DESC`,
      ).all();
      return J({ kocs: results.map(parseKoc) });
    }
    if (p === "/api/admin/kocs" && m === "GET") {
      const q = url.searchParams;
      const page = Math.max(1, parseInt(q.get("page") || "1"));
      const per = 10;
      const where = [];
      const bind = [];
      if (q.get("status")) {
        where.push(`status=?`);
        bind.push(q.get("status"));
      }
      if (q.get("search")) {
        where.push(`(name LIKE ? OR email LIKE ? OR phone LIKE ?)`);
        const term = `%${q.get("search")}%`;
        bind.push(term, term, term);
      }
      const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const total = Number(
        (await env.DB.prepare(`SELECT COUNT(*) c FROM kocs ${clause}`)
          .bind(...bind)
          .first("c")) || 0,
      );
      const { results } = await env.DB.prepare(
        `SELECT * FROM kocs ${clause} ORDER BY created_at DESC,rowid DESC LIMIT ? OFFSET ?`,
      ).bind(...bind, per, (page - 1) * per).all();
      const kocs = [];
      for (const row of results) {
        const prices = await env.DB.prepare(
          `SELECT category,price FROM koc_prices WHERE koc_id=? ORDER BY category`,
        ).bind(row.id).all();
        kocs.push({ ...parseKoc(row), prices: prices.results });
      }
      return J({
        kocs,
        total,
        page,
        pages: Math.ceil(total / per) || 1,
      });
    }
    if (p.startsWith("/api/admin/koc-identity/") && m === "GET") {
      const kocId = p.split("/")[4];
      const identity = await env.DB.prepare(
        `SELECT front_image,back_image,selfie_image,front_object_key,back_object_key,selfie_object_key
         FROM koc_identity_documents WHERE koc_id=?`,
      ).bind(kocId).first();
      if (!identity) return J({ identity: null });
      const [frontUrl, backUrl, selfieUrl] = await Promise.all([
        identity.front_object_key ? signedKocIdentityUrl(env, identity.front_object_key) : identity.front_image,
        identity.back_object_key ? signedKocIdentityUrl(env, identity.back_object_key) : identity.back_image,
        identity.selfie_object_key ? signedKocIdentityUrl(env, identity.selfie_object_key) : identity.selfie_image,
      ]);
      return J({ identity: { front_url: frontUrl, back_url: backUrl, selfie_url: selfieUrl } });
    }
    if (p === "/api/admin/approve" && m === "POST") {
      const status = body.approve ? "active" : "rejected";
      await env.DB.batch([
        env.DB.prepare("UPDATE kocs SET status=? WHERE id=?")
          .bind(status, body.id),
        env.DB.prepare(
          `UPDATE users SET status=?,updated_at=?
           WHERE role='koc' AND koc_id=?`,
        ).bind(status, now(), body.id),
      ]);
      return J({ ok: true });
    }
    if (p === "/api/admin/approve-bulk" && m === "POST") {
      const ids = body.ids || [];
      const stmts = ids.map((id) =>
        env.DB.prepare(`UPDATE kocs SET status='active' WHERE id=?`).bind(id),
      );
      ids.forEach((id) => stmts.push(
        env.DB.prepare(
          `UPDATE users SET status='active',updated_at=?
           WHERE role='koc' AND koc_id=?`,
        ).bind(now(), id),
      ));
      if (stmts.length) await env.DB.batch(stmts);
      return J({ ok: true, count: ids.length });
    }
    if (p === "/api/admin/kpi") {
      const kc = await env.DB.prepare(
        `SELECT COUNT(*) c FROM kocs WHERE status='active'`,
      ).first("c");
      const bz = await env.DB.prepare(
        `SELECT COUNT(*) c FROM businesses`,
      ).first("c");
      const gmv = await env.DB.prepare(
        `SELECT COALESCE(SUM(price),0) s FROM bookings b
         WHERE b.status='completed' OR EXISTS(
           SELECT 1 FROM payment_requests bp
           WHERE bp.booking_id=b.id AND bp.status='paid'
         )`,
      ).first("s");
      const fee = await env.DB.prepare(
        `SELECT COALESCE(SUM(amount),0) s FROM ledger WHERE kind='service_fee'`,
      ).first("s");
      const funnel = {};
      for (const st of [
        "pending",
        "confirmed",
        "producing",
        "posted",
        "settling",
        "completed",
        "rejected",
      ]) {
        funnel[st] =
          Number(
            await env.DB.prepare(
              "SELECT COUNT(*) c FROM bookings WHERE status=?",
            )
              .bind(st)
              .first("c"),
          ) || 0;
      }
      const prov = await env.DB.prepare(
        `SELECT province, COUNT(*) c FROM kocs WHERE status='active' GROUP BY province ORDER BY c DESC, province ASC`,
      ).all();
      const officialProvinces = await getAddressKitProvinces();
      const provinceCounts = new Map(officialProvinces.map(province => [province, 0]));
      for (const row of prov.results || []) {
        const province = canonicalProvinceName(row.province, officialProvinces);
        if (province) provinceCounts.set(province, (provinceCounts.get(province) || 0) + Number(row.c || 0));
      }
      const pendingWithdraw = await env.DB.prepare(
        `SELECT COALESCE(SUM(amount),0) s FROM wallet_tx WHERE status IN ('pending','expected')`,
      ).first("s");
      const affAgg = await env.DB.prepare(
        `SELECT COALESCE(SUM(gmv),0) g, COALESCE(SUM(commission_amount),0) c, COALESCE(SUM(platform_fee),0) f FROM affiliate_orders WHERE status NOT IN ('cancelled','refunded')`,
      ).first();
      const leads =
        Number(
          await env.DB.prepare(
            `SELECT COUNT(*) c FROM quote_leads WHERE status='new'`,
          ).first("c"),
        ) || 0;
      return J({
        kocs: Number(kc),
        businesses: Number(bz),
        gmv: Number(gmv),
        fee: Number(fee),
        funnel,
        provinces: officialProvinces.map(province => ({ province, c: provinceCounts.get(province) || 0 })),
        targetKoc: 300000,
        targetBiz: 200000,
        pendingSettle: Number(pendingWithdraw),
        affGmv: Number(affAgg.g) || 0,
        affCommission: Number(affAgg.c) || 0,
        platformFee: Number(affAgg.f) || 0,
        newLeads: leads,
      });
    }
    if (p === "/api/admin/settle" && m === "POST") {
      // settle all pending commissions (wallet) + confirm+settle affiliate_orders + record 1% platform fee
      const { results } = await env.DB.prepare(
        `SELECT * FROM wallet_tx WHERE status IN ('pending','expected')`,
      ).all();
      const stmts = [];
      let total = 0;
      for (const t of results) {
        stmts.push(
          env.DB.prepare(
            `UPDATE wallet_tx SET status='reconciled' WHERE id=?`,
          ).bind(t.id),
        );
        total += Number(t.amount || 0);
      }
      // settle affiliate_orders that are pending/confirmed and not cancelled/refunded
      const ords = await env.DB.prepare(
        `SELECT * FROM affiliate_orders WHERE status IN ('pending','confirmed')`,
      ).all();
      let platformFeeTotal = 0,
        gmvTotal = 0;
      for (const o of ords.results) {
        stmts.push(
          env.DB.prepare(
            `UPDATE affiliate_orders SET status='settled', settled_at=? WHERE id=?`,
          ).bind(now(), o.id),
        );
        platformFeeTotal += Number(o.platform_fee || 0);
        gmvTotal += Number(o.gmv || 0);
        stmts.push(
          env.DB.prepare(
            `INSERT INTO affiliate_settlements (id,kind,koc_id,booking_id,order_id,amount,note,created_at) VALUES (?,?,?,?,?,?,?,?)`,
          ).bind(
            uid(),
            "commission",
            o.koc_id,
            o.booking_id,
            o.platform_order_id,
            o.commission_amount,
            `Hoa hồng đơn ${o.platform_order_id}`,
            now(),
          ),
        );
      }
      if (total)
        stmts.push(
          env.DB.prepare(
            `INSERT INTO ledger (id,kind,amount,ref,note,created_at) VALUES (?,?,?,?,?,?)`,
          ).bind(
            uid(),
            "affiliate_settle",
            total,
            "batch",
            "Đối soát hoa hồng cuối kỳ",
            now(),
          ),
        );
      if (platformFeeTotal)
        stmts.push(
          env.DB.prepare(
            `INSERT INTO ledger (id,kind,amount,ref,note,created_at) VALUES (?,?,?,?,?,?)`,
          ).bind(
            uid(),
            "platform_fee",
            platformFeeTotal,
            "batch",
            `Phí nền tảng 1% tiếp thị liên kết (doanh nghiệp trả) · Doanh số ${gmvTotal.toLocaleString("vi")}đ`,
            now(),
          ),
        );
      if (stmts.length) await env.DB.batch(stmts);
      const settledKocs = [
        ...new Set(results.filter((t) => t.koc_id).map((t) => t.koc_id)),
      ];
      for (const kocId of settledKocs) {
        const amount = results
          .filter((t) => t.koc_id === kocId)
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        await notifyKoc(
          env,
          kocId,
          "commission",
          "Hoa hồng đã đối soát",
          `${amount.toLocaleString("vi-VN")}đ đã chuyển từ Dự kiến sang Đã đối soát.`,
          "#/wallet",
        );
      }
      await audit(
        env,
        me.id,
        "settle.run",
        "batch",
        `commission=${total} platformFee=${platformFeeTotal} orders=${ords.results.length}`,
      );
      return J({
        ok: true,
        count: results.length,
        total,
        platformFee: platformFeeTotal,
        affOrders: ords.results.length,
      });
    }
    if (p === "/api/admin/ledger") {
      const per = Math.min(20, Math.max(5, Number(url.searchParams.get("per") || 8)));
      const distributionPage = Math.max(1, Number(url.searchParams.get("distributionPage") || 1));
      const ledgerPage = Math.max(1, Number(url.searchParams.get("ledgerPage") || 1));
      const auditPage = Math.max(1, Number(url.searchParams.get("auditPage") || 1));
      const auditSearch = String(url.searchParams.get("auditSearch") || "").trim().toLowerCase();
      const auditCategory = String(url.searchParams.get("auditCategory") || "").trim();
      const auditWhere = [];
      const auditBinds = [];
      const auditCategories = {
        booking: "a.action LIKE 'booking.%'",
        aiclone: "a.action LIKE 'aiclone.%'",
        payment: "(a.action LIKE 'payment.%' OR a.action LIKE 'wallet.%' OR a.action LIKE 'settle.%' OR a.action LIKE 'affiliate_order.%')",
        account: "(a.action LIKE 'business.%' OR a.action LIKE 'koc.%' OR a.action LIKE 'account.%')",
        other: "NOT (a.action LIKE 'booking.%' OR a.action LIKE 'aiclone.%' OR a.action LIKE 'payment.%' OR a.action LIKE 'wallet.%' OR a.action LIKE 'settle.%' OR a.action LIKE 'affiliate_order.%' OR a.action LIKE 'business.%' OR a.action LIKE 'koc.%' OR a.action LIKE 'account.%')",
      };
      if (auditCategories[auditCategory]) auditWhere.push(auditCategories[auditCategory]);
      if (auditSearch) {
        auditWhere.push("LOWER(COALESCE(a.action,'') || ' ' || COALESCE(a.ref,'') || ' ' || COALESCE(a.detail,'') || ' ' || COALESCE(u.name,'')) LIKE ?");
        auditBinds.push(`%${auditSearch}%`);
      }
      const auditWhereSql = auditWhere.length ? `WHERE ${auditWhere.join(" AND ")}` : "";
      const ledgerTotal = Number(await env.DB.prepare("SELECT COUNT(*) c FROM ledger").first("c")) || 0;
      const auditTotal = Number(await env.DB.prepare(`SELECT COUNT(*) c FROM audit_log a LEFT JOIN users u ON u.id=a.actor ${auditWhereSql}`).bind(...auditBinds).first("c")) || 0;
      const settlementWhere = "WHERE b.status IN ('completed', 'settling', 'video_approved', 'posted', 'brief_review', 'producing')";
      const campaignSettlementWhere = "WHERE c.status IN ('funded','coordinating','assigned','in_progress','completed','cancelled')";
      const bookingSettlementTotal = Number(await env.DB.prepare(`SELECT COUNT(*) c FROM bookings b ${settlementWhere}`).first("c")) || 0;
      const campaignSettlementTotal = Number(await env.DB.prepare(`SELECT COUNT(*) c FROM campaigns c ${campaignSettlementWhere}`).first("c")) || 0;
      const kolSettlementTotal = Number(await env.DB.prepare(`SELECT COUNT(*) c FROM kol_requests WHERE status IN ('funded','confirmed','revision_requested','delivered','approved','completed','cancelled')`).first('c'))||0;
      const settlementTotal = bookingSettlementTotal + campaignSettlementTotal + kolSettlementTotal;
      const settlementTotals = await env.DB.prepare(
        `SELECT COALESCE(SUM(price),0) escrow,COALESCE(SUM(koc_fee),0) koc,COALESCE(SUM(price-koc_fee),0) netviet
         FROM (
           SELECT price,CASE
             WHEN type='aiclone' THEN COALESCE(aiclone_quote_koc,0)
             ELSE price-ROUND(price*0.05)
           END koc_fee FROM bookings WHERE status='completed'
         ) summary`,
      ).first();
      const { results } = await env.DB.prepare(
        "SELECT * FROM ledger ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?",
      ).bind(per, (ledgerPage - 1) * per).all();
      const audit = await env.DB.prepare(
        `SELECT a.*,u.name actor_name,u.role actor_role
         FROM audit_log a LEFT JOIN users u ON u.id=a.actor
         ${auditWhereSql} ORDER BY a.created_at DESC,a.id DESC LIMIT ? OFFSET ?`,
      ).bind(...auditBinds, per, (auditPage - 1) * per).all();
      const settlements = await env.DB.prepare(
        `SELECT * FROM (
         SELECT b.id, b.code, b.type, b.price, b.status, b.created_at, b.updated_at, b.aiclone_batch_id,
                b.aiclone_quote_production, b.aiclone_quote_koc, b.aiclone_quote_platform, b.aiclone_quote_additional,
                b.aiclone_production_fee, b.aiclone_platform_fee,
                k.name koc_name, bz.name business_name,
                0 campaign_koc_paid,0 campaign_netviet_paid,0 campaign_remaining
         FROM bookings b
         LEFT JOIN kocs k ON k.id=b.koc_id
         LEFT JOIN businesses bz ON bz.id=b.business_id
         ${settlementWhere}
         UNION ALL
         SELECT c.id,'CD-' || UPPER(SUBSTRING(c.id FROM 1 FOR 8)) code,'campaign' type,c.total_amount price,c.status,
                c.created_at,COALESCE(c.completed_at,c.cancelled_at,c.started_at,c.funded_at,c.created_at) updated_at,NULL aiclone_batch_id,
                0,0,0,0,0,0,
                COALESCE((SELECT STRING_AGG(k.name,' · ' ORDER BY k.name) FROM campaign_allocations ca JOIN kocs k ON k.id=ca.koc_id WHERE ca.campaign_id=c.id),'Chưa phân bổ') koc_name,
                bz.name business_name,
                COALESCE((SELECT SUM(ca.amount) FROM campaign_allocations ca WHERE ca.campaign_id=c.id AND ca.status='settled'),0) campaign_koc_paid,
                CASE WHEN c.status='completed' THEN c.management_fee ELSE c.upfront_fee_released END campaign_netviet_paid,
                CASE WHEN c.status='cancelled' THEN 0 ELSE GREATEST(0,c.total_amount-COALESCE((SELECT SUM(ca.amount) FROM campaign_allocations ca WHERE ca.campaign_id=c.id AND ca.status='settled'),0)-(CASE WHEN c.status='completed' THEN c.management_fee ELSE c.upfront_fee_released END)) END campaign_remaining
         FROM campaigns c JOIN businesses bz ON bz.id=c.business_id
         ${campaignSettlementWhere}
         UNION ALL
         SELECT kr.id,'KOL-' || UPPER(SUBSTRING(kr.id FROM 1 FOR 8)) code,'kol' type,kr.total_amount price,kr.status,
                kr.created_at,kr.updated_at,NULL,0,0,0,0,0,0,kp.name,bz.name,
                CASE WHEN kr.status='completed' THEN kr.quote_kol ELSE 0 END,
                CASE WHEN kr.status='completed' THEN kr.quote_platform+kr.quote_additional ELSE 0 END,
                CASE WHEN kr.status='cancelled' THEN 0 ELSE kr.escrow_amount END
         FROM kol_requests kr JOIN kol_profiles kp ON kp.id=kr.kol_id JOIN businesses bz ON bz.id=kr.business_id
         WHERE kr.status IN ('funded','confirmed','revision_requested','delivered','approved','completed','cancelled')
         ) distribution_rows
         ORDER BY updated_at DESC,id DESC LIMIT ? OFFSET ?`,
      ).bind(per, (distributionPage - 1) * per).all();
      const pagination = (page, total) => ({ page, per, total, pages: Math.max(1, Math.ceil(total / per)) });
      const platformWalletRevenue = await walletBalance(env, 'platform', 'netviet', 'revenue');
      const campaignTotals = await env.DB.prepare(
        `SELECT
           COALESCE((SELECT SUM(amount) FROM campaign_allocations WHERE status='settled'),0) koc,
           COALESCE((SELECT SUM(total_amount) FROM campaigns WHERE status='completed'),0) escrow`,
      ).first();
      const kolTotals=await env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN status='completed' THEN quote_kol ELSE 0 END),0) koc,COALESCE(SUM(CASE WHEN status='completed' THEN total_amount ELSE 0 END),0) escrow FROM kol_requests`).first();
      return J({
        ledger: results, audit: audit.results, settlements: settlements.results || [],
        pagination: {
          distribution: pagination(distributionPage, settlementTotal),
          ledger: pagination(ledgerPage, ledgerTotal),
          audit: pagination(auditPage, auditTotal),
        },
        totals: {
          escrow: Number(settlementTotals.escrow || 0) + Number(campaignTotals.escrow || 0)+Number(kolTotals.escrow||0),
          koc: Number(settlementTotals.koc || 0) + Number(campaignTotals.koc || 0)+Number(kolTotals.koc||0),
          netviet: Number(settlementTotals.netviet || 0),
          platformWalletRevenue,
        },
      });
    }
    // Admin: all affiliate orders (reconciliation with sàn)
    if (p === "/api/admin/affiliate") {
      const { results } = await env.DB.prepare(
        `SELECT o.*, k.name kocname, b.code bcode, b.platform FROM affiliate_orders o
         JOIN kocs k ON k.id=o.koc_id JOIN bookings b ON b.id=o.booking_id ORDER BY o.ordered_at DESC, o.rowid DESC LIMIT 200`,
      ).all();
      const agg = await env.DB.prepare(
        `SELECT COALESCE(SUM(gmv),0) g, COALESCE(SUM(commission_amount),0) c, COALESCE(SUM(platform_fee),0) f,
        COUNT(*) n, COALESCE(SUM(CASE WHEN flagged=1 THEN 1 ELSE 0 END),0) flagged FROM affiliate_orders`,
      ).first();
      return J({ orders: results, totals: agg });
    }
    // Admin: quote leads
    if (p === "/api/admin/leads") {
      const status = String(url.searchParams.get("status") || "");
      const where = status ? "WHERE q.status=?" : "";
      const bind = status ? [status] : [];
      const { results } = await env.DB.prepare(
        `SELECT q.*, s.name sales_name, s.email sales_email,
          (SELECT note FROM lead_activities la WHERE la.lead_id=q.id ORDER BY la.created_at DESC, la.rowid DESC LIMIT 1) latest_note
         FROM quote_leads q LEFT JOIN sales_agents s ON s.id=q.assigned_to
         ${where} ORDER BY COALESCE(q.updated_at,q.created_at) DESC, q.rowid DESC LIMIT 200`,
      )
        .bind(...bind)
        .all();
      return J({ leads: results });
    }
    if (p === "/api/admin/sales-agents") {
      const { results } = await env.DB.prepare(
        `SELECT id,name,email FROM sales_agents WHERE status='active' ORDER BY name`,
      ).all();
      return J({ agents: results });
    }
    if (p === "/api/admin/lead-activities") {
      const leadId = String(url.searchParams.get("lead_id") || "");
      const lead = await env.DB.prepare("SELECT id FROM quote_leads WHERE id=?")
        .bind(leadId)
        .first();
      if (!lead) return err("Không tìm thấy lead", 404);
      const { results } = await env.DB.prepare(
        `SELECT la.*, u.name actor_name FROM lead_activities la
         LEFT JOIN users u ON u.id=la.actor_id WHERE la.lead_id=?
         ORDER BY la.created_at DESC, la.rowid DESC`,
      )
        .bind(leadId)
        .all();
      return J({ activities: results });
    }
    if (p === "/api/admin/lead-update" && m === "POST") {
      const lead = await env.DB.prepare("SELECT * FROM quote_leads WHERE id=?")
        .bind(body.id)
        .first();
      if (!lead) return err("Không tìm thấy lead", 404);
      const validStatuses = [
        "new",
        "contacting",
        "advised",
        "converted",
        "no_need",
        "assigned",
        "contacted",
        "following_up",
        "qualified",
        "won",
        "lost",
      ];
      let status = String(body.status || lead.status || "new");
      if (!validStatuses.includes(status))
        return err("Trạng thái lead không hợp lệ");
      const assignedTo =
        body.assigned_to === undefined
          ? lead.assigned_to || ""
          : String(body.assigned_to || "");
      if (assignedTo) {
        const agent = await env.DB.prepare(
          `SELECT id FROM sales_agents WHERE id=? AND status='active'`,
        )
          .bind(assignedTo)
          .first();
        if (!agent) return err("Nhân viên CSKH không hợp lệ");
        if (status === "new") status = "contacting";
      }
      const need =
        body.need !== undefined
          ? String(body.need || "").slice(0, 800)
          : lead.need || "";
      const note = String(body.note || "")
        .trim()
        .slice(0, 1000);
      const changed =
        status !== lead.status ||
        assignedTo !== (lead.assigned_to || "") ||
        need !== (lead.need || "");
      if (!changed && !note) return err("Không có thay đổi để cập nhật");
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE quote_leads SET need=?,assigned_to=?,status=?,updated_at=? WHERE id=?",
        ).bind(need, assignedTo || null, status, now(), lead.id),
        env.DB.prepare(
          "INSERT INTO lead_activities (id,lead_id,actor_id,status,note,created_at) VALUES (?,?,?,?,?,?)",
        ).bind(
          uid(),
          lead.id,
          me.id,
          status,
          note || "Cập nhật trạng thái",
          now(),
        ),
      ]);
      await audit(
        env,
        me.id,
        "lead.update",
        lead.id,
        `status=${status} assigned_to=${assignedTo}`,
      );
      return J({ ok: true, status, assigned_to: assignedTo });
    }
    if (p === "/api/admin/lead-status" && m === "POST") {
      const lead = await env.DB.prepare("SELECT * FROM quote_leads WHERE id=?")
        .bind(body.id)
        .first();
      if (!lead) return err("Không tìm thấy lead", 404);
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE quote_leads SET status=?,updated_at=? WHERE id=?",
        ).bind("contacting", now(), lead.id),
        env.DB.prepare(
          "INSERT INTO lead_activities (id,lead_id,actor_id,status,note,created_at) VALUES (?,?,?,?,?,?)",
        ).bind(
          uid(),
          lead.id,
          me.id,
          "contacted",
          "Đã liên hệ khách hàng",
          now(),
        ),
      ]);
      await audit(env, me.id, "lead.contacted", lead.id, "");
      return J({ ok: true, status: "contacted" });
    }
    // Admin: KOL requests — approve/quote/reject (premium approval)
    if (p === "/api/admin/kol-action" && m === "POST") {
      const kr = await env.DB.prepare("SELECT * FROM kol_requests WHERE id=?")
        .bind(body.id)
        .first();
      if (!kr) return err("Không tìm thấy yêu cầu", 404);
      const to = body.action; // 'quote' | 'approve' | 'reject'
      if (["completed", "rejected", "cancelled"].includes(kr.status))
        return err("Yêu cầu KOL đã được xử lý");
      if (to === "quote") {
        if (!['pending','quoted'].includes(kr.status))return err("Không thể sửa báo giá sau khi doanh nghiệp ký quỹ");
        const kolAmount=Number(body.kolAmount),platformFee=Number(body.platformFee),additionalFee=Number(body.additionalFee||0);
        if(!Number.isSafeInteger(kolAmount)||kolAmount<=0||!Number.isSafeInteger(platformFee)||platformFee<0||!Number.isSafeInteger(additionalFee)||additionalFee<0)return err('Các khoản báo giá phải là số nguyên VND hợp lệ');
        const quote=kolAmount+platformFee+additionalFee;if(!Number.isSafeInteger(quote)||quote<=0||quote>100_000_000_000)return err('Tổng báo giá không hợp lệ');
        await env.DB.prepare(
          "UPDATE kol_requests SET status=?,quote=?,quote_kol=?,quote_platform=?,quote_additional=?,total_amount=?,admin_note=?,quoted_at=?,updated_at=? WHERE id=?",
        )
          .bind(
            "quoted",
            quote,
            kolAmount,platformFee,additionalFee,quote,
            String(body.note || "")
              .trim()
              .slice(0, 500),
            now(),now(),
            body.id,
          )
          .run();
        await notifyBusiness(env,kr.business_id,'kol_quote','NetViet đã gửi báo giá KOL',`Tổng ký quỹ ${quote.toLocaleString('vi-VN')}đ.`,'#/kol');
      } else if (to === "confirm") {
        if (kr.status !== "funded")return err("Doanh nghiệp chưa ký quỹ");
        const contractReference=String(body.contractReference||'').trim().slice(0,200);if(!contractReference)return err('Vui lòng nhập mã hợp đồng hoặc xác nhận lịch diễn');
        await env.DB.prepare(
          "UPDATE kol_requests SET status='confirmed',contract_reference=?,confirmed_at=?,updated_at=? WHERE id=?",
        )
          .bind(contractReference,now(),now(),body.id)
          .run();
        await notifyBusiness(env,kr.business_id,'kol_confirmed','KOL đã xác nhận lịch và hợp đồng','Yêu cầu đang được thực hiện.','#/kol');
      } else if(to==='deliver'){
        if(!['confirmed','revision_requested'].includes(kr.status))return err('Yêu cầu chưa ở giai đoạn bàn giao');
        const deliveryUrl=String(body.deliveryUrl||'').trim(),deliveryNote=String(body.note||'').trim().slice(0,1000);if(!isUrl(deliveryUrl))return err('Link bàn giao không hợp lệ');
        await env.DB.prepare(`UPDATE kol_requests SET status='delivered',delivery_url=?,delivery_note=?,delivered_at=?,updated_at=? WHERE id=?`).bind(deliveryUrl,deliveryNote||null,now(),now(),kr.id).run();
        await notifyBusiness(env,kr.business_id,'kol_delivery','KOL đã bàn giao sản phẩm','Vui lòng kiểm tra và nghiệm thu.','#/kol');
      } else if(to==='settle'){
        if(kr.status!=='approved')return err('Doanh nghiệp chưa nghiệm thu sản phẩm KOL');
        const kolAmount=Number(kr.quote_kol),platformAmount=Number(kr.quote_platform)+Number(kr.quote_additional),total=kolAmount+platformAmount;
        if(total!==Number(kr.escrow_amount)||total!==Number(kr.total_amount))return err('Số tiền ký quỹ không khớp báo giá, chưa thể giải ngân');
        const destinations=[{account:walletAccount('kol',kr.kol_id,'available'),amount:kolAmount}];if(platformAmount>0)destinations.push({account:walletAccount('platform','netviet','revenue'),amount:platformAmount});
        await transferWalletFunds(env,{idempotencyKey:`kol-settle:${kr.id}`,eventType:'kol_settled',referenceType:'kol_request',referenceId:kr.id,note:`Giải ngân yêu cầu KOL ${kr.id}`,source:walletAccount('business',kr.business_id,'escrow'),destinations});
        await env.DB.prepare(`UPDATE kol_requests SET status='completed',escrow_amount=0,completed_at=?,updated_at=? WHERE id=?`).bind(now(),now(),kr.id).run();
        await notifyBusiness(env,kr.business_id,'kol_completed','Yêu cầu KOL đã hoàn tất',`Đã giải ngân ${total.toLocaleString('vi-VN')}đ.`,'#/kol');
      } else if (to === "reject") {
        if (!["pending", "quoted"].includes(kr.status))
          return err("Không thể từ chối yêu cầu ở trạng thái hiện tại");
        const reason = String(body.note || "")
          .trim()
          .slice(0, 500);
        if (!reason) return err("Vui lòng nhập lý do từ chối");
        await env.DB.prepare(
          "UPDATE kol_requests SET status=?, admin_note=?, updated_at=? WHERE id=?",
        )
          .bind("rejected", reason, now(), body.id)
          .run();
        await notifyBusiness(env,kr.business_id,'kol_rejected','Yêu cầu KOL đã bị từ chối',reason,'#/kol');
      } else if(to==='cancel'){
        if(!['funded','confirmed','revision_requested','delivered','approved'].includes(kr.status))return err('Không thể hủy ở trạng thái hiện tại');
        const refund=Number(kr.escrow_amount||0);if(refund>0)await transferWalletFunds(env,{idempotencyKey:`kol-refund:${kr.id}`,eventType:'kol_refund',referenceType:'kol_request',referenceId:kr.id,note:`Admin hoàn ký quỹ KOL ${kr.id}`,source:walletAccount('business',kr.business_id,'escrow'),destinations:[{account:walletAccount('business',kr.business_id,'available'),amount:refund}]});
        await env.DB.prepare(`UPDATE kol_requests SET status='cancelled',escrow_amount=0,admin_note=?,cancelled_at=?,updated_at=? WHERE id=?`).bind(String(body.note||'').trim().slice(0,500)||null,now(),now(),kr.id).run();
        await notifyBusiness(env,kr.business_id,'kol_cancelled','Yêu cầu KOL đã được hủy',`Đã hoàn ${refund.toLocaleString('vi-VN')}đ về Ví doanh nghiệp.`,'#/kol');
      } else return err("Hành động không hợp lệ");
      await audit(
        env,
        me.id,
        "kol_request." + to,
        body.id,
        `action=${to} kol=${body.kolAmount||kr.quote_kol||0} platform=${body.platformFee||kr.quote_platform||0} note=${String(body.note||'').trim().slice(0,300)}`,
      );
      return J({ ok: true });
    }
    if (p === "/api/admin/tiers" && m === "POST") {
      const tiers = Array.isArray(body.tiers) ? body.tiers : [];
      if (tiers.length !== 4) return err("Cần đủ 4 hạng Nano/Micro/Mid/Macro");
      const names = ["Nano", "Micro", "Mid", "Macro"];
      const clean = [];
      for (let i = 0; i < 4; i++) {
        const t = tiers[i] || {};
        const min = Number(t.min),
          max = Number(t.max),
          minF = Number(t.minF),
          maxF = Number(t.maxF),
          fee = Number(t.fee);
        if (
          ![min, max, minF, maxF, fee].every(
            (v) => Number.isFinite(v) && v >= 0,
          )
        )
          return err(`Hạng ${names[i]}: giá trị phải là số không âm`);
        if (min >= max)
          return err(
            `Hạng ${names[i]}: khung giá tối thiểu phải nhỏ hơn tối đa`,
          );
        if (minF >= maxF)
          return err(
            `Hạng ${names[i]}: follower tối thiểu phải nhỏ hơn tối đa`,
          );
        if (fee < 0 || fee > 50)
          return err(`Hạng ${names[i]}: phí dịch vụ không hợp lệ`);
        clean.push({ name: t.name || names[i], min, max, minF, maxF, fee });
      }
      await env.KV.put("tiers_override", JSON.stringify(clean));
      await audit(env, me.id, "tiers.update", "batch", JSON.stringify(clean));
      const { results } = await env.DB.prepare(
        `SELECT p.id, p.koc_id, p.category, p.price, k.name kocname, k.tier FROM koc_prices p JOIN kocs k ON k.id=p.koc_id WHERE k.status='active'`,
      ).all();
      const byTier = Object.fromEntries(clean.map((t) => [t.name, t]));
      const warnings = results
        .filter((r) => {
          const t = byTier[r.tier];
          return t && (r.price < t.min || r.price > t.max);
        })
        .map((r) => ({
          kocId: r.koc_id,
          name: r.kocname,
          category: r.category,
          price: r.price,
          tier: r.tier,
          min: byTier[r.tier].min,
          max: byTier[r.tier].max,
        }));
      return J({ ok: true, warnings });
    }
    if (p === "/api/admin/contracts") {
      const q = url.searchParams;
      const page = Math.max(1, parseInt(q.get("page") || "1"));
      const per = 10;
      const where = [`contract_hash IS NOT NULL`];
      const bind = [];
      if (q.get("status")) {
        where.push(`status=?`);
        bind.push(q.get("status"));
      }
      if (q.get("search")) {
        where.push(`(name LIKE ? OR contract_hash LIKE ?)`);
        bind.push("%" + q.get("search") + "%", "%" + q.get("search") + "%");
      }
      const w = "WHERE " + where.join(" AND ");
      const total = Number(
        (await env.DB.prepare(`SELECT COUNT(*) c FROM kocs ${w}`)
          .bind(...bind)
          .first("c")) || 0,
      );
      const { results: crows } = await env.DB.prepare(
        `SELECT id,name,tier,status,contract_hash,contract_version,contract_signed_at,contract_signature,contract_html,created_at FROM kocs ${w} ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?`,
      )
        .bind(...bind, per, (page - 1) * per)
        .all();
      return J({
        contracts: crows,
        total,
        page,
        pages: Math.ceil(total / per) || 1,
      });
    }
    if (p === "/api/admin/campaign-allocation-replace" && m === "POST") {
      const allocation = await env.DB.prepare(`SELECT ca.*,c.category,c.tier,c.status campaign_status FROM campaign_allocations ca JOIN campaigns c ON c.id=ca.campaign_id WHERE ca.id=?`).bind(body.allocationId).first();
      if (!allocation) return err('Không tìm thấy phân bổ cần thay thế',404);
      if (allocation.status !== 'declined' || allocation.campaign_status !== 'assigned') return err('Chỉ thay thế KOC đã từ chối trong chiến dịch đang phân bổ');
      const kocId=String(body.kocId||'');
      const duplicate=await env.DB.prepare(`SELECT id FROM campaign_allocations WHERE campaign_id=? AND koc_id=?`).bind(allocation.campaign_id,kocId).first();
      if(duplicate)return err('KOC này đã có trong chiến dịch');
      const allCategories=allocation.category==='Tất cả';
      const koc=await env.DB.prepare(`SELECT id,name,avatar,tier FROM kocs WHERE id=? AND status='active' AND tier=?${allCategories?'':' AND categories LIKE ?'}`).bind(...(allCategories?[kocId,allocation.tier]:[kocId,allocation.tier,'%"'+allocation.category+'"%'])).first();
      if(!koc)return err('KOC thay thế không còn hoạt động hoặc không phù hợp hạng/ngành');
      const replacementId=uid(),timestamp=now();
      await env.DB.batch([env.DB.prepare(`DELETE FROM campaign_allocations WHERE id=?`).bind(allocation.id),env.DB.prepare(`INSERT INTO campaign_allocations (id,campaign_id,koc_id,amount,status,deadline,created_at,updated_at) VALUES (?,?,?,?,'invited',?,?,?)`).bind(replacementId,allocation.campaign_id,koc.id,allocation.amount,allocation.deadline||null,timestamp,timestamp)]);
      const {results:assignedRows}=await env.DB.prepare(`SELECT k.id,k.name,k.avatar,k.tier FROM campaign_allocations ca JOIN kocs k ON k.id=ca.koc_id WHERE ca.campaign_id=? ORDER BY ca.created_at,ca.id`).bind(allocation.campaign_id).all();
      await env.DB.prepare(`UPDATE campaigns SET assigned=? WHERE id=?`).bind(JSON.stringify(assignedRows||[]),allocation.campaign_id).run();
      await audit(env,me.id,'campaign.allocation_replaced',allocation.campaign_id,`old=${allocation.koc_id} new=${koc.id} amount=${allocation.amount}`);
      return J({ok:true,allocationId:replacementId,amount:Number(allocation.amount)});
    }
    if (p === "/api/admin/campaign-assign" && m === "POST") {
      const c = await env.DB.prepare("SELECT * FROM campaigns WHERE id=?")
        .bind(body.id)
        .first();
      if (!c) return err("Không tìm thấy chiến dịch", 404);
      if (!['coordinating','assigned'].includes(c.status)) return err('Chiến dịch phải được ký quỹ và bắt đầu điều phối trước');
      const requested = Array.isArray(body.allocations) ? body.allocations : [];
      const ids = [...new Set(requested.map(item => String(item.kocId || '')))];
      const requiredQty = Number(c.qty) || 0;
      if (ids.length !== requested.length || ids.length !== requiredQty) return err(`Chiến dịch yêu cầu phân bổ đúng ${requiredQty} KOC`);
      const amounts = requested.map(item => Number(item.amount));
      if (amounts.some(value => !Number.isSafeInteger(value) || value <= 0) || amounts.reduce((sum,value)=>sum+value,0) !== Number(c.budget)) return err('Tổng tiền phân bổ phải bằng ngân sách trả KOC');
      const locked = await env.DB.prepare(`SELECT id FROM campaign_allocations WHERE campaign_id=? AND status NOT IN ('invited','declined') LIMIT 1`).bind(c.id).first();
      if (locked) return err('Không thể sửa toàn bộ phân bổ sau khi KOC đã nhận việc hoặc nộp bài');
      let assigned = [];
      if (ids.length) {
        const placeholders = ids.map(() => "?").join(",");
        const allCategories = c.category === 'Tất cả';
        const query = `SELECT id,name,avatar,tier FROM kocs WHERE id IN (${placeholders}) AND status='active' AND tier=?${allCategories ? '' : ' AND categories LIKE ?'}`;
        const params = allCategories ? [...ids,c.tier] : [...ids,c.tier,'%"'+c.category+'"%'];
        const { results: arows } = await env.DB.prepare(query).bind(...params).all();
        if (arows.length !== ids.length) {
          return err(
            "Có KOC không còn hoạt động hoặc không phù hợp hạng/ngành của chiến dịch",
          );
        }
        assigned = arows;
      }
      const amountByKoc=new Map(requested.map(item=>[String(item.kocId),Number(item.amount)])),timestamp=now();
      await env.DB.batch([env.DB.prepare(`DELETE FROM campaign_allocations WHERE campaign_id=?`).bind(c.id),...assigned.map(k=>env.DB.prepare(`INSERT INTO campaign_allocations (id,campaign_id,koc_id,amount,status,deadline,created_at,updated_at) VALUES (?,?,?,?,'invited',?,?,?)`).bind(uid(),c.id,k.id,amountByKoc.get(k.id),c.deadline||null,timestamp,timestamp)),env.DB.prepare(`UPDATE campaigns SET assigned=?,status='assigned' WHERE id=?`).bind(JSON.stringify(assigned),c.id)]);
      await audit(
        env,
        me.id,
        "campaign.assign",
        body.id,
        `count=${assigned.length}/${requiredQty}`,
      );
      return J({
        ok: true,
        assigned,
        assignedCount: assigned.length,
        requiredQty,
        remaining: requiredQty - assigned.length,
      });
    }
    if (p === "/api/complaints" && m === "GET") {
      const st = url.searchParams.get("status");
      const where = st ? "WHERE c.status=?" : "";
      const cbind = st ? [st] : [];
      const { results: comps } = await env.DB.prepare(
        `SELECT c.*, b.code bcode, b.status bstatus, b.escrow, b.price, bz.name bizname, k.name kocname
         FROM complaints c JOIN bookings b ON b.id=c.booking_id JOIN businesses bz ON bz.id=b.business_id JOIN kocs k ON k.id=b.koc_id
         ${where} ORDER BY c.created_at DESC, c.rowid DESC LIMIT 200`,
      )
        .bind(...cbind)
        .all();
      return J({ complaints: comps });
    }
    if (p === "/api/complaints/action" && m === "POST") {
      const c = await env.DB.prepare("SELECT * FROM complaints WHERE id=?")
        .bind(body.id)
        .first();
      if (!c) return err("Không tìm thấy khiếu nại", 404);
      if (c.status !== "open" && c.status !== "in_review")
        return err("Khiếu nại đã được xử lý");
      const cact = body.action; // 'review' | 'refund' | 'resolve' | 'reject'
      const note = String(body.note || "").slice(0, 500);
      if (cact === "review") {
        await env.DB.prepare(
          "UPDATE complaints SET status=?, updated_at=? WHERE id=?",
        )
          .bind("in_review", now(), c.id)
          .run();
      } else if (cact === "refund") {
        const b = await env.DB.prepare("SELECT * FROM bookings WHERE id=?")
          .bind(c.booking_id)
          .first();
        if (!b || b.escrow <= 0)
          return err(
            "Booking không còn khoản tiền có thể hoàn (đã chuyển tiền hoặc là booking chỉ nhận hoa hồng bán hàng)",
          );
        await upd(env, b.id, {
          status: "refund_pending",
          reject_reason: "Khiếu nại: " + note,
          escrow: b.escrow,
        });
        await env.DB.prepare(
          `UPDATE payment_requests SET status='refund_pending',updated_at=?
           WHERE booking_id=? AND status='paid'`,
        ).bind(now(), b.id).run();
        await env.DB.prepare(
          "UPDATE complaints SET status=?, admin_note=?, refunded=0, updated_at=? WHERE id=?",
        )
          .bind("in_review", `Chờ hoàn tiền: ${note}`, now(), c.id)
          .run();
      } else if (cact === "resolve") {
        await env.DB.prepare(
          "UPDATE complaints SET status=?, admin_note=?, updated_at=? WHERE id=?",
        )
          .bind("resolved", note, now(), c.id)
          .run();
      } else if (cact === "reject") {
        await env.DB.prepare(
          "UPDATE complaints SET status=?, admin_note=?, updated_at=? WHERE id=?",
        )
          .bind("rejected", note, now(), c.id)
          .run();
      } else return err("Hành động không hợp lệ");
      await audit(env, me.id, "complaint." + cact, c.id, note);
      return J({ ok: true });
    }
    if (p === "/api/admin/aiclone") {
      const { results } = await env.DB.prepare(
        `SELECT a.id,a.koc_id,a.status,k.name,k.tier,k.avatar,k.province,
                b.id booking_id,b.code booking_code,b.status booking_status,
                b.aiclone_format,b.requirements,b.aiclone_script,b.video_link,
                b.business_video_link,b.koc_video_link,
                bz.name business_name,b.created_at booking_created_at,
                b.price,b.aiclone_quote_note,b.aiclone_scope,b.aiclone_video_quantity,
                b.aiclone_production_fee,b.aiclone_platform_fee,b.aiclone_message,
                b.product_link,b.platform,b.product_url,b.commission_rate,
                b.aiclone_batch_id,b.aiclone_quote_production,b.aiclone_quote_koc,
                b.aiclone_quote_platform,b.aiclone_quote_additional
         FROM bookings b
         LEFT JOIN aiclone a ON a.koc_id=b.koc_id
         JOIN kocs k ON k.id=b.koc_id
         JOIN businesses bz ON bz.id=b.business_id
         WHERE b.type='aiclone'
         UNION ALL
         SELECT a.id,a.koc_id,a.status,k.name,k.tier,k.avatar,k.province,
                NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,
                NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,
                NULL,NULL,NULL,NULL
         FROM aiclone a JOIN kocs k ON k.id=a.koc_id
         WHERE NOT EXISTS (
           SELECT 1 FROM bookings b WHERE b.koc_id=a.koc_id AND b.type='aiclone'
         )
         ORDER BY booking_created_at DESC`,
      ).all();
      return J({ list: results });
    }
    if (p === "/api/admin/aiclone/quote" && m === "POST") {
      const batchId = String(body.batch_id || "").trim();
      const booking = await env.DB.prepare(
        `SELECT * FROM bookings
         WHERE type='aiclone' AND status='quote_pending'
           AND (id=? OR (aiclone_batch_id=? AND ?!=''))
         ORDER BY created_at,rowid LIMIT 1`,
      ).bind(body.id || "", batchId, batchId).first();
      if (!booking) return err("Không tìm thấy yêu cầu AI Clone", 404);
      const effectiveBatchId = booking.aiclone_batch_id || booking.id;
      const { results: batchBookings } = await env.DB.prepare(
        `SELECT id,koc_id FROM bookings
         WHERE type='aiclone' AND status='quote_pending'
           AND (id=? OR aiclone_batch_id=?)
         ORDER BY created_at,rowid`,
      ).bind(booking.id, effectiveBatchId).all();
      const rawAllocations = Array.isArray(body.koc_allocations) ? body.koc_allocations : [];
      const allocationMap = new Map(rawAllocations.map(item => [String(item?.booking_id || ''), Number(item?.amount)]));
      if (allocationMap.size !== batchBookings.length || batchBookings.some(item => !allocationMap.has(String(item.id))))
        return err("Vui lòng nhập phí riêng cho đầy đủ từng KOC trong booking");
      const allocationValues = batchBookings.map(item => allocationMap.get(String(item.id)));
      if (!allocationValues.every(value => Number.isSafeInteger(value) && value >= 0))
        return err("Phí của từng KOC phải là số nguyên không âm");
      const production = Number(body.production_fee || 0);
      const kocFee = allocationValues.reduce((sum, value) => sum + value, 0);
      const platformFee = Number(body.platform_fee || 0);
      const additionalFee = Number(body.additional_fee || 0);
      const parts = [production, kocFee, platformFee, additionalFee];
      if (!parts.every(value => Number.isSafeInteger(value) && value >= 0))
        return err("Các hạng mục báo giá phải là số nguyên không âm");
      const quote = parts.reduce((sum, value) => sum + value, 0);
      if (quote <= 0 || quote > 1_000_000_000)
        return err("Tổng báo giá phải từ 1đ đến 1 tỷ đồng");
      const note = String(body.note || "").trim().slice(0, 1000);
      await env.DB.batch(batchBookings.map(item => {
        const representative = item.id === booking.id;
        return env.DB.prepare(
          `UPDATE bookings
           SET price=?,status=?,aiclone_quote_note=?,
               aiclone_quote_production=?,aiclone_quote_koc=?,
               aiclone_quote_platform=?,aiclone_quote_additional=?,updated_at=?
           WHERE id=? AND status='quote_pending'`,
        ).bind(
          representative ? quote : 0,
          representative ? 'quote_sent' : 'quote_grouped',
          note || null,
          representative ? production : 0,
          allocationMap.get(String(item.id)),
          representative ? platformFee : 0,
          representative ? additionalFee : 0,
          now(), item.id,
        );
      }));
      const bookingCount = Number(await env.DB.prepare(
        `SELECT COUNT(*) c FROM bookings
         WHERE aiclone_batch_id=? AND type='aiclone'`,
      ).bind(effectiveBatchId).first("c")) || 1;
      await notifyBusiness(
        env,
        booking.business_id,
        "aiclone_quote",
        "Admin đã gửi báo giá AI Clone Avatar",
        `${booking.code} · Báo giá tổng cho ${bookingCount} KOC là ${quote.toLocaleString("vi-VN")}đ. Vui lòng kiểm tra và xác nhận báo giá.`,
        "#/orders",
      );
      await audit(
        env,
        me.id,
        "aiclone.quote_sent",
        booking.id,
        `batch=${effectiveBatchId} kocs=${bookingCount} production=${production} koc=${kocFee} platform=${platformFee} additional=${additionalFee} total=${quote} note=${note}`,
      );
      return J({ ok: true, status: "quote_sent", quote, bookingId: booking.id, batchId: effectiveBatchId });
    }
    if (p === "/api/admin/aiclone/script" && m === "POST") {
      const script = String(body.script || "").trim().slice(0, 5000);
      if (script.length < 20) return err("Kịch bản cần ít nhất 20 ký tự");
      const booking = await env.DB.prepare(
        "SELECT * FROM bookings WHERE id=? AND type='aiclone'",
      ).bind(body.id).first();
      if (!booking) return err("Không tìm thấy booking AI Clone", 404);
      if (!["confirmed", "brief_review", "script_drafting", "revision_requested"].includes(booking.status))
        return err("Booking không ở bước soạn kịch bản");
      await env.DB.prepare(
        "UPDATE bookings SET aiclone_script=?,status='producing',reject_reason=NULL,updated_at=? WHERE id=?",
      ).bind(script, now(), booking.id).run();
      await audit(env, me.id, "aiclone.script_approved", booking.id, "");
      return J({ ok: true, status: "producing" });
    }
    if (p === "/api/admin/aiclone/booking" && m === "POST") {
      const koc = await env.DB.prepare("SELECT * FROM kocs WHERE id=?")
        .bind(body.koc_id)
        .first();
      if (!koc) return err("KOC không tồn tại", 404);
      const cat = JSON.parse(koc.categories || "[]")[0] || "Thời trang";
      const priceRow = await env.DB.prepare(
        "SELECT price FROM koc_prices WHERE koc_id=? LIMIT 1",
      )
        .bind(koc.id)
        .first();
      const price = priceRow ? priceRow.price : 1000000;
      const bizId = await env.DB.prepare(
        "SELECT id FROM businesses LIMIT 1",
      ).first("id");
      const id = uid();
      const code = 'AI'+Math.floor(100000+Math.random()*899999);
      await env.DB.prepare(
        `INSERT INTO bookings (id,code,business_id,koc_id,category,price,escrow,product_link,requirements,status,type,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(id,code,bizId,koc.id,cat,price,price,
        body.product_link||'https://netviet.vn/aiclone/brief','NetViet sản xuất video AI Clone Avatar, KOC đăng bài.',
        'confirmed','aiclone',now(),now()).run();
      await env.DB.prepare(`UPDATE aiclone SET status='booked' WHERE koc_id=?`).bind(koc.id).run();
      await notifyKoc(
        env,
        koc.id,
        "booking",
        "Bạn có booking AI Clone Avatar mới",
        `${code} đã được tạo. NetViet sẽ thông báo khi video sẵn sàng.`,
        "#/aiclone",
      );
      const business = await env.DB.prepare('SELECT name FROM businesses WHERE id=?').bind(bizId).first();
      const emailContact = await kocEmailContact(env, koc.id, koc);
      await sendEmailBestEffort('aiclone.booking_created', emailContact, () =>
        sendBookingCreatedEmail(env, emailContact.email, {
          code,
          kocName: emailContact.name,
          businessName: business?.name || 'NetViet',
          type: 'aiclone',
          category: cat,
          price,
          deadline: '',
        })
      );
      return J({ ok: true, bookingId: id });
    }
    if (p === "/api/admin/aiclone/deliver" && m === "POST") {
      const videoLink = String(body.video_link || "").trim();
      const target = String(body.target || "business");
      if (target !== "business") return err("Video phải được gửi cho doanh nghiệp duyệt trước");
      if (!isUrl(videoLink)) return err("Link video phải là URL http/https hợp lệ");
      const booking = await env.DB.prepare(
        "SELECT id,code,koc_id,business_id,type,status,aiclone_batch_id FROM bookings WHERE id=?",
      )
        .bind(body.id)
        .first();
      if (!booking || booking.type !== "aiclone")
        return err("Không tìm thấy booking AI Clone Avatar", 404);
      if (
        target === "business" &&
        !["brief_review", "producing", "revision_requested", "pending_business_review", "business_approved", "pending_koc_review", "video_approved"].includes(booking.status)
      ) return err("Booking chưa ở bước cho phép giao video cho doanh nghiệp");
      const nextStatus = "pending_business_review";
      const effectiveBatchId = booking.aiclone_batch_id || booking.id;
      await env.DB.prepare(
        `UPDATE bookings SET business_video_link=?,video_link=?,status=?,reject_reason=NULL,updated_at=?
         WHERE type='aiclone' AND (id=? OR aiclone_batch_id=?)
           AND status IN ('brief_review','producing','revision_requested','pending_business_review','business_approved','pending_koc_review','video_approved')`,
      ).bind(videoLink, videoLink, nextStatus, now(), booking.id, effectiveBatchId).run();
      await env.DB.prepare(
        `UPDATE aiclone SET status='produced' WHERE koc_id IN (
           SELECT koc_id FROM bookings WHERE type='aiclone' AND (id=? OR aiclone_batch_id=?)
         )`,
      )
        .bind(booking.id, effectiveBatchId)
        .run();
      await notifyBusiness(
          env,
          booking.business_id,
          "video_review",
          "Bản dựng AI Clone đang chờ duyệt",
          `${booking.code} · Vui lòng xem và duyệt video.`,
          "#/orders",
        );
      await audit(
        env,
        me.id,
        "aiclone.deliver",
        booking.id,
        `target=${target} batch=${effectiveBatchId} video=${videoLink}`,
      );
      return J({ ok: true, video_link: videoLink, target, status: nextStatus });
    }
  }

  // ---------- AI Clone Avatar register (koc) ----------
  if (p === "/api/aiclone/register" && m === "POST") {
    if (me.role !== "koc") return err("403", 403);
    const ex = await env.DB.prepare("SELECT id FROM aiclone WHERE koc_id=?")
      .bind(me.koc_id)
      .first();
    if (ex) return err("Bạn đã đăng ký dịch vụ AI Clone Avatar");
    await env.DB.prepare(
      `INSERT INTO aiclone (id,koc_id,status,created_at) VALUES (?,?,?,?)`,
    )
      .bind(uid(), me.koc_id, "registered", now())
      .run();
    await env.DB.prepare("UPDATE kocs SET ai_clone=1 WHERE id=?")
      .bind(me.koc_id)
      .run();
    return J({ ok: true });
  }

  // ---------- KOC dashboard summary ----------
  if (p === "/api/koc/dashboard") {
    if (me.role !== "koc") return err("403", 403);
    const k = await env.DB.prepare("SELECT * FROM kocs WHERE id=?")
      .bind(me.koc_id)
      .first();
    const pending =
      Number(
        await env.DB.prepare(
          `SELECT COUNT(*) c FROM bookings WHERE koc_id=? AND status='pending'`,
        )
          .bind(me.koc_id)
          .first("c"),
      ) || 0;
    const active =
      Number(
        await env.DB.prepare(
          `SELECT COUNT(*) c FROM bookings WHERE koc_id=? AND status IN ('confirmed','producing','posted')`,
        )
          .bind(me.koc_id)
          .first("c"),
      ) || 0;
    const pr = await env.DB.prepare(
      "SELECT category,price FROM koc_prices WHERE koc_id=?",
    )
      .bind(me.koc_id)
      .all();
    const koc = parseKoc(k);
    koc.prices = pr.results;
    const unread =
      Number(
        await env.DB.prepare(
          `SELECT COUNT(*) c FROM notifications WHERE user_id=? AND is_read=0`,
        )
          .bind(me.id)
          .first("c"),
      ) || 0;
    return J({ koc, pending, active, unread });
  }

  // ---------- KOC toggle accepting ----------
  if (p === "/api/koc/accepting" && m === "POST") {
    if (me.role !== "koc") return err("403", 403);
    const k = await env.DB.prepare("SELECT accepting FROM kocs WHERE id=?")
      .bind(me.koc_id)
      .first();
    const acc = JSON.parse(k.accepting || "{}");
    acc[body.category] = !acc[body.category];
    await env.DB.prepare("UPDATE kocs SET accepting=? WHERE id=?")
      .bind(JSON.stringify(acc), me.koc_id)
      .run();
    return J({ ok: true, accepting: acc });
  }

  // ---------- KOC profile (view/edit — avatar, cover, ngành hàng, tỉnh/thành, email, TK nhận thanh toán) ----------
  if (p === "/api/koc/profile" && m === "GET") {
    if (me.role !== "koc") return err("403", 403);
    const k = await env.DB.prepare("SELECT * FROM kocs WHERE id=?")
      .bind(me.koc_id)
      .first();
    if (!k) return err("Không tìm thấy hồ sơ", 404);
    const pr = await env.DB.prepare(
      "SELECT category,price FROM koc_prices WHERE koc_id=?",
    )
      .bind(me.koc_id)
      .all();
    const koc = parseKoc(k);
    koc.email = k.email || me.email || "";
    koc.prices = pr.results;
    return J({ koc });
  }
  if (p === "/api/koc/profile" && m === "POST") {
    if (me.role !== "koc") return err("403", 403);
    const k = await env.DB.prepare("SELECT * FROM kocs WHERE id=?")
      .bind(me.koc_id)
      .first();
    if (!k) return err("Không tìm thấy hồ sơ", 404);
    const email = String(body.email || k.email || me.email || "")
      .trim()
      .toLowerCase()
      .slice(0, 160);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return err("Email không hợp lệ");
    const existingUser = await env.DB.prepare(
      "SELECT id FROM users WHERE email=? AND id<>?",
    )
      .bind(email, me.id)
      .first();
    if (existingUser)
      return err("Email này đã được sử dụng bởi tài khoản khác");
    const bio = String(body.bio || "").slice(0, 600);
    const province = String(body.province || k.province || "")
      .trim()
      .slice(0, 80);
    if (!province) return err("Chọn tỉnh/thành");
    const avatar = String(body.avatar ?? k.avatar ?? "");
    const cover = String(body.cover ?? k.cover ?? "");
    if (avatar.length > 450000 || cover.length > 650000)
      return err("Ảnh vượt quá dung lượng cho phép sau khi tối ưu");
    if (!isImageSource(avatar) || !isImageSource(cover))
      return err("Định dạng ảnh không hợp lệ");
    let socials = Array.isArray(body.socials)
      ? body.socials.slice(0, 6)
      : JSON.parse(k.socials || "[]");
    if (k.followers_verified) {
      const currentSocials = JSON.parse(k.socials || "[]");
      const currentSocial = currentSocials[0] || {};
      const requestedSocial = socials[0] || {};
      const samePlatform =
        normalizedSocialPlatform(currentSocial.platform) ===
        normalizedSocialPlatform(requestedSocial.platform);
      const sameHandle = socialHandlesMatch(
        currentSocial.handle,
        requestedSocial.handle,
      );
      if (!samePlatform || !sameHandle)
        return err(
          "Kênh mạng xã hội đã được xác minh. Hãy liên hệ admin để đổi kênh và xác minh lại.",
          409,
        );
      socials = currentSocials;
    }
    const categories = Array.isArray(body.categories)
      ? [
          ...new Set(
            body.categories.map((c) => String(c).trim()).filter(Boolean),
          ),
        ].slice(0, 10)
      : JSON.parse(k.categories || "[]");
    if (!categories.length) return err("Chọn ít nhất 1 ngành hàng");
    const prices = body.prices || {};
    const tiersNow = await getTiers(env);
    const tr = tiersNow.find((t) => t.name === k.tier) || tiersNow[0];
    for (const cat of categories) {
      const v = Number(prices[cat]);
      if (!Number.isFinite(v) || v <= 0)
        return err(`Nhập giá cho ngành "${cat}"`);
      if (v < tr.min || v > tr.max)
        return err(
          `Giá ngành "${cat}" (${v.toLocaleString("vi")}đ) ngoài khung ${tr.name}: ${tr.min.toLocaleString("vi")}–${tr.max.toLocaleString("vi")}đ`,
        );
    }
    const bank = body.bank || {};
    const bankName = String(bank.name || "")
      .trim()
      .slice(0, 80);
    const bankBin = String(bank.bin || "").trim();
    const bankAccount = String(bank.account || "")
      .trim()
      .slice(0, 40);
    const bankOwner = String(bank.owner || "")
      .trim()
      .slice(0, 120);
    if (!bankName || !bankAccount || !bankOwner)
      return err("Nhập đầy đủ thông tin tài khoản nhận thanh toán");
    if (!/^\d{6}$/.test(bankBin))
      return err("Mã ngân hàng gồm đúng 6 chữ số");
    const oldAccepting = JSON.parse(k.accepting || "{}");
    const accepting = {};
    categories.forEach((c) => (accepting[c] = oldAccepting[c] !== false));
    await env.DB.prepare(
      `UPDATE kocs SET email=?,bio=?,province=?,avatar=?,cover=?,socials=?,categories=?,accepting=?,bank_name=?,bank_bin=?,bank_account=?,bank_owner=? WHERE id=?`,
    )
      .bind(
        email,
        bio,
        province,
        avatar,
        cover,
        JSON.stringify(socials),
        JSON.stringify(categories),
        JSON.stringify(accepting),
        bankName,
        bankBin,
        bankAccount,
        bankOwner,
        me.koc_id,
      )
      .run();
    // Profile edits (including avatar/cover changes) must not revoke the
    // current login session. session_version is reserved for security events
    // such as changing or resetting a password.
    await env.DB.prepare("UPDATE users SET email=?,updated_at=? WHERE id=?")
      .bind(email, now(), me.id)
      .run();
    const stmts = [
      env.DB.prepare("DELETE FROM koc_prices WHERE koc_id=?").bind(me.koc_id),
    ];
    for (const cat of categories)
      stmts.push(
        env.DB.prepare(
          "INSERT INTO koc_prices (id,koc_id,category,price) VALUES (?,?,?,?)",
        ).bind(uid(), me.koc_id, cat, Number(prices[cat])),
      );
    await env.DB.batch(stmts);
    await audit(env, me.id, "koc.profile_update", me.koc_id, "");
    return J({ ok: true });
  }

  // ---------- Business profile (view/edit — logo, cover, ngành nghề, MST, TK nhận thanh toán) ----------
  if (p === "/api/business/profile" && m === "GET") {
    if (me.role !== "business") return err("403", 403);
    const b = await env.DB.prepare("SELECT * FROM businesses WHERE id=?")
      .bind(me.business_id)
      .first();
    if (!b) return err("Không tìm thấy hồ sơ", 404);
    return J({ business: b });
  }
  if (p === "/api/business/profile" && m === "POST") {
    if (me.role !== "business") return err("403", 403);
    const name = String(body.name || "")
      .trim()
      .slice(0, 160);
    if (!name) return err("Nhập tên doanh nghiệp");
    const contact = String(body.contact || "")
      .trim()
      .slice(0, 120);
    const email = String(body.email || "")
      .trim()
      .slice(0, 160);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return err("Email không hợp lệ");
    const industry = String(body.industry || "")
      .trim()
      .slice(0, 120);
    const taxCode = String(body.tax_code || "")
      .trim()
      .slice(0, 40);
    const avatar = String(body.avatar || "");
    const cover = String(body.cover || "");
    if (avatar.length > 450000 || cover.length > 650000)
      return err("Ảnh vượt quá dung lượng cho phép sau khi tối ưu");
    if (!isImageSource(avatar) || !isImageSource(cover))
      return err("Định dạng ảnh không hợp lệ");
    const bank = body.bank || {};
    await env.DB.prepare(
      `UPDATE businesses SET name=?,contact=?,email=?,industry=?,tax_code=?,avatar=?,cover=?,bank_name=?,bank_account=?,bank_owner=? WHERE id=?`,
    )
      .bind(
        name,
        contact,
        email,
        industry,
        taxCode,
        avatar,
        cover,
        String(bank.name || "")
          .trim()
          .slice(0, 80),
        String(bank.account || "")
          .trim()
          .slice(0, 40),
        String(bank.owner || "")
          .trim()
          .slice(0, 120),
        me.business_id,
      )
      .run();
    await audit(env, me.id, "business.profile_update", me.business_id, "");
    return J({ ok: true });
  }

  return err("Không tìm thấy route", 404);
}

function safeUser(u) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    name: u.name,
    koc_id: u.koc_id,
    business_id: u.business_id,
    demo: !!u._sessionDemo,
  };
}
async function audit(env, actor, action, ref, detail) {
  try {
    await env.DB.prepare(
      `INSERT INTO audit_log (id,actor,action,ref,detail,created_at) VALUES (?,?,?,?,?,?)`,
    )
      .bind(uid(), actor || "system", action, ref || "", detail || "", now())
      .run();
  } catch (e) {
    /* audit is best-effort */
  }
}
async function upd(env, id, fields) {
  const keys = Object.keys(fields);
  const set = keys.map((k) => `${k}=?`).join(", ") + ", updated_at=?";
  await env.DB.prepare(`UPDATE bookings SET ${set} WHERE id=?`)
    .bind(...keys.map((k) => fields[k]), now(), id)
    .run();
}
// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
