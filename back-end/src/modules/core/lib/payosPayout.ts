// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
const PAYOS_API_BASE_URL = 'https://api-merchant.payos.vn';
const PAYOS_TIMEOUT_MS = 15000;

function required(value, name) {
  const result = String(value || '').trim();
  if (!result) throw new Error(`Thiếu cấu hình ${name}`);
  return result;
}

export function payOSPayoutConfig(env) {
  return {
    clientId: required(env.PAYOS_PAYOUT_CLIENT_ID || env.PAYOS_CLIENT_ID, 'PAYOS_PAYOUT_CLIENT_ID'),
    apiKey: required(env.PAYOS_PAYOUT_API_KEY || env.PAYOS_API_KEY, 'PAYOS_PAYOUT_API_KEY'),
    checksumKey: required(env.PAYOS_PAYOUT_CHECKSUM_KEY || env.PAYOS_CHECKSUM_KEY, 'PAYOS_PAYOUT_CHECKSUM_KEY'),
  };
}

function deepSort(value) {
  if (Array.isArray(value)) return value.map(deepSort);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = deepSort(value[key]);
    return result;
  }, {});
}

function payoutSignatureData(payload) {
  return Object.keys(payload || {}).sort().map(key => {
    const value = payload[key];
    const normalized = value === null || value === undefined
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(deepSort(value))
        : String(value);
    return `${key}=${encodeURI(normalized)}`;
  }).join('&');
}

function bytesToHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function payoutSignature(checksumKey, payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(checksumKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payoutSignatureData(payload)),
  );
  return bytesToHex(new Uint8Array(signature));
}

async function payoutRequest(env, path, {
  method = 'GET',
  payload,
  idempotencyKey,
  signed = false,
} = {}) {
  const config = payOSPayoutConfig(env);
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json; charset=utf-8',
    'x-client-id': config.clientId,
    'x-api-key': config.apiKey,
  };
  if (idempotencyKey) headers['x-idempotency-key'] = idempotencyKey;
  if (signed) headers['x-signature'] = await payoutSignature(config.checksumKey, payload);

  let response;
  try {
    response = await fetch(`${PAYOS_API_BASE_URL}${path}`, {
      method,
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(PAYOS_TIMEOUT_MS),
    });
  } catch (cause) {
    const error = new Error(
      cause?.name === 'TimeoutError'
        ? 'payOS chưa phản hồi lệnh chi sau 15 giây'
        : `Không kết nối được payOS Chi hộ: ${cause?.message || 'lỗi kết nối'}`,
    );
    error.ambiguous = true;
    throw error;
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.code !== '00') {
    const error = new Error(
      `payOS từ chối lệnh chi: ${result.desc || result.message || result.code || `HTTP ${response.status}`}`,
    );
    error.ambiguous = response.status >= 500;
    error.status = response.status;
    throw error;
  }
  return result.data || {};
}

export async function createPayOSPayout(env, payout, idempotencyKey) {
  const payload = {
    referenceId: payout.referenceId,
    amount: payout.amount,
    description: payout.description,
    toBin: payout.toBin,
    toAccountNumber: payout.toAccountNumber,
    category: ['other'],
  };
  return payoutRequest(env, '/v1/payouts', {
    method: 'POST',
    payload,
    idempotencyKey,
    signed: true,
  });
}

export async function getPayOSPayout(env, payoutId) {
  const id = encodeURIComponent(String(payoutId || '').trim());
  if (!id) throw new Error('Thiếu mã lệnh chi payOS');
  return payoutRequest(env, `/v1/payouts/${id}`);
}

export async function findPayOSPayoutByReference(env, referenceId) {
  const reference = encodeURIComponent(String(referenceId || '').trim());
  if (!reference) throw new Error('Thiếu mã tham chiếu lệnh chi');
  const data = await payoutRequest(
    env,
    `/v1/payouts?limit=10&offset=0&referenceId=${reference}`,
  );
  return Array.isArray(data.payouts) ? data.payouts[0] || null : null;
}

export function normalizedPayoutState(data) {
  const transactionStates = Array.isArray(data?.transactions)
    ? data.transactions.map(item => String(item.state || '').toUpperCase())
    : data?.transactions && typeof data.transactions === 'object'
      ? Object.values(data.transactions).map(item => String(item?.state || '').toUpperCase())
      : [];
  const state = String(
    data?.approvalState || transactionStates[0] || 'PROCESSING',
  ).toUpperCase();
  if (['SUCCEEDED', 'SUCCESS', 'COMPLETED', 'PAID'].includes(state))
    return 'paid';
  if (['FAILED', 'CANCELLED', 'CANCELED', 'REJECTED'].includes(state))
    return 'failed';
  return 'processing';
}
// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
