import crypto from 'node:crypto';

export interface VNPayConfig {
  tmnCode: string;
  hashSecret: string;
  paymentUrl: string;
  apiUrl: string;
  returnUrl: string;
}

export function vnpayConfig(env: any = {}): VNPayConfig {
  const rawTmnCode = env.VNPAY_TMN_CODE !== undefined
    ? env.VNPAY_TMN_CODE
    : (process.env.VNPAY_TMN_CODE ?? 'KOCVTES1');
  const tmnCode = String(rawTmnCode || '').trim();

  const rawHashSecret = env.VNPAY_HASH_SECRET !== undefined
    ? env.VNPAY_HASH_SECRET
    : (process.env.VNPAY_HASH_SECRET ?? '');
  const hashSecret = String(rawHashSecret || '').trim();

  const rawPaymentUrl = env.VNPAY_PAYMENT_URL !== undefined
    ? env.VNPAY_PAYMENT_URL
    : (process.env.VNPAY_PAYMENT_URL ?? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
  const paymentUrl = String(rawPaymentUrl || '').trim();

  const rawApiUrl = env.VNPAY_API_URL !== undefined
    ? env.VNPAY_API_URL
    : (process.env.VNPAY_API_URL ?? 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction');
  const apiUrl = String(rawApiUrl || '').trim();

  const rawReturnUrl = env.VNPAY_RETURN_URL !== undefined
    ? env.VNPAY_RETURN_URL
    : (process.env.VNPAY_RETURN_URL ?? 'http://localhost:5173/business.html');
  const returnUrl = String(rawReturnUrl || '').trim();

  return {
    tmnCode,
    hashSecret,
    paymentUrl,
    apiUrl,
    returnUrl,
  };
}

export function formatVNPayDate(date: Date = new Date()): string {
  // Convert to UTC+7 (Vietnam Timezone)
  const tzOffset = 7 * 60; // minutes
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
  const vnTime = new Date(utcTime + tzOffset * 60000);
  const yyyy = vnTime.getFullYear();
  const mm = String(vnTime.getMonth() + 1).padStart(2, '0');
  const dd = String(vnTime.getDate()).padStart(2, '0');
  const hh = String(vnTime.getHours()).padStart(2, '0');
  const mi = String(vnTime.getMinutes()).padStart(2, '0');
  const ss = String(vnTime.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

export function formatVNPayExpireDate(date: Date = new Date(), minutesAhead = 15): string {
  return formatVNPayDate(new Date(date.getTime() + minutesAhead * 60 * 1000));
}

export function normalizeVNPayOrderInfo(str: string): string {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s:_-]/g, '')
    .trim()
    .slice(0, 255);
}

export function sortVNPayParams(obj: Record<string, any>): Record<string, string> {
  const sorted: Record<string, string> = {};
  const keys: string[] = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (val !== undefined && val !== null && val !== '') {
        keys.push(encodeURIComponent(key));
      }
    }
  }
  keys.sort();
  for (const key of keys) {
    const origKey = decodeURIComponent(key);
    sorted[key] = encodeURIComponent(String(obj[origKey])).replace(/%20/g, '+');
  }
  return sorted;
}

export function buildVNPaySignData(sortedParams: Record<string, string>): string {
  return Object.keys(sortedParams)
    .map(key => `${key}=${sortedParams[key]}`)
    .join('&');
}

