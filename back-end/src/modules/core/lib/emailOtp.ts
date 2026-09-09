// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
import { now, uid } from '../db.js';
import { sendOtpEmail } from './smtp.js';

const OTP_TTL_SECONDS = 300;
const OTP_RESEND_SECONDS = 30;
const OTP_MAX_ATTEMPTS = 5;
const VERIFIED_TTL_SECONDS = 3600; // 1 hour
const RATE_WINDOW_SECONDS = 10 * 60;

function clientIp(request) {
  return String(
    request?.headers?.get('cf-connecting-ip') ||
    request?.headers?.get('x-forwarded-for')?.split(',')[0] ||
    'unknown',
  ).trim();
}

async function digestText(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function rateAllowed(env, scope, identity, limit) {
  // Version the namespace so releases can retire stale/incorrect limiter state
  // without deleting unrelated KV data.
  const key = `otp-rate-v2:${scope}:${await digestText(String(identity || '').toLowerCase())}`;
  const currentTime = now();
  let state = null;
  try { state = JSON.parse((await env.KV.get(key)) || 'null'); } catch (_) {}
  if (!state || currentTime - Number(state.startedAt || 0) >= RATE_WINDOW_SECONDS) {
    state = { startedAt: currentTime, count: 0 };
  }
  if (state.count >= limit) return false;
  state.count++;
  await env.KV.put(key, JSON.stringify(state), { expirationTtl: RATE_WINDOW_SECONDS });
  return true;
}

function otpPepper(env) {
  const configured = String(env.OTP_PEPPER || '').trim();
  if (configured.length >= 32) return configured;

  // Nexrall does not import .dev.vars automatically. Derive a domain-separated
  // OTP key from the already-required Brevo secret so real email remains usable
  // before OTP_PEPPER is added to the production environment. A dedicated
  // OTP_PEPPER is still preferred and always wins when configured.
  const brevoSecret = String(env.BREVO_API_KEY || '').trim();
  if (brevoSecret.length >= 32) return `koc-viet:otp-hmac:v1:${brevoSecret}`;

  throw new Error('OTP_PEPPER hoặc BREVO_API_KEY phải có ít nhất 32 ký tự');
}

async function otpDigest(env, id, email, purpose, code) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(otpPepper(env)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const value = `${id}\n${email}\n${purpose}\n${code}`;
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  const hex = Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
  return `hmac_sha256$${hex}`;
}

function constantTimeEqual(left, right) {
  const a = new TextEncoder().encode(String(left || ''));
  const b = new TextEncoder().encode(String(right || ''));
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) difference |= (a[i] || 0) ^ (b[i] || 0);
  return difference === 0;
}

export function genCode() {
  const values = new Uint32Array(1);
  const ceiling = Math.floor(0x1_0000_0000 / 900000) * 900000;
  do crypto.getRandomValues(values); while (values[0] >= ceiling);
  return String(100000 + (values[0] % 900000));
}

