import assert from 'node:assert/strict';
import test from 'node:test';
import { sortVNPayParams, buildVNPaySignData, signVNPayData } from './lib/vnpay.js';
import { route } from './routes.js';

class VNPayTestDb {
  payment: any = {
    id: 'pay-1',
    booking_id: 'wallet_topup',
    business_id: 'biz-1',
    provider: 'vnpay',
    order_code: 888999,
    amount: 100000,
    status: 'pending',
    purpose: 'deposit',
  };

  walletAccounts: Map<string, number> = new Map();
  ledgerEntries: any[] = [];
  audits: any[] = [];

  prepare(sql: string) {
    const db = this;
    let values: any[] = [];
    const statement = {
      bind(...bound: any[]) {
        values = bound;
        return statement;
      },
      async first(field?: string) {
        let row: any = null;
        if (sql.includes('SELECT * FROM payment_requests WHERE order_code=?')) {
          if (Number(values[0]) === db.payment.order_code) {
            row = { ...db.payment };
          }
        }
        return field ? row?.[field] ?? null : row;
      },
      async all() {
        return { results: [] };
      },
      async run() {
        if (sql.includes('UPDATE payment_requests') && sql.includes("status='paid'")) {
          db.payment.status = 'paid';
          db.payment.provider_reference = values[0];
          db.payment.paid_at = values[1];
        } else if (sql.includes('UPDATE payment_requests') && sql.includes("status='failed'")) {
          db.payment.status = 'failed';
          db.payment.failure_reason = values[0];
        }
        return { meta: { changes: 1 } };
      },
    };
    return statement;
  }

  async batch(statements: any[]) {
    const results = [];
    for (const stmt of statements) {
      results.push(await stmt.run());
    }
    return results;
  }
}

function createTestEnv(db: VNPayTestDb, hashSecret = 'SECRETKEY123') {
  return {
    DB: db,
    KV: { get: async () => null, put: async () => {} },
    VNPAY_TMN_CODE: 'KOCVTES1',
    VNPAY_HASH_SECRET: hashSecret,
    VNPAY_RETURN_URL: 'http://localhost:5173/business.html',
    JWT_SECRET: 'test-jwt-secret-at-least-32-chars-long',
  };
}

function buildTestIpnParams(secret: string, overrides: Record<string, string> = {}) {
  const base: Record<string, string> = {
    vnp_Amount: '10000000', // 100,000 * 100
    vnp_BankCode: 'NCB',
    vnp_BankTranNo: 'VNP123456',
    vnp_CardType: 'ATM',
    vnp_OrderInfo: 'Nap+tien+vi+888999',
    vnp_PayDate: '20260910143000',
    vnp_ResponseCode: '00',
    vnp_TmnCode: 'KOCVTES1',
    vnp_TransactionNo: '14226112',
    vnp_TransactionStatus: '00',
    vnp_TxnRef: '888999',
    ...overrides,
  };

  const sorted = sortVNPayParams(base);
  const signData = buildVNPaySignData(sorted);
  const vnp_SecureHash = signVNPayData(secret, signData);

  return new URLSearchParams({
    ...base,
    vnp_SecureHash,
  });
}

test('VNPAY IPN returns RspCode 97 on invalid checksum', async () => {
  const db = new VNPayTestDb();
  const env = createTestEnv(db);
  const params = buildTestIpnParams('DIFFERENT_KEY');
  const url = new URL(`http://localhost:3000/api/vnpay/ipn?${params.toString()}`);

  const req = new Request(url.toString(), { method: 'GET' });
  const res = await route(req, env, url);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.RspCode, '97');
  assert.equal(body.Message, 'Invalid Checksum');
});

test('VNPAY IPN returns RspCode 01 when order is not found', async () => {
  const db = new VNPayTestDb();
  const env = createTestEnv(db);
  const params = buildTestIpnParams(env.VNPAY_HASH_SECRET, { vnp_TxnRef: '999999' });
  const url = new URL(`http://localhost:3000/api/vnpay/ipn?${params.toString()}`);

  const req = new Request(url.toString(), { method: 'GET' });
  const res = await route(req, env, url);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.RspCode, '01');
  assert.equal(body.Message, 'Order not found');
});

test('VNPAY IPN returns RspCode 04 when amount is mismatched', async () => {
  const db = new VNPayTestDb();
  const env = createTestEnv(db);
  const params = buildTestIpnParams(env.VNPAY_HASH_SECRET, { vnp_Amount: '5000000' });
  const url = new URL(`http://localhost:3000/api/vnpay/ipn?${params.toString()}`);

  const req = new Request(url.toString(), { method: 'GET' });
  const res = await route(req, env, url);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.RspCode, '04');
  assert.equal(body.Message, 'Invalid Amount');
});

test('VNPAY IPN updates order and returns RspCode 00 on successful payment', async () => {
  const db = new VNPayTestDb();
  const env = createTestEnv(db);
  const params = buildTestIpnParams(env.VNPAY_HASH_SECRET);
  const url = new URL(`http://localhost:3000/api/vnpay/ipn?${params.toString()}`);

  const req = new Request(url.toString(), { method: 'GET' });
  const res = await route(req, env, url);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.RspCode, '00');
  assert.equal(body.Message, 'Confirm Success');
  assert.equal(db.payment.status, 'paid');
  assert.equal(db.payment.provider_reference, '14226112');
});

test('VNPAY IPN returns RspCode 02 when order was already confirmed', async () => {
  const db = new VNPayTestDb();
  db.payment.status = 'paid';
  const env = createTestEnv(db);
  const params = buildTestIpnParams(env.VNPAY_HASH_SECRET);
  const url = new URL(`http://localhost:3000/api/vnpay/ipn?${params.toString()}`);

  const req = new Request(url.toString(), { method: 'GET' });
  const res = await route(req, env, url);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.RspCode, '02');
  assert.equal(body.Message, 'Order already confirmed');
});

test('POST /api/vnpay/verify-return verifies hash and updates payment to paid', async () => {
  const db = new VNPayTestDb();
  const env = createTestEnv(db);
  const params = buildTestIpnParams(env.VNPAY_HASH_SECRET);
  const payload: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    payload[k] = v;
  }
  const url = new URL('http://localhost:3000/api/vnpay/verify-return');
  const req = new Request(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const res = await route(req, env, url);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.status, 'paid');
  assert.equal(db.payment.status, 'paid');
});

test('POST /api/vnpay/verify-return rejects invalid hash', async () => {
  const db = new VNPayTestDb();
  const env = createTestEnv(db);
  const params = buildTestIpnParams('INVALID_SECRET');
  const payload: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    payload[k] = v;
  }
  const url = new URL('http://localhost:3000/api/vnpay/verify-return');
  const req = new Request(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const res = await route(req, env, url);
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.match(body.error, /Chữ ký bảo mật VNPAY không hợp lệ/);
});