export function signVNPayData(hashSecret: string, signData: string): string {
  return crypto
    .createHmac('sha512', hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');
}

export interface CreateVNPayPaymentOptions {
  orderId: string | number;
  amount: number;
  orderInfo: string;
  ipAddr?: string;
  bankCode?: string;
  locale?: 'vn' | 'en';
  returnUrl?: string;
  orderType?: string;
  createDate?: Date;
  expireMinutes?: number;
}

export function createVNPayPaymentUrl(
  env: any,
  options: CreateVNPayPaymentOptions,
): string {
  const config = vnpayConfig(env);
  if (!config.tmnCode) {
    throw new Error('Thiếu mã kết nối VNPAY (VNPAY_TMN_CODE)');
  }
  if (!config.hashSecret) {
    throw new Error('Thiếu mã bảo mật VNPAY (VNPAY_HASH_SECRET)');
  }

  const date = options.createDate || new Date();
  const createDate = formatVNPayDate(date);
  const expireDate = formatVNPayExpireDate(date, options.expireMinutes || 15);
  const returnUrl = options.returnUrl || config.returnUrl;
  const ipAddr = options.ipAddr || '127.0.0.1';
  const normalizedOrderInfo = normalizeVNPayOrderInfo(options.orderInfo);

  const vnpParams: Record<string, any> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: config.tmnCode,
    vnp_Locale: options.locale || 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: String(options.orderId),
    vnp_OrderInfo: normalizedOrderInfo,
    vnp_OrderType: options.orderType || 'other',
    vnp_Amount: Math.round(options.amount * 100),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  if (options.bankCode) {
    vnpParams.vnp_BankCode = options.bankCode;
  }

  const sortedParams = sortVNPayParams(vnpParams);
  const signData = buildVNPaySignData(sortedParams);
  const secureHash = signVNPayData(config.hashSecret, signData);

  return `${config.paymentUrl}?${signData}&vnp_SecureHash=${secureHash}`;
}

export function verifyVNPaySecureHash(
  hashSecret: string,
  queryParams: Record<string, any> | URLSearchParams,
): boolean {
  if (!hashSecret) return false;
  const params: Record<string, string> = {};
  let secureHash = '';
  const ignoredKeys = new Set(['vnp_SecureHash', 'vnp_SecureHashType', 'vnp_route', 'app_route', 'vnpay', 'orderCode']);

  if (queryParams instanceof URLSearchParams) {
    for (const [key, value] of queryParams.entries()) {
      if (key === 'vnp_SecureHash') {
        secureHash = value;
      } else if (key.startsWith('vnp_') && !ignoredKeys.has(key)) {
        params[key] = value;
      }
    }
  } else {
    for (const key in queryParams) {
      if (Object.prototype.hasOwnProperty.call(queryParams, key)) {
        if (key === 'vnp_SecureHash') {
          secureHash = String(queryParams[key] || '');
        } else if (key.startsWith('vnp_') && !ignoredKeys.has(key)) {
          params[key] = String(queryParams[key] || '');
        }
      }
    }
  }

  if (!secureHash) return false;

  const sortedParams = sortVNPayParams(params);
  const signData = buildVNPaySignData(sortedParams);
  const expectedHash = signVNPayData(hashSecret, signData);

  return secureHash.toLowerCase() === expectedHash.toLowerCase();
}

export async function queryVNPayTransaction(
  env: any,
  options: {
    orderId: string | number;
    transactionDate: string; // YYYYMMDDHHmmss
    createDate?: Date;
    ipAddr?: string;
  },
) {
  const config = vnpayConfig(env);
  if (!config.hashSecret) throw new Error('Thiếu VNPAY_HASH_SECRET');

  const date = options.createDate || new Date();
  const createDate = formatVNPayDate(date);
  const requestId = `${options.orderId}-${Date.now()}`;
  const ipAddr = options.ipAddr || '127.0.0.1';
  const orderInfo = `Truy van giao dich ${options.orderId}`;

  const dataToSign = [
    requestId,
    '2.1.0',
    'querydr',
    config.tmnCode,
    String(options.orderId),
    options.transactionDate,
    createDate,
    ipAddr,
    orderInfo,
  ].join('|');

  const secureHash = signVNPayData(config.hashSecret, dataToSign);

  const payload = {
    vnp_RequestId: requestId,
    vnp_Version: '2.1.0',
    vnp_Command: 'querydr',
    vnp_TmnCode: config.tmnCode,
    vnp_TxnRef: String(options.orderId),
    vnp_OrderInfo: orderInfo,
    vnp_TransactionDate: options.transactionDate,
    vnp_CreateDate: createDate,
    vnp_IpAddr: ipAddr,
    vnp_SecureHash: secureHash,
  };

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return await response.json();
}
