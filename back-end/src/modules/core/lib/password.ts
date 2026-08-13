// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
const PREFIX = "pbkdf2_sha256";
// Cloudflare-compatible Web Crypto rejects PBKDF2 iteration counts above
// 100,000. Keep this at the runtime limit so legacy-password migration cannot
// fail before every API route is served.
const ITERATIONS = 100_000;
const KEY_BYTES = 32;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
const COMMON_PASSWORDS = new Set([
  "123456789012345",
  "passwordpassword",
  "qwertyqwertyqwerty",
  "matkhaumatkhau",
]);

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function derive(password, salt, iterations) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(String(password), salt, ITERATIONS);
  return `${PREFIX}$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export function validatePassword(password) {
  const value = String(password || "");
  if (value.length < PASSWORD_MIN_LENGTH)
    return `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`;
  if (value.length > PASSWORD_MAX_LENGTH)
    return `Mật khẩu không được quá ${PASSWORD_MAX_LENGTH} ký tự`;
  if (COMMON_PASSWORDS.has(value.toLowerCase()))
    return "Mật khẩu này quá phổ biến. Vui lòng chọn mật khẩu khác";
  return "";
}

export function passwordNeedsRehash(stored) {
  const parts = String(stored || "").split("$");
  return parts.length !== 4 || parts[0] !== PREFIX || Number(parts[1]) !== ITERATIONS;
}

export async function verifyPassword(password, stored) {
  const value = String(stored || "");
  if (!value.startsWith(`${PREFIX}$`)) return false;
  const parts = value.split("$");
  if (parts.length !== 4) return false;
  const iterations = Number(parts[1]);
  if (!Number.isSafeInteger(iterations) || iterations < 1) return false;
  try {
    const expected = fromBase64(parts[3]);
    const actual = await derive(String(password), fromBase64(parts[2]), iterations);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
    return difference === 0;
  } catch (_) {
    return false;
  }
}

// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
