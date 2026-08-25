// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
const PAYOS_API_BASE_URL = 'https://api-merchant.payos.vn';
const PAYOS_TIMEOUT_MS = 15000;
const PAYOS_RATE_LIMIT_RETRIES = 2;
const PAYOS_RATE_LIMIT_BACKOFF_MS = 500;
const PAYOS_MAX_RETRY_DELAY_MS = 5000;

function providerText(value, maxLength = 300) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function required(value, name) {
  const result = String(value || '').trim();
  if (!result) throw new Error(`Thiếu ${name}`);
  return result;
}

function retryAfterSeconds(response) {
  const value = String(response.headers.get('retry-after') || '').trim();
  if (!value) return null;
  if (/^\d+(?:\.\d+)?$/.test(value)) return Math.max(0, Math.ceil(Number(value)));
  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return null;
  return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
}

function rateLimitDelay(response, attempt) {
  const retryAfter = retryAfterSeconds(response);
  if (retryAfter !== null) {
    return Math.min(retryAfter * 1000, PAYOS_MAX_RETRY_DELAY_MS);
  }
  return Math.min(
    PAYOS_RATE_LIMIT_BACKOFF_MS * (2 ** attempt),
    PAYOS_MAX_RETRY_DELAY_MS,
  );
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export function payOSPayoutConfig(env) {
  const config = {
    clientId: required(env.PAYOS_PAYOUT_CLIENT_ID, 'mã kết nối kênh rút tiền'),
    apiKey: required(env.PAYOS_PAYOUT_API_KEY, 'khóa truy cập kênh rút tiền'),
    checksumKey: required(env.PAYOS_PAYOUT_CHECKSUM_KEY, 'khóa xác thực kênh rút tiền'),
  };
  const duplicatesPaymentConfig =
    config.clientId === String(env.PAYOS_CLIENT_ID || '').trim()
    && config.apiKey === String(env.PAYOS_API_KEY || '').trim()
    && config.checksumKey === String(env.PAYOS_CHECKSUM_KEY || '').trim();
  if (duplicatesPaymentConfig) {
    throw new Error('Kênh rút tiền chưa được cấu hình đúng. Vui lòng liên hệ quản trị viên.');
  }
  return config;
}

function deepSort(value) {
  if (Array.isArray(value)) return value.map(deepSort);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = deepSort(value[key]);
    return result;
  }, {});
}

export function payoutSignatureData(payload) {
  return Object.keys(payload || {}).sort().map(key => {
    const value = payload[key];
    const normalized = value === null || value === undefined
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(deepSort(value))
        : String(value);
    return `${encodeURIComponent(key)}=${encodeURIComponent(normalized)}`;
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
  let result;
  let rateLimitRetryAfter = null;
  for (let attempt = 0; ; attempt++) {
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
          ? 'Dịch vụ rút tiền chưa phản hồi. Vui lòng thử lại.'
          : 'Chưa kết nối được dịch vụ rút tiền. Vui lòng thử lại.',
      );
      error.ambiguous = true;
      throw error;
    }
    result = await response.json().catch(() => ({}));
    const providerCode = providerText(result.code || response.status || '', 50);
    const rateLimited = response.status === 429 || providerCode === '429';
    const safeToRetry = method === 'GET' || !!idempotencyKey;
    if (!rateLimited || !safeToRetry || attempt >= PAYOS_RATE_LIMIT_RETRIES) break;

    const delayMs = rateLimitDelay(response, attempt);
    rateLimitRetryAfter = retryAfterSeconds(response);
    console.warn('Payout request rate limited; retrying:', {
      path,
      attempt: attempt + 1,
      delayMs,
    });
    await wait(delayMs);
  }

  if (!response.ok || result.code !== '00') {
    const providerCode = providerText(result.code || response.status || '', 50);
    const providerDescription = providerText(
      result.desc
        || result.description
        || result.message
        || result.error?.message
        || (typeof result.error === 'string' ? result.error : ''),
    );
    console.error('Payout request rejected:', {
      status: response.status,
      code: providerCode,
      description: providerDescription,
    });
    const rateLimited = response.status === 429 || providerCode === '429';
    let message = 'Yêu cầu rút tiền chưa được chấp nhận. Vui lòng thử lại.';
    if (rateLimited) {
      message = 'payOS đang giới hạn tần suất yêu cầu rút tiền. Vui lòng chờ một lúc rồi thử lại.';
    } else if (providerCode === '607') {
      message = 'Tài khoản nhận tiền không hợp lệ. Vui lòng kiểm tra lại ngân hàng, mã BIN và số tài khoản trong Hồ sơ.';
    } else if (providerCode === '601' || response.status === 401) {
      message = 'Cấu hình kênh rút tiền chưa hợp lệ. Vui lòng liên hệ quản trị viên.';
    } else if (response.status === 403) {
      message = 'Kênh rút tiền chưa được kích hoạt hoặc máy chủ chưa được cho phép.';
    }
    const error = new Error(message);
    error.ambiguous = response.status >= 500;
    error.status = response.status;
    error.providerCode = providerCode;
    error.providerDescription = providerDescription;
    error.rateLimited = rateLimited;
    error.invalidDestination = providerCode === '607';
    error.retryAfter = rateLimited
      ? retryAfterSeconds(response)
        ?? rateLimitRetryAfter
        ?? Math.ceil(rateLimitDelay(response, PAYOS_RATE_LIMIT_RETRIES) / 1000)
      : null;
    throw error;
  }
  return result.data || {};
}

export async function createPayOSPayout(env, payout, idempotencyKey) {
  const requestId = required(idempotencyKey, 'khóa chống trùng lệnh chi');
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
    idempotencyKey: requestId,
    signed: true,
  });
}

export async function getPayOSPayoutBalance(env) {
  return payoutRequest(env, '/v1/payouts-account/balance');
}

export async function getPayOSPayout(env, payoutId) {
  const id = encodeURIComponent(String(payoutId || '').trim());
  if (!id) throw new Error('Thiếu mã yêu cầu rút tiền');
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