export async function createAndSendEmailOtp(env, request, email, purpose = 'onboard') {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const ip = clientIp(request);
  if (
    !(await rateAllowed(env, 'send-ip', ip, 10)) ||
    !(await rateAllowed(env, 'send-email', normalizedEmail, 5))
  ) {
    return {
      sent: false,
      demo: false,
      rateLimited: true,
      warning: 'Bạn đã yêu cầu quá nhiều mã OTP. Vui lòng thử lại sau.',
    };
  }

  const issuedAt = now();
  const latest = await env.DB.prepare(
    `SELECT created_at,expires_at FROM email_otp
     WHERE email=? AND purpose=? AND verified=0
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(normalizedEmail, purpose).first();
  if (latest && issuedAt - Number(latest.created_at) < OTP_RESEND_SECONDS) {
    const retryAfter = OTP_RESEND_SECONDS - (issuedAt - Number(latest.created_at));
    return {
      sent: false,
      demo: false,
      cooldown: true,
      retryAfter,
      resendAt: Number(latest.created_at) + OTP_RESEND_SECONDS,
      expiresAt: Number(latest.expires_at),
      warning: `Vui lòng chờ ${retryAfter} giây trước khi gửi lại mã OTP.`,
    };
  }

  const code = genCode();
  const id = uid();
  const expiresAt = issuedAt + OTP_TTL_SECONDS;
  const protectedCode = await otpDigest(env, id, normalizedEmail, purpose, code);
  await env.DB.prepare(
    `INSERT INTO email_otp (id,email,code,purpose,verified,attempts,expires_at,created_at)
     VALUES (?,?,?,?,0,0,?,?)`,
  ).bind(id, normalizedEmail, protectedCode, purpose, expiresAt, issuedAt).run();

  try {
    await sendOtpEmail(env, request, normalizedEmail, code);
    await env.DB.prepare(
      `UPDATE email_otp SET expires_at=? WHERE email=? AND purpose=? AND verified=0 AND id<>?`,
    ).bind(issuedAt, normalizedEmail, purpose, id).run();
    return {
      sent: true,
      demo: false,
      expiresAt,
      resendAt: issuedAt + OTP_RESEND_SECONDS,
      expiresIn: OTP_TTL_SECONDS,
      resendIn: OTP_RESEND_SECONDS,
    };
  } catch (error) {
    console.error('OTP email send failed:', error?.message);
    const isDev = (env.NODE_ENV || 'development') === 'development';
    if (isDev) {
      console.log(`\n========================================\n[DEV OTP] Mã xác thực cho ${normalizedEmail}: ${code}\n========================================\n`);
      await env.DB.prepare(
        `UPDATE email_otp SET expires_at=? WHERE email=? AND purpose=? AND verified=0 AND id<>?`,
      ).bind(issuedAt, normalizedEmail, purpose, id).run();
      return {
        sent: true,
        demo: true,
        devCode: code,
        expiresAt,
        resendAt: issuedAt + OTP_RESEND_SECONDS,
        expiresIn: OTP_TTL_SECONDS,
        resendIn: OTP_RESEND_SECONDS,
      };
    }
    await env.DB.prepare(`DELETE FROM email_otp WHERE id=?`).bind(id).run();
    return {
      sent: false,
      demo: false,
      warning: 'Chưa gửi được mã OTP. Vui lòng thử lại sau.',
    };
  }
}

export async function verifyEmailOtp(env, email, code, purpose = 'onboard', request = null) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (
    !(await rateAllowed(env, 'verify-ip', clientIp(request), 20)) ||
    !(await rateAllowed(env, 'verify-email', normalizedEmail, 15))
  ) {
    return { ok: false, reason: 'rate', error: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.' };
  }

  const row = await env.DB.prepare(
    `SELECT * FROM email_otp WHERE email=? AND purpose=? AND verified=0
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(normalizedEmail, purpose).first();
  if (!row) return { ok: false, reason: 'missing', error: 'Chưa có mã OTP. Vui lòng gửi mã mới.' };
  if (Number(row.expires_at) <= now())
    return { ok: false, reason: 'expired', error: 'Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.' };
  if (Number(row.attempts) >= OTP_MAX_ATTEMPTS)
    return { ok: false, reason: 'attempts', error: 'Bạn đã nhập sai quá 5 lần. Vui lòng gửi lại mã mới.' };

  const normalizedCode = String(code || '').trim();
  const expected = /^\d{6}$/.test(normalizedCode)
    ? await otpDigest(env, row.id, normalizedEmail, purpose, normalizedCode)
    : '';
  if (!constantTimeEqual(row.code, expected)) {
    await env.DB.prepare(`UPDATE email_otp SET attempts=attempts+1 WHERE id=?`).bind(row.id).run();
    const attemptsRemaining = Math.max(0, OTP_MAX_ATTEMPTS - Number(row.attempts || 0) - 1);
    return {
      ok: false,
      reason: 'invalid',
      attemptsRemaining,
      expiresAt: Number(row.expires_at),
      error: attemptsRemaining > 0
        ? `Mã OTP không đúng. Bạn còn ${attemptsRemaining} lần thử.`
        : 'Mã OTP không đúng. Vui lòng gửi lại mã mới.',
    };
  }

  await env.DB.prepare(`UPDATE email_otp SET verified=1,expires_at=? WHERE id=?`)
    .bind(now() + VERIFIED_TTL_SECONDS, row.id).run();
  return { ok: true, verifiedFor: VERIFIED_TTL_SECONDS };
}

export async function isEmailVerified(env, email, purpose = 'onboard') {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;
  if (
    (env.NODE_ENV || 'development') === 'development' &&
    (normalized === 'koc-test@example.com' || normalized.endsWith('@example.com'))
  ) {
    return true;
  }
  const row = await env.DB.prepare(
    `SELECT expires_at FROM email_otp WHERE email=? AND purpose=? AND verified=1
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(normalized, purpose).first();
  return !!(row && Number(row.expires_at) >= now());
}
// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
