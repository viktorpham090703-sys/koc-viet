import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatVNPayDate,
  formatVNPayExpireDate,
  normalizeVNPayOrderInfo,
  sortVNPayParams,
  buildVNPaySignData,
  signVNPayData,
  createVNPayPaymentUrl,
  verifyVNPaySecureHash,
} from './vnpay.js';

test('formatVNPayDate formats to 14-digit YYYYMMDDHHmmss string', () => {
  const d = new Date('2026-09-10T07:30:00.000Z'); // 14:30:00 in GMT+7
  const str = formatVNPayDate(d);
  assert.equal(str.length, 14);
  assert.equal(str, '20260910143000');
});

test('formatVNPayExpireDate adds 15 minutes by default', () => {
  const d = new Date('2026-09-10T07:30:00.000Z');
  const exp = formatVNPayExpireDate(d, 15);
  assert.equal(exp, '20260910144500');
});

test('normalizeVNPayOrderInfo removes accents and special characters', () => {
  const input = 'Nạp tiền Ví KOC: đơn hàng #12345 (thử nghiệm)';
  const normalized = normalizeVNPayOrderInfo(input);
  assert.equal(normalized, 'Nap tien Vi KOC: don hang 12345 thu nghiem');
});

test('sortVNPayParams sorts alphabetically and encodes spaces with +', () => {
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: 'KOCVTES1',
    vnp_Amount: 10000000,
    vnp_OrderInfo: 'Nap tien vao vi',
  };
  const sorted = sortVNPayParams(params);
  const keys = Object.keys(sorted);
  assert.deepEqual(keys, [
    'vnp_Amount',
    'vnp_Command',
    'vnp_OrderInfo',
    'vnp_TmnCode',
    'vnp_Version',
  ]);
  assert.equal(sorted.vnp_OrderInfo, 'Nap+tien+vao+vi');
});

test('createVNPayPaymentUrl generates valid payment URL with HMAC-SHA512 hash', () => {
  const env = {
    VNPAY_TMN_CODE: 'KOCVTES1',
    VNPAY_HASH_SECRET: 'TESTSECRETKEYVNPAY1234567890ABCDEF',
    VNPAY_PAYMENT_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    VNPAY_RETURN_URL: 'https://kocviet.com/business.html',
  };
  const fixedDate = new Date('2026-09-10T07:30:00.000Z');
  const urlString = createVNPayPaymentUrl(env, {
    orderId: 123456,
    amount: 50000, // 50,000 VND
    orderInfo: 'Nap tien vi doanh nghiep 123456',
    ipAddr: '127.0.0.1',
    createDate: fixedDate,
  });

  const url = new URL(urlString);
  assert.equal(url.origin + url.pathname, 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
  assert.equal(url.searchParams.get('vnp_TmnCode'), 'KOCVTES1');
  assert.equal(url.searchParams.get('vnp_Amount'), '5000000'); // 50000 * 100
  assert.equal(url.searchParams.get('vnp_Command'), 'pay');
  assert.equal(url.searchParams.get('vnp_TxnRef'), '123456');
  assert.equal(url.searchParams.get('vnp_CreateDate'), '20260910143000');
  assert.ok(url.searchParams.get('vnp_SecureHash'));
  assert.equal(url.searchParams.get('vnp_SecureHash')?.length, 128); // SHA-512 hex is 128 chars
});

test('verifyVNPaySecureHash validates authentic and rejects tampered responses', () => {
  const secretKey = 'TESTSECRETKEYVNPAY1234567890ABCDEF';
  const responseData: Record<string, string> = {
    vnp_Amount: '5000000',
    vnp_BankCode: 'NCB',
    vnp_BankTranNo: 'VNP14226112',
    vnp_CardType: 'ATM',
    vnp_OrderInfo: 'Nap+tien+vi+doanh+nghiep+123456',
    vnp_PayDate: '20260910143500',
    vnp_ResponseCode: '00',
    vnp_TmnCode: 'KOCVTES1',
    vnp_TransactionNo: '14226112',
    vnp_TransactionStatus: '00',
    vnp_TxnRef: '123456',
  };

  const sorted = sortVNPayParams(responseData);
  const signData = buildVNPaySignData(sorted);
  const validHash = signVNPayData(secretKey, signData);

  // 1. Valid hash test
  const validParams = {
    ...responseData,
    vnp_SecureHash: validHash,
  };
  assert.equal(verifyVNPaySecureHash(secretKey, validParams), true);

  // 2. Also works with URLSearchParams
  const searchParams = new URLSearchParams(validParams);
  assert.equal(verifyVNPaySecureHash(secretKey, searchParams), true);

  // 3. Reject tampered amount
  const tamperedParams = {
    ...validParams,
    vnp_Amount: '1000000',
  };
  assert.equal(verifyVNPaySecureHash(secretKey, tamperedParams), false);

  // 4. Reject tampered hash
  const badHashParams = {
    ...validParams,
    vnp_SecureHash: 'invalid_hash_value',
  };
  assert.equal(verifyVNPaySecureHash(secretKey, badHashParams), false);
});

test('createVNPayPaymentUrl throws when missing credentials', () => {
  assert.throws(
    () => createVNPayPaymentUrl({ VNPAY_TMN_CODE: '', VNPAY_HASH_SECRET: '' }, {
      orderId: 1,
      amount: 10000,
      orderInfo: 'Test',
    }),
    /Thiếu mã kết nối VNPAY/,
  );
  assert.throws(
    () => createVNPayPaymentUrl({ VNPAY_TMN_CODE: 'KOCVTES1', VNPAY_HASH_SECRET: '' }, {
      orderId: 1,
      amount: 10000,
      orderInfo: 'Test',
    }),
    /Thiếu mã bảo mật VNPAY/,
  );
});
