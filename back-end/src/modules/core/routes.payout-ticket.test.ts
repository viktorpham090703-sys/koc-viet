import assert from 'node:assert/strict';
import test from 'node:test';
import { route } from './routes.js';
import { signJwt } from './lib/jwt.js';

class PayoutTestDb {
  adminUser: any = {
    id: 'admin-1',
    role: 'admin',
    email: 'admin@kocviet.com',
    status: 'active',
    session_version: 0,
  };

  tickets: any[] = [
    {
      id: 'tx-wd-1',
      koc_id: 'koc-user-1',
      type: 'withdraw',
      amount: 500000,
      fee: 0,
      status: 'pending_review',
      reference_code: 'WD26091001',
      note: 'Yeu cau rut tien WD26091001',
      created_at: Math.floor(Date.now() / 1000),
      koc_name: 'Nguyen Van A',
      email: 'nguyenvana@gmail.com',
      koc_phone: '0901234567',
      bank_name: 'Techcombank',
      bank_account: '19031234567890',
      bank_owner: 'NGUYEN VAN A',
      bank_bin: '970407',
    },
  ];
  audits: any[] = [];
  notifications: any[] = [];

  prepare(sql: string) {
    const db = this;
    let values: any[] = [];
    const statement = {
      bind(...bound: any[]) {
        values = bound;
        return statement;
      },
      async first(field?: string) {
        if (sql.includes('SELECT * FROM users WHERE id=?')) {
          if (values[0] === db.adminUser.id) {
            return field ? db.adminUser[field] : { ...db.adminUser };
          }
        }
        if (sql.includes('SELECT id FROM users WHERE koc_id = ?')) {
          return field ? 'user-koc-1' : { id: 'user-koc-1' };
        }
        if (sql.includes('COUNT(*) count') || sql.includes('COUNT(*) as count')) {
          const count = db.tickets.filter((t) => t.status === 'pending_review').length;
          const row: Record<string, any> = { count };
          return field ? row[field] : row;
        }
        if (sql.includes('WHERE wt.id = ?')) {
          const row = db.tickets.find((t) => t.id === values[0]);
          return field ? row?.[field] ?? null : (row ? { ...row } : null);
        }
        return null;
      },
      async all() {
        if (sql.includes('SELECT wt.*') || sql.includes('FROM wallet_tx')) {
          return { results: db.tickets.map((t) => ({ ...t })) };
        }
        return { results: [] };
      },
      async run() {
        if (sql.includes("UPDATE wallet_tx SET status = 'settled'")) {
          const [newNote, targetId] = values;
          const t = db.tickets.find((item) => item.id === targetId);
          if (t) {
            t.status = 'settled';
            t.note = newNote;
          }
        } else if (sql.includes("UPDATE wallet_tx SET status = 'rejected'")) {
          const [newNote, targetId] = values;
          const t = db.tickets.find((item) => item.id === targetId);
          if (t) {
            t.status = 'rejected';
            t.note = newNote;
          }
        }
        if (sql.includes('INSERT INTO audit_log')) {
          db.audits.push(values);
        }
        if (sql.includes('INSERT INTO notifications')) {
          db.notifications.push(values);
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

async function createAdminCookieHeader(jwtSecret: string) {
  const token = await signJwt({
    iss: 'koc-viet',
    aud: 'koc-viet-web',
    sub: 'admin-1',
    role: 'admin',
    sv: 0,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  }, jwtSecret);
  return `kv_session=${token}`;
}

test('GET /api/admin/payout-tickets returns tickets with VietQR URLs and pending count', async () => {
  const db = new PayoutTestDb();
  const secret = 'test-jwt-secret-at-least-32-chars-long';
  const env = { DB: db, JWT_SECRET: secret, KV: { get: async () => null, put: async () => {} } };
  const cookieHeader = await createAdminCookieHeader(secret);
  const url = new URL('http://localhost:3000/api/admin/payout-tickets?status=pending');

  const req = new Request(url.toString(), {
    method: 'GET',
    headers: { Cookie: cookieHeader },
  });

  const res = await route(req, env, url);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.total, 1);
  assert.equal(data.pendingCount, 1);
  assert.equal(data.tickets.length, 1);

  const ticket = data.tickets[0];
  assert.equal(ticket.id, 'tx-wd-1');
  assert.equal(ticket.amount, 500000);
  assert.equal(ticket.bank_bin, '970407');
  assert.ok(ticket.vietqr_url.startsWith('https://img.vietqr.io/image/970407-19031234567890-compact2.png'));
  assert.ok(ticket.vietqr_url.includes('amount=500000'));
});

test('POST /api/admin/payout-tickets/approve marks ticket settled and records audit', async () => {
  const db = new PayoutTestDb();
  const secret = 'test-jwt-secret-at-least-32-chars-long';
  const env = { DB: db, JWT_SECRET: secret, KV: { get: async () => null, put: async () => {} } };
  const cookieHeader = await createAdminCookieHeader(secret);
  const url = new URL('http://localhost:3000/api/admin/payout-tickets/approve');

  const req = new Request(url.toString(), {
    method: 'POST',
    headers: {
      Cookie: cookieHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: 'tx-wd-1',
      reference_code: 'FT2609101234',
    }),
  });

  const res = await route(req, env, url);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(db.tickets[0].status, 'settled');
  assert.ok(db.tickets[0].note.includes('FT2609101234'));
  assert.ok(db.audits.length > 0);
  assert.ok(db.notifications.length > 0);
});

test('POST /api/admin/payout-tickets/reject marks ticket rejected with reason', async () => {
  const db = new PayoutTestDb();
  const secret = 'test-jwt-secret-at-least-32-chars-long';
  const env = { DB: db, JWT_SECRET: secret, KV: { get: async () => null, put: async () => {} } };
  const cookieHeader = await createAdminCookieHeader(secret);
  const url = new URL('http://localhost:3000/api/admin/payout-tickets/reject');

  const req = new Request(url.toString(), {
    method: 'POST',
    headers: {
      Cookie: cookieHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: 'tx-wd-1',
      reason: 'Sai so tai khoan ngan hang',
    }),
  });

  const res = await route(req, env, url);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(db.tickets[0].status, 'rejected');
  assert.ok(db.tickets[0].note.includes('Sai so tai khoan ngan hang'));
  assert.ok(db.audits.length > 0);
  assert.ok(db.notifications.length > 0);
});
