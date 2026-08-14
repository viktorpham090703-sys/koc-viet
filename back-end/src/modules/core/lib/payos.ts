// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
const PAYOS_API_BASE_URL = 'https://api-merchant.payos.vn';
const PAYOS_TIMEOUT_MS = 10000;

function normalizedKey(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function unwrappedValue(value) {
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (!value || typeof value !== 'object') return '';
  for (const key of ['value', 'secret', 'text']) {
    if (typeof value[key] === 'string' || typeof value[key] === 'number') {
      return value[key];
    }
  }
  return '';
}

function bindingContainers(binding) {
  const containers = [];
  const queue = [binding];
  const visited = new Set();
  while (queue.length && containers.length < 20) {
    let current = queue.shift();
    if (typeof current === 'string') {
      try {
        current = JSON.parse(current);
      } catch (_) {
        continue;
      }
    }
    if (!current || typeof current !== 'object' || visited.has(current)) continue;
    visited.add(current);
    containers.push(current);
    for (const key of [
      'credentials',
      'config',
      'secrets',
      'fields',
      'values',
      'data',
      'connection',
    ]) {
      if (current[key] && typeof current[key] === 'object') {
        queue.push(current[key]);
      }
    }
  }
  return containers;
}

function bindingValue(binding, aliases) {
  const aliasKeys = new Set(aliases.map(normalizedKey));
  for (const container of bindingContainers(binding)) {
    for (const [key, rawValue] of Object.entries(container)) {
      if (!aliasKeys.has(normalizedKey(key))) continue;
      const value = String(unwrappedValue(rawValue) || '').trim();
      if (value) return value;
    }
  }
  return '';
}

function requiredValue(value, name) {
  value = String(value || '').trim();
  if (!value) throw new Error(`Thiếu ${name}`);
  return value;
}

export function payOSConfig(env) {
  const binding =
    env.PAYOS ||
    env.payOS ||
    env.payos ||
    env.PAYOS_SERVICE ||
    env.payosService ||
    env.PAYOS_CONFIG ||
    env.services?.PAYOS ||
    env.services?.payOS ||
    env.services?.payos ||
    env.SERVICES?.PAYOS ||
    null;
  return {
    clientId: requiredValue(
      env.PAYOS_CLIENT_ID || bindingValue(binding, [
        'PAYOS_CLIENT_ID',
        'CLIENT_ID',
        'Client ID',
        'clientId',
      ]),
      'cấu hình thanh toán',
    ),
    apiKey: requiredValue(
      env.PAYOS_API_KEY || bindingValue(binding, [
        'PAYOS_API_KEY',
        'API_KEY',
        'API Key',
        'apiKey',
      ]),
      'cấu hình thanh toán',
    ),
    checksumKey: requiredValue(
      env.PAYOS_CHECKSUM_KEY || bindingValue(binding, [
        'PAYOS_CHECKSUM_KEY',
        'CHECKSUM_KEY',
        'Checksum Key',
        'checksumKey',
      ]),
      'cấu hình thanh toán',
    ),
  };
}

function sortObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = value[key];
    return result;
  }, {});
}

function signatureValue(value) {
  if ([null, undefined, 'undefined', 'null'].includes(value)) return '';
  if (Array.isArray(value)) {
    return JSON.stringify(value.map(item => sortObject(item)));
  }
  return String(value);
}

export function payOSSignatureData(data) {
  return Object.keys(data || {})
    .filter(key => data[key] !== undefined)
    .sort()
    .map(key => `${key}=${signatureValue(data[key])}`)
    .join('&');
}

function bytesToHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value) {
  const hex = String(value || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
}

async function hmacKey(checksumKey, usage) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(checksumKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage,
  );
}

export async function createPayOSSignature(checksumKey, data) {
  const key = await hmacKey(checksumKey, ['sign']);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payOSSignatureData(data)),
  );
  return bytesToHex(new Uint8Array(signature));
}

export async function verifyPayOSSignature(checksumKey, data, signature) {
  const signatureBytes = hexToBytes(signature);
  if (!signatureBytes) return false;
  const key = await hmacKey(checksumKey, ['verify']);
  return crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    new TextEncoder().encode(payOSSignatureData(data)),
  );
}

async function payOSRequest(env, path, options = {}) {
  const { clientId, apiKey } = payOSConfig(env);
  let response;
  try {
    response = await fetch(`${PAYOS_API_BASE_URL}${path}`, {
      ...options,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json; charset=utf-8',
        'x-client-id': clientId,
        'x-api-key': apiKey,
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(PAYOS_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(
      error?.name === 'TimeoutError'
        ? 'Dịch vụ thanh toán chưa phản hồi. Vui lòng thử lại.'
        : 'Chưa kết nối được dịch vụ thanh toán. Vui lòng thử lại.',
    );
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.code !== '00') {
    throw new Error('Yêu cầu thanh toán chưa được chấp nhận. Vui lòng thử lại.');
  }
  return result;
}

async function verifiedResponseData(env, result) {
  if (!result?.data || !result.signature) return result?.data || {};
  const { checksumKey } = payOSConfig(env);
  const valid = await verifyPayOSSignature(checksumKey, result.data, result.signature);
  if (!valid) throw new Error('Không thể xác minh phản hồi thanh toán');
  return result.data;
}

export async function createPayOSPaymentLink(env, payment) {
  const { checksumKey } = payOSConfig(env);
  const signedData = {
    amount: payment.amount,
    cancelUrl: payment.cancelUrl,
    description: payment.description,
    orderCode: payment.orderCode,
    returnUrl: payment.returnUrl,
  };
  const payload = {
    ...payment,
    signature: await createPayOSSignature(checksumKey, signedData),
  };
  const result = await payOSRequest(env, '/v2/payment-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await verifiedResponseData(env, result);
  const checkoutUrl = new URL(String(data.checkoutUrl || ''));
  const payOSHost =
    checkoutUrl.hostname === 'payos.vn' ||
    checkoutUrl.hostname.endsWith('.payos.vn');
  if (checkoutUrl.protocol !== 'https:' || !payOSHost) {
    throw new Error('Không thể mở trang thanh toán');
  }
  return data;
}

export async function getPayOSPaymentLink(env, id) {
  const value = encodeURIComponent(String(id || '').trim());
  if (!value) throw new Error('Thiếu mã giao dịch');
  const result = await payOSRequest(env, `/v2/payment-requests/${value}`);
  return verifiedResponseData(env, result);
}

export async function verifyPayOSWebhook(env, webhook) {
  const { checksumKey } = payOSConfig(env);
  if (!webhook?.data || !webhook.signature) {
    throw new Error('Webhook payOS thiếu dữ liệu hoặc chữ ký');
  }
  const valid = await verifyPayOSSignature(
    checksumKey,
    webhook.data,
    webhook.signature,
  );
  if (!valid) throw new Error('Chữ ký webhook payOS không hợp lệ');
  return webhook.data;
}
// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
